<script setup lang="ts">
import { inject, ref } from 'vue'
import { useBilingual } from '@/composables/useBilingual'
import type { TranslatorConfig } from '@/core/Translator'

const openExportDialog = inject<() => void>('openExportDialog')

const { isTranslating, translationProgress, translateSubtitles, clearTranslations } = useBilingual()

// Translation settings
const provider = ref<TranslatorConfig['provider']>('google')
const apiKey = ref('')
const sourceLang = ref('en')
const targetLang = ref('zh')

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
]

async function handleTranslate() {
  const config: TranslatorConfig = {
    provider: provider.value,
    apiKey: apiKey.value || undefined,
    sourceLang: sourceLang.value,
    targetLang: targetLang.value,
  }
  await translateSubtitles(config)
}

function openExport() {
  openExportDialog?.()
}
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-title">导出格式</span>
      </div>
      <!-- Export format cards rendered by parent SidePanel -->
      <button class="export-action-btn" @click="openExport">
        <svg class="export-btn-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 14v3h14v-3M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导出字幕文件
      </button>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">🌐 双语字幕</span>
      </div>

      <div class="translation-settings">
        <div class="setting-row">
          <label class="setting-label">翻译引擎</label>
          <select v-model="provider" class="setting-select">
            <option value="google">Google Translate (免费)</option>
            <option value="deepl">DeepL</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        <div class="setting-row" v-if="provider !== 'google'">
          <label class="setting-label">API Key</label>
          <input
            v-model="apiKey"
            type="password"
            class="setting-input"
            :placeholder="provider === 'deepl' ? 'DeepL Auth Key' : 'OpenAI API Key'"
          />
        </div>

        <div class="setting-row">
          <label class="setting-label">源语言</label>
          <select v-model="sourceLang" class="setting-select">
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>

        <div class="setting-row">
          <label class="setting-label">目标语言</label>
          <select v-model="targetLang" class="setting-select">
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>

        <div v-if="isTranslating" class="translation-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: translationProgress + '%' }"></div>
          </div>
          <span class="progress-text">翻译中... {{ translationProgress }}%</span>
        </div>

        <div class="translation-actions">
          <button
            class="btn-translate"
            :disabled="isTranslating"
            @click="handleTranslate"
          >
            🌐 翻译字幕
          </button>
          <button
            class="btn-clear"
            @click="clearTranslations"
          >
            🗑️ 清除翻译
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translation-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.setting-select,
.setting-input {
  padding: 6px 10px;
  border: 1px solid var(--border-color, #333);
  border-radius: 4px;
  background: var(--bg-secondary, #1a1a1a);
  color: var(--text-primary, #fff);
  font-size: 13px;
}

.setting-select:focus,
.setting-input:focus {
  outline: none;
  border-color: var(--accent-color, #6366f1);
}

.translation-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 4px;
  background: var(--bg-tertiary, #333);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color, #6366f1);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--text-secondary, #999);
  text-align: center;
}

.translation-actions {
  display: flex;
  gap: 8px;
}

.btn-translate,
.btn-clear {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-translate {
  background: var(--accent-color, #6366f1);
  color: white;
}

.btn-translate:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-translate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clear {
  background: var(--bg-tertiary, #333);
  color: var(--text-primary, #fff);
}

.btn-clear:hover {
  background: var(--bg-hover, #444);
}
</style>
