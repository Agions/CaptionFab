<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatFrameToTime } from '@/utils/time'

interface Props {
  hoverFrame: number
  totalFrames: number
  fps: number
  thumbnail: string | null
}

defineProps<Props>()

const rootRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // 初始渲染后确保 DOM 可用
})

defineExpose({ rootEl: rootRef })
</script>

<template>
  <div
    ref="rootRef"
    class="timeline-preview"
    :style="{
      left: `${(hoverFrame / totalFrames) * 100}%`,
      transform: 'translateX(-50%)'
    }"
  >
    <img
      v-if="thumbnail"
      :src="thumbnail"
      class="preview-thumbnail"
      alt="Frame preview"
    />
    <span class="preview-time">{{ formatFrameToTime(hoverFrame, fps) }}</span>
    <span class="preview-frame">#{{ hoverFrame.toLocaleString() }}</span>
  </div>
</template>

<style lang="scss" scoped>
.timeline-preview {
  position: absolute;
  top: -180px;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: none;
  background: $bg-surface;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-2;
  box-shadow: $shadow-lg;
  min-width: 160px;
  display: none;
  animation: tooltip-enter 0.15s ease-out;
}

.preview-thumbnail {
  width: 100%;
  height: auto;
  border-radius: $radius-sm;
  margin-bottom: $space-2;
}

.preview-time {
  display: block;
  font-family: $font-mono;
  font-size: $text-sm;
  font-weight: 700;
  color: $text-primary;
  text-align: center;
  margin-bottom: 2px;
}

.preview-frame {
  display: block;
  font-family: $font-mono;
  font-size: $text-xs;
  color: $text-muted;
  text-align: center;
}

@keyframes tooltip-enter {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
