/**
 * useROI - ROI state
 * Extracted from SidePanel.vue ROI tab
 */
import { computed } from 'vue'
import { useVideoStore } from '@/stores/video'
import { ROI_PRESETS } from '@/types/video'

export function useROI() {
  const videoStore = useVideoStore()

  const roiPresets = ROI_PRESETS

  const selectedROI = computed(() => videoStore.selectedROI)

  function selectPreset(presetId: string) {
    videoStore.selectROIPreset(presetId)
  }

  return {
    roiPresets,
    selectedROI,
    selectPreset,
  }
}
