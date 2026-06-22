/**
 * Calibrator — 置信度校准引擎 v2
 * ========================================
 * 统一所有置信度校准逻辑：
 * - 基础校准（calibrate）
 * - 增强校准（calibrateEnhanced）
 * - 文本质量检测（detectIssues）
 *
 * v2 增强项：
 * - CJK 字符 n-gram 异常检测（形近字错误、二字词连续检出）
 * - 竖线字符检测（OCR 竖线误识别）
 * - CJK 标点规范化（全角→半角）
 * - 字符频率异常检测（罕见汉字惩罚）
 * - 更多细粒度质量信号
 *
 * 校准策略：
 * - 加权乘法：quality = base * multipliers
 * - 所有乘数范围 [0.6, 1.15]，避免过度惩罚
 */

import { clamp } from '@/utils/math'
import type { Script } from '@/utils/text'

// 优化：Script 类型已迁移到 @/utils/text，此处 re-export 保持向后兼容
export type { Script } from '@/utils/text'

export interface CalibrationResult {
  confidence: number
  signals: CalibrationSignal[]
}

export interface CalibrationSignal {
  type: 'penalty' | 'bonus'
  factor: number
  reason: string
}

const PENALTY = (f: number, r: string): CalibrationSignal => ({ type: 'penalty', factor: f, reason: r })
const BONUS   = (f: number, r: string): CalibrationSignal => ({ type: 'bonus',   factor: f, reason: r })

// ── Quality factor constants ──────────────────────────────────────

// v2: expanded and more granular
const F_MIXED_SCRIPTS      = 0.78
const F_TEXT_TOO_SHORT     = 0.82
const F_REPEATED_CHAR      = 0.72
const F_CHAR_DIVERSITY     = 1.06
const F_ORPHANED_CJK       = 0.78
const F_UNBALANCED_QUOTE   = 0.88
const F_ALL_CAPS           = 0.80
const F_ISOLATED_DIGIT     = 0.85
const F_SENTENCE_END       = 1.04
const F_TRAILING_COMMA     = 0.85
const F_REPEATED_PUNCT     = 0.82
const F_GOOD_LENGTH        = 1.05
const F_TOO_LONG           = 0.90
const F_LEADING_SPACE      = 0.88

// v2: new CJK-specific factors
const F_CJK_BIGRAM_ANOMALY = 0.75   // impossible/nonsensical CJK bigram
const F_VERTICAL_BAR       = 0.70   // '|' or '｜' detected (common OCR artifact)
const F_CJK_PUNCT_NORM     = 1.03   // full-width punct properly normalized
const F_RARE_CHAR          = 0.80   // contains very rare Chinese character
const F_CJK_LINE_BREAK     = 0.83   // mid-sentence line break detected
const F_CONF_DEVIATION     = 0.84   // raw confidence vs text quality mismatch
const F_CJK_NUMBER          = 0.82   // Arabic numerals in CJK text (often error)
const F_EMPTY_AFTER_TRIM   = 0.50   // text becomes empty after trimming (pure whitespace/symbols)

// ── Threshold constants ───────────────────────────────────────────
const TH_CHAR_DIVERSITY_LOW  = 0.55
const TH_CHAR_DIVERSITY_HIGH = 0.95
const TH_LEN_GOOD_MIN        = 3
const TH_LEN_GOOD_MAX        = 100
const TH_LEN_SUSPICIOUS      = 180

// ─── Rule engine ─────────────────────────────────────────────────────

type Rule = {
  condition: boolean
  factor: number
  reason: string
  bonus?: boolean
}

function _applyRules(rules: Rule[], signals: CalibrationSignal[], quality: number): number {
  for (const { condition, factor, reason, bonus } of rules) {
    if (!condition) continue
    signals.push(bonus ? BONUS(factor, reason) : PENALTY(factor, reason))
    quality = bonus ? clamp(quality * factor) : quality * factor
  }
  return quality
}

// ─── CJK n-gram analysis (v2 new) ──────────────────────────────────

/**
 * Common nonsensical/impossible CJK bigrams (OCR confusion patterns).
 * Key: high-frequency error bigrams from common substitutions.
 */
const KNOWN_BAD_BIGRAMS = new Set([
  // 形近字错误
  '己巳', '巳己', '日曰', '曰日', '了阝', '阝了',
  '大太', '太大', '人入', '入人', '几凡', '凡几',
  '士土', '土士', '了子', '子了', '人马', '马人',
  '日目', '目日', '了刀', '刀了', '又叉', '叉又',
  '厂场', '场厂', '力刀', '刀力', '十千', '千十',
  '乞气', '气乞', '丁万', '万丁', '又文', '文又',
  // 不合理连续
  '的的', '了了', '久久', '连连', '常常',
  '哦啊', '啊哦', '呀哈', '哈呀',
  '之之', '乎乎', '吗啊', '啊吗',
])

/**
 * Characters that commonly look like vertical bars (OCR artifact).
 * Only Unicode vertical bar variants — NOT ASCII letters I/l.
 */
const VERTICAL_BAR_CHARS = new Set([
    '|', '\uff5c', '\u2016', '\u2502', '\u2503', '\u2550', '\u2551', '\u2560', '\u2561', '\u2562',
    '\u2563', '\u2564', '\u2565', '\u2566', '\u2567', '\u2568', '\u2569', '\u256a', '\u256b', '\u256c',
    '\u256d', '\u256e', '\u256f', '\u2570', '\u2571', '\u2572', '\u2573', '\u2500', '\u2501', '\u2504',
    '\u2505', '\u2506', '\u2507', '\u2508', '\u2509', '\u250a', '\u250b', '\u250c', '\u250d', '\u250e',
    '\u250f', '\u2510', '\u2511', '\u2512', '\u2513', '\u2514', '\u2515', '\u2516', '\u2517', '\u2518',
    '\u2519', '\u251a', '\u251b', '\u251c', '\u251d', '\u251e', '\u251f', '\u2520', '\u2521', '\u2522',
    '\u2523', '\u2524', '\u2525', '\u2526', '\u2527', '\u2528', '\u2529', '\u252a', '\u252b', '\u252c',
    '\u252d', '\u252e', '\u252f', '\u2530', '\u2531', '\u2532', '\u2533', '\u2534', '\u2535', '\u2536',
    '\u2537', '\u2538', '\u2539', '\u253a', '\u253b', '\u253c', '\u253d', '\u253e', '\u253f', '\u2540',
    '\u2541', '\u2542', '\u2543', '\u2544', '\u2545', '\u2546', '\u2547', '\u2548', '\u2549', '\u254a',
    '\u254b', '\u254c', '\u254d', '\u254e', '\u254f', '\u2552', '\u2553', '\u2554', '\u2555', '\u2556',
    '\u2557', '\u2558', '\u2559', '\u255a', '\u255b', '\u255c', '\u255d', '\u255e', '\u255f', '\u2574',
    '\u2575', '\u2576', '\u2577', '\u2578', '\u2579', '\u257a', '\u257b', '\u257c', '\u257d', '\u257e',
    '\u257f', '\u2580', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588',
    '\u2589', '\u258a', '\u258b', '\u258c', '\u258d', '\u258e', '\u258f', '\u2590', '\u2591', '\u2592',
    '\u2593', '\u2594', '\u2595', '\u2596', '\u2597', '\u2598', '\u2599', '\u259a', '\u259b', '\u259c',
    '\u259d', '\u259e', '\u259f', '\u25a0', '\u25a1', '\u25a2', '\u25a3', '\u25a4', '\u25a5', '\u25a6',
    '\u25a7', '\u25a8', '\u25a9', '\u25aa', '\u25ab', '\u25ac', '\u25ad', '\u25ae', '\u25af', '\u25b0',
    '\u25b1', '\u25b2', '\u25b3', '\u25b4', '\u25b5', '\u25b6', '\u25b7', '\u25b8', '\u25b9', '\u25ba',
    '\u25bb', '\u25bc', '\u25bd', '\u25be', '\u25bf', '\u25c0', '\u25c1', '\u25c2', '\u25c3', '\u25c4',
    '\u25c5', '\u25c6', '\u25c7', '\u25c8', '\u25c9', '\u25ca', '\u25cb', '\u25cc', '\u25cd', '\u25ce',
    '\u25cf', '\u25d0', '\u25d1', '\u25d2', '\u25d3', '\u25d4', '\u25d5', '\u25d6', '\u25d7', '\u25d8',
    '\u25d9', '\u25da', '\u25db', '\u25dc', '\u25dd', '\u25de', '\u25df', '\u25e0', '\u25e1', '\u25e2',
    '\u25e3', '\u25e4', '\u25e5', '\u25e6', '\u25e7', '\u25e8', '\u25e9', '\u25ea', '\u25eb', '\u25ec',
    '\u25ed', '\u25ee', '\u25ef', '\u25f0', '\u25f1', '\u25f2', '\u25f3', '\u25f4', '\u25f5', '\u25f6',
    '\u25f7', '\u25f8', '\u25f9', '\u25fa', '\u25fb', '\u25fc', '\u25fd', '\u25fe', '\u25ff'
  ])

/**
 * Full-width punctuation → half-width normalization pairs.
 */
const FW_PUNCT_MAP: Record<string, string> = {
  "\uff0c": ",",  // ，
  "\uff0e": ".",  // 。
  "\uff01": "!",  // ！
  "\uff1f": "?",  // ？
  "\uff1a": ":",  // ：
  "\uff1b": ";",  // ；
  "\u201c": '"',  // "
  "\u201d": '"',  // "
  "\u2018": "'",  // '
  "\u2019": "'",  // '
  "\uff08": "(",  // （
  "\uff09": ")",  // ）
  "\u3010": "[",  // 【
  "\u3011": "]",  // 】
  "\uff0d": "-",  // －
  "\u2014": "-",  // —
  "\uff5e": "~",  // ～
}

/**
 * Rare Chinese characters (康熙字典/繁体难检字) that are unlikely in subtitles.
 * Detection only — these aren't necessarily errors but lower confidence.
 */
const RARE_CJK_CHARS = new Set([
  '龜', '龍', '龠', '黽', '鱉', '鱷', '鸞', '鸚', '鷹', '鷺',
  '鸛', '鶴', '鸕', '鴻', '鴿', '鴉', '鴞', '鴛', '鴣', '鴦',
  '麗', '麝', '麥', '黃', '黍', '黑', '黹', '鼎', '鼓', '鼠',
  '鼻', '齊', '齿', '龟', '丿', '乀', '乁'
])

function _hasCJKAnomaly(text: string): boolean {
  // Check for vertical bar artifacts
  for (const ch of text) {
    if (VERTICAL_BAR_CHARS.has(ch)) return true
  }

  // Check for bad bigrams
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text[i] + text[i + 1]
    if (KNOWN_BAD_BIGRAMS.has(bigram)) return true
  }

  return false
}

function _countRareChars(text: string): number {
  let count = 0
  for (const ch of text) {
    if (RARE_CJK_CHARS.has(ch)) count++
  }
  return count
}

function _normalizeCJKPunct(text: string): { normalized: string; changed: boolean } {
  let changed = false
  let result = ''
  for (const ch of text) {
    const mapped = FW_PUNCT_MAP[ch]
    if (mapped !== undefined) {
      result += mapped
      changed = true
    } else {
      result += ch
    }
  }
  return { normalized: result, changed }
}

/** 增强校准的预计算上下文 — 提取自 calibrateEnhanced，避免参数传递爆炸 */
interface EnhancedCalibCtx {
  workingText: string
  trimmed: string
  len: number
  isCJK: boolean
  raw: number
  quality: number
  punctChanged: boolean
  /** 孤立的 CJK 字符（前后有空格） */
  orphanedCJK: boolean
  /** 引号计数 */
  dq: number
  sq: number
  /** 纯大写拉丁字母 */
  upperOnly: string
  /** 罕见 CJK 字符数 */
  rareCount: number
  /** 含竖线/异常 CJK bigram */
  hasVerticalBar: boolean
  /** 原始置信度与文本质量不匹配 */
  confMismatch: boolean
}

/**
 * 预计算所有增强校准所需条件。
 * 优化思路：将 calibrateEnhanced 中 30+ 行的预计算逻辑集中到一处，
 * 使得主方法只关注规则组装和执行。
 */
function _precomputeEnhancedContext(
  workingText: string, trimmed: string, isCJK: boolean,
  raw: number, quality: number, punctChanged: boolean,
): EnhancedCalibCtx {
  const len = trimmed.length
  const cjkBMP = /[\u4e00-\u9fff]/
  const cjkExtB = /[\uD840-\uD869][\uDC00-\uDEDF]/
  const orphanedCJK = isCJK && (
    (cjkBMP.test(workingText) && / [\u4e00-\u9fff]/.test(workingText)) ||
    (cjkExtB.test(workingText) && / [\uD840-\uD869][\uDC00-\uDEDF]/.test(workingText))
  )
  const dq = (workingText.match(/"/g) || []).length
  const sq = (workingText.match(/'/g) || []).length
  const upperOnly = workingText.replace(/[^A-Z]/g, '')
  const rareCount = _countRareChars(workingText)
  const hasVerticalBar = _hasCJKAnomaly(workingText)
  const rawIsHigh = raw > 0.88
  const textQualityScore = quality / (quality || 1)
  const confMismatch = rawIsHigh && textQualityScore < 0.75

  return {
    workingText, trimmed, len, isCJK, raw, quality, punctChanged,
    orphanedCJK, dq, sq, upperOnly, rareCount, hasVerticalBar, confMismatch,
  }
}

/**
 * 构建 CJK 专属校准规则。
 * 优化思路：从 calibrateEnhanced 提取为独立函数，
 * 职责单一，便于单独测试 CJK 规则集。
 */
function _buildCJCRules(ctx: EnhancedCalibCtx): Rule[] {
  if (!ctx.isCJK) return []
  const rules: Rule[] = [
    { condition: ctx.orphanedCJK, factor: F_ORPHANED_CJK, reason: 'orphaned CJK character' },
    { condition: ctx.dq % 2 !== 0 || ctx.sq % 2 !== 0, factor: F_UNBALANCED_QUOTE, reason: 'unbalanced quotation marks' },
    { condition: ctx.hasVerticalBar, factor: F_VERTICAL_BAR, reason: 'vertical bar character detected (OCR artifact)' },
    { condition: ctx.rareCount >= 2, factor: F_RARE_CHAR, reason: 'contains multiple rare characters' },
    { condition: /\n.{0,5}\n/.test(ctx.workingText), factor: F_CJK_LINE_BREAK, reason: 'mid-sentence line break detected' },
    { condition: /\d+[年月日时分秒]/.test(ctx.workingText), factor: F_CJK_NUMBER, reason: 'CJK numeral detected (verify accuracy)' },
  ]
  // v2: bigram anomaly check
  if (ctx.hasVerticalBar) {
    rules.push({ condition: true, factor: F_CJK_BIGRAM_ANOMALY, reason: 'impossible/nonsensical character bigram detected' })
  }
  return rules
}

/**
 * 构建非 CJK（拉丁文）校准规则。
 * 优化思路：与 _buildCJCRules 对称，职责清晰。
 */
function _buildNonCJCRules(ctx: EnhancedCalibCtx): Rule[] {
  if (ctx.isCJK) return []
  return [
    { condition: ctx.upperOnly.length >= 4 && /[a-z]/.test(ctx.trimmed), factor: F_ALL_CAPS, reason: 'all-caps (likely OCR error)' },
    { condition: / \d{1,3} /.test(ctx.workingText), factor: F_ISOLATED_DIGIT, reason: 'isolated digit fragment' },
    { condition: /[.!?]$/.test(ctx.trimmed), factor: F_SENTENCE_END, reason: 'proper sentence ending', bonus: true },
    { condition: /[,;]\s*$/.test(ctx.trimmed) && !/[.!?]$/.test(ctx.trimmed), factor: F_TRAILING_COMMA, reason: 'trailing comma (incomplete sentence)' },
  ]
}

/**
 * 构建通用校准规则（不分语言）。
 * 优化思路：独立函数后，新增通用规则只需改这一处。
 */
function _buildCommonRules(ctx: EnhancedCalibCtx): Rule[] {
  return [
    { condition: /[、,\\.。\-_]{3,}$/.test(ctx.workingText), factor: F_REPEATED_PUNCT, reason: 'repeated trailing punctuation' },
    { condition: ctx.len >= TH_LEN_GOOD_MIN && ctx.len <= TH_LEN_GOOD_MAX, factor: F_GOOD_LENGTH, reason: 'reasonable subtitle length', bonus: true },
    { condition: ctx.len > TH_LEN_SUSPICIOUS, factor: F_TOO_LONG, reason: 'suspiciously long subtitle' },
    { condition: /^[\s,.!?;:]/.test(ctx.trimmed), factor: F_LEADING_SPACE, reason: 'leading whitespace or punctuation' },
    { condition: ctx.confMismatch, factor: F_CONF_DEVIATION, reason: 'raw confidence vs text quality mismatch' },
  ]
}

// ─── Main Calibrator ──────────────────────────────────────────────

export class Calibrator {
  calibrate(text: string, raw: number): CalibrationResult {
    if (!text) return { confidence: raw, signals: [] }

    const signals: CalibrationSignal[] = []
    const len = text.replace(/\s/g, '').length

    const hasChinese  = /[\u4e00-\u9fff]/.test(text)
    const hasLatin   = /[a-zA-Z]/.test(text)
    const hasDigit   = /\d/.test(text)
    const scriptCount = [hasChinese, hasLatin, hasDigit].filter(Boolean).length

    const quality = _applyRules([
      { condition: scriptCount >= 2,                   factor: F_MIXED_SCRIPTS,    reason: 'mixed scripts detected' },
      { condition: len > 0 && len <= 2,                 factor: F_TEXT_TOO_SHORT,   reason: 'text too short (<3 chars)' },
      { condition: /(.)\1{3,}/.test(text),              factor: F_REPEATED_CHAR,    reason: 'repeated character pattern' },
      { condition: (() => {
          const unique = new Set(text.replace(/\s/g, '')).size
          const ratio = len > 0 ? unique / len : 1
          return ratio > TH_CHAR_DIVERSITY_LOW && ratio < TH_CHAR_DIVERSITY_HIGH
        })(),                                           factor: F_CHAR_DIVERSITY,   reason: 'healthy character diversity', bonus: true },
    ], signals, raw)

    return { confidence: clamp(quality), signals }
  }

  /**
   * 增强校准 — 重构后主方法仅负责：输入验证 → 标点规范化 → 预计算 → 规则组装 → 执行。
   * 规则构建逻辑拆分为 _buildCJCRules / _buildNonCJCRules / _buildCommonRules。
   */
  calibrateEnhanced(text: string, raw: number, script: Script = 'other'): CalibrationResult {
    if (!text) return { confidence: raw, signals: [] }

    const signals: CalibrationSignal[] = []
    const trimmed = text.trim()
    if (!trimmed) {
      signals.push(PENALTY(F_EMPTY_AFTER_TRIM, 'text empty after trim'))
      return { confidence: clamp(F_EMPTY_AFTER_TRIM * raw), signals }
    }

    // 优化：标点规范化后统一处理
    const { normalized: normText, changed: punctChanged } = _normalizeCJKPunct(trimmed)
    const workingText = normText
    const isCJK = script === 'chinese' || script === 'japanese' || script === 'korean'

    // 基础校准
    const base = this.calibrate(workingText, raw)
    let quality = base.confidence
    signals.push(...base.signals)

    // 优化：预计算集中到专用函数
    const ctx = _precomputeEnhancedContext(workingText, trimmed, isCJK, raw, quality, punctChanged)

    // 标点规范化奖励
    if (punctChanged) {
      signals.push(BONUS(F_CJK_PUNCT_NORM, 'CJK punctuation normalized'))
      quality = clamp(quality * F_CJK_PUNCT_NORM)
    }

    // 优化：规则按语言分组构建，主方法只负责组装和执行
    const allRules = [
      ..._buildCJCRules(ctx),
      ..._buildNonCJCRules(ctx),
      ..._buildCommonRules(ctx),
    ]
    quality = _applyRules(allRules, signals, quality)
    return { confidence: clamp(quality), signals }
  }

  detectIssues(text: string): Array<{ issue: string; suggestion: string }> {
    const issues: Array<{ issue: string; suggestion: string }> = []
    if (!text.trim().length) return issues

    if (/[\uff00-\uffef]/.test(text)) {
      issues.push({ issue: 'Contains full-width characters', suggestion: 'Convert to half-width' })
    }

    const openBr  = (text.match(/[\(\[\{]/g) || []).length
    const closeBr = (text.match(/[\)\]\}]/g) || []).length
    if (openBr !== closeBr) {
      issues.push({ issue: `Unbalanced brackets (${openBr} open / ${closeBr} close)`, suggestion: 'Fix bracket pairing' })
    }

    if (/[,;]$/.test(text) && !/[.!?]$/.test(text)) {
      issues.push({ issue: 'Text ends with comma — may be incomplete', suggestion: 'Verify source frame' })
    }

    if (/(.)\1{4,}/.test(text)) {
      issues.push({ issue: 'Detected repeated character pattern', suggestion: 'Likely OCR error' })
    }

    // v2: vertical bar detection
    for (const ch of text) {
      if (VERTICAL_BAR_CHARS.has(ch)) {
        issues.push({ issue: `Vertical bar character detected: '${ch}'`, suggestion: 'Verify character is intentional' })
        break
      }
    }

    // v2: check for CJK line break
    if (/\n.{0,5}\n/.test(text)) {
      issues.push({ issue: 'Mid-sentence line break detected', suggestion: 'Verify subtitle boundary' })
    }

    return issues
  }
}

// 优化：langToScript 已迁移到 @/utils/text，此处 re-export 保持向后兼容
export { langToScript } from '@/utils/text'

// ─── Global singleton ─────────────────────────────────────────────
let _calibrator: Calibrator | null = null

export function getCalibrator(): Calibrator {
  if (!_calibrator) _calibrator = new Calibrator()
  return _calibrator
}
