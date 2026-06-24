import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { logger } from '@/utils/logger'

export interface GPUInfo {
  available: boolean
  deviceCount?: number
  memoryTotal?: number
  deviceName?: string
}

export function useGPU() {
  const gpuInfo = ref<GPUInfo>({ available: false })
  const isLoading = ref(false)

  async function checkGPU() {
    isLoading.value = true
    try {
      const result = await invoke<GPUInfo>('check_gpu_capability')
      gpuInfo.value = result
    } catch (e) {
      logger.error('GPU', 'Check failed', e)
      gpuInfo.value = { available: false }
    } finally {
      isLoading.value = false
    }
  }

  function formatMemory(bytes?: number): string {
    if (!bytes) return '未知'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  onMounted(() => checkGPU())

  return { gpuInfo, isLoading, checkGPU, formatMemory }
}
