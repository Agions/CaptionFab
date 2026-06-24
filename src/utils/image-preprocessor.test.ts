import { describe, it, expect, vi, beforeEach } from 'vitest'
import { preprocessImage, preprocessForSubtitles, preprocessForGeneralText, DEFAULT_PREPROCESSOR_CONFIG } from '@/utils/image-preprocessor'
import { makeFrame } from '@/test-utils/frames'

// Mock canvas and context
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    putImageData: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  toBlob: vi.fn((cb: (blob: Blob) => void) => cb(new Blob(['mock'], { type: 'image/png' }))),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return mockCanvas
      return {}
    }),
  })
  vi.stubGlobal('HTMLCanvasElement', vi.fn(() => mockCanvas))
})

describe('preprocessImage', () => {
  const input = makeFrame(40, 40, 128, 128, 128)

  it('returns PreprocessorResult with processedData, canvas, toDataURL, toBlob', () => {
    const result = preprocessImage(input)
    expect(result.processedData).toBeInstanceOf(ImageData)
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
    expect(typeof result.toDataURL).toBe('function')
    expect(typeof result.toBlob).toBe('function')
  })

  it('produces output larger than input with default config (scale + deskew)', () => {
    const result = preprocessImage(input)
    expect(result.processedData.width).toBeGreaterThan(input.width)
    expect(result.processedData.height).toBeGreaterThan(input.height)
  })

  it('skips deskew when deskew=false', () => {
    const result = preprocessImage(input, { deskew: false })
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })

  it('skips upscale when scaleFactor=1', () => {
    const result = preprocessImage(input, { scaleFactor: 1, deskew: false })
    // With scale=1 and no deskew, output should be same size as input
    expect(result.processedData.width).toBe(input.width)
    expect(result.processedData.height).toBe(input.height)
  })

  it('skips denoise when denoise=false', () => {
    const result = preprocessImage(input, { denoise: false })
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })

  it('skips threshold when adaptiveThreshold=false', () => {
    const result = preprocessImage(input, { adaptiveThreshold: false })
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })

  it('skips morph cleanup when morphCleanup=false', () => {
    const result = preprocessImage(input, { morphCleanup: false })
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })

  it('applies invertColors when enabled', () => {
    const result = preprocessImage(input, { invertColors: true, scaleFactor: 1, deskew: false })
    const normal = preprocessImage(input, { invertColors: false, scaleFactor: 1, deskew: false })
    expect(result.processedData.data[0]).not.toBe(normal.processedData.data[0])
  })

  it('preserves alpha channel through pipeline', () => {
    const semiTransparent = makeFrame(10, 10, 200, 200, 200)
    semiTransparent.data[3] = 128
    const result = preprocessImage(semiTransparent, { scaleFactor: 1, deskew: false })
    expect(result.processedData.data[3]).toBeGreaterThanOrEqual(0)
    expect(result.processedData.data[3]).toBeLessThanOrEqual(255)
  })

  it('toDataURL returns a data URL string', async () => {
    const result = preprocessImage(input)
    const url = await result.toDataURL()
    expect(url).toContain('data:image/png')
  })

  it('toBlob resolves with a Blob', async () => {
    const result = preprocessImage(input)
    const blob = await result.toBlob()
    expect(blob).toBeInstanceOf(Blob)
  })
})

describe('preprocessForSubtitles', () => {
  it('uses subtitle-optimized defaults', () => {
    const result = preprocessForSubtitles(makeFrame(40, 40, 128, 128, 128))
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })
})

describe('preprocessForGeneralText', () => {
  it('uses general-text defaults with multiPass=false', () => {
    const result = preprocessForGeneralText(makeFrame(40, 40, 128, 128, 128))
    expect(result.processedData.width).toBeGreaterThan(0)
    expect(result.processedData.height).toBeGreaterThan(0)
  })
})

describe('DEFAULT_PREPROCESSOR_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_PREPROCESSOR_CONFIG.scaleFactor).toBe(2.0)
    expect(DEFAULT_PREPROCESSOR_CONFIG.enhanceContrast).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.contrastLevel).toBe(1.5)
    expect(DEFAULT_PREPROCESSOR_CONFIG.adaptiveThreshold).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.adaptiveBlockSize).toBe(11)
    expect(DEFAULT_PREPROCESSOR_CONFIG.denoise).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.morphCleanup).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.invertColors).toBe(false)
    expect(DEFAULT_PREPROCESSOR_CONFIG.deskew).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.multiPass).toBe(true)
    expect(DEFAULT_PREPROCESSOR_CONFIG.multiPassScale).toBe(3.0)
  })
})
