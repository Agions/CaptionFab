<script setup lang="ts">
import { computed } from 'vue'
import type { BatchJob } from '@/composables/useBatchProcessor'
import JobCard from './job-card.vue'

interface Props {
  jobs: BatchJob[]
  stats: { total: number; completed: number; failed: number }
  isProcessing: boolean
}

const props = defineProps<Props>()

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
const JOB_STATUS_INFO: Record<JobStatus, { color: string; label: string }> = {
  pending: { color: 'var(--text-muted)', label: '等待中' },
  processing: { color: 'var(--primary)', label: '处理中' },
  completed: { color: 'var(--success)', label: '已完成' },
  failed: { color: 'var(--error)', label: '失败' },
  cancelled: { color: 'var(--warning)', label: '已取消' }
}

function getStatusColor(status: BatchJob['status']): string {
  return JOB_STATUS_INFO[status as JobStatus]?.color ?? 'var(--text-muted)'
}

function getStatusText(status: BatchJob['status']): string {
  return JOB_STATUS_INFO[status as JobStatus]?.label ?? status
}

const s = computed(() => ({
  total: props.stats.total,
  completed: props.stats.completed,
  failed: props.stats.failed
}))
</script>

<template>
  <section class="panel-section jobs-section">
    <div class="section-header">
      <span class="section-label">处理队列</span>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-chip">
        <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>{{ s.total }}</span>
      </div>
      <div class="stat-chip stat-success">
        <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>{{ s.completed }}</span>
      </div>
      <div class="stat-chip stat-error">
        <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 3v3M6 8.5v.5" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>{{ s.failed }}</span>
      </div>
    </div>

    <!-- Job list -->
    <div class="job-list" v-if="jobs.length > 0">
      <transition-group name="job-list" tag="div">
        <job-card
          v-for="job in jobs"
          :key="job.id"
          :job="job"
          :status-color="getStatusColor(job.status)"
          :status-text="getStatusText(job.status)"
        />
      </transition-group>
    </div>

    <!-- Empty state -->
    <div v-else class="jobs-empty">
      <svg class="empty-icon" viewBox="0 0 64 48" fill="none">
        <rect x="8" y="8" width="48" height="32" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4"/>
        <path d="M24 20l10 6-10 6V20z" fill="currentColor" opacity="0.2"/>
        <circle cx="50" cy="12" r="6" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
        <path d="M50 9v3M50 12v.5" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
      </svg>
      <p class="empty-title">暂无处理任务</p>
      <p class="empty-hint">添加视频文件并开始处理</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.panel-section {
  background: $bg-surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-4;
  display: flex;
  @include flex-column;
  gap: $space-4;
  flex: 1;
  overflow: hidden;
}

.stats-row {
  display: flex;
  gap: $space-2;
}

.stat-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;

  svg {
    width: 14px;
    height: 14px;
  }

  &.stat-success {
    color: $success;
    border-color: rgba($success, 0.3);
  }

  &.stat-error {
    color: $error;
    border-color: rgba($error, 0.3);
  }
}

.job-list {
  display: flex;
  @include flex-column;
  gap: $space-2;
  flex: 1;
  overflow-y: auto;
  @include custom-scrollbar;
}

.jobs-empty {
  flex: 1;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  text-align: center;
  color: $text-muted;
}

.empty-icon {
  width: 64px;
  height: 48px;
  opacity: 0.5;
}

.empty-title {
  font-size: $text-base;
  font-weight: 600;
}

.empty-hint {
  font-size: $text-sm;
}

.job-list-enter-active,
.job-list-leave-active {
  transition: all 0.2s ease;
}

.job-list-enter-from,
.job-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
