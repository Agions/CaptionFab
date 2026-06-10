import { describe, it, expect } from 'vitest'
import { findSubtitleAtTime } from './subtitleSearch'
import type { SubtitleItem } from '@/types/subtitle'

/** Helper to create a minimal SubtitleItem */
function makeSub(id: string, startTime: number, endTime: number, text = ''): SubtitleItem {
  return {
    id,
    index: 0,
    startTime,
    endTime,
    startFrame: 0,
    endFrame: 0,
    text,
    confidence: 1,
    roi: { id: 'bottom', name: '默认', type: 'bottom', x: 0, y: 0, width: 0, height: 0, unit: 'percent', enabled: true },
    thumbnailUrls: [],
    edited: false,
  }
}

const subs: SubtitleItem[] = [
  makeSub('1', 0, 2, 'Hello'),
  makeSub('2', 3, 5, 'World'),
  makeSub('3', 7, 10, 'Foo'),
  makeSub('4', 12, 15, 'Bar'),
  makeSub('5', 20, 25, 'Baz'),
]

describe('findSubtitleAtTime', () => {
  it('returns null for empty subtitle list', () => {
    expect(findSubtitleAtTime([], 5)).toBeNull()
  })

  it('finds subtitle at exact startTime', () => {
    const result = findSubtitleAtTime(subs, 0)
    expect(result?.id).toBe('1')
  })

  it('finds subtitle at exact endTime', () => {
    const result = findSubtitleAtTime(subs, 5)
    expect(result?.id).toBe('2')
  })

  it('finds subtitle in the middle of its time range', () => {
    const result = findSubtitleAtTime(subs, 4)
    expect(result?.id).toBe('2')
  })

  it('returns null when time is before the first subtitle', () => {
    const result = findSubtitleAtTime(subs, -1)
    expect(result).toBeNull()
  })

  it('returns null when time is after the last subtitle', () => {
    const result = findSubtitleAtTime(subs, 100)
    expect(result).toBeNull()
  })

  it('returns null when time falls in a gap between subtitles', () => {
    // Gap between sub 2 (ends at 5) and sub 3 (starts at 7)
    const result = findSubtitleAtTime(subs, 6)
    expect(result).toBeNull()
  })

  it('works with a single subtitle', () => {
    const single = [makeSub('single', 5, 10, 'Only')]
    expect(findSubtitleAtTime(single, 5)?.id).toBe('single')
    expect(findSubtitleAtTime(single, 7)?.id).toBe('single')
    expect(findSubtitleAtTime(single, 10)?.id).toBe('single')
    expect(findSubtitleAtTime(single, 4)).toBeNull()
    expect(findSubtitleAtTime(single, 11)).toBeNull()
  })

  it('respects startIdx parameter for incremental search', () => {
    // Skip first 3 subtitles, start searching from index 3
    const result = findSubtitleAtTime(subs, 8, 2) // should still find sub '3'
    expect(result?.id).toBe('3')
  })

  it('returns correct subtitle when searching from a later startIdx', () => {
    const result = findSubtitleAtTime(subs, 14, 3)
    expect(result?.id).toBe('4')
  })

  it('returns null with startIdx that skips past matching subtitle', () => {
    const result = findSubtitleAtTime(subs, 4, 3)
    expect(result).toBeNull()
  })

  it('handles time at the boundary of two consecutive subtitles', () => {
    // Sub 2 ends at 5, Sub 3 starts at 7 — time 5 should match sub 2
    const result = findSubtitleAtTime(subs, 5)
    expect(result?.id).toBe('2')
  })

  it('handles overlapping subtitle time ranges', () => {
    const overlapping = [
      makeSub('o1', 0, 5, 'Overlap1'),
      makeSub('o2', 3, 8, 'Overlap2'),
      makeSub('o3', 7, 12, 'Overlap3'),
    ]
    // At time 4, both o1 and o2 contain it — binary search may hit either
    // depending on mid point; verify we get a valid match
    const result = findSubtitleAtTime(overlapping, 4)
    expect(result).not.toBeNull()
    expect(['o1', 'o2']).toContain(result!.id)
  })

  it('returns null for startIdx beyond list length', () => {
    const result = findSubtitleAtTime(subs, 5, 100)
    expect(result).toBeNull()
  })

  it('works with many subtitles (performance-like test)', () => {
    const manySubs: SubtitleItem[] = []
    for (let i = 0; i < 100; i++) {
      manySubs.push(makeSub(String(i), i * 2, i * 2 + 1.5, `Text ${i}`))
    }
    // Time 50 falls in subtitle index 25 (50-51.5)
    const result = findSubtitleAtTime(manySubs, 50)
    expect(result?.id).toBe('25')
    // Time 49 falls in gap (48-49.5 is sub 24, so 49 is within sub 24)
    const result2 = findSubtitleAtTime(manySubs, 49)
    expect(result2?.id).toBe('24')
  })
})
