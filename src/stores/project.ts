/**
 * Project Store — CaptionFab
 * ============================
 * ⚠️ DEPRECATED — 建议直接使用 useVideoStore / useExtractionStore。
 *
 * 保持向后兼容的外观层，内部委托给 video store 和 extraction store。
 * 将在 v4.0 移除。
 *
 * @deprecated 改用 useVideoStore + useExtractionStore
 */

import { defineStore, storeToRefs } from 'pinia'
import { useVideoStore } from './video'
import { useExtractionStore } from './extraction'
import type { VideoMetadata, ROI, ExtractOptions, OCREngine, ProcessingMode } from '@/types/video'

export const useProjectStore = defineStore('project', () => {
  const video = useVideoStore()
  const extraction = useExtractionStore()

  // storeToRefs preserves reactive refs (Pinia auto-unwraps store props)
  const {
    videoPath, videoMeta, currentFrame, isPlaying, volume, isMuted, selectedROI,
    hasVideo, currentTime, duration, progress,
  } = storeToRefs(video)

  const { extractOptions } = storeToRefs(extraction)

  return {
    // ── Video State ──
    videoPath,
    videoMeta,
    currentFrame,
    isPlaying,
    volume,
    isMuted,
    selectedROI,

    // ── Extraction State ──
    extractOptions,

    // ── Computed ──
    hasVideo,
    currentTime,
    duration,
    progress,

    // ── Video Actions ──
    setVideo: video.setVideo,
    clearVideo: video.clearVideo,
    setCurrentFrame: video.setCurrentFrame,
    setPlaying: video.setPlaying,
    togglePlay: video.togglePlay,
    selectROIPreset: video.selectROIPreset,
    updateROI: video.updateROI,

    // ── Extraction Actions ──
    setOCROptions: extraction.setOCROptions,
    setOCREngine: extraction.setOCREngine,
    setLanguages: extraction.setLanguages,
  }
})
