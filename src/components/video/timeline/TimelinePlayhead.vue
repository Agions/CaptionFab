<script setup lang="ts">
defineOptions({ name: 'TimelinePlayhead' })

interface Props {
  position: number
  isDragging: boolean
}

defineProps<Props>()

defineEmits<{
  mousedown: [event: MouseEvent]
}>()
</script>

<template>
  <div
    class="playhead"
    :class="{ dragging: isDragging }"
    :style="{ left: `${position}%` }"
    @mousedown="$emit('mousedown', $event)"
  >
    <div class="playhead-head" />
    <div class="playhead-line" />
  </div>
</template>

<style lang="scss" scoped>
.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  z-index: 10;
  pointer-events: auto;
  cursor: ew-resize;

  &.dragging .playhead-head {
    background: $accent;
  }
}

.playhead-head {
  position: absolute;
  top: -4px;
  left: -6px;
  width: 12px;
  height: 12px;
  border-radius: $radius-full;
  background: $primary;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: background 0.15s ease;
}

.playhead-line {
  position: absolute;
  top: 12px;
  left: -1px;
  width: 2px;
  bottom: 0;
  background: $primary;
  opacity: 0.6;
}
</style>
