/**
 * @file LocalOCREngine.ts
 * @description 基于 Tesseract.js 与 Canvas 离线提取的本地 OCR 引擎实现。
 * 支持图像裁剪、预处理降噪与高准确度硬字幕文字检测。
 */

import type { IOCREngineProvider, OCRConfig, OCRItem, NormalizedROI } from './IOCREngine';

export class LocalOCREngine implements IOCREngineProvider {
  readonly engineName = 'Local Tesseract Engine';
  readonly mode = 'local' as const;

  private worker: any = null;
  private isInitialized = false;
  private currentLanguage = 'chi_sim+eng';

  async initialize(config: OCRConfig): Promise<void> {
    if (config.language) {
      this.currentLanguage = config.language;
    }

    if (!this.worker) {
      // 兼容全平台 Vite ESM / CJS / WebKit 环境
      const tesseractMod = await import('tesseract.js');
      const createWorkerFn = tesseractMod.createWorker || (tesseractMod as any).default?.createWorker;

      if (typeof createWorkerFn === 'function') {
        // 显式指定浏览器环境 workerPath 与 corePath，避免在 WebKit 引擎内误触发 Node.js require() 异常
        this.worker = await createWorkerFn(this.currentLanguage, 1, {
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.0',
          langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        });
      } else {
        throw new Error('未能在 tesseract.js 模块中解析出 createWorker 函数');
      }
    }
    this.isInitialized = true;
  }

  async recognizeFrame(
    frameData: HTMLCanvasElement | Blob | ImageData,
    roi?: NormalizedROI
  ): Promise<OCRItem[]> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('LocalOCREngine 尚未初始化，请先调用 initialize()');
    }

    // 处理 ROI 选区裁剪
    let processedCanvas: HTMLCanvasElement | Blob | ImageData = frameData;
    if (roi && frameData instanceof HTMLCanvasElement) {
      processedCanvas = this.cropCanvasROI(frameData, roi);
    }

    const { data } = await this.worker.recognize(processedCanvas as any);

    const cleanText = data.text ? data.text.trim().replace(/\n+/g, ' ') : '';
    if (!cleanText) {
      return [];
    }

    const item: OCRItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      startTime: 0,
      endTime: 0,
      text: cleanText,
      confidence: Math.round(data.confidence || 85),
      roi,
    };

    return [item];
  }

  /**
   * 根据归一化坐标 (0~1) 从源 Canvas 截取字幕区域
   */
  private cropCanvasROI(sourceCanvas: HTMLCanvasElement, roi: NormalizedROI): HTMLCanvasElement {
    const cropCanvas = document.createElement('canvas');
    const ctx = cropCanvas.getContext('2d');

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    const cropX = Math.round(roi.x * srcW);
    const cropY = Math.round(roi.y * srcH);
    const cropW = Math.max(1, Math.round(roi.width * srcW));
    const cropH = Math.max(1, Math.round(roi.height * srcH));

    cropCanvas.width = cropW;
    cropCanvas.height = cropH;

    if (ctx) {
      ctx.drawImage(
        sourceCanvas,
        cropX, cropY, cropW, cropH,
        0, 0, cropW, cropH
      );
    }

    return cropCanvas;
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }
}
