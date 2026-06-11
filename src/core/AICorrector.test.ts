import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AICorrector } from './AICorrector'

describe('AICorrector', () => {
  let corrector: AICorrector
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockClear()
    corrector = new AICorrector({
      apiEndpoint: 'http://localhost:11434/v1/chat/completions',
      apiKey: '',
      model: 'llama3',
      temperature: 0.3,
      maxTokens: 1000,
    })
  })

  it('should return empty text unchanged', async () => {
    const result = await corrector.correct('')
    expect(result.corrected).toBe('')
    expect(result.confidence).toBe(1)
  })

  it('should correct typos via LLM', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              corrected: '今天天气真好',
              confidence: 0.95,
              changes: [{
                type: 'typo',
                original: '今天天汽真好',
                corrected: '今天天气真好',
              }],
            }),
          },
        }],
      }),
    })

    const result = await corrector.correct('今天天汽真好')
    expect(result.corrected).toBe('今天天气真好')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.changes).toHaveLength(1)
  })

  it('should handle LLM API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const result = await corrector.correct('测试文本')
    expect(result.corrected).toBe('测试文本')
    expect(result.confidence).toBe(0)
  })

  it('should handle invalid JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: { content: '这不是JSON格式' },
        }],
      }),
    })

    const result = await corrector.correct('测试')
    expect(result.corrected).toBe('测试')
    expect(result.confidence).toBe(0)
  })

  it('should process batch corrections', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              corrected: '修正后',
              confidence: 0.9,
              changes: [],
            }),
          },
        }],
      }),
    })

    const results = await corrector.correctBatch(['文本1', '文本2'])
    expect(results).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
