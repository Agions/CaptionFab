<template>
  <div
    ref="containerRef"
    class="relative w-full h-full overflow-hidden select-none cursor-crosshair"
    @mousedown="onContainerMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <!-- 视频画质 ROI 遮罩与画框 -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
      <!-- 变暗背景遮罩 (使用 mask 或 4 个外侧矩形) -->
      <path :d="maskPathD" fill="rgba(0, 0, 0, 0.55)" />

      <!-- ROI 主矩形框 -->
      <rect
        :x="boxPixel.x"
        :y="boxPixel.y"
        :width="boxPixel.w"
        :height="boxPixel.h"
        fill="none"
        stroke="#10b981"
        stroke-width="2.5"
        stroke-dasharray="4 2"
        class="transition-all duration-75"
      />
    </svg>

    <!-- 可交互与可拖拽的 ROI 选区元素 -->
    <div
      class="absolute border-2 border-emerald-400 bg-emerald-500/10 z-20 group cursor-move shadow-lg rounded-sm"
      :style="{
        left: `${boxPixel.x}px`,
        top: `${boxPixel.y}px`,
        width: `${boxPixel.w}px`,
        height: `${boxPixel.h}px`,
      }"
      @mousedown.stop="startDragMove"
    >
      <!-- 中心提示 Label -->
      <div class="absolute -top-7 left-0 px-2 py-0.5 bg-emerald-600 text-white text-xs font-mono rounded shadow flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M3 5v4h2V7h2V5H3zm0 10v4h4v-2H5v-2H3zm14 4h4v-4h-2v2h-2v2zm2-14h-4v2h2v2h2V5z"/></svg>
        字幕框选 ROI [{{ Math.round(roi.width * 100) }}% × {{ Math.round(roi.height * 100) }}%]
      </div>

      <!-- 8 点控制手柄 Handles -->
      <div
        v-for="handle in handles"
        :key="handle"
        :class="[
          'absolute w-3 h-3 bg-white border-2 border-emerald-600 rounded-full z-30 transition-transform hover:scale-125',
          getHandleClass(handle),
        ]"
        @mousedown.stop="startResize($event, handle)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSubtitleStore } from '../../stores/subtitleStore';
import type { NormalizedROI } from '../../services/ocr/IOCREngine';

const subtitleStore = useSubtitleStore();
const containerRef = ref<HTMLDivElement | null>(null);

const roi = computed(() => subtitleStore.roi);

const containerSize = ref({ width: 800, height: 450 });

// 8 点控制手柄定义
const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type HandleType = typeof handles[number];

// 计算 ROI 在容器中的像素坐标
const boxPixel = computed(() => {
  const w = containerSize.value.width;
  const h = containerSize.value.height;
  return {
    x: roi.value.x * w,
    y: roi.value.y * h,
    w: roi.value.width * w,
    h: roi.value.height * h,
  };
});

// 计算遮罩 SVG Path
const maskPathD = computed(() => {
  const W = containerSize.value.width;
  const H = containerSize.value.height;
  const { x, y, w, h } = boxPixel.value;
  return `M 0 0 H ${W} V ${H} H 0 Z M ${x} ${y} V ${y + h} H ${x + w} V ${y} Z`;
});

let isDragging = false;
let isResizing = false;
let currentHandle: HandleType | null = null;
let dragStartX = 0;
let dragStartY = 0;
let initialRoi: NormalizedROI = { ...roi.value };

function updateContainerSize() {
  if (containerRef.value) {
    containerSize.value = {
      width: containerRef.value.clientWidth || 800,
      height: containerRef.value.clientHeight || 450,
    };
  }
}

// 8 点手柄 Class 映射
function getHandleClass(handle: HandleType) {
  switch (handle) {
    case 'nw': return '-top-1.5 -left-1.5 cursor-nwse-resize';
    case 'n':  return '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
    case 'ne': return '-top-1.5 -right-1.5 cursor-nesw-resize';
    case 'e':  return 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize';
    case 'se': return '-bottom-1.5 -right-1.5 cursor-nwse-resize';
    case 's':  return '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
    case 'sw': return '-bottom-1.5 -left-1.5 cursor-nesw-resize';
    case 'w':  return 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize';
  }
}

function onContainerMouseDown(e: MouseEvent) {
  if (isDragging || isResizing) return;
  // 直接点击背景创建新框选
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;

  const startX = (e.clientX - rect.left) / rect.width;
  const startY = (e.clientY - rect.top) / rect.height;

  initialRoi = { x: startX, y: startY, width: 0.05, height: 0.05 };
  subtitleStore.setROI(initialRoi);

  isResizing = true;
  currentHandle = 'se';
  dragStartX = e.clientX;
  dragStartY = e.clientY;
}

function startDragMove(e: MouseEvent) {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  initialRoi = { ...roi.value };
}

function startResize(e: MouseEvent, handle: HandleType) {
  isResizing = true;
  currentHandle = handle;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  initialRoi = { ...roi.value };
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging && !isResizing) return;

  const W = containerSize.value.width;
  const H = containerSize.value.height;
  const deltaX = (e.clientX - dragStartX) / W;
  const deltaY = (e.clientY - dragStartY) / H;

  if (isDragging) {
    let newX = Math.max(0, Math.min(1 - initialRoi.width, initialRoi.x + deltaX));
    let newY = Math.max(0, Math.min(1 - initialRoi.height, initialRoi.y + deltaY));
    subtitleStore.setROI({
      ...roi.value,
      x: newX,
      y: newY,
    });
  } else if (isResizing && currentHandle) {
    let { x, y, width, height } = { ...initialRoi };

    if (currentHandle.includes('e')) {
      width = Math.max(0.05, Math.min(1 - x, initialRoi.width + deltaX));
    }
    if (currentHandle.includes('s')) {
      height = Math.max(0.03, Math.min(1 - y, initialRoi.height + deltaY));
    }
    if (currentHandle.includes('w')) {
      const maxW = initialRoi.x + initialRoi.width;
      x = Math.max(0, Math.min(maxW - 0.05, initialRoi.x + deltaX));
      width = maxW - x;
    }
    if (currentHandle.includes('n')) {
      const maxH = initialRoi.y + initialRoi.height;
      y = Math.max(0, Math.min(maxH - 0.03, initialRoi.y + deltaY));
      height = maxH - y;
    }

    subtitleStore.setROI({ x, y, width, height });
  }
}

function onMouseUp() {
  isDragging = false;
  isResizing = false;
  currentHandle = null;
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateContainerSize();
  window.addEventListener('resize', updateContainerSize);
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize);
  resizeObserver?.disconnect();
});
</script>
