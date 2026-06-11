/**
 * AICorrector — AI 字幕校对引擎
 * =================================
 * 调用本地 LLM API 对 OCR 结果进行智能纠错：
 * - 错别字修正
 * - 标点规范化
 * - 上下文一致性检查
 */

export interface AICorrectorConfig {
  apiEndpoint: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export interface CorrectionResult {
  original: string
  corrected: string
  confidence: number
  changes: Array<{
    type: 'typo' | 'punctuation' | 'context'
    original: string
    corrected: string
  }>
}

export class AICorrector {
  private config: AICorrectorConfig

  constructor(config: AICorrectorConfig) {
    this.config = config
  }

  async correct(text: string, context?: string): Promise<CorrectionResult> {
    if (!text.trim()) {
      return { original: text, corrected: text, confidence: 1, changes: [] }
    }

    try {
      const prompt = this.buildPrompt(text, context)
      const response = await this.callLLM(prompt)
      return this.parseResponse(text, response)
    } catch {
      return {
        original: text,
        corrected: text,
        confidence: 0,
        changes: [],
      }
    }
  }

  async correctBatch(texts: string[], context?: string): Promise<CorrectionResult[]> {
    const results: CorrectionResult[] = []
    for (const text of texts) {
      results.push(await this.correct(text, context))
    }
    return results
  }

  private buildPrompt(text: string, context?: string): string {
    let prompt = `你是一个专业的字幕校对助手。请修正以下 OCR 识别结果中的错误：

原文：${text}

要求：
1. 修正错别字
2. 规范标点符号
3. 保持原意不变
4. 如果是多语言混合，保持语言一致性

请返回 JSON 格式：
{
  "corrected": "修正后的文本",
  "confidence": 0.95,
  "changes": [
    {
      "type": "typo|punctuation|context",
      "original": "原文片段",
      "corrected": "修正后"
    }
  ]
}

只返回 JSON，不要其他内容。`

    if (context) {
      prompt = `上下文信息：${context}\n\n${prompt}`
    }

    return prompt
  }

  private async callLLM(prompt: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: '你是一个专业的字幕校对助手。只返回JSON格式结果。' },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  private parseResponse(original: string, response: string): CorrectionResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      
      // Try to find JSON object
      const objMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (objMatch) {
        jsonStr = objMatch[0]
      }

      const parsed = JSON.parse(jsonStr)
      return {
        original,
        corrected: parsed.corrected || original,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
      }
    } catch {
      // If parsing fails, return original text
      return {
        original,
        corrected: original,
        confidence: 0,
        changes: [],
      }
    }
  }
}
