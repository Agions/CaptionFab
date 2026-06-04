<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  isReady: boolean
  isLoading: boolean
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  init: [el: HTMLVideoElement]
  load: [url: string]
  'toggle-play': []
  'seek-to-frame': [frame: number]
  'seek-relative': [frames: number]
  'capture-frame': []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  if (videoRef.value) {
    emit('init', videoRef.value)
  }
})

watch(() => props.isLoading, (loading) => {
  if (!loading && videoRef.value) {
    emit('load', videoRef.value.src)
  }
})
</script>

<template>
  <div class="video-wrapper">
    <video
      ref="videoRef"
      class="video-element"
      preload="metadata"
      @click="$emit('toggle-play')"
    />

    <!-- Loading State -->
    <transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-ring">
          <svg viewBox="0 0 60 60" class="ring-svg">
            <circle cx="30" cy="30" r="24" class="ring-track"/>
            <circle cx="30" cy="30" r="24" class="ring-progress"/>
          </svg>
        </div>
        <span class="loading-text">正在分析视频...</span>
      </div>
    </transition>

    <!-- Error State -->
    <transition name="fade">
      <div v-if="error" class="error-state">
        <svg viewBox="0 0 24 24" fill="none" class="error-icon">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 7v5M12 15.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="error-text">{{ error }}</span>
      </div>
    </transition>

    <!-- Subtitle Overlay Slot -->
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.video-element {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  background: rgba($gray-950, 0.9);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.loading-ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.ring-svg {
  width: 56px;
  height: 56px;
  transform: rotate(-90deg);
}

.ring-track {
  stroke: $bg-overlay;
  stroke-width: 4;
  fill: none;
}

.ring-progress {
  stroke: $primary;
  stroke-width: 4;
  fill: none;
  stroke-dasharray: 150;
  stroke-dashoffset: 150;
  animation: load-ring 1.5s ease-out infinite;
}

@keyframes load-ring {
  0% { stroke-dashoffset: 150; }
  50% { stroke-dashoffset: 75; }
  100% { stroke-dashoffset: 0; }
}

.loading-text {
  font-size: $text-sm;
  color: $text-secondary;
}

.error-state {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  background: rgba($error, 0.1);
  z-index: 10;
}

.error-icon {
  width: 48px;
  height: 48px;
  color: $error;
}

.error-text {
  font-size: $text-sm;
  color: $error;
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
