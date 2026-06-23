<script setup lang="ts">
interface Props {
  progress: number
  stats: { total: number; completed: number; failed: number }
  isOpen: boolean
}

defineProps<Props>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="batch-progress-dialog" role="dialog" aria-modal="true">
        <div class="modal-content">
          <div class="modal-header">
            <h3>批量处理进度</h3>
            <button class="modal-close" @click="$emit('close')" aria-label="关闭">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="progress-overview">
              <div class="progress-ring-wrapper">
                <svg class="progress-ring" viewBox="0 0 140 140">
                  <circle
                    class="ring-track"
                    cx="70"
                    cy="70"
                    r="60"
                    stroke="var(--bg-overlay)"
                    stroke-width="8"
                    fill="none"
                  />
                  <circle
                    class="ring-progress"
                    cx="70"
                    cy="70"
                    r="60"
                    stroke="var(--primary)"
                    stroke-width="8"
                    fill="none"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 60"
                    :stroke-dashoffset="2 * Math.PI * 60 * (1 - progress / 100)"
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div class="ring-center">
                  <span class="ring-percent">{{ Math.round(progress) }}%</span>
                </div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">总任务</span>
              </div>
              <div class="stat-card">
                <span class="stat-value" style="color: var(--success)">{{ stats.completed }}</span>
                <span class="stat-label">已完成</span>
              </div>
              <div class="stat-card">
                <span class="stat-value" style="color: var(--error)">{{ stats.failed }}</span>
                <span class="stat-label">失败</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style lang="scss" scoped>
.batch-progress-dialog {
  @include modal-wrapper;
}

.modal-content {
  @include modal-content(320px, 400px);
}

.modal-header {
  @include modal-header;
}

.modal-close {
  @include modal-close;
}

.modal-body {
  @include modal-body(center, $space-6);
}

.progress-overview {
  display: flex;
  justify-content: center;
}

.progress-ring-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
}

.progress-ring {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);

  .ring-track {
    stroke: $bg-overlay;
  }

  .ring-progress {
    stroke: var(--primary);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 50%, transparent));
    transition: stroke-dashoffset 0.4s ease;
  }
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-percent {
  font-family: $font-display;
  font-size: 32px;
  font-weight: 800;
  color: $text-primary;
  line-height: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-3;
  width: 100%;
}

.stat-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  text-align: center;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $border-light;
  }

  .stat-value {
    display: block;
    font-family: $font-display;
    font-size: $text-lg;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 2px;
  }

  .stat-label {
    font-size: 10px;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

@include modal-fade('modal-fade');
</style>
