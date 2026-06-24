import { describe, it, expect } from 'vitest'
import { morphologicalErode, morphologicalDilate, morphOpen } from './image-morph'

/** Helper to create a uniform-color ImageData — 优化：g/b 默认跟随 r，简化灰度图创建 */
function makeImage(w: number, h: number, r: number, g?: number, b?: number, a = 255): ImageData {
  const gray = g ?? r
  const blue = b ?? r
  const size = w * h * 4
  const data = new Uint8ClampedArray(size)
  for (let i = 0; i < size; i += 4) {
    data[i] = r
    data[i + 1] = gray
    data[i + 2] = blue
    data[i + 3] = a
  }
  return { data, width: w, height: h } as unknown as ImageData
}

describe('image-morph', () => {
  // ─── morphologicalErode ────────────────────────────────────────
  describe('morphologicalErode', () => {
    it('returns same-size ImageData', () => {
      const img = makeImage(8, 8, 200)
      const result = morphologicalErode(img, 1)
      expect(result.width).toBe(8)
      expect(result.height).toBe(8)
    })

    it('uniform image stays uniform after erode', () => {
      const img = makeImage(6, 6, 200, 200, 200)
      const result = morphologicalErode(img, 1)
      const centerIdx = (3 * 6 + 3) * 4
      expect(result.data[centerIdx]).toBe(200)
    })

    it('erode shrinks bright region: single bright pixel becomes dark', () => {
      const w = 5, h = 5
      const img = makeImage(w, h, 50)
      // Set center pixel to white
      const center = (2 * w + 2) * 4
      img.data[center] = 255
      img.data[center + 1] = 255
      img.data[center + 2] = 255

      const result = morphologicalErode(img, 1)
      const ri = (2 * w + 2) * 4
      expect(result.data[ri]).toBe(50)
    })

    it('erode with size 1 considers 3x3 neighborhood', () => {
      const w = 7, h = 7
      const img = makeImage(w, h, 0)
      const idx33 = (3 * w + 3) * 4
      img.data[idx33] = 200
      img.data[idx33 + 1] = 200
      img.data[idx33 + 2] = 200

      const result = morphologicalErode(img, 1)
      expect(result.data[idx33]).toBe(0)
    })

    it('preserves alpha channel (always sets to 255)', () => {
      const w = 4, h = 4
      const data = new Uint8ClampedArray(w * h * 4)
      for (let i = 0; i < w * h * 4; i += 4) {
        data[i] = 100
        data[i + 3] = 200
      }
      const img = { data, width: w, height: h } as unknown as ImageData
      const result = morphologicalErode(img, 1)
      for (let i = 3; i < w * h * 4; i += 4) {
        expect(result.data[i]).toBe(255)
      }
    })
  })

  // ─── morphologicalDilate ──────────────────────────────────────
  describe('morphologicalDilate', () => {
    it('returns same-size ImageData', () => {
      const img = makeImage(8, 8, 100)
      const result = morphologicalDilate(img, 1)
      expect(result.width).toBe(8)
      expect(result.height).toBe(8)
    })

    it('uniform image stays uniform after dilate', () => {
      const img = makeImage(6, 6, 100, 100, 100)
      const result = morphologicalDilate(img, 1)
      const centerIdx = (3 * 6 + 3) * 4
      expect(result.data[centerIdx]).toBe(100)
    })

    it('dilate expands bright region: dark pixel near bright neighbor becomes bright', () => {
      const w = 5, h = 5
      const img = makeImage(w, h, 0)
      const center = (2 * w + 2) * 4
      img.data[center] = 255
      img.data[center + 1] = 255
      img.data[center + 2] = 255

      const result = morphologicalDilate(img, 1)
      // (2,3) has neighbor (2,2) with value 255 → max = 255
      const ri = (2 * w + 3) * 4
      expect(result.data[ri]).toBe(255)
    })

    it('dilate with size 2 expands further than size 1', () => {
      const w = 9, h = 9
      const img = makeImage(w, h, 0)
      const center = (4 * w + 4) * 4
      img.data[center] = 255
      img.data[center + 1] = 255
      img.data[center + 2] = 255

      const r1 = morphologicalDilate(img, 1)
      const r2 = morphologicalDilate(img, 2)

      const farIdx = (4 * w + 6) * 4
      expect(r1.data[farIdx]).toBe(0)
      expect(r2.data[farIdx]).toBe(255)
    })

    it('dilate at corner only checks valid neighbors', () => {
      const w = 5, h = 5
      const img = makeImage(w, h, 0)
      // Put bright pixel at (0,1)
      const idx = (1 * w + 0) * 4
      img.data[idx] = 200
      img.data[idx + 1] = 200
      img.data[idx + 2] = 200

      const result = morphologicalDilate(img, 1)
      // (0,0) has neighbor (0,1) with value 200 → max = 200
      expect(result.data[0]).toBe(200)
    })
  })

  // ─── morphOpen ────────────────────────────────────────────────
  describe('morphOpen', () => {
    it('returns same-size ImageData', () => {
      const img = makeImage(8, 8, 128)
      const result = morphOpen(img, 1)
      expect(result.width).toBe(8)
      expect(result.height).toBe(8)
    })

    it('removes single-pixel noise', () => {
      const w = 7, h = 7
      const img = makeImage(w, h, 0)
      const spot = (3 * w + 3) * 4
      img.data[spot] = 255
      img.data[spot + 1] = 255
      img.data[spot + 2] = 255

      const result = morphOpen(img, 1)
      expect(result.data[spot]).toBe(0)
    })

    it('preserves large bright region through open', () => {
      const w = 9, h = 9
      const data = new Uint8ClampedArray(w * h * 4)
      for (let i = 0; i < w * h * 4; i += 4) {
        data[i] = 0
        data[i + 3] = 255
      }
      // 3x3 bright block at center
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((3 + dy) * w + (3 + dx)) * 4
          data[idx] = 255
          data[idx + 1] = 255
          data[idx + 2] = 255
        }
      }

      const img = { data, width: w, height: h } as unknown as ImageData
      const result = morphOpen(img, 1)
      const centerIdx = (3 * w + 3) * 4
      expect(result.data[centerIdx]).toBe(255)
    })

    it('default size is 1', () => {
      const img = makeImage(5, 5, 100)
      const result = morphOpen(img)
      expect(result.width).toBe(5)
    })
  })
})
