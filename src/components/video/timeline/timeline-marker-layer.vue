<script setup lang="ts">
interface Marker {
  id: string
  frame: number
  endFrame: number
  text: string
}

interface Props {
  markers: Marker[]
  selectedId: string | null
  totalFrames: number
}

defineProps<Props>()

defineEmits<{
  select: [event: MouseEvent, marker: Marker]
}>()
</script>

<template>
  <div class="subtitle-markers">
    <div
      v-for="marker in markers"
      :key="marker.id"
      v-memo="[marker.id, marker.frame, marker.endFrame]"
      class="subtitle-marker"
      :class="{ selected: selectedId === marker.id }"
      :style="{
        left: `${(marker.frame / totalFrames) * 100}%`,
        width: `${Math.max(0.1, ((marker.endFrame - marker.frame) / totalFrames) * 100)}%`
      }"
      @click="$emit('select', $event, marker)"
      :title="marker.text"
    >
      <span class="marker-label">{{ marker.text.slice(0, 16) }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.subtitle-markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.subtitle-marker {
  position: absolute;
  top: 4px;
  height: 20px;
  background: rgba($primary, 0.3);
  border-radius: 2px;
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  transition: all 0.15s ease;

  &:hover {
    background: rgba($primary, 0.5);
  }

  &.selected {
    background: $primary;
    box-shadow: 0 0 0 1px rgba($primary, 0.5);
  }
}

.marker-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.subtitle-marker:hover .marker-label,
.subtitle-marker.selected .marker-label {
  opacity: 1;
}
</style>
