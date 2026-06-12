/**
 * Video Store — CaptionFab
 * =========================
 * 纯视频状态管理：视频路径、元数据、播放控制。
 *
 * 从 project.ts 拆出，遵循单⼀职责原则。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VideoMetadata, ROI } from '@/types/video'
import { ROI_PRESETS } from '@/types/video'
import { clamp } from '@/utils/math'
import {
  DEFAULT_ROI_NAME,
  DEFAULT_ROI_Y,
  DEFAULT_ROI_HEIGHT,
} from '@/utils/constants'

export const useVideoStore = defineStore('video', () => {
  // State
  const videoPath = ref<string | null>(null)
  const videoMeta = ref<VideoMetadata | null>(null)
  const currentFrame = ref(0)
  const isPlaying = ref(false)
  const volume = ref(1)
  const isMuted = ref(false)

  // Active blob URL — tracked separately so it can be revoked on video switch/clear
  let _activeBlobUrl: string | null = null

  // ROI State
  const selectedROI = ref<ROI>({
    id: 'bottom',
    name: DEFAULT_ROI_NAME,
    type: 'bottom',
    x: 0,
    y: DEFAULT_ROI_Y,
    width: 100,
    height: DEFAULT_ROI_HEIGHT,
    unit: 'percent',
    enabled: true,
  })

  // Computed
  const hasVideo = computed(() => videoPath.value !== null)

  const currentTime = computed(() => {
    if (!videoMeta.value) return 0
    return currentFrame.value / videoMeta.value.fps
  })

  const duration = computed(() => videoMeta.value?.duration ?? 0)

  const progress = computed(() => {
    if (!videoMeta.value || videoMeta.value.totalFrames === 0) return 0
    return (currentFrame.value / videoMeta.value.totalFrames) * 100
  })

  // Actions
  function setVideo(path: string, meta: VideoMetadata) {
    if (_activeBlobUrl && path !== _activeBlobUrl) {
      URL.revokeObjectURL(_activeBlobUrl)
    }
    _activeBlobUrl = path
    videoPath.value = path
    videoMeta.value = meta
    currentFrame.value = 0
  }

  function clearVideo() {
    if (_activeBlobUrl) {
      URL.revokeObjectURL(_activeBlobUrl)
      _activeBlobUrl = null
    }
    videoPath.value = null
    videoMeta.value = null
    currentFrame.value = 0
    isPlaying.value = false
  }

  function setCurrentFrame(frame: number) {
    if (!videoMeta.value) return
    currentFrame.value = clamp(frame, 0, videoMeta.value.totalFrames - 1)
  }

  function setPlaying(playing: boolean) {
    isPlaying.value = playing
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function selectROIPreset(presetId: string) {
    const preset = ROI_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      selectedROI.value = {
        ...preset.rect,
        id: preset.id,
        name: preset.name,
        type: preset.id as ROI['type'],
        enabled: true,
      }
    }
  }

  function updateROI(updates: Partial<ROI>) {
    selectedROI.value = { ...selectedROI.value, ...updates }
  }

  return {
    videoPath,
    videoMeta,
    currentFrame,
    isPlaying,
    volume,
    isMuted,
    selectedROI,
    hasVideo,
    currentTime,
    duration,
    progress,
    setVideo,
    clearVideo,
    setCurrentFrame,
    setPlaying,
    togglePlay,
    selectROIPreset,
    updateROI,
  }
})
