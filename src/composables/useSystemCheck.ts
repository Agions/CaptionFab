import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { logger } from '@/utils/logger'

export interface SystemDependency {
  name: string
  installed: boolean
  version?: string
  error?: string
}

export interface SystemCheckResult {
  all_satisfied: boolean
  dependencies: SystemDependency[]
  recommendations: string[]
}

export function useSystemCheck() {
  const isChecking = ref(false)
  const lastResult = ref<SystemCheckResult | null>(null)
  const error = ref<string | null>(null)

  /**
   * Check all system dependencies (ffmpeg, ffprobe, tesseract, ImageMagick)
   */
  async function checkDependencies(): Promise<SystemCheckResult | null> {
    isChecking.value = true
    error.value = null

    try {
      const result = await invoke<SystemCheckResult>('check_system_dependencies')
      lastResult.value = result
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      logger.error('SystemCheck', 'Failed to check dependencies', e)
      return null
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Get list of installed Tesseract languages
   */
  async function getTesseractLanguages(): Promise<string[]> {
    try {
      const languages = await invoke<string[]>('get_tesseract_languages')
      return languages
    } catch (e) {
      logger.error('SystemCheck', 'Failed to get Tesseract languages', e)
      return ['eng', 'chi_sim'] // Fallback
    }
  }

  /**
   * Check if a specific dependency is available
   */
  function isDependencyInstalled(name: string): boolean {
    if (!lastResult.value) return false
    const dep = lastResult.value.dependencies.find(d => d.name === name)
    return dep?.installed ?? false
  }

  /**
   * Get version of a specific dependency
   */
  function getDependencyVersion(name: string): string | null {
    if (!lastResult.value) return null
    const dep = lastResult.value.dependencies.find(d => d.name === name)
    return dep?.version ?? null
  }

  /**
   * Get user-friendly status message
   */
  function getStatusMessage(): string {
    if (!lastResult.value) {
      return 'System check not yet run'
    }

    if (lastResult.value.all_satisfied) {
      return 'All required dependencies are installed ✓'
    }

    const missing = lastResult.value.dependencies
      .filter(d => !d.installed)
      .map(d => d.name)

    return `Missing dependencies: ${missing.join(', ')}`
  }

  return {
    isChecking,
    lastResult,
    error,
    checkDependencies,
    getTesseractLanguages,
    isDependencyInstalled,
    getDependencyVersion,
    getStatusMessage
  }
}
