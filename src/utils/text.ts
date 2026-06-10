/**
 * 文本工具函数 — 提取自 Pipeline.ts 和 Calibrator.ts
 * 提供 CJK 文本检测、规范化等通用能力。
 */

/** CJK 字符 Unicode 范围：中文 + 日文假名 + 韩文 */
const CJK_PATTERN = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/

/**
 * 检测文本是否主要为 CJK（中日韩）文字。
 * 当 CJK 字符占比超过 50% 时判定为 CJK 文本。
 */
export function isCJKText(text: string): boolean {
  if (!text.length) return false
  const cjkCount = (text.match(new RegExp(CJK_PATTERN.source, 'g')) || []).length
  return cjkCount / text.length > 0.5
}

/**
 * 检测文本中是否包含任何 CJK 字符。
 * 比 isCJKText 更宽松，只要有一个 CJK 字符即返回 true。
 */
export function hasCJKChars(text: string): boolean {
  return CJK_PATTERN.test(text)
}

/**
 * 中文标点 → 英文标点映射（全角 → 半角）
 * 提取自 Calibrator.ts，供多处复用。
 */
export const FULLWIDTH_PUNCT_MAP: Record<string, string> = {
  '，': ',', '。': '.', '！': '!', '？': '?',
  '：': ':', '；': ';', '（': '(', '）': ')',
  '【': '[', '】': ']', '「': '"', '」': '"',
  '『': "'", '』': "'", '、': ',',
}

/**
 * 将全角标点替换为半角标点。
 */
export function normalizeCJKPunct(text: string): string {
  let result = text
  for (const [full, half] of Object.entries(FULLWIDTH_PUNCT_MAP)) {
    // 兼容 ES2020：使用 split+join 替代 replaceAll
    result = result.split(full).join(half)
  }
  return result
}

// ─── 语言 → 书写系统映射 ────────────────────────────────────────
// 优化：从 Calibrator.ts 提取到通用文本工具，解除 useOCREngine/useExtractor 对 @/core 的耦合

export type Script = 'chinese' | 'japanese' | 'korean' | 'latin' | 'other'

/**
 * 语言代码 → 书写系统类型。
 * 供 Calibrator、OCREngine、Extractor 等多处复用。
 */
export function langToScript(lang: string): Script {
  if (['zh', 'chi', 'ch', 'zho'].includes(lang)) return 'chinese'
  if (['ja', 'jpn', 'jap'].includes(lang)) return 'japanese'
  if (['ko', 'kor', 'korean'].includes(lang)) return 'korean'
  if (['en', 'eng', 'latin'].includes(lang)) return 'latin'
  return 'other'
}
