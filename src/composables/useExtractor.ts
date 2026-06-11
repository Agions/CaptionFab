/**
 * useSubtitleExtractor — 字幕提取 composable
 * ===========================================
 * 职责：
 * - 管理提取状态（isExtracting, isPaused 等）
 * - 协调 VideoPlayer、OCREngine、Pipeline
 * - 与 SubtitleStore 交互（更新进度、添加字幕）
 *
 * 不再负责：
 * - 场景检测（→ SceneDetect）
 * - 后处理管道（→ Pipeline）
 * - 置信度校准（→ Calibrator）
 */

import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { ERR_NO_VIDEO } from '@/utils/constants'
import { useVideoPlayer } from './usePlayer'
import { useOCREngine } from './useOCREngine'
import type { OCRConfig } from '@/types/video'
import type { SubtitleLite, SubtitleItem } from '@/types/subtitle'
import {
  Pipeline,
  SceneDetect,
  getCalibrator,
} from '@/core'
import { langToScript } from '@/utils/text'
import { extractFrameMetrics } from '@/utils/detection'
import { normalizeROI } from '@/utils/image'
import { AICorrector } from '@/core/AICorrector'
import type { ROI } from '@/types/video'

/**
 * 将 SubtitleLite 转换为 SubtitleItem 的工厂函数
 * 优化：重命名为 createSubtitleItem，更符合工厂函数命名惯例
 */
function createSubtitleItem(
  s: SubtitleLite,
  i: number,
  lang: string,
  roi: ROI,
  idPrefix: string,
): SubtitleItem {
  return {
    id: `${idPrefix}${s.startFrame}-${Math.round(s.startTime * 1000)}-${i}`,
    index: i + 1,
    startTime: s.startTime,
    endTime: s.endTime,
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    text: s.text,
    confidence: s.confidence,
    language: lang,
    roi,
    thumbnailUrls: [],
    edited: false,
  }
}


/**
 * 检测 ROI 区域是否为纯色（方差低于阈值）。
 * 优化：复用 extractFrameMetrics 消除重复的像素遍历+方差计算逻辑。
 * Exported for unit testing.
 */
export function isRoiRegionLikelyEmpty(
  frameData: { data: Uint8ClampedArray; width: number; height: number },
  roi: { x: number; y: number; width: number; height: number },
  threshold = 100,
): boolean {
  const { width, height } = frameData
  // ROI 完全越界时直接返回
  // 优化：复用 @/utils/image 的 normalizeROI，消除重复实现
  const { x0, y0, xEnd, yEnd } = normalizeROI(roi, width, height)
  if (xEnd <= x0 || yEnd <= y0) return false

  const metrics = extractFrameMetrics(frameData, roi)
  return metrics.variance < threshold
}

export function useSubtitleExtractor() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()
  const videoPlayer = useVideoPlayer()
  const ocrEngine = useOCREngine()
  const calibrator = getCalibrator()

  // ─── 状态 ───────────────────────────────────────────────────
  const isExtracting = ref(false)
  const isPaused = ref(false)
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  const extractedCount = ref(0)

  // ─── 管道实例（延迟创建）──────────────────────────────────
  let pipeline: Pipeline | null = null
  let sceneDetector: SceneDetect | null = null

  // ─── 提取主循环 ───────────────────────────────────────────
  async function startExtraction() {
    if (!projectStore.videoMeta) {
      throw new Error(ERR_NO_VIDEO)
    }

    const opts = projectStore.extractOptions
    const roi = projectStore.selectedROI
    const frameInterval = opts.frameInterval

    // 初始化管道
    pipeline = new Pipeline({
      jitterMinDuration: 0.3,
      jitterMaxConfidence: opts.confidenceThreshold,
      splitMaxGap: 1.5,
      splitSimilarityThreshold: opts.mergeThreshold,
      similarMaxGap: 0.5,
      similarSimilarityThreshold: opts.mergeThreshold,
    })

    // 初始化场景检测器
    sceneDetector = new SceneDetect({
      threshold: opts.sceneThreshold,
    })

    isExtracting.value = true
    isPaused.value = false
    extractedCount.value = 0
    totalFrames.value = projectStore.videoMeta.totalFrames

    // 提取循环外预计算（避免每帧重复计算）
    const fps = projectStore.videoMeta.fps
    const lang = opts.languages[0]
    const confThreshold = opts.confidenceThreshold

    // 统一的校准+验证 — 提升到循环外，避免每帧重新创建函数对象
    const _calibrateAndValidate = (
      text: string,
      confidence: number,
    ): { text: string; confidence: number } | null => {
      const trimmed = text.trim()
      if (!trimmed) return null
      const { confidence: calibrated } = calibrator.calibrateEnhanced(
        trimmed, confidence, langToScript(lang),
      )
      if (calibrated < confThreshold) return null
      return { text: trimmed, confidence: calibrated }
    }

    // 构建 OCR 配置
    const ocrConfig: OCRConfig = {
      engine: opts.ocrEngine,
      language: opts.languages,
      confidenceThreshold: opts.confidenceThreshold,
    }

    // 初始化 OCR 引擎
    await ocrEngine.init(ocrConfig.engine, ocrConfig.language)

    subtitleStore.startExtraction()

    // 原始字幕收集（未经后处理）
    const rawSubs: SubtitleLite[] = []
    let prevFrameData: ImageData | null = null

    for (let frameIndex = 0; frameIndex < totalFrames.value; frameIndex++) {
      // ── 暂停/停止检查 ──────────────────────────────────
      if (!isExtracting.value) break
      while (isPaused.value && isExtracting.value) {
        const resumed = await sleepWithAbort(100)
        if (!resumed) break  // was cancelled via stop
      }
      if (!isExtracting.value) break

      // ── 帧间隔跳帧（优先检查，避免无效帧捕获）───────────
      if (frameIndex % opts.frameInterval !== 0) {
        continue
      }

      // ── 捕获帧 ───────────────────────────────────────
      const frameData = videoPlayer.captureFrame()
      if (!frameData) continue

      // ── ROI 预检测：跳过全黑/低方差帧（无字幕概率高）───
      let skipFrame = false
      try {
        if (isRoiRegionLikelyEmpty(frameData, roi)) {
          prevFrameData = frameData
          skipFrame = true
        }
      } catch (e) {
        console.warn(`[Extractor] ROI check failed for frame ${frameIndex}, skipping:`, e)
        skipFrame = true
      }
      if (skipFrame) continue

      // ── 场景变化检测 ────────────────────────────────────
      try {
        if (prevFrameData && !sceneDetector.detect(prevFrameData, frameData)) {
          prevFrameData = frameData
          continue
        }
      } catch (e) {
        console.warn(`[Extractor] Scene detection failed for frame ${frameIndex}, skipping:`, e)
        prevFrameData = frameData
        continue
      }

      // ── OCR 识别 ─────────────────────────────────────
      try {
        let result: { text: string; confidence: number } | null = null

        if (opts.multiPass && opts.postProcess) {
          // 多通道 OCR
          const passes = await ocrEngine.processMultiPass(frameData, ocrConfig, {
            multiPass: true,
            preprocessMode: 'subtitle',
          })
          const mergedWords = passes ?? []
          const fullText = mergedWords.map(r => r.text).join(' ')
          const avgConf = mergedWords.length > 0
            ? mergedWords.reduce((s, r) => s + r.confidence, 0) / mergedWords.length
            : 0
          result = _calibrateAndValidate(fullText, avgConf)
        } else {
          // 单次 OCR
          const singleResult = await ocrEngine.processROI(frameData, roi, ocrConfig)
          result = _calibrateAndValidate(singleResult.text, singleResult.confidence)
        }

        if (result) {
          const timestamp = frameIndex / fps
          const frameDuration = Math.max(frameInterval / fps, 2)

          rawSubs.push({
            startTime: timestamp,
            endTime: timestamp + frameDuration,
            startFrame: frameIndex,
            endFrame: frameIndex,
            text: result.text,
            confidence: result.confidence,
          })
          extractedCount.value++
        }
      } catch (e) {
        console.error(`[Extractor] Frame ${frameIndex} OCR failed:`, e)
      }

      // ── 进度更新 ─────────────────────────────────────
      subtitleStore.updateExtractionProgress(frameIndex, totalFrames.value)
      currentFrame.value = frameIndex
      prevFrameData = frameData
    }

    // ── 后处理管道 ─────────────────────────────────────────
    if (opts.mergeSubtitles && rawSubs.length > 0) {
      const cleaned = pipeline.process(rawSubs)
      subtitleStore.setSubtitles(
        cleaned.map((s, i) =>
          createSubtitleItem(s, i, opts.languages[0], roi, 'sub-')
        )
      )
    } else {
      // 无需后处理，直接设置
      subtitleStore.setSubtitles(
        rawSubs.map((s, i) =>
          createSubtitleItem(s, i, opts.languages[0], roi, `sub-raw-`)
        )
      )
    }

    // ── AI Correction（可选）─────────────────────────────────
    if (opts.aiCorrection && subtitleStore.subtitles.length > 0) {
      try {
        const corrector = new AICorrector({
          apiEndpoint: opts.aiEndpoint,
          apiKey: opts.aiApiKey,
          model: opts.aiModel,
          temperature: 0.3,
          maxTokens: 1000,
        })

        const texts = subtitleStore.subtitles.map(s => s.text)
        const results = await corrector.correctBatch(texts)

        // Apply corrections with confidence threshold
        for (let i = 0; i < subtitleStore.subtitles.length; i++) {
          if (results[i].confidence > 0.7) {
            subtitleStore.subtitles[i].text = results[i].corrected
          }
        }
        console.log(`[Extractor] AI correction applied to ${results.filter(r => r.confidence > 0.7).length} subtitles`)
      } catch (e) {
        console.error('[Extractor] AI correction failed:', e)
      }
    }

    subtitleStore.finishExtraction()
    isExtracting.value = false

    // 清理
    pipeline.clearCache()
    sceneDetector.reset()
    await ocrEngine.terminate()
  }

  function pauseExtraction() {
    isPaused.value = true
  }

  function resumeExtraction() {
    isPaused.value = false
  }

  function stopExtraction() {
    isExtracting.value = false
    isPaused.value = false
    subtitleStore.finishExtraction()
  }

  /** Interruptible sleep — checks stop flag on each tick to allow cancellation. */
  async function sleepWithAbort(ms: number): Promise<boolean> {
    const interval = 100
    for (let elapsed = 0; elapsed < ms; elapsed += interval) {
      if (!isExtracting.value) return false  // cancelled
      await new Promise(resolve => setTimeout(resolve, Math.min(interval, ms - elapsed)))
    }
    return true
  }


  return {
    isExtracting,
    isPaused,
    currentFrame,
    totalFrames,
    extractedCount,
    startExtraction,
    pauseExtraction,
    resumeExtraction,
    stopExtraction,
    isRoiRegionLikelyEmpty,
  }
}
