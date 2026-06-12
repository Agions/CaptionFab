/**
 * Extraction Store — CaptionFab
 * ==============================
 * 提取配置管理：OCR 引擎、语言、处理模式、AI 校正等。
 *
 * 从 project.ts 拆出，遵循单一职责原则。
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ExtractOptions, OCREngine, ProcessingMode } from '@/types/video'
import {
  DEFAULT_OCR_ENGINE,
  DEFAULT_LANGUAGES,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MERGE_THRESHOLD,
  DEFAULT_SCENE_THRESHOLD,
  DEFAULT_FRAME_INTERVAL,
} from '@/utils/constants'

function defaultExtractOptions(): ExtractOptions {
  return {
    ocrEngine: DEFAULT_OCR_ENGINE,
    languages: [...DEFAULT_LANGUAGES],
    confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
    processingMode: 'standard' as ProcessingMode,
    multiPass: true,
    postProcess: true,
    mergeSubtitles: true,
    mergeThreshold: DEFAULT_MERGE_THRESHOLD,
    sceneThreshold: DEFAULT_SCENE_THRESHOLD,
    frameInterval: DEFAULT_FRAME_INTERVAL,
    // AI Correction
    aiCorrection: false,
    aiEndpoint: 'http://localhost:11434/v1/chat/completions',
    aiApiKey: '',
    aiModel: 'llama3',
  }
}

export const useExtractionStore = defineStore('extraction', () => {
  const extractOptions = ref<ExtractOptions>(defaultExtractOptions())

  function setOCROptions(options: Partial<ExtractOptions>) {
    extractOptions.value = { ...extractOptions.value, ...options }
  }

  function setOCREngine(engine: OCREngine) {
    extractOptions.value.ocrEngine = engine
  }

  function setLanguages(langs: string[]) {
    extractOptions.value.languages = langs
  }

  function resetOptions() {
    extractOptions.value = defaultExtractOptions()
  }

  return {
    extractOptions,
    setOCROptions,
    setOCREngine,
    setLanguages,
    resetOptions,
  }
})
