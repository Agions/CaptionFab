<script setup lang="ts">
import { ref } from 'vue'
import { useBatchProcessor, type BatchOptions } from '@/composables/useBatchProcessor'
import JobConfigPanel from './JobConfigPanel.vue'
import BatchProgressDialog from './BatchProgressDialog.vue'

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
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="batch-dialog" role="dialog" aria-modal="true">
        <div class="modal-content">
          <div class="modal-header">
            <h3>批量处理</h3>
            <button class="modal-close" @click="handleClose" aria-label="关闭">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <JobConfigPanel v-model="batchOptions" />

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
          </div>
        </div>
      </div>
    </transition>
  </teleport>

  <BatchProgressDialog
    :is-open="showProgressDialog"
    :progress="overallProgress"
    :stats="{ total: stats.total, completed: stats.completed, failed: stats.failed }"
    @close="showProgressDialog = false"
  />
</template>

<style lang="scss" scoped>
.batch-dialog {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($bg-base, 0.8);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: $bg-surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-6;
  min-width: 360px;
  max-width: 480px;
  animation: fade-up 0.3s ease-out both;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $space-4;
}

.modal-header h3 {
  font-size: $text-lg;
  font-weight: 700;
  color: $text-primary;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover {
    background: $bg-overlay;
    color: $text-primary;
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.modal-body {
  display: flex;
  @include flex-column;
  gap: $space-4;
}

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

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
