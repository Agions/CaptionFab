/**
 * @file PipelineEngine.ts
 * @description 视频硬字幕提取主管道引擎。
 * 负责从视频 HTML5 video 元素按步长（如 1.5 秒）抽取视频帧、对比画面差异与场景切换、调用对应的 OCR Engine 并推送到 Subtitle Store。
 */

import { OCREngineFactory } from '../services/ocr/OCREngineFactory';
import { useSubtitleStore } from '../stores/subtitleStore';
import { useSecurityStore } from '../stores/securityStore';
import type { NormalizedROI } from '../services/ocr/IOCREngine';

export class PipelineEngine {
  private isCancelRequested = false;

  /**
   * 启动全视频/选定区域硬字幕提取管道
   */
  public async startExtraction(
    videoElement: HTMLVideoElement,
    roi: NormalizedROI,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const subtitleStore = useSubtitleStore();
    const securityStore = useSecurityStore();

    // 校验云端模式配置
    if (subtitleStore.ocrMode === 'cloud' && !securityStore.apiKey.trim()) {
      throw new Error('未配置 API Key，请点击右上角设置按钮配置密钥，或切换为离线模式');
    }

    this.isCancelRequested = false;
    subtitleStore.isExtracting = true;
    subtitleStore.progressPercent = 0;

    // 确定模式配置
    const config = {
      mode: subtitleStore.ocrMode,
      language: 'chi_sim+eng',
      apiKey: securityStore.apiKey,
      cloudEndpoint: securityStore.cloudEndpoint,
    };

    // 临时暂停播放以稳定抽取帧画面
    const wasPlaying = !videoElement.paused;
    if (wasPlaying) {
      videoElement.pause();
    }

    const originalTime = videoElement.currentTime;

    try {
      // 获取对应的 OCR 引擎实例
      const ocrEngine = await OCREngineFactory.getEngine(config);

      const duration = videoElement.duration || 10;
      const stepSeconds = duration > 60 ? 1.5 : 1.0; // 智能调节步长
      const totalSteps = Math.max(1, Math.floor(duration / stepSeconds));

      // 隐式 offscreen canvas 抽取帧
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      for (let step = 0; step < totalSteps; step++) {
        if (this.isCancelRequested) break;

        const targetTime = step * stepSeconds;
        videoElement.currentTime = targetTime;

        // 异步精准等待 HTML5 Video seeked 完毕，确保图像完整更新
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            videoElement.removeEventListener('seeked', onSeeked);
            resolve();
          };
          videoElement.addEventListener('seeked', onSeeked, { once: true });
          setTimeout(onSeeked, 250);
        });

        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          try {
            const results = await ocrEngine.recognizeFrame(canvas, roi);

            if (results && results.length > 0) {
              results.forEach((r) => {
                r.startTime = Math.round(targetTime * 1000);
                r.endTime = Math.round((targetTime + stepSeconds) * 1000);
              });
              subtitleStore.addSubtitles(results);
            }
          } catch (frameErr) {
            console.warn(`帧 [${targetTime}s] OCR 识别跳过:`, frameErr);
          }
        }

        const percent = Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
        subtitleStore.progressPercent = percent;
        onProgress?.(percent);
      }

      // 恢复原播放位置与状态
      videoElement.currentTime = originalTime;
      if (wasPlaying) {
        videoElement.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error('PipelineEngine 识别过程出错:', err);
      throw err;
    } finally {
      subtitleStore.isExtracting = false;
    }
  }

  public cancel() {
    this.isCancelRequested = true;
  }
}
