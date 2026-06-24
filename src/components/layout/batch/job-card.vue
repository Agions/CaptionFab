<script setup lang="ts">
import type { BatchJob } from '@/composables/useBatchProcessor'

interface Props {
  job: BatchJob
  statusColor: string
  statusText: string
}

defineProps<Props>()

defineEmits<{
  retry: [jobId: string]
  remove: [jobId: string]
}>()
</script>

<template>
  <div :class="['job-card', job.status]">
    <div :class="['job-bar', `bar-${job.status}`]" />

    <div class="job-main">
      <div class="job-left">
        <div :class="['job-status-icon', job.status]">
          <svg v-if="job.status === 'completed'" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="job.status === 'failed'" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else-if="job.status === 'processing'" class="spin" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v2M6 9v2M1 6H3M9 6h2M2.2 2.2l1.4 1.4M8.4 8.4l1.4 1.4M2.2 9.8l1.4-1.4M8.4 3.6l1.4-1.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>
          </svg>
        </div>

        <div class="job-info">
          <span class="job-name">{{ job.inputPath.split('/').pop() ?? job.inputPath }}</span>
          <span class="job-status-text" :style="{ color: statusColor }">
            {{ statusText }}
          </span>
        </div>
      </div>

      <div class="job-right">
        <div v-if="job.status === 'processing'" class="job-progress-wrap">
          <div class="job-progress-bar">
            <div class="job-progress-fill" :style="{ width: job.progress + '%' }" />
          </div>
          <span class="job-progress-pct">{{ Math.round(job.progress) }}%</span>
          <span v-if="job.stageLabel" class="job-stage-label">{{ job.stageLabel }}</span>
        </div>

        <span v-else-if="job.status === 'failed'" class="job-error-text">{{ job.error }}</span>

        <div class="job-actions">
          <button
            v-if="job.status === 'failed'"
            class="job-action-btn"
            @click="$emit('retry', job.id)"
            title="重试"
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M13.5 4v3.5H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="job-action-btn job-action-btn--remove" @click="$emit('remove', job.id)" title="移除">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.job-card {
  position: relative;
  background: $bg-elevated;
  @include card-border;
  border-radius: $radius-md;
  padding: $space-3;
  transition: all $transition-base;
  animation: card-enter 0.2s ease-out;

  &.completed {
    border-color: rgba($success, 0.3);
  }

  &.failed {
    border-color: rgba($error, 0.3);
    background: rgba($error, 0.05);
  }

  &.processing {
    border-color: rgba($primary, 0.3);
  }
}

.job-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: $radius-md 0 0 $radius-md;

  &.bar-pending { background: $text-muted; }
  &.bar-processing { background: $primary; }
  &.bar-completed { background: $success; }
  &.bar-failed { background: $error; }
  &.bar-cancelled { background: $warning; }
}

.job-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $space-3;
}

.job-left {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex: 1;
  min-width: 0;
}

.job-status-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }

  &.completed svg { color: $success; }
  &.failed svg { color: $error; }
  &.processing svg { color: $primary; }
}

.job-info {
  display: flex;
  @include flex-column;
  gap: 2px;
  min-width: 0;
}

.job-name {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-status-text {
  font-size: $text-xs;
  color: $text-muted;
}

.job-right {
  display: flex;
  @include flex-column;
  align-items: flex-end;
  gap: $space-2;
  flex-shrink: 0;
}

.job-progress-wrap {
  display: flex;
  @include flex-column;
  align-items: flex-end;
  gap: 2px;
  min-width: 80px;
}

.job-progress-bar {
  width: 80px;
  height: 4px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.job-progress-fill {
  height: 100%;
  background: $primary;
  border-radius: $radius-full;
  transition: width 0.3s ease;
}

.job-progress-pct {
  font-family: $font-display;
  font-size: 10px;
  font-weight: 700;
  color: $primary;
}

.job-stage-label {
  font-size: 9px;
  color: $text-muted;
}

.job-error-text {
  font-size: 10px;
  color: $error;
  text-align: right;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-actions {
  display: flex;
  gap: 4px;
}

.job-action-btn {
  @include icon-btn(28px, $radius-sm, rgba($primary, 0.1), $primary);

  &--remove:hover {
    background: rgba($error, 0.1);
    color: $error;
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
