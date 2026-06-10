<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, provide } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from '@/composables/usePlayer'
import { useFileDrop } from '@/composables/useFileDrop'
import { formatTimeShort, formatTimePrecise } from '@/utils/time'
import { findSubtitleAtTime } from '@/utils/subtitleSearch'
import VideoPlayer from './video/VideoPlayer.vue'
import SubtitleOverlay from './video/SubtitleOverlay.vue'
import FrameCounter from './video/FrameCounter.vue'
import DropImportArea from './video/DropImportArea.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const {
  isReady,
  isLoading,
  error,
  initVideo,
  loadVideo,
  togglePlay,
  seekToFrame,
  seekRelative,
  handleKeydown,
  captureFrameAsDataURL
} = useVideoPlayer()

const { handleFileDrop, handleFileSelect } = useFileDrop({
  accept: 'video/*',
  multiple: false,
  onFilesSelected: (files) => {
    const file = files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      projectStore.setVideo(file.name, {
        path: url,
        width: 1920,
        height: 1080,
        duration: 0,
        fps: 30,
        totalFrames: 0,
        codec: ''
      })
      loadVideo(url)
    }
  }
})

const videoElement = ref<HTMLVideoElement | null>(null)
const isDragOver = ref(false)
const hoverTime = ref<number | null>(null)
const hoverX = ref(0)

// 优化：provide 移到 setup 顶层，确保在子组件挂载前可用
// 原来在 onMounted 内调用是 Vue 反模式，可能导致子组件注入失败
provide('seekToFrame', seekToFrame)
provide('captureFrame', captureFrameAsDataURL)

onMounted(() => {
  if (videoElement.value) {
    initVideo(videoElement.value)
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => projectStore.videoPath, (path) => {
  if (path && videoElement.value) {
    loadVideo(path)
  }
})

function handleProgressClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  if (projectStore.videoMeta) {
    const frame = Math.floor(percent * projectStore.videoMeta.totalFrames)
    seekToFrame(frame)
  }
}

function handleTimelineHover(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  if (projectStore.videoMeta) {
    hoverTime.value = percent * projectStore.duration
    hoverX.value = x
  }
}

function handleTimelineLeave() {
  hoverTime.value = null
}

const currentSubtitle = computed(() => {
  if (!projectStore.hasVideo || subtitleStore.subtitles.length === 0) return null
  // 优化：二分查找提取到 utils/subtitleSearch.ts，可复用且可独立测试
  return findSubtitleAtTime(subtitleStore.subtitles, projectStore.currentTime)
})

const hasVideo = computed(() => projectStore.hasVideo)
</script>

<template>
  <main class="video-preview">
    <!-- Video Area -->
    <div
      class="video-container"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="handleFileDrop"
    >
      <!-- Empty State + Drop Zone -->
      <DropImportArea
        :has-video="hasVideo"
        :is-drag-over="isDragOver"
        @drop="handleFileDrop"
        @click="handleFileSelect"
      />

      <!-- Video Player -->
      <VideoPlayer
        v-if="hasVideo"
        ref="videoElement"
        :is-ready="isReady"
        :is-loading="isLoading"
        :error="error"
        @init="initVideo"
        @load="loadVideo"
        @toggle-play="togglePlay"
        @seek-to-frame="seekToFrame"
        @seek-relative="seekRelative"
        @capture-frame="captureFrameAsDataURL"
      >
        <!-- Subtitle Overlay -->
        <SubtitleOverlay v-if="currentSubtitle" :text="currentSubtitle.text" />
      </VideoPlayer>

      <!-- ROI Selector -->
      <slot v-if="isReady && hasVideo" name="roi-selector" />
    </div>

    <!-- Controls -->
    <div class="video-controls">
      <button
        class="ctrl-btn ctrl-play"
        @click="togglePlay"
        :disabled="!hasVideo"
        :title="projectStore.isPlaying ? '暂停' : '播放'"
      >
        <svg v-if="projectStore.isPlaying" viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>
        </svg>
      </button>

      <button class="ctrl-btn" @click="seekRelative(-10)" :disabled="!hasVideo" title="后退10秒">
        <svg viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M12.5 8l-4 4 4 4M8 12h7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="ctrl-btn" @click="seekRelative(10)" :disabled="!hasVideo" title="前进10秒">
        <svg viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M11.5 8l4 4-4 4M16 12H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Timeline -->
      <div
        class="timeline"
        @click="handleProgressClick"
        @mousemove="handleTimelineHover"
        @mouseleave="handleTimelineLeave"
      >
        <div
          v-if="hoverTime !== null && hasVideo"
          class="timeline-bubble"
          :style="{ left: `${hoverX}px` }"
        >
          {{ formatTimePrecise(hoverTime) }}
        </div>

    <!-- Timeline markers — Performance: v-memo to skip re-render when markers unchanged -->
        <div class="timeline-markers">
          <div
            v-for="sub in subtitleStore.subtitles.slice(0, 50)"
            :key="sub.id"
            v-memo="[sub.id, sub.startTime, sub.endTime, subtitleStore.selectedId]"
            class="marker"
            :style="{
              left: `${(sub.startTime / projectStore.duration) * 100}%`,
              width: `${Math.max(1, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`
            }"
            :class="{ active: sub.id === subtitleStore.selectedId }"
          />
        </div>

        <div class="timeline-track">
          <div
            v-for="sub in subtitleStore.subtitles.slice(0, 20)"
            :key="`band-${sub.id}`"
            v-memo="[sub.id, sub.startTime, sub.endTime, subtitleStore.selectedId]"
            class="timeline-band"
            :style="{
              left: `${(sub.startTime / projectStore.duration) * 100}%`,
              width: `${Math.max(0.5, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`,
              opacity: sub.id === subtitleStore.selectedId ? 0.4 : 0.15
            }"
          />
          <div class="timeline-fill" :style="{ width: `${projectStore.progress}%` }"/>
          <div class="timeline-head" :style="{ left: `${projectStore.progress}%` }"/>
        </div>
      </div>

      <!-- Time display -->
      <div class="time-display">
        <span class="time-current">{{ formatTimeShort(projectStore.currentTime) }}</span>
        <span class="time-sep">/</span>
        <span class="time-total">{{ formatTimeShort(projectStore.duration) }}</span>
      </div>

      <!-- Frame counter -->
      <FrameCounter v-if="hasVideo" />
    </div>
  </main>
</template>

<style lang="scss" scoped>
.video-preview {
  flex: 1;
  display: flex;
  @include flex-column;
  background: var(--bg-base);
  overflow: hidden;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: $space-6;
}

.video-controls {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  background: $bg-surface;
  border-top: 1px solid $border;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  background: transparent;
  border: 1px solid $border;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: $bg-overlay;
    color: $text-primary;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ctrl-icon {
    width: 20px;
    height: 20px;
  }
}

.ctrl-play {
  width: 44px;
  height: 44px;
  background: rgba($primary, 0.1);
  border-color: rgba($primary, 0.3);
  color: $primary;

  &:hover:not(:disabled) {
    background: rgba($primary, 0.2);
  }
}

.timeline {
  flex: 1;
  position: relative;
  height: 40px;
  cursor: pointer;
}

.timeline-bubble {
  position: absolute;
  top: -32px;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-sm;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
  pointer-events: none;
}

.timeline-markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.marker {
  position: absolute;
  top: 10px;
  height: 20px;
  background: rgba($primary, 0.3);
  border-radius: 2px;
  cursor: pointer;

  &.active {
    background: $primary;
  }
}

.timeline-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.timeline-band {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba($primary, 0.15);
  border-radius: $radius-full;
}

.timeline-fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  transition: width 0.1s linear;
}

.timeline-head {
  position: absolute;
  top: -4px;
  width: 14px;
  height: 14px;
  border-radius: $radius-full;
  background: $primary;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transform: translateX(-50%);
  transition: left 0.1s linear;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 700;
  color: $text-secondary;
  min-width: 100px;
}

.time-sep {
  color: $text-muted;
  font-weight: 400;
}
</style>
