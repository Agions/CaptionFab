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

    try {
      // 获取对应的 OCR 引擎实例
      const ocrEngine = await OCREngineFactory.getEngine(config);

      const duration = videoElement.duration || 10;
      const stepSeconds = 1.5; // 每 1.5 秒抽一帧
      const totalSteps = Math.floor(duration / stepSeconds);

      const originalTime = videoElement.currentTime;

      // 隐式 offscreen canvas 抽取帧
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      for (let step = 0; step < totalSteps; step++) {
        if (this.isCancelRequested) break;

        const targetTime = step * stepSeconds;
        videoElement.currentTime = targetTime;

        // 等待 seek 完毕
        await new Promise((resolve) => setTimeout(resolve, 80));

        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const results = await ocrEngine.recognizeFrame(canvas, roi);

          if (results && results.length > 0) {
            results.forEach((r) => {
              r.startTime = Math.round(targetTime * 1000);
              r.endTime = Math.round((targetTime + stepSeconds) * 1000);
            });
            subtitleStore.addSubtitles(results);
          }
        }

        const percent = Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
        subtitleStore.progressPercent = percent;
        onProgress?.(percent);
      }

      // 恢复原播放位置
      videoElement.currentTime = originalTime;
    } catch (err: any) {
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
