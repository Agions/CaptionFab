<script setup lang="ts">
import { ref } from 'vue'
import { useBatchProcessor, type BatchOptions } from '@/composables/useBatchProcessor'
import JobConfigPanel from './job-config-panel.vue'
import BatchProgressDialog from './batch-progress-dialog.vue'
import BaseModal from './base-modal.vue'

interface Props {
  isOpen: boolean
  selectedFiles: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const { isProcessing, overallProgress, estimatedTimeRemaining, stats, addToQueue, startBatch, cancelBatch, clearCompleted } = useBatchProcessor()

const batchOptions = ref<BatchOptions>({
  outputDir: '',
  formats: ['srt'],
  roiPreset: 'bottom',
  ocrEngine: 'tesseract',
  languages: ['zh'],
  sceneThreshold: 0.3,
  confidenceThreshold: 0.5,
  maxConcurrency: 2,
  processingMode: 'standard',
  aiCorrection: false,
})

const showProgressDialog = ref(false)

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

async function handleStartBatch() {
  if (props.selectedFiles.length === 0) return
  addToQueue(props.selectedFiles, batchOptions.value)
  showProgressDialog.value = true
  await startBatch(batchOptions.value)
}

function handleClose() {
  if (!isProcessing.value) {
    clearCompleted()
    emit('close')
  }
}
</script>

<template>
  <base-modal :is-open="isOpen" title="批量处理" @close="handleClose">
    <job-config-panel v-model="batchOptions" />

    <!-- Processing Mode -->
    <div class="option-group">
      <label>处理模式</label>
      <select v-model="batchOptions.processingMode">
        <option value="fast">🚀 快速模式</option>
        <option value="standard">⚖️ 标准模式</option>
        <option value="precise">🎯 精准模式</option>
      </select>
    </div>

    <!-- ETA Display -->
    <div v-if="estimatedTimeRemaining" class="eta-display">
      <span class="eta-label">预计剩余:</span>
      <span class="eta-value">{{ formatTime(estimatedTimeRemaining) }}</span>
    </div>

    <div class="actions">
      <button
        class="btn btn-primary"
        :disabled="selectedFiles.length === 0 || isProcessing"
        @click="handleStartBatch"
      >
        {{ isProcessing ? '处理中...' : '开始处理' }}
      </button>
      <button
        v-if="isProcessing"
        class="btn btn-secondary"
        @click="cancelBatch"
      >
        取消
      </button>
    </div>
  </base-modal>

  <batch-progress-dialog
    :is-open="showProgressDialog"
    :progress="overallProgress"
    :stats="{ total: stats.total, completed: stats.completed, failed: stats.failed }"
    @close="showProgressDialog = false"
  />
</template>

<style lang="scss" scoped>
.option-group {
  display: flex;
  @include flex-column;
  gap: $space-2;

  label {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-muted;
  }

  select {
    @include form-select;
  }
}

.eta-display {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
}

.eta-label {
  font-size: $text-xs;
  color: $text-muted;
}

.eta-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $primary;
}

.actions {
  display: flex;
  gap: $space-3;
  justify-content: flex-end;
}

.btn {
  padding: $space-2 $space-4;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: $primary;
  color: white;
  border: none;

  &:hover:not(:disabled) {
    background: color-mix(in oklch, $primary 80%, black);
  }
}

.btn-secondary {
  background: transparent;
  color: $text-secondary;
  border: 1px solid $border;

  &:hover {
    background: $bg-overlay;
  }
}
</style>
