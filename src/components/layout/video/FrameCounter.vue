<script setup lang="ts">
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()
</script>

<template>
  <div class="frame-counter">
    <span class="frame-label">F</span>
    <span class="frame-num">{{ projectStore.currentFrame.toLocaleString() }}</span>
  </div>
</template>

<style lang="scss" scoped>
.frame-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  background: $bg-overlay;
  border: 1px solid $border;
  border-radius: $radius-sm;
  padding: 4px 10px;
  font-family: $font-display;
}

.frame-label {
  font-size: $text-xs;
  font-weight: 700;
  color: $text-muted;
}

.frame-num {
  font-size: $text-sm;
  font-weight: 800;
  color: $text-primary;
  min-width: 48px;
  text-align: right;
}
</style>
