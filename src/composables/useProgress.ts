/**
 * useProgress - Progress state
 * Extracted from SidePanel.vue Progress tab
 */
import { computed } from 'vue'
import { useVideoStore } from '@/stores/video'
import { useExtractionStore } from '@/stores/extraction'
import { useSubtitleStore } from '@/stores/subtitle'

export function useProgress() {
  const videoStore = useVideoStore()
  const extractionStore = useExtractionStore()
  const subtitleStore = useSubtitleStore()

  // Computed stats
  const fps = computed(() => videoStore.videoMeta?.fps ?? 0)
  const resolution = computed(() => {
    if (!videoStore.videoMeta) return 'N/A'
    return `${videoStore.videoMeta.width} × ${videoStore.videoMeta.height}`
  })

  const memoryUsage = computed(() => {
    const subCount = subtitleStore.subtitles.length
    return `${(subCount * 1).toFixed(1)} KB`
  })

  const extractSpeed = computed(() => {
    if (!videoStore.videoMeta || !extractionStore.extractOptions.frameInterval) return '0 fps'
    const effectiveFps = fps.value / extractionStore.extractOptions.frameInterval
    return `${effectiveFps.toFixed(1)} fps`
  })

  return {
    fps,
    resolution,
    memoryUsage,
    extractSpeed,
  }
}
