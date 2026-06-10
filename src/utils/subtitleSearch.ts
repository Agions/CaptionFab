/**
 * 字幕查找工具 — 提取自 VideoPreview.vue 的 currentSubtitle 计算属性
 * 提供 O(log n) 二分查找，适用于按 startTime 排序的字幕列表。
 */

import type { SubtitleItem } from '@/types/subtitle'

/**
 * 在已排序的字幕列表中查找当前时间点对应的字幕。
 * 利用 startTime 有序性进行二分查找，时间复杂度 O(log n)。
 *
 * @param subtitles 按 startTime 升序排列的字幕数组
 * @param currentTime 当前播放时间（秒）
 * @param startIdx 起始搜索索引（用于增量搜索优化，默认 0）
 * @returns 匹配的字幕项，未找到返回 null
 */
export function findSubtitleAtTime(
  subtitles: SubtitleItem[],
  currentTime: number,
  startIdx = 0,
): SubtitleItem | null {
  if (subtitles.length === 0) return null

  let lo = startIdx
  let hi = subtitles.length - 1
  let result: SubtitleItem | null = null

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const sub = subtitles[mid]
    if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
      result = sub
      break
    } else if (currentTime < sub.startTime) {
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }

  return result
}
