<script setup lang="ts">
import type { BatchOptions } from '@/composables/useBatchProcessor'

interface Props {
  modelValue: BatchOptions
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: BatchOptions]
}>()

function updateField<K extends keyof BatchOptions>(key: K, value: BatchOptions[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <section class="panel-section">
    <div class="section-header">
      <span class="section-label">处理选项</span>
    </div>

    <div class="option-grid">
      <div class="option-item">
        <label class="option-label">OCR 引擎</label>
        <select :value="modelValue.ocrEngine" @change="updateField('ocrEngine', ($event.target as HTMLSelectElement).value as any)">
          <option value="tesseract">Tesseract.js</option>
          <option value="paddle">PaddleOCR</option>
          <option value="easyocr">EasyOCR</option>
        </select>
      </div>

      <div class="option-item">
        <label class="option-label">字幕区域</label>
        <select :value="modelValue.roiPreset" @change="updateField('roiPreset', ($event.target as HTMLSelectElement).value)">
          <option value="bottom">底部字幕</option>
          <option value="top">顶部字幕</option>
          <option value="left">左侧字幕</option>
          <option value="right">右侧字幕</option>
          <option value="center">中心字幕</option>
        </select>
      </div>
    </div>

    <div class="option-item">
      <label class="option-label">导出格式</label>
      <div class="format-chips">
        <label v-for="fmt in ['srt','vtt','ass','json']" :key="fmt" :class="['chip', { active: modelValue.formats.includes(fmt as any) }]">
          <input type="checkbox" :value="fmt" :checked="modelValue.formats.includes(fmt as any)" @change="handleFormatChange(fmt, ($event.target as HTMLInputElement).checked)" />
          {{ fmt.toUpperCase() }}
        </label>
      </div>
    </div>

    <div class="option-item">
      <label class="option-label">置信度阈值 <span class="threshold-val">{{ Math.round(modelValue.confidenceThreshold * 100) }}%</span></label>
      <div class="slider-track">
        <div class="slider-fill" :style="{ width: modelValue.confidenceThreshold * 100 + '%' }" />
        <input type="range" :value="modelValue.confidenceThreshold" @input="updateField('confidenceThreshold', parseFloat(($event.target as HTMLInputElement).value))" min="0" max="1" step="0.01" class="slider" />
      </div>
    </div>
  </section>
</template>

<script lang="ts">
export default {
  methods: {
    handleFormatChange(fmt: string, checked: boolean) {
      const formats = checked
        ? [...this.modelValue.formats, fmt as any]
        : this.modelValue.formats.filter(f => f !== fmt)
      this.$emit('update:modelValue', { ...this.modelValue, formats })
    }
  }
}
</script>

<style lang="scss" scoped>
.panel-section {
  background: $bg-surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-4;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $space-3;
}

.section-label {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
  margin-bottom: $space-3;
}

.option-item {
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.option-label {
  font-size: $text-xs;
  font-weight: 600;
  color: $text-muted;
}

.option-select {
  padding: $space-2 $space-3;
  border: 1px solid $border;
  border-radius: $radius-sm;
  background: $bg-elevated;
  color: $text-secondary;
  font-size: $text-sm;
  cursor: pointer;

  &:focus {
    border-color: $primary;
    outline: none;
  }
}

.format-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-muted;
  cursor: pointer;
  transition: all $transition-base;

  input[type="checkbox"] {
    display: none;
  }

  &:hover {
    border-color: $border-light;
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.1);
    color: $primary;
  }
}

.threshold-val {
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 700;
  color: $primary;
  min-width: 32px;
  text-align: right;
}

.slider-track {
  position: relative;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.slider-fill {
  height: 100%;
  background: $primary;
  border-radius: $radius-full;
}

.slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
