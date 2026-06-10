import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'
import { LOCALSTORAGE_KEY_SETTINGS } from '@/utils/constants'

// Mock localStorage for Node test environment
function mockLocalStorage() {
  const store: Record<string, string> = {}
  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { for (const k in store) delete store[k] }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
  // Expose the raw store for test assertions
  ;(localStorageMock as any)._store = store
  return localStorageMock
}

describe('useSettingsStore', () => {
  let ls: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    ls = mockLocalStorage()
    vi.stubGlobal('localStorage', ls)
    setActivePinia(createPinia())
  })

  // ─── Initial State ──────────────────────────────────────────────────

  it('has default theme "dark"', () => {
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('dark')
  })

  it('has default language "zh-CN"', () => {
    const store = useSettingsStore()
    expect(store.settings.language).toBe('zh-CN')
  })

  it('has default autoSave true', () => {
    const store = useSettingsStore()
    expect(store.settings.autoSave).toBe(true)
  })

  it('has default autoSaveInterval 60', () => {
    const store = useSettingsStore()
    expect(store.settings.autoSaveInterval).toBe(60)
  })

  it('has default showThumbnails true', () => {
    const store = useSettingsStore()
    expect(store.settings.showThumbnails).toBe(true)
  })

  it('has default confirmDelete true', () => {
    const store = useSettingsStore()
    expect(store.settings.confirmDelete).toBe(true)
  })

  it('has default maxHistory 50', () => {
    const store = useSettingsStore()
    expect(store.settings.maxHistory).toBe(50)
  })

  // ─── Loading from localStorage ──────────────────────────────────────

  it('loads saved settings from localStorage', () => {
    const saved = {
      theme: 'light',
      language: 'en-US',
      autoSave: false,
      autoSaveInterval: 120,
      showThumbnails: false,
      confirmDelete: false,
      maxHistory: 100,
    }
    ls.setItem(LOCALSTORAGE_KEY_SETTINGS, JSON.stringify(saved))
    // Re-create pinia so store re-initializes with the mocked localStorage
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('light')
    expect(store.settings.language).toBe('en-US')
    expect(store.settings.autoSave).toBe(false)
    expect(store.settings.maxHistory).toBe(100)
  })

  it('falls back to defaults for missing keys in saved settings', () => {
    const partial = { theme: 'light' }
    ls.setItem(LOCALSTORAGE_KEY_SETTINGS, JSON.stringify(partial))
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('light')
    // Missing keys should be defaults
    expect(store.settings.language).toBe('zh-CN')
    expect(store.settings.autoSave).toBe(true)
    expect(store.settings.maxHistory).toBe(50)
  })

  it('uses defaults when localStorage is empty', () => {
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('dark')
    expect(store.settings.language).toBe('zh-CN')
  })

  it('uses defaults when localStorage has invalid JSON', () => {
    ls.setItem(LOCALSTORAGE_KEY_SETTINGS, '{invalid json')
    setActivePinia(createPinia())
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('dark')
  })

  // ─── updateSetting ──────────────────────────────────────────────────

  it('updateSetting changes a single property', () => {
    const store = useSettingsStore()
    store.updateSetting('theme', 'light')
    expect(store.settings.theme).toBe('light')
  })

  it('updateSetting changes language', () => {
    const store = useSettingsStore()
    store.updateSetting('language', 'en-US')
    expect(store.settings.language).toBe('en-US')
  })

  it('updateSetting changes autoSaveInterval', () => {
    const store = useSettingsStore()
    store.updateSetting('autoSaveInterval', 30)
    expect(store.settings.autoSaveInterval).toBe(30)
  })

  it('updateSetting changes maxHistory', () => {
    const store = useSettingsStore()
    store.updateSetting('maxHistory', 200)
    expect(store.settings.maxHistory).toBe(200)
  })

  it('updateSetting changes showThumbnails', () => {
    const store = useSettingsStore()
    store.updateSetting('showThumbnails', false)
    expect(store.settings.showThumbnails).toBe(false)
  })

  it('updateSetting changes confirmDelete', () => {
    const store = useSettingsStore()
    store.updateSetting('confirmDelete', false)
    expect(store.settings.confirmDelete).toBe(false)
  })

  // ─── toggleTheme ────────────────────────────────────────────────────

  it('toggleTheme switches dark to light', () => {
    const store = useSettingsStore()
    expect(store.settings.theme).toBe('dark')
    store.toggleTheme()
    expect(store.settings.theme).toBe('light')
  })

  it('toggleTheme switches light back to dark', () => {
    const store = useSettingsStore()
    store.toggleTheme() // dark -> light
    store.toggleTheme() // light -> dark
    expect(store.settings.theme).toBe('dark')
  })

  it('toggleTheme works repeatedly', () => {
    const store = useSettingsStore()
    for (let i = 0; i < 10; i++) {
      store.toggleTheme()
    }
    // 10 toggles = back to dark
    expect(store.settings.theme).toBe('dark')
  })

  // ─── resetSettings ──────────────────────────────────────────────────

  it('resetSettings restores all defaults', () => {
    const store = useSettingsStore()
    store.updateSetting('theme', 'light')
    store.updateSetting('language', 'en-US')
    store.updateSetting('autoSave', false)
    store.updateSetting('maxHistory', 999)
    store.resetSettings()
    expect(store.settings.theme).toBe('dark')
    expect(store.settings.language).toBe('zh-CN')
    expect(store.settings.autoSave).toBe(true)
    expect(store.settings.maxHistory).toBe(50)
    expect(store.settings.showThumbnails).toBe(true)
    expect(store.settings.confirmDelete).toBe(true)
    expect(store.settings.autoSaveInterval).toBe(60)
  })

  // ─── Persistence (localStorage write) ──────────────────────────────

  it('persists settings to localStorage on change', async () => {
    const store = useSettingsStore()
    store.updateSetting('theme', 'light')
    // The store uses a debounced save (100ms), so we wait for it
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(ls.setItem).toHaveBeenCalledWith(
      LOCALSTORAGE_KEY_SETTINGS,
      expect.stringContaining('"theme":"light"'),
    )
  })
})
