/**
 * core/ — CaptionFab 核心业务逻辑模块
 *
 * 子模块：
 * - Pipeline         后处理管道（4阶段清洗）
 * - SceneDetect     场景变化检测
 * - Exporter        多格式导出引擎
 * - Calibrator       置信度校准
 */

// Re-export all public APIs
export { Pipeline } from './Pipeline'
export type { PipelineOptions } from './Pipeline'

export { SceneDetect } from './SceneDetect'
export type { SceneDetectOptions } from './SceneDetect'

export { Exporter, getExporter } from './Exporter'
export type { ExportFormat } from '@/types/subtitle'

export { Calibrator, getCalibrator, langToScript } from './Calibrator'

export { AICorrector } from './AICorrector'

export { Translator } from './Translator'
export type { TranslatorConfig } from '@/core/Translator'
