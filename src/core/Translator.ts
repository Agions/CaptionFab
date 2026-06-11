/**
 * Translator — 多引擎字幕翻译服务
 * ==================================
 * 支持 Google Translate (免费)、DeepL、OpenAI 三种翻译引擎。
 */

export interface TranslatorConfig {
  provider: 'google' | 'deepl' | 'openai'
  apiKey?: string
  sourceLang: string
  targetLang: string
  endpoint?: string
}

export interface TranslationResult {
  original: string
  translated: string
  confidence: number
}

export class Translator {
  private config: TranslatorConfig

  constructor(config: TranslatorConfig) {
    this.config = config
  }

  async translate(text: string): Promise<TranslationResult> {
    switch (this.config.provider) {
      case 'google': return this.translateGoogle(text)
      case 'deepl': return this.translateDeepL(text)
      case 'openai': return this.translateOpenAI(text)
    }
  }

  async translateBatch(texts: string[]): Promise<TranslationResult[]> {
    const results: TranslationResult[] = []
    for (const text of texts) {
      results.push(await this.translate(text))
    }
    return results
  }

  // Google Translate (free)
  private async translateGoogle(text: string): Promise<TranslationResult> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${this.config.sourceLang}&tl=${this.config.targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const response = await fetch(url)
    const data = await response.json()
    const translated = data[0].map((item: any[]) => item[0]).join('')
    return { original: text, translated, confidence: 0.9 }
  }

  // DeepL
  private async translateDeepL(text: string): Promise<TranslationResult> {
    const url = this.config.endpoint || 'https://api-free.deepl.com/v2/translate'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: this.config.sourceLang.toUpperCase(),
        target_lang: this.config.targetLang.toUpperCase(),
      }),
    })
    const data = await response.json()
    return { original: text, translated: data.translations[0].text, confidence: 0.95 }
  }

  // OpenAI
  private async translateOpenAI(text: string): Promise<TranslationResult> {
    const url = this.config.endpoint || 'https://api.openai.com/v1/chat/completions'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `Translate from ${this.config.sourceLang} to ${this.config.targetLang}. Keep natural for subtitles.` },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    })
    const data = await response.json()
    return { original: text, translated: data.choices[0].message.content, confidence: 0.9 }
  }
}
