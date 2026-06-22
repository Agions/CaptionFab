/**
 * useOCR - OCR 标签页状态
 * 优化：消除影子状态反模式 — 所有选项通过 computed get/set 直连 extractionStore，
 * 不再维护本地 ref 副本。confidenceThreshold 原有的正确模式扩展到全部属性。
 */
import { computed } from 'vue'
import { useExtractionStore } from '@/stores/extraction'
import type { OCREngine } from '@/types/video'
import { clamp } from '@/utils/math'

export interface OCREngineInfo {
  id: OCREngine
  name: string
  shortName: string
  tech: string
  recommended: boolean
  speed: string
  accuracy: string
  langs: number
  description: string
}

export function useOCR() {
  const extractionStore = useExtractionStore()

  // 引擎定义（只读数据，直接导出常量）
  const ocrEngines: OCREngineInfo[] = [
    {
      id: 'paddle',
      name: 'PaddleOCR',
      shortName: 'PP',
      tech: '深度学习',
      recommended: true,
      speed: '快',
      accuracy: '高',
      langs: 80,
      description: '支持80+语言，中文识别准确率95%+',
    },
    {
      id: 'tesseract',
      name: 'Tesseract.js',
      shortName: 'TS',
      tech: '传统算法',
      recommended: false,
      speed: '慢',
      accuracy: '中',
      langs: 100,
      description: '纯JS实现，无需外部依赖',
    },
    {
      id: 'easyocr',
      name: 'EasyOCR',
      shortName: 'EZ',
      tech: '深度学习',
      recommended: false,
      speed: '中',
      accuracy: '高',
      langs: 40,
      description: '支持40+语言，GPU加速',
    },
  ]

  const languageOptions = [
    { value: 'ch', label: '中文', abbr: '中' },
    { value: 'en', label: 'English', abbr: 'EN' },
    { value: 'ja', label: '日本語', abbr: '日' },
    { value: 'ko', label: '한국어', abbr: '한' },
    { value: 'fr', label: 'Français', abbr: 'FR' },
    { value: 'de', label: 'Deutsch', abbr: 'DE' },
    { value: 'es', label: 'Español', abbr: 'ES' },
    { value: 'pt', label: 'Português', abbr: 'PT' },
    { value: 'it', label: 'Italiano', abbr: 'IT' },
    { value: 'ru', label: 'Русский', abbr: 'RU' },
    { value: 'ar', label: 'العربية', abbr: 'AR' },
  ]

  // ─── 优化：所有选项通过 computed get/set 直连 store ──────────
  // 修复：消除影子状态反模式，不再维护本地 ref 副本
  // confidenceThreshold 原有模式扩展到全部属性

  const confidenceThreshold = computed({
    get: () => Math.round(extractionStore.extractOptions.confidenceThreshold * 100),
    set: (val: number) => {
      extractionStore.extractOptions.confidenceThreshold = val / 100
    },
  })

  const selectedEngine = computed({
    get: () => extractionStore.extractOptions.ocrEngine || 'paddle',
    set: (val: OCREngine) => {
      extractionStore.extractOptions.ocrEngine = val
    },
  })

  const multiPass = computed({
    get: () => extractionStore.extractOptions.multiPass,
    set: (val: boolean) => {
      extractionStore.extractOptions.multiPass = val
    },
  })

  const postProcess = computed({
    get: () => extractionStore.extractOptions.postProcess,
    set: (val: boolean) => {
      extractionStore.extractOptions.postProcess = val
    },
  })

  const mergeSubtitles = computed({
    get: () => extractionStore.extractOptions.mergeSubtitles,
    set: (val: boolean) => {
      extractionStore.extractOptions.mergeSubtitles = val
    },
  })

  const mergeThreshold = computed({
    get: () => extractionStore.extractOptions.mergeThreshold,
    set: (val: number) => {
      extractionStore.extractOptions.mergeThreshold = val
    },
  })

  const sceneThreshold = computed({
    get: () => extractionStore.extractOptions.sceneThreshold,
    set: (val: number) => {
      extractionStore.extractOptions.sceneThreshold = val
    },
  })

  const frameInterval = computed({
    get: () => extractionStore.extractOptions.frameInterval,
    set: (val: number) => {
      extractionStore.extractOptions.frameInterval = val
    },
  })

  // 预估准确率
  const estimatedAccuracy = computed(() => {
    const engine = selectedEngine.value
    const baseAccuracy = { paddle: 92, easyocr: 90, tesseract: 78 }[engine] ?? 80
    let adjusted = baseAccuracy
    if (multiPass.value) adjusted += 3
    if (postProcess.value) adjusted += 2
    return clamp(adjusted, 0, 99)
  })

  // 方法 — 简化为直接赋值
  function setLanguage(lang: string) {
    extractionStore.extractOptions.languages = [lang]
  }

  return {
    ocrEngines,
    selectedEngine,
    languageOptions,
    multiPass,
    postProcess,
    mergeSubtitles,
    mergeThreshold,
    sceneThreshold,
    frameInterval,
    confidenceThreshold,
    estimatedAccuracy,
    setLanguage,
  }
}
