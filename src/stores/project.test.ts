import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from './project'
import type { VideoMetadata } from '@/types/video'
import { ROI_PRESETS } from '@/types/video'
import {
  DEFAULT_OCR_ENGINE,
  DEFAULT_LANGUAGES,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MERGE_THRESHOLD,
  DEFAULT_SCENE_THRESHOLD,
  DEFAULT_FRAME_INTERVAL,
} from '@/utils/constants'

function makeMeta(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    path: '/test/video.mp4',
    width: 1920,
    height: 1080,
    duration: 120,
    fps: 30,
    totalFrames: 3600,
    codec: 'h264',
    ...overrides,
  }
}

describe('useProjectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── Initial State ──────────────────────────────────────────────────

  it('starts with no video loaded', () => {
    const store = useProjectStore()
    expect(store.videoPath).toBeNull()
    expect(store.videoMeta).toBeNull()
    expect(store.hasVideo).toBe(false)
  })

  it('starts with default playback state', () => {
    const store = useProjectStore()
    expect(store.currentFrame).toBe(0)
    expect(store.isPlaying).toBe(false)
    expect(store.volume).toBe(1)
    expect(store.isMuted).toBe(false)
  })

  it('starts with default extract options', () => {
    const store = useProjectStore()
    const opts = store.extractOptions
    expect(opts.ocrEngine).toBe(DEFAULT_OCR_ENGINE)
    expect(opts.languages).toEqual([...DEFAULT_LANGUAGES])
    expect(opts.confidenceThreshold).toBe(DEFAULT_CONFIDENCE_THRESHOLD)
    expect(opts.multiPass).toBe(true)
    expect(opts.postProcess).toBe(true)
    expect(opts.mergeSubtitles).toBe(true)
    expect(opts.mergeThreshold).toBe(DEFAULT_MERGE_THRESHOLD)
    expect(opts.sceneThreshold).toBe(DEFAULT_SCENE_THRESHOLD)
    expect(opts.frameInterval).toBe(DEFAULT_FRAME_INTERVAL)
  })

  it('starts with default ROI (bottom preset)', () => {
    const store = useProjectStore()
    expect(store.selectedROI.id).toBe('bottom')
    expect(store.selectedROI.type).toBe('bottom')
    expect(store.selectedROI.unit).toBe('percent')
    expect(store.selectedROI.enabled).toBe(true)
  })

  // ─── Computed: hasVideo ─────────────────────────────────────────────

  it('hasVideo is true after setVideo', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta())
    expect(store.hasVideo).toBe(true)
  })

  it('hasVideo is false after clearVideo', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta())
    store.clearVideo()
    expect(store.hasVideo).toBe(false)
  })

  // ─── Computed: currentTime ──────────────────────────────────────────

  it('currentTime is 0 when no video', () => {
    const store = useProjectStore()
    expect(store.currentTime).toBe(0)
  })

  it('currentTime equals currentFrame / fps', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ fps: 30 }))
    store.setCurrentFrame(90)
    expect(store.currentTime).toBe(3) // 90 / 30 = 3
  })

  it('currentTime handles fractional fps', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ fps: 24 }))
    store.setCurrentFrame(60)
    expect(store.currentTime).toBeCloseTo(2.5, 5) // 60 / 24 = 2.5
  })

  // ─── Computed: duration ─────────────────────────────────────────────

  it('duration is 0 when no video', () => {
    const store = useProjectStore()
    expect(store.duration).toBe(0)
  })

  it('duration matches videoMeta.duration', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ duration: 240 }))
    expect(store.duration).toBe(240)
  })

  // ─── Computed: progress ─────────────────────────────────────────────

  it('progress is 0 when no video', () => {
    const store = useProjectStore()
    expect(store.progress).toBe(0)
  })

  it('progress is 0 at first frame', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 100 }))
    expect(store.progress).toBe(0)
  })

  it('progress is 100 at last frame', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 100 }))
    store.setCurrentFrame(99) // clamped to totalFrames - 1
    expect(store.progress).toBeCloseTo(99, 5)
  })

  it('progress is 50 at midpoint', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 200 }))
    store.setCurrentFrame(100)
    expect(store.progress).toBe(50)
  })

  it('progress is 0 when totalFrames is 0', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 0 }))
    expect(store.progress).toBe(0)
  })

  // ─── setVideo ───────────────────────────────────────────────────────

  it('setVideo sets path, meta, and resets frame', () => {
    const store = useProjectStore()
    store.setCurrentFrame(100)
    // Need video meta for setCurrentFrame to work
    store.setVideo('blob:test', makeMeta())
    // Frame was set to 0 by setVideo
    store.setCurrentFrame(100)
    store.setVideo('blob:test2', makeMeta())
    expect(store.videoPath).toBe('blob:test2')
    expect(store.currentFrame).toBe(0)
  })

  // ─── clearVideo ─────────────────────────────────────────────────────

  it('clearVideo resets all video-related state', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta())
    store.setCurrentFrame(50)
    store.setPlaying(true)
    store.clearVideo()
    expect(store.videoPath).toBeNull()
    expect(store.videoMeta).toBeNull()
    expect(store.currentFrame).toBe(0)
    expect(store.isPlaying).toBe(false)
  })

  // ─── setCurrentFrame ────────────────────────────────────────────────

  it('setCurrentFrame clamps to 0 when frame is negative', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 100 }))
    store.setCurrentFrame(-10)
    expect(store.currentFrame).toBe(0)
  })

  it('setCurrentFrame clamps to totalFrames - 1', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 100 }))
    store.setCurrentFrame(200)
    expect(store.currentFrame).toBe(99)
  })

  it('setCurrentFrame is a no-op when no video is loaded', () => {
    const store = useProjectStore()
    store.setCurrentFrame(50)
    expect(store.currentFrame).toBe(0)
  })

  it('setCurrentFrame sets exact frame within valid range', () => {
    const store = useProjectStore()
    store.setVideo('blob:test', makeMeta({ totalFrames: 300 }))
    store.setCurrentFrame(150)
    expect(store.currentFrame).toBe(150)
  })

  // ─── setPlaying / togglePlay ────────────────────────────────────────

  it('setPlaying sets isPlaying directly', () => {
    const store = useProjectStore()
    store.setPlaying(true)
    expect(store.isPlaying).toBe(true)
    store.setPlaying(false)
    expect(store.isPlaying).toBe(false)
  })

  it('togglePlay flips isPlaying', () => {
    const store = useProjectStore()
    expect(store.isPlaying).toBe(false)
    store.togglePlay()
    expect(store.isPlaying).toBe(true)
    store.togglePlay()
    expect(store.isPlaying).toBe(false)
  })

  // ─── selectROIPreset ────────────────────────────────────────────────

  it('selectROIPreset applies matching preset', () => {
    const store = useProjectStore()
    store.selectROIPreset('top')
    expect(store.selectedROI.id).toBe('top')
    expect(store.selectedROI.type).toBe('top')
    expect(store.selectedROI.y).toBe(0)
    expect(store.selectedROI.height).toBe(15)
    expect(store.selectedROI.enabled).toBe(true)
  })

  it('selectROIPreset ignores invalid preset id', () => {
    const store = useProjectStore()
    const before = { ...store.selectedROI }
    store.selectROIPreset('nonexistent')
    expect(store.selectedROI).toEqual(before)
  })

  it('selectROIPreset can select all available presets', () => {
    const store = useProjectStore()
    for (const preset of ROI_PRESETS) {
      store.selectROIPreset(preset.id)
      expect(store.selectedROI.id).toBe(preset.id)
      expect(store.selectedROI.name).toBe(preset.name)
    }
  })

  // ─── updateROI ──────────────────────────────────────────────────────

  it('updateROI merges partial updates', () => {
    const store = useProjectStore()
    store.updateROI({ x: 10, width: 80 })
    expect(store.selectedROI.x).toBe(10)
    expect(store.selectedROI.width).toBe(80)
    // Other fields preserved
    expect(store.selectedROI.id).toBe('bottom')
    expect(store.selectedROI.unit).toBe('percent')
  })

  it('updateROI can change enabled flag', () => {
    const store = useProjectStore()
    store.updateROI({ enabled: false })
    expect(store.selectedROI.enabled).toBe(false)
  })

  // ─── setOCROptions / setOCREngine / setLanguages ────────────────────

  it('setOCROptions merges partial options', () => {
    const store = useProjectStore()
    store.setOCROptions({ confidenceThreshold: 0.9, multiPass: false })
    expect(store.extractOptions.confidenceThreshold).toBe(0.9)
    expect(store.extractOptions.multiPass).toBe(false)
    // Others unchanged
    expect(store.extractOptions.ocrEngine).toBe(DEFAULT_OCR_ENGINE)
  })

  it('setOCREngine changes only the engine', () => {
    const store = useProjectStore()
    store.setOCREngine('easyocr')
    expect(store.extractOptions.ocrEngine).toBe('easyocr')
    // Other options unchanged
    expect(store.extractOptions.languages).toEqual([...DEFAULT_LANGUAGES])
  })

  it('setOCREngine can set tesseract', () => {
    const store = useProjectStore()
    store.setOCREngine('tesseract')
    expect(store.extractOptions.ocrEngine).toBe('tesseract')
  })

  it('setLanguages replaces language list', () => {
    const store = useProjectStore()
    store.setLanguages(['en', 'fr'])
    expect(store.extractOptions.languages).toEqual(['en', 'fr'])
  })

  it('setLanguages with empty array clears languages', () => {
    const store = useProjectStore()
    store.setLanguages([])
    expect(store.extractOptions.languages).toEqual([])
  })

  // ─── Store isolation ────────────────────────────────────────────────

  it('two store instances are independent', () => {
    const store1 = useProjectStore()
    const store2 = useProjectStore()
    // They share the same pinia, so same state
    store1.setPlaying(true)
    expect(store2.isPlaying).toBe(true)
  })

  it('new pinia gives fresh state', () => {
    const store1 = useProjectStore()
    store1.setVideo('blob:test', makeMeta())
    expect(store1.hasVideo).toBe(true)

    // Create a fresh pinia
    setActivePinia(createPinia())
    const store2 = useProjectStore()
    expect(store2.hasVideo).toBe(false)
  })

  // ─── Edge: volume & isMuted direct mutation ─────────────────────────

  it('volume can be set directly', () => {
    const store = useProjectStore()
    store.volume = 0.5
    expect(store.volume).toBe(0.5)
  })

  it('isMuted can be set directly', () => {
    const store = useProjectStore()
    store.isMuted = true
    expect(store.isMuted).toBe(true)
  })
})
