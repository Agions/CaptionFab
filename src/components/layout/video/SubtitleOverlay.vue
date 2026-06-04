<script setup lang="ts">
defineOptions({ name: 'SubtitleOverlay' })

interface Props {
  text: string
}

defineProps<Props>()
</script>

<template>
  <transition name="subtitle">
    <div class="subtitle-overlay">
      <div class="subtitle-text">{{ text }}</div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.subtitle-overlay {
  position: absolute;
  bottom: $space-6;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: $z-raised;
}

.subtitle-text {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  color: white;
  padding: $space-2 $space-5;
  border-radius: var(--radius-md);
  font-size: $text-xs;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: $shadow-lg;
}

.subtitle-enter-active,
.subtitle-leave-active {
  transition: all 0.2s ease;
}

.subtitle-enter-from,
.subtitle-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
