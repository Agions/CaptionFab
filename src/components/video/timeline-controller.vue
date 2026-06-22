<script setup lang="ts">
import { ref, computed, onUnmounted, inject } from 'vue'
import { useVideoStore } from '@/stores/video'
import { useSubtitleStore } from '@/stores/subtitle'
import { formatFrameToTime } from '@/utils/time'
import TimelineRuler from './timeline/timeline-ruler.vue'
import TimelineMarkerLayer from './timeline/timeline-marker-layer.vue'
import TimelinePlayhead from './timeline/timeline-playhead.vue'
import TimelineTooltip from './timeline/timeline-tooltip.vue'

const videoStore = useVideoStore()
const subtitleStore = useSubtitleStore()

const emit = defineEmits<{
  (e: 'seek', frame: number): void
  (e: 'select', id: string): void
}>()

// Timeline state
const zoomLevel = ref(1)
const isDragging = ref(false)
const isHovering = ref(false)
const hoverFrame = ref(0)
const hoverPosition = ref({ x: 0, y: 0 })
const hoverThumbnail = ref<string | null>(null)

// Keyboard navigation
const focusedMarkerIndex = ref(-1)
const timelineRef = ref<HTMLElement | null>(null)

// Video control functions
const seekToFrame = inject<(frame: number) => void>('seekToFrame')
const captureFrame = inject<() => string | null>('captureFrame')

// Thumbnail capture with proper debounce and requestIdleCallback
let thumbnailTimeout: ReturnType<typeof setTimeout> | null = null
let _pendingThumbnailFrame = -1

async function captureThumbnailAtFrame(frame: number) {
  if (!seekToFrame || !captureFrame) return null
  // Skip if same frame is already pending
  if (_pendingThumbnailFrame === frame) return hoverThumbnail.value
  _pendingThumbnailFrame = frame
    
  seekToFrame(frame)
  await new Promise<void>(resolve => {
    const videoEl = document.querySelector('video')
    if (!videoEl) { resolve(); return }
    const handler = () => {
      videoEl.removeEventListener('seeked', handler)
      resolve()
    }
    videoEl.addEventListener('seeked', handler)
    setTimeout(resolve, 150) // Reduced from 200ms
  })
  return captureFrame()
}

function getFrameFromEvent(e: MouseEvent): number {
  const target = document.querySelector('.timeline-track') as HTMLElement
  if (!target) return 0
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  return Math.floor(percent * totalFrames.value)
}

function handlePlayheadMouseDown(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const frame = getFrameFromEvent(e)
  emit('seek', Math.max(0, Math.min(frame, totalFrames.value - 1)))
}

function handleMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleTimelineHover(e: MouseEvent) {
  const track = document.querySelector('.timeline-track') as HTMLElement
  if (!track) return
  const rect = track.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  hoverFrame.value = Math.floor(percent * totalFrames.value)
  hoverPosition.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  isHovering.value = true

  // Performance: throttle thumbnail capture to avoid excessive frame seeks
  if (thumbnailTimeout) clearTimeout(thumbnailTimeout)
  thumbnailTimeout = setTimeout(async () => {
    // Skip if frame hasn't changed since last capture
    if (hoverThumbnail.value && hoverFrame.value === _pendingThumbnailFrame) return
    if (seekToFrame && captureFrame) {
      hoverThumbnail.value = await captureThumbnailAtFrame(hoverFrame.value)
    }
  }, 80) // Reduced from 100ms for snappier response
}

function handleTimelineLeave() {
  isHovering.value = false
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  if (thumbnailTimeout) clearTimeout(thumbnailTimeout)
})

// Keyboard navigation
function handleTimelineKeydown(e: KeyboardEvent) {
  if (subtitleMarkers.value.length === 0) return
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      if (focusedMarkerIndex.value > 0) {
        focusedMarkerIndex.value--
      } else {
        const currentFrame = videoStore.currentFrame
        const prevMarker = [...subtitleMarkers.value].reverse().find(m => m.endFrame < currentFrame - 1)
        if (prevMarker) emit('seek', Math.max(0, prevMarker.frame - 1))
        else emit('seek', Math.max(0, currentFrame - fps.value))
      }
      break
    case 'ArrowRight':
      e.preventDefault()
      if (focusedMarkerIndex.value < subtitleMarkers.value.length - 1) {
        focusedMarkerIndex.value++
      } else {
        const currentFrame = videoStore.currentFrame
        const nextMarker = subtitleMarkers.value.find(m => m.frame > currentFrame + 1)
        if (nextMarker) emit('seek', nextMarker.frame)
        else emit('seek', Math.min(totalFrames.value - 1, currentFrame + fps.value))
      }
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (focusedMarkerIndex.value >= 0 && focusedMarkerIndex.value < subtitleMarkers.value.length) {
        const marker = subtitleMarkers.value[focusedMarkerIndex.value]
        emit('select', marker.id)
        emit('seek', marker.frame)
      }
      break
    case 'Home':
      e.preventDefault()
      focusedMarkerIndex.value = 0
      emit('seek', 0)
      break
    case 'End':
      e.preventDefault()
      focusedMarkerIndex.value = subtitleMarkers.value.length - 1
      emit('seek', totalFrames.value - 1)
      break
    case 'Escape':
      e.preventDefault()
      focusedMarkerIndex.value = -1
      timelineRef.value?.blur()
      break
  }
}

// Computed
const totalFrames = computed(() => videoStore.videoMeta?.totalFrames ?? 0)
const fps = computed(() => videoStore.videoMeta?.fps ?? 30)

const subtitleMarkers = computed(() => {
  return subtitleStore.subtitles.map(sub => ({
    id: sub.id,
    frame: sub.startFrame,
    endFrame: sub.endFrame,
    text: sub.text
  }))
})

const playheadPosition = computed(() => {
  if (totalFrames.value === 0) return 0
  return (videoStore.currentFrame / totalFrames.value) * 100
})

function handleTimelineClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  const frame = Math.floor(percent * totalFrames.value)
  emit('seek', Math.max(0, Math.min(frame, totalFrames.value - 1)))
}

function handleMarkerClick(e: MouseEvent, marker: typeof subtitleMarkers.value[0]) {
  e.stopPropagation()
  emit('select', marker.id)
  emit('seek', marker.frame)
}

function zoomIn() { zoomLevel.value = Math.min(zoomLevel.value * 1.5, 10) }
function zoomOut() { zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.1) }
function resetZoom() { zoomLevel.value = 1 }

const currentTime = computed(() => formatFrameToTime(videoStore.currentFrame, fps.value))
const totalTime = computed(() => formatFrameToTime(totalFrames.value, fps.value))
const currentFrame = computed(() => videoStore.currentFrame)
const subtitleCount = computed(() => subtitleStore.totalCount)
</script>

<template>
  <div class="timeline-component">
    <!-- Header -->
    <div class="timeline-header">
      <div class="header-left">
        <div class="zoom-controls">
          <button class="zoom-btn" @click="zoomOut" title="缩小">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon"><path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <button class="zoom-btn" @click="zoomIn" title="放大">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <button class="zoom-btn" @click="resetZoom" title="重置">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon"><path d="M2 8a6 6 0 1011.5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M2 5V8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="header-right">
        <span class="time-display">
          <span class="time-current">{{ currentTime }}</span>
          <span class="time-sep">/</span>
          <span class="time-total">{{ totalTime }}</span>
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="timeline-body">
      <timeline-ruler :total-frames="totalFrames" :fps="fps" />

      <div
        class="timeline-track"
        tabindex="0"
        role="slider"
        :aria-valuenow="videoStore.currentFrame"
        :aria-valuemin="0"
        :aria-valuemax="totalFrames"
        aria-label="Timeline navigation"
        @click="handleTimelineClick"
        @mousemove="handleTimelineHover"
        @mouseleave="handleTimelineLeave"
        @keydown="handleTimelineKeydown"
        ref="timelineRef"
      >
        <timeline-marker-layer
          :markers="subtitleMarkers"
          :selected-id="subtitleStore.selectedId"
          :total-frames="totalFrames"
          @select="handleMarkerClick"
        />

        <timeline-playhead
          :position="playheadPosition"
          :is-dragging="isDragging"
          @mousedown="handlePlayheadMouseDown"
        />
      </div>

      <timeline-tooltip
        v-if="isHovering || isDragging"
        :hover-frame="hoverFrame"
        :total-frames="totalFrames"
        :fps="fps"
        :thumbnail="hoverThumbnail"
      />
    </div>

    <!-- Footer -->
    <div class="timeline-footer">
      <div class="footer-left">
        <span class="stat-item"><span class="stat-label">帧</span><span class="stat-value">#{{ currentFrame.toLocaleString() }}</span></span>
        <span class="stat-item"><span class="stat-label">FPS</span><span class="stat-value">{{ fps }}</span></span>
      </div>
      <div class="footer-right">
        <span class="stat-item"><span class="stat-label">字幕</span><span class="stat-value">{{ subtitleCount }} 条</span></span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.timeline-component {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  @include flex-column;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-3;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.zoom-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  @include pressable;

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  .zoom-icon {
    width: 14px;
    height: 14px;
  }
}

.zoom-level {
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}

.time-display {
  font-family: $font-mono;
  font-size: $text-xs;
  display: flex;
  gap: 4px;
}

.time-current { color: var(--text-primary); font-weight: 600; }
.time-sep { color: $gray-600; }
.time-total { color: $gray-500; }

// Body
.timeline-body {
  position: relative;
  height: 44px;
  overflow: visible;
}

.timeline-track {
  position: relative;
  height: 28px;
  background: var(--bg-elevated);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 9px,
      var(--border) 9px,
      var(--border) 10px
    );
    opacity: 0.25;
  }
}

.timeline-footer {
  display: flex;
  justify-content: space-between;
  padding: $space-2 $space-3;
  border-top: 1px solid var(--border);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: $text-xs;
  color: $text-muted;
}

.stat-label {
  color: $text-muted;
}

.stat-value {
  font-family: $font-display;
  font-weight: 700;
  color: $text-secondary;
}
</style>
