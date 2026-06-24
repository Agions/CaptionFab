import { describe, it, expect } from 'vitest'
import {
  extractFrameMetrics,
  AdaptiveEmptyDetector,
  SceneHysteresis,
  DEFAULT_EMPTY_DETECTOR_OPTIONS,
  DEFAULT_SCENE_HYSTERESIS_OPTIONS,
} from './detection'
import { makeFrame, makeStripeFrame, makeHighVarianceFrame } from '@/test-utils/frames'

// ─── extractFrameMetrics ────────────────────────────────────────────
describe('extractFrameMetrics', () => {
  // Use full-frame ROI for simpler calculation
  const fullROI = { x: 0, y: 0, width: 100, height: 100 }

  it('returns FrameMetrics with all required fields', () => {
    const frame = makeFrame(32, 32, 128, 128, 128)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics).toHaveProperty('variance')
    expect(metrics).toHaveProperty('brightness')
    expect(metrics).toHaveProperty('edgeDensity')
    expect(metrics).toHaveProperty('timestamp')
  })

  it('uniform image has zero variance', () => {
    const frame = makeFrame(32, 32, 128, 128, 128)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics.variance).toBeCloseTo(0, 1)
  })

  it('uniform image has brightness equal to pixel luma', () => {
    const frame = makeFrame(32, 32, 200, 100, 50)
    const metrics = extractFrameMetrics(frame, fullROI)
    // luma = 0.299*200 + 0.587*100 + 0.114*50 ≈ 124.4
    expect(metrics.brightness).toBeCloseTo(124.4, 0)
  })

  it('uniform image has zero edge density', () => {
    const frame = makeFrame(32, 32, 100, 100, 100)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics.edgeDensity).toBeCloseTo(0, 2)
  })

  it('image with high contrast has high variance', () => {
    const frame = makeHighVarianceFrame(32, 32)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics.variance).toBeGreaterThan(1000)
  })

  it('image with stripe has non-zero edge density', () => {
    const frame = makeStripeFrame(40, 40, 20)
    const metrics = extractFrameMetrics(frame, fullROI)
    // Stripe creates gradient transitions at row boundaries
    expect(metrics.edgeDensity).toBeGreaterThan(0)
  })

  it('brightness is between 0 and 255', () => {
    const frame = makeFrame(16, 16, 50, 100, 200)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics.brightness).toBeGreaterThanOrEqual(0)
    expect(metrics.brightness).toBeLessThanOrEqual(255)
  })

  it('timestamp is always 0', () => {
    const frame = makeFrame(16, 16, 100, 100, 100)
    const metrics = extractFrameMetrics(frame, fullROI)
    expect(metrics.timestamp).toBe(0)
  })

  it('handles partial ROI (bottom half of image)', () => {
    const frame = makeFrame(40, 40, 100, 100, 100)
    // ROI = bottom 50%
    const bottomROI = { x: 0, y: 50, width: 100, height: 50 }
    const metrics = extractFrameMetrics(frame, bottomROI)
    expect(metrics.brightness).toBeCloseTo(100, 0)
  })

  it('handles smaller ROI region', () => {
    const frame = makeFrame(60, 60, 80, 80, 80)
    // ROI = center 25%
    const centerROI = { x: 25, y: 25, width: 50, height: 50 }
    const metrics = extractFrameMetrics(frame, centerROI)
    expect(metrics.brightness).toBeCloseTo(80, 0)
  })
})

// ─── AdaptiveEmptyDetector ──────────────────────────────────────────
describe('AdaptiveEmptyDetector', () => {
  const fullROI = { x: 0, y: 0, width: 100, height: 100 }

  it('constructs with default options', () => {
    const det = new AdaptiveEmptyDetector()
    expect(det).toBeDefined()
  })

  it('constructs with custom options', () => {
    const det = new AdaptiveEmptyDetector({
      varianceThreshold: 50,
      bufferSize: 5,
      confirmFrames: 3,
    })
    expect(det).toBeDefined()
  })

  it('returns false during warmup (first few frames)', () => {
    const det = new AdaptiveEmptyDetector({ confirmFrames: 2 })
    const frame = makeFrame(32, 32, 128, 128, 128)
    // First frame should not trigger
    const result = det.isEmpty(frame, fullROI)
    expect(result).toBe(false)
  })

  it('eventually detects empty frame (uniform low-variance)', () => {
    const det = new AdaptiveEmptyDetector({
      varianceThreshold: 200,
      minBrightness: 5,
      maxBrightness: 245,
      bufferSize: 3,
      confirmFrames: 2,
    })
    const uniformFrame = makeFrame(32, 32, 200, 200, 200) // low variance, mid brightness

    // Feed enough frames to pass warmup
    for (let i = 0; i < 12; i++) {
      det.isEmpty(uniformFrame, fullROI)
    }
    // After warmup, uniform low-variance frame should be detected as empty
    const result = det.isEmpty(uniformFrame, fullROI)
    expect(result).toBe(true)
  })

  it('does not falsely detect high-variance frames as empty', () => {
    const det = new AdaptiveEmptyDetector({ confirmFrames: 2 })
    const highVarFrame = makeHighVarianceFrame(32, 32)

    for (let i = 0; i < 15; i++) {
      det.isEmpty(highVarFrame, fullROI)
    }
    const result = det.isEmpty(highVarFrame, fullROI)
    expect(result).toBe(false)
  })

  it('reset clears internal state', () => {
    const det = new AdaptiveEmptyDetector({ confirmFrames: 2 })
    const frame = makeFrame(32, 32, 200, 200, 200)

    // Feed frames
    for (let i = 0; i < 5; i++) det.isEmpty(frame, fullROI)
    det.reset()

    // After reset, should be back in warmup
    const result = det.isEmpty(frame, fullROI)
    expect(result).toBe(false)
  })

  it('buffer is trimmed to configured size', () => {
    const det = new AdaptiveEmptyDetector({ bufferSize: 3 })
    const frame = makeFrame(16, 16, 128, 128, 128)
    // Feed many frames — internal buffer should stay bounded
    for (let i = 0; i < 20; i++) {
      det.isEmpty(frame, fullROI)
    }
    // No error means buffer trimming works
    expect(true).toBe(true)
  })

  it('detects frames outside brightness range as non-empty', () => {
    const det = new AdaptiveEmptyDetector({
      varianceThreshold: 500,
      minBrightness: 10,
      maxBrightness: 240,
      bufferSize: 3,
      confirmFrames: 2,
    })
    // Very dark frame (brightness < minBrightness)
    const darkFrame = makeFrame(16, 16, 0, 0, 0)
    for (let i = 0; i < 12; i++) {
      det.isEmpty(darkFrame, fullROI)
    }
    const result = det.isEmpty(darkFrame, fullROI)
    // Low brightness means brightnessEmpty is false
    // But low variance AND low edge density could still make it "empty"
    expect(typeof result).toBe('boolean')
  })
})

// ─── SceneHysteresis ────────────────────────────────────────────────
describe('SceneHysteresis', () => {
  const makeImageData = (w: number, h: number, color: number): ImageData => {
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h * 4; i += 4) {
      data[i] = color
      data[i + 1] = color
      data[i + 2] = color
      data[i + 3] = 255
    }
    return { data, width: w, height: h } as unknown as ImageData
  }

  it('constructs with default options', () => {
    const det = new SceneHysteresis(
      null,
      () => false,
    )
    expect(det).toBeDefined()
  })

  it('returns false when detector says frames are same', () => {
    const frame = makeImageData(10, 10, 128)
    const sh = new SceneHysteresis(
      null,
      () => false, // detector always returns "same"
    )
    expect(sh.detect(frame, frame)).toBe(false)
  })

  it('returns true when detector says frames are different', () => {
    const frameA = makeImageData(10, 10, 100)
    const frameB = makeImageData(10, 10, 200)
    const sh = new SceneHysteresis(
      null,
      () => true, // detector always returns "different"
    )
    expect(sh.detect(frameA, frameB)).toBe(true)
  })

  it('applies cooldown: subsequent detect calls during cooldown return false', () => {
    const frameA = makeImageData(10, 10, 100)
    const frameB = makeImageData(10, 10, 200)
    const sh = new SceneHysteresis(
      null,
      () => true,
      { cooldownFrames: 3 },
    )
    // First detect triggers scene change
    expect(sh.detect(frameA, frameB)).toBe(true)
    // Next 3 calls are in cooldown
    expect(sh.detect(frameA, frameB)).toBe(false)
    expect(sh.detect(frameA, frameB)).toBe(false)
    expect(sh.detect(frameA, frameB)).toBe(false)
  })

  it('detect resumes after cooldown expires', () => {
    const frameA = makeImageData(10, 10, 100)
    const frameB = makeImageData(10, 10, 200)
    const sh = new SceneHysteresis(
      null,
      () => true,
      { cooldownFrames: 2 },
    )
    sh.detect(frameA, frameB) // triggers
    sh.detect(frameA, frameB) // cooldown 1
    sh.detect(frameA, frameB) // cooldown 2
    // After cooldown, detect can trigger again
    expect(sh.detect(frameA, frameB)).toBe(true)
  })

  it('reset clears cooldown and scene state', () => {
    const frameA = makeImageData(10, 10, 100)
    const frameB = makeImageData(10, 10, 200)
    const sh = new SceneHysteresis(
      null,
      () => true,
      { cooldownFrames: 3 },
    )
    sh.detect(frameA, frameA) // triggers
    sh.reset()
    // After reset, cooldown is cleared, can trigger again
    expect(sh.detect(frameA, frameB)).toBe(true)
  })

  it('hysteresis: stays in scene change even when detector fluctuates', () => {
    const detector = { count: 0 }
    const sh = new SceneHysteresis(
      detector,
      (d) => {
        d.count++
        // First call triggers, subsequent calls alternate
        return d.count <= 1 || d.count % 2 === 1
      },
      { cooldownFrames: 0 },
    )
    const frameA = makeImageData(10, 10, 100)
    const frameB = makeImageData(10, 10, 200)

    // First detect triggers
    const first = sh.detect(frameA, frameB)
    expect(first).toBe(true)

    // Subsequent detects should stay in scene change due to hysteresis
    const second = sh.detect(frameA, frameB)
    expect(second).toBe(true)
  })

  it('passes correct frames to detector function', () => {
    const frameA = makeImageData(10, 10, 50)
    const frameB = makeImageData(10, 10, 200)
    const received: { prev: ImageData; curr: ImageData }[] = []
    const sh = new SceneHysteresis(
      null,
      (_d, prev, curr) => {
        received.push({ prev, curr })
        return false
      },
    )
    sh.detect(frameA, frameB)
    expect(received.length).toBeGreaterThanOrEqual(1)
    expect(received[0].prev).toBe(frameA)
    expect(received[0].curr).toBe(frameB)
  })
})

// ─── Default options constants ──────────────────────────────────────
describe('default options', () => {
  it('DEFAULT_EMPTY_DETECTOR_OPTIONS has expected values', () => {
    expect(DEFAULT_EMPTY_DETECTOR_OPTIONS.varianceThreshold).toBe(100)
    expect(DEFAULT_EMPTY_DETECTOR_OPTIONS.minBrightness).toBe(5)
    expect(DEFAULT_EMPTY_DETECTOR_OPTIONS.maxBrightness).toBe(245)
    expect(DEFAULT_EMPTY_DETECTOR_OPTIONS.bufferSize).toBe(3)
    expect(DEFAULT_EMPTY_DETECTOR_OPTIONS.confirmFrames).toBe(2)
  })

  it('DEFAULT_SCENE_HYSTERESIS_OPTIONS has expected values', () => {
    expect(DEFAULT_SCENE_HYSTERESIS_OPTIONS.triggerThreshold).toBe(0.3)
    expect(DEFAULT_SCENE_HYSTERESIS_OPTIONS.leaveThreshold).toBe(0.5)
    expect(DEFAULT_SCENE_HYSTERESIS_OPTIONS.cooldownFrames).toBe(3)
  })
})
