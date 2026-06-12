/**
 * useAutoROI - Automatic subtitle region detection.
 *
 * Extracts a frame from the video and uses OpenCV edge detection
 * to find the subtitle region, then applies it as a custom ROI.
 */
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useProjectStore } from '@/stores/project'

export interface DetectedROI {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export function useAutoROI() {
  const projectStore = useProjectStore()
  const isDetecting = ref(false)
  const detectedROI = ref<DetectedROI | null>(null)
  const error = ref<string | null>(null)

  /**
   * Detect the subtitle region at the given timestamp.
   */
  async function detectROI(videoPath: string, timestamp: number): Promise<void> {
    isDetecting.value = true
    error.value = null
    detectedROI.value = null

    try {
      const result = await invoke<DetectedROI>('auto_detect_roi', {
        videoPath,
        timestamp,
      })
      detectedROI.value = result
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = msg
      console.error('Auto ROI detection failed:', msg)
    } finally {
      isDetecting.value = false
    }
  }

  /**
   * Apply the detected ROI as a custom ROI in the project store.
   */
  function applyDetectedROI(): void {
    if (!detectedROI.value) return

    projectStore.updateROI({
      id: 'custom',
      name: '自动检测',
      type: 'custom',
      x: detectedROI.value.x,
      y: detectedROI.value.y,
      width: detectedROI.value.width,
      height: detectedROI.value.height,
      unit: 'percent',
      enabled: true,
    })
  }

  return {
    isDetecting,
    detectedROI,
    error,
    detectROI,
    applyDetectedROI,
  }
}
