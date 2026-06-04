<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBatchProcessor, type BatchOptions } from '@/composables/useBatchProcessor'
import { useFileDrop } from '@/composables/useFileDrop'
import { formatETA } from '@/utils/time'
import BatchDropZone from './batch/BatchDropZone.vue'
import JobList from './batch/JobList.vue'
import JobConfigPanel from './batch/JobConfigPanel.vue'

const {
  jobs,
  isProcessing,
  overallProgress,
  estimatedTimeRemaining,
  addToQueue,
  startBatch,
  cancelBatch,
  clearCompleted,
  stats
} = useBatchProcessor()

const { dropZoneActive, selectedFiles: fileObjects, handleFileDrop, handleFileSelect, removeFile } = useFileDrop({
  accept: 'video/*',
  multiple: true
})

const selectedFiles = computed(() => fileObjects.value.map(f => f.name))

const options = ref<BatchOptions>({
  outputDir: './exports',
  formats: ['srt', 'json'],
  roiPreset: 'bottom',
  ocrEngine: 'tesseract',
  languages: ['ch'],
  sceneThreshold: 0.3,
  confidenceThreshold: 0.7
})

function addToBatchAndStart() {
  if (selectedFiles.value.length === 0) return
  addToQueue(selectedFiles.value, options.value)
  startBatch(options.value)
}

// Dialog state
const isOpen = ref(false)
function openDialog() { isOpen.value = true }
function closeDialog() { isOpen.value = false }

defineExpose({ open: openDialog, close: closeDialog })
</script>

<template>
  <div v-if="isOpen" class="batch-view">
    <!-- Header -->
    <header class="batch-header">
      <div class="header-left">
        <h2 class="batch-title">批量处理</h2>
        <span v-if="jobs.length > 0" class="job-count-badge">{{ jobs.length }} 个任务</span>
        <div v-if="isProcessing" class="overall-progress-wrap">
          <div class="overall-progress-bar">
            <div class="overall-progress-fill" :style="{ width: overallProgress + '%' }" />
          </div>
          <span class="overall-progress-pct">{{ overallProgress }}%</span>
          <span v-if="estimatedTimeRemaining !== null" class="eta-label">{{ formatETA(estimatedTimeRemaining) }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="action-btn action-btn--primary"
          :disabled="selectedFiles.length === 0 || isProcessing"
          @click="addToBatchAndStart"
        >
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <path d="M6 4l10 6-10 6V4z" fill="currentColor"/>
          </svg>
          {{ isProcessing ? '处理中...' : '开始处理' }}
        </button>
        <button v-if="isProcessing" class="action-btn action-btn--danger" @click="cancelBatch">
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <rect x="5" y="5" width="4" height="10" rx="1" fill="currentColor"/>
            <rect x="11" y="5" width="4" height="10" rx="1" fill="currentColor"/>
          </svg>
          取消
        </button>
        <button v-else class="action-btn" @click="clearCompleted" :disabled="jobs.filter(j => j.status === 'completed').length === 0">
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <path d="M5 6h10M8 6V4h4v2M6 6v9h8V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          清空完成
        </button>
      </div>
    </header>

    <!-- Body: 2-column layout -->
    <div class="batch-body">
      <!-- Left: Files -->
      <div class="files-col">
        <BatchDropZone
          v-model:drop-zone-active="dropZoneActive"
          :selected-files="selectedFiles"
          @drop="handleFileDrop"
          @click="handleFileSelect"
          @remove="removeFile"
        />
        <JobConfigPanel v-model="options" />
      </div>

      <!-- Right: Jobs Queue -->
      <div class="jobs-col">
        <JobList :jobs="jobs" :stats="stats" :is-processing="isProcessing" />
      </div>
    </div>

    <!-- Close button -->
    <button class="batch-close-btn" @click="closeDialog" title="关闭">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.batch-view {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  height: 100%;
  display: flex;
  @include flex-column;
  background: $bg-base;
  animation: fade-up 0.3s ease-out both;
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-5;
  border-bottom: 1px solid $border;
  background: $bg-surface;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-3;
  flex-wrap: wrap;
}

.batch-title {
  font-size: $text-lg;
  font-weight: 700;
  color: $text-primary;
}

.job-count-badge {
  @include badge;
  padding: 3px 10px;
}

.overall-progress-wrap {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.overall-progress-bar {
  width: 80px;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.overall-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  transition: width 0.4s ease;
}

.overall-progress-pct {
  font-family: $font-display;
  font-size: 11px;
  font-weight: 700;
  color: $primary;
}

.eta-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 8px;
  border-radius: $radius-full;
}

.header-actions {
  display: flex;
  gap: $space-2;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  border-radius: $radius-lg;
  font-size: $text-sm;
  font-weight: 600;
  transition: all $transition-base;
  border: none;

  .btn-icon-svg {
    width: 16px;
    height: 16px;
  }

  &--primary {
    background: linear-gradient(135deg, $primary, lighten($primary, 8%));
    color: #fff;
    box-shadow: 0 2px 12px rgba($primary, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba($primary, 0.4);
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  &--danger {
    background: $bg-elevated;
    @include card-border-error;
    color: $error;

    &:hover { background: rgba($error, 0.08); border-color: rgba($error, 0.5); }
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.batch-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  padding: $space-4;
  overflow: hidden;
}

.files-col, .jobs-col {
  display: flex;
  @include flex-column;
  gap: $space-4;
  overflow: hidden;
}

.batch-close-btn {
  position: absolute;
  top: $space-3;
  right: $space-3;
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  background: rgba($bg-overlay, 0.8);
  border: none;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba($bg-overlay, 1);
    color: $text-primary;
  }

  svg {
    width: 18px;
    height: 18px;
  }
}
</style>
