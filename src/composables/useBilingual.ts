import { ref } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { Translator, type TranslatorConfig } from '@/core/Translator'

export function useBilingual() {
  const subtitleStore = useSubtitleStore()
  const isTranslating = ref(false)
  const translationProgress = ref(0)

  async function translateSubtitles(config: TranslatorConfig) {
    if (subtitleStore.subtitles.length === 0) return
    isTranslating.value = true
    translationProgress.value = 0
    try {
      const translator = new Translator(config)
      const texts = subtitleStore.subtitles.map(s => s.text)
      const results = await translator.translateBatch(texts)
      for (let i = 0; i < subtitleStore.subtitles.length; i++) {
        subtitleStore.subtitles[i].translatedText = results[i].translated
      }
      translationProgress.value = 100
    } finally {
      isTranslating.value = false
    }
  }

  function clearTranslations() {
    for (const sub of subtitleStore.subtitles) {
      sub.translatedText = undefined
    }
  }

  return { isTranslating, translationProgress, translateSubtitles, clearTranslations }
}
