import { ref, onUnmounted } from 'vue'
import { useVideoStore } from '@/stores/video'
import { CANVAS_CONTEXT_2D, MIME_IMAGE_PNG } from '@/utils/constants'
import { clamp } from '@/utils/math'

// ─── Video event constants ───────────────────────────────────────────
const VIDEO_EVENTS = {
  LOADED_METADATA: 'loadedmetadata',
  ERROR: 'error',
  PLAY: 'play',
  PAUSE: 'pause',
  ENDED: 'ended',
  TIME_UPDATE: 'timeupdate',
} as const

type VideoEvent = typeof VIDEO_EVENTS[keyof typeof VIDEO_EVENTS]

// ─── Keyboard shortcut constants ─────────────────────────────────────
const KEYBOARD_SHORTCUTS = {
  SPACE: ' ',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  MUTE: 'm',
} as const

export function useVideoPlayer() {
  const videoStore = useVideoStore()

  const videoRef = ref<HTMLVideoElement | null>(null)
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Track listeners so they can be removed on cleanup
  type BoundHandler = [HTMLVideoElement, VideoEvent, EventListener]
  const _listeners: BoundHandler[] = []
  let _rvfcActive = false

  function _addListener(el: HTMLVideoElement, event: VideoEvent, handler: EventListener) {
    el.addEventListener(event, handler)
    _listeners.push([el, event, handler])
  }

  function _cleanupListeners() {
    for (const [el, event, handler] of _listeners) {
      el.removeEventListener(event, handler)
    }
    _listeners.length = 0
  }

  // Initialize video element
  function initVideo(element: HTMLVideoElement) {
    videoRef.value = element

    _addListener(element, VIDEO_EVENTS.LOADED_METADATA, () => {
      isReady.value = true
      isLoading.value = false
    })

    _addListener(element, VIDEO_EVENTS.ERROR, () => {
      error.value = '视频加载失败'
      isLoading.value = false
    })

    _addListener(element, VIDEO_EVENTS.PLAY, () => {
      videoStore.setPlaying(true)
    })

    _addListener(element, VIDEO_EVENTS.PAUSE, () => {
      videoStore.setPlaying(false)
    })

    _addListener(element, VIDEO_EVENTS.ENDED, () => {
      videoStore.setPlaying(false)
    })

    // Throttled frame update — prevents store updates on every timeupdate event
    // Performance: use requestVideoFrameCallback when available for frame-accurate tracking
    let _rafPending = false
    let _lastFrameTime = 0

    // Performance: requestVideoFrameCallback for smoother frame-accurate updates (Chrome 117+)
    function _startRVFC() {
      if (!_rvfcActive && 'requestVideoFrameCallback' in element) {
        _rvfcActive = true
        // 优化：使用 unknown 替代 any，保持类型安全
        // requestVideoFrameCallback 的 metadata 类型在部分 TS 版本中未定义
        const videoEl = element as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: DOMHighResTimeStamp, metadata: unknown) => void) => number }
        const callback = (_now: DOMHighResTimeStamp, _metadata: unknown) => {
          if (videoStore.videoMeta && element.currentTime) {
            const frame = Math.floor(element.currentTime * videoStore.videoMeta.fps)
            if (frame !== _lastFrameTime) {
              _lastFrameTime = frame
              videoStore.setCurrentFrame(frame)
            }
          }
          if (_rvfcActive && !element.paused) {
            videoEl.requestVideoFrameCallback(callback)
          } else {
            _rvfcActive = false
          }
        }
        videoEl.requestVideoFrameCallback(callback)
      }
    }

    function _stopRVFC() {
      _rvfcActive = false
    }

    _addListener(element, VIDEO_EVENTS.TIME_UPDATE, () => {
      if (_rafPending) return
      _rafPending = true
      requestAnimationFrame(() => {
        if (videoStore.videoMeta && element.currentTime) {
          const frame = Math.floor(element.currentTime * videoStore.videoMeta.fps)
          if (frame !== _lastFrameTime) {
            _lastFrameTime = frame
            videoStore.setCurrentFrame(frame)
          }
        }
        _rafPending = false
      })
    })

    // Start RVFC when video plays
    _addListener(element, VIDEO_EVENTS.PLAY, () => {
      _startRVFC()
    })

    // Stop RVFC when video pauses
    _addListener(element, VIDEO_EVENTS.PAUSE, () => {
      _stopRVFC()
    })

    _addListener(element, VIDEO_EVENTS.ENDED, () => {
      _stopRVFC()
    })
  }

  // Load video
  async function loadVideo(path: string) {
    if (!videoRef.value) {
      error.value = 'Video element not initialized'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      videoRef.value.src = path
      await videoRef.value.load()
    } catch (e) {
      error.value = `Failed to load video: ${e}`
      isLoading.value = false
    }
  }

  // Playback controls
  function play() {
    videoRef.value?.play()
  }

  function pause() {
    videoRef.value?.pause()
  }

  function togglePlay() {
    if (videoStore.isPlaying) {
      pause()
    } else {
      play()
    }
  }

  function seek(time: number) {
    if (videoRef.value) {
      const duration = videoRef.value.duration || 0
      const clampedTime = clamp(time, 0, duration)
      videoRef.value.currentTime = clampedTime
    }
  }

  function seekToFrame(frame: number) {
    if (videoStore.videoMeta) {
      const time = frame / videoStore.videoMeta.fps
      seek(time)
    }
  }

  function seekRelative(deltaFrames: number) {
    const newFrame = videoStore.currentFrame + deltaFrames
    seekToFrame(clamp(newFrame, 0))
  }

  // Volume
  function setVolume(volume: number) {
    if (videoRef.value) {
      videoRef.value.volume = clamp(volume, 0, 1)
      videoStore.volume = videoRef.value.volume
    }
  }

  function toggleMute() {
    if (videoRef.value) {
      videoRef.value.muted = !videoRef.value.muted
      videoStore.isMuted = videoRef.value.muted
    }
  }

  // Reusable offscreen canvas for frame capture (avoids per-frame allocation)
  const _captureCanvas = ref<HTMLCanvasElement | null>(null)
  const _captureCtx = ref<CanvasRenderingContext2D | null>(null)

  function _ensureCaptureCanvas(width: number, height: number): CanvasRenderingContext2D | null {
    if (!_captureCanvas.value || _captureCanvas.value.width !== width || _captureCanvas.value.height !== height) {
      _captureCanvas.value = document.createElement('canvas')
      _captureCanvas.value.width = width
      _captureCanvas.value.height = height
      _captureCtx.value = _captureCanvas.value.getContext(CANVAS_CONTEXT_2D)
    }
    return _captureCtx.value
  }

  // Frame capture — 统一入口，减少 captureFrame / captureFrameAsDataURL 的 null-check 重复
  function _captureToCanvas(): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
    if (!videoRef.value || !isReady.value) return null
    const width = videoRef.value.videoWidth
    const height = videoRef.value.videoHeight
    const ctx = _ensureCaptureCanvas(width, height)
    if (!ctx) return null
    ctx.drawImage(videoRef.value, 0, 0)
    return { ctx, width, height }
  }

  function captureFrame(): ImageData | null {
    const result = _captureToCanvas()
    if (!result) return null
    return result.ctx.getImageData(0, 0, result.width, result.height)
  }

  function captureFrameAsDataURL(): string | null {
    const result = _captureToCanvas()
    if (!result) return null
    return _captureCanvas.value!.toDataURL(MIME_IMAGE_PNG)
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case KEYBOARD_SHORTCUTS.SPACE:
        e.preventDefault()
        togglePlay()
        break
      case KEYBOARD_SHORTCUTS.ARROW_LEFT:
        e.preventDefault()
        seekRelative(-1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_RIGHT:
        e.preventDefault()
        seekRelative(1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_UP:
        e.preventDefault()
        setVolume(videoStore.volume + 0.1)
        break
      case KEYBOARD_SHORTCUTS.ARROW_DOWN:
        e.preventDefault()
        setVolume(videoStore.volume - 0.1)
        break
      case KEYBOARD_SHORTCUTS.MUTE:
        toggleMute()
        break
    }
  }

  // Cleanup — remove all event listeners and clear video src
  onUnmounted(() => {
    _cleanupListeners()
    if (_rvfcActive && videoRef.value && 'requestVideoFrameCallback' in videoRef.value) {
      _rvfcActive = false
    }
    if (videoRef.value) {
      videoRef.value.pause()
      videoRef.value.src = ''
    }
    // Release offscreen capture canvas to avoid memory leaks on resize
    if (_captureCanvas.value) {
      _captureCanvas.value.width = 0
      _captureCanvas.value.height = 0
      _captureCanvas.value = null
    }
  })

  return {
    videoRef,
    isReady,
    isLoading,
    error,
    initVideo,
    loadVideo,
    play,
    pause,
    togglePlay,
    seek,
    seekToFrame,
    seekRelative,
    setVolume,
    toggleMute,
    captureFrame,
    captureFrameAsDataURL,
    handleKeydown
  }
}
