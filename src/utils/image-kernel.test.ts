import { describe, it, expect } from 'vitest'
import { forEachNeighbor, getSquareKernel } from './image-kernel'

describe('image-kernel', () => {
  // ─── getSquareKernel ────────────────────────────────────────────
  describe('getSquareKernel', () => {
    it('returns a single center point for radius 0', () => {
      const kernel = getSquareKernel(0)
      expect(kernel.length).toBe(1)
      expect(kernel[0][0]).toBeCloseTo(0)
      expect(kernel[0][1]).toBeCloseTo(0)
    })

    it('returns 9 offsets for radius 1', () => {
      const kernel = getSquareKernel(1)
      expect(kernel.length).toBe(9)
    })

    it('returns 25 offsets for radius 2', () => {
      const kernel = getSquareKernel(2)
      expect(kernel.length).toBe(25)
    })

    it('returns 49 offsets for radius 3', () => {
      const kernel = getSquareKernel(3)
      expect(kernel.length).toBe(49)
    })

    it('contains expected offsets for radius 1', () => {
      const kernel = getSquareKernel(1)
      // Should include corners: (-1,-1), (-1,1), (1,-1), (1,1)
      const has = (dx: number, dy: number) =>
        kernel.some(([kx, ky]) => kx === dx && ky === dy)
      expect(has(-1, -1)).toBe(true)
      expect(has(1, 1)).toBe(true)
      expect(has(0, 0)).toBe(true)
      expect(has(-1, 1)).toBe(true)
      expect(has(1, -1)).toBe(true)
    })

    it('returns same reference when using cache with same radius', () => {
      const cache = new Map<number, [number, number][]>()
      const a = getSquareKernel(2, cache)
      const b = getSquareKernel(2, cache)
      expect(a).toBe(b)
    })

    it('returns different references for different radii', () => {
      const cache = new Map<number, [number, number][]>()
      const a = getSquareKernel(1, cache)
      const b = getSquareKernel(2, cache)
      expect(a).not.toBe(b)
    })

    it('caches multiple radii independently', () => {
      const cache = new Map<number, [number, number][]>()
      getSquareKernel(1, cache)
      getSquareKernel(2, cache)
      expect(cache.size).toBe(2)
      expect(cache.get(1)!.length).toBe(9)
      expect(cache.get(2)!.length).toBe(25)
    })

    it('works without cache parameter', () => {
      const a = getSquareKernel(1)
      const b = getSquareKernel(1)
      // Without cache, each call returns a new array
      expect(a).not.toBe(b)
      expect(a).toEqual(b)
    })
  })

  // ─── forEachNeighbor ────────────────────────────────────────────
  describe('forEachNeighbor', () => {
    it('visits center pixel (offset [0,0])', () => {
      const visited: [number, number][] = []
      const kernel: [number, number][] = [[0, 0]]
      forEachNeighbor(2, 2, 5, 5, kernel, (nx, ny) => {
        visited.push([nx, ny])
      })
      expect(visited).toEqual([[2, 2]])
    })

    it('skips out-of-bounds neighbors', () => {
      const visited: [number, number][] = []
      const kernel: [number, number][] = [[0, 0], [-1, 0], [0, -1]]
      // center at (0,0) → neighbor (-1,0) and (0,-1) are out of bounds
      forEachNeighbor(0, 0, 5, 5, kernel, (nx, ny) => {
        visited.push([nx, ny])
      })
      expect(visited).toEqual([[0, 0]])
    })

    it('includes all valid neighbors at center of image', () => {
      const visited: [number, number][] = []
      const kernel: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 0], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ]
      forEachNeighbor(3, 3, 10, 10, kernel, (nx, ny) => {
        visited.push([nx, ny])
      })
      expect(visited.length).toBe(9)
    })

    it('computes correct srcIdx for each neighbor', () => {
      const indices: number[] = []
      const kernel: [number, number][] = [[0, 0], [1, 0], [0, 1]]
      forEachNeighbor(2, 3, 10, 10, kernel, (_nx, _ny, srcIdx) => {
        indices.push(srcIdx)
      })
      // (2,3) → index (3*10+2)*4 = 128, (3,3) → (3*10+3)*4 = 132, (2,4) → (4*10+2)*4 = 168
      expect(indices).toEqual([128, 132, 168])
    })

    it('skips all neighbors at top-left corner with offsets going negative', () => {
      const visited: [number, number][] = []
      const kernel: [number, number][] = [[-1, -1], [-1, 0], [0, -1], [0, 0]]
      forEachNeighbor(0, 0, 10, 10, kernel, (nx, ny) => {
        visited.push([nx, ny])
      })
      expect(visited).toEqual([[0, 0]])
    })

    it('handles kernel with no offsets gracefully', () => {
      const visited: [number, number][] = []
      forEachNeighbor(5, 5, 10, 10, [], (nx, ny) => {
        visited.push([nx, ny])
      })
      expect(visited).toEqual([])
    })
  })
})
