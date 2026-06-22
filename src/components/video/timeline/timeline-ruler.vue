<script setup lang="ts">
import { formatFrameToTime } from '@/utils/time'

interface Props {
  totalFrames: number
  fps: number
}

defineProps<Props>()
</script>

<template>
  <div class="timeline-ruler">
    <span
      v-for="i in Math.ceil(totalFrames / (fps * 10))"
      :key="i"
      class="ruler-mark"
      :style="{ left: `${(i * fps * 10 / totalFrames) * 100}%` }"
    >
      {{ formatFrameToTime(i * fps * 10, fps) }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.timeline-ruler {
  position: relative;
  height: 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.ruler-mark {
  position: absolute;
  font-family: $font-mono;
  font-size: 9px;
  color: $gray-600;
  transform: translateX(-50%);
  padding-top: 2px;
}
</style>
