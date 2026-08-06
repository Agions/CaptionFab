/**
 * @file OCREngineFactory.ts
 * @description OCR 引擎简单工厂类，用于根据配置创建与切换本地 OCR 和云端 OCR Provider。
 */

import type { IOCREngineProvider, OCRConfig } from './IOCREngine';
import { LocalOCREngine } from './LocalOCREngine';
import { CloudOCREngine } from './CloudOCREngine';

export class OCREngineFactory {
  private static instanceMap = new Map<string, IOCREngineProvider>();

  /**
   * 获取或初始化对应的 OCR 引擎实例
   */
  public static async getEngine(config: OCRConfig): Promise<IOCREngineProvider> {
    const key = config.mode;
    let engine = this.instanceMap.get(key);

    if (!engine) {
      if (config.mode === 'cloud') {
        engine = new CloudOCREngine();
      } else {
        engine = new LocalOCREngine();
      }
      this.instanceMap.set(key, engine);
    }

    await engine.initialize(config);
    return engine;
  }

  /**
   * 释放所有已经实例化的 OCR 引擎
   */
  public static async destroyAll(): Promise<void> {
    for (const engine of this.instanceMap.values()) {
      await engine.destroy();
    }
    this.instanceMap.clear();
  }
}
