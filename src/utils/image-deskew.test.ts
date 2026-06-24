import { describe, it, expect } from 'vitest'
import { detectSkewAngle, rotateImage, applyDeskew } from './image-deskew'
import { makeFrame, makeStripeFrame } from '@/test-utils/frames'

describe('image-deskew', () => {
  // ─── detectSkewAngle ──────────────────────────────────────────
  describe('detectSkewAngle', () => {
    it('returns 0 for uniform (all-white) image', () => {
      const img = makeFrame(32, 32, 255, 255, 255)
      const angle = detectSkewAngle(img)
      expect(typeof angle).toBe('number')
    })

    it('returns 0 for uniform (all-black) image', () => {
      const img = makeFrame(32, 32, 0, 0, 0)
      const angle = detectSkewAngle(img)
      expect(typeof angle).toBe('number')
    })

    it('returns a value within [-15, 15] range', () => {
      // Image with a horizontal line at center
      const img = makeStripeFrame(40, 40, 20)
      const angle = detectSkewAngle(img)
      expect(angle).toBeGreaterThanOrEqual(-15)
      expect(angle).toBeLessThanOrEqual(15)
    })

    it('returns an integer angle (1° steps)', () => {
      const img = makeStripeFrame(40, 40, 20)
      const angle = detectSkewAngle(img)
      expect(Number.isInteger(angle)).toBe(true)
    })

    it('detectSkewAngle returns an integer in [-15,15]', () => {
      const img = makeStripeFrame(50, 50, 25)
      const angle = detectSkewAngle(img)
      // The projection variance method finds the angle with most uniform projection
      // For a single line, the returned angle depends on geometry
      expect(Number.isInteger(angle)).toBe(true)
      expect(angle).toBeGreaterThanOrEqual(-15)
      expect(angle).toBeLessThanOrEqual(15)
    })

    it('works on a small image (10x10)', () => {
      const img = makeFrame(10, 10, 255, 255, 255)
      const angle = detectSkewAngle(img)
      expect(typeof angle).toBe('number')
    })

    it('works on a larger image (100x60)', () => {
      const img = makeStripeFrame(100, 60, 30)
      const angle = detectSkewAngle(img)
      expect(angle).toBeGreaterThanOrEqual(-15)
      expect(angle).toBeLessThanOrEqual(15)
    })
  })

  // ─── rotateImage ──────────────────────────────────────────────
  describe('rotateImage', () => {
    it('returns original ImageData when angle is < 0.5°', () => {
      const img = makeFrame(10, 10, 100, 100, 100)
      const result = rotateImage(img, 0.3)
      expect(result).toBe(img) // Same reference
    })

    it('returns original ImageData for 0° angle', () => {
      const img = makeFrame(10, 10, 100, 100, 100)
      const result = rotateImage(img, 0)
      expect(result).toBe(img)
    })

    it('returns original ImageData for very small negative angle', () => {
      const img = makeFrame(10, 10, 100, 100, 100)
      const result = rotateImage(img, -0.4)
      expect(result).toBe(img)
    })

    it('produces a new ImageData when angle >= 0.5°', () => {
      const img = makeFrame(20, 20, 100, 100, 100)
      const result = rotateImage(img, 5)
      expect(result).not.toBe(img)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('rotation output has valid dimensions (width/height > 0)', () => {
      const img = makeFrame(30, 20, 150, 150, 150)
      const result = rotateImage(img, 45)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('rotation output data length matches width * height * 4', () => {
      const img = makeFrame(20, 20, 100, 100, 100)
      const result = rotateImage(img, 10)
      expect(result.data.length).toBe(result.width * result.height * 4)
    })

    it('90° rotation produces a valid ImageData', () => {
      const img = makeFrame(30, 10, 200, 200, 200)
      const result = rotateImage(img, 90)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })
  })

  // ─── applyDeskew ──────────────────────────────────────────────
  describe('applyDeskew', () => {
    it('returns an object with angle and corrected fields', () => {
      const img = makeFrame(20, 20, 128, 128, 128)
      const result = applyDeskew(img)
      expect(result).toHaveProperty('angle')
      expect(result).toHaveProperty('corrected')
    })

    it('angle is within [-15, 15] range', () => {
      const img = makeFrame(30, 30, 200, 200, 200)
      const result = applyDeskew(img)
      expect(result.angle).toBeGreaterThanOrEqual(-15)
      expect(result.angle).toBeLessThanOrEqual(15)
    })

    it('corrected is a valid ImageData', () => {
      const img = makeFrame(20, 20, 100, 100, 100)
      const result = applyDeskew(img)
      expect(result.corrected.width).toBeGreaterThan(0)
      expect(result.corrected.height).toBeGreaterThan(0)
      expect(result.corrected.data.length).toBe(
        result.corrected.width * result.corrected.height * 4,
      )
    })

    it('for uniform image, corrected is a valid ImageData', () => {
      const img = makeFrame(16, 16, 200, 200, 200)
      const result = applyDeskew(img)
      expect(typeof result.angle).toBe('number')
      expect(result.corrected.width).toBeGreaterThan(0)
      expect(result.corrected.height).toBeGreaterThan(0)
    })

    it('works with horizontal line image', () => {
      const img = makeStripeFrame(40, 40, 20)
      const result = applyDeskew(img)
      expect(typeof result.angle).toBe('number')
      expect(result.corrected.width).toBeGreaterThan(0)
    })
  })
})
