<script setup lang="ts">
import { computed } from 'vue'
import type { SubtitleItem } from '@/types/subtitle'
import { useSubtitleStore } from '@/stores/subtitle'
import { useSubtitleList } from '@/composables/useSubList'
import CardTimeDisplay from './card/CardTimeDisplay.vue'
import CardConfidenceBadge from './card/CardConfidenceBadge.vue'
import CardThumbnailStrip from './card/CardThumbnailStrip.vue'
import CardEditForm from './card/CardEditForm.vue'

interface Props {
  subtitle: SubtitleItem
}

const props = defineProps<Props>()

const subtitleStore = useSubtitleStore()
const {
  hoveredId,
  editingId,
  editText,
  editStartTime,
  editEndTime,
  startEdit,
  cancelEdit,
  saveEdit,
  formatTimeShort,
  getConfidenceHeatmap,
} = useSubtitleList()

const isSelected = computed(() => subtitleStore.selectedId === props.subtitle.id)
const isHovered = computed(() => hoveredId.value === props.subtitle.id)
const isEditing = computed(() => editingId.value === props.subtitle.id)

function handleClick() {
  subtitleStore.selectSubtitle(props.subtitle.id)
}

function handleDoubleClick() {
  startEdit(props.subtitle.id)
}

function handleMouseEnter() {
  hoveredId.value = props.subtitle.id
}

function handleMouseLeave() {
  hoveredId.value = null
}

function handleDelete(e: Event) {
  e.stopPropagation()
  subtitleStore.deleteSubtitle(props.subtitle.id)
}

function handleEditStart(e: Event) {
  e.stopPropagation()
  startEdit(props.subtitle.id)
}
</script>

<template>
  <div
    :class="['subtitle-card', {
      'is-selected': isSelected,
      'is-edited': subtitle.edited
    }]"
    role="listitem"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Action buttons -->
    <div class="card-actions">
      <button class="card-action-btn" @click="handleEditStart" title="编辑 (双击)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="card-action-btn" @click="handleDelete" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>

    <!-- Header -->
    <div class="card-header">
      <div class="card-meta">
        <span class="card-index">{{ subtitle.index }}</span>
        <CardTimeDisplay :start="subtitle.startTime" :end="subtitle.endTime" :format="formatTimeShort" />
      </div>
      <div class="card-badges">
        <CardConfidenceBadge :confidence="subtitle.confidence" />
        <span class="frame-tag">#{{ subtitle.startFrame }}</span>
      </div>
    </div>

    <!-- Text -->
    <p class="card-text" :class="{ 'is-edited': subtitle.edited }">
      {{ subtitle.text }}
    </p>

    <!-- Thumbnail strip -->
    <CardThumbnailStrip v-if="isHovered && subtitle.thumbnailUrls?.length" :urls="subtitle.thumbnailUrls.slice(0, 5)" />

    <!-- Edit form -->
    <CardEditForm
      v-if="isEditing"
      :edit-text="editText"
      :edit-start-time="editStartTime"
      :edit-end-time="editEndTime"
      @cancel="cancelEdit"
      @save="saveEdit"
    />

    <!-- Confidence heatmap bar -->
    <div
      class="conf-heatmap"
      :style="{ background: getConfidenceHeatmap(subtitle.confidence) }"
      :title="`置信度: ${Math.round(subtitle.confidence * 100)}%`"
    />

    <!-- Selected indicator -->
    <div class="selected-bar" />
  </div>
</template>

<style lang="scss" scoped>
.subtitle-card {
  position: relative;
  padding: $space-3;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  overflow: hidden;
  animation: card-in $duration-normal $ease-out-expo both;
  @include pressable;
  transition: transform $duration-fast $ease-out-expo, border-color $duration-fast $ease-out-expo, box-shadow $duration-fast $ease-out-expo;

  &:hover {
    border-color: var(--border-light);
    transform: translateY(-2px);
    box-shadow: $shadow-md;
    .card-actions { opacity: 1; transform: translateX(0); }
  }

  &:active:not(.is-edited) { transform: scale(0.98); }

  &.is-selected {
    border-color: var(--primary);
    background: rgba($primary, 0.05);
    box-shadow: $glow-md;
    .selected-bar { opacity: 1; }
  }

  &.is-edited .card-text { font-style: italic; opacity: 0.85; }
}

.card-actions {
  position: absolute;
  top: $space-2;
  right: $space-2;
  display: flex;
  gap: 4px;
  opacity: 0;
  transform: translateX(8px);
  transition: opacity $duration-fast $ease-out-expo, transform $duration-fast $ease-out-expo;
  z-index: 2;
}

.card-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: $radius-md;
  background: var(--bg-overlay);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all $duration-fast $ease-out-expo;

  &:hover { background: var(--bg-surface); border-color: var(--border-light); color: var(--text-primary); }
  &:active { transform: scale(0.92); }
  svg { width: 14px; height: 14px; }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-2;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.card-index {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  border-radius: var(--radius-sm);
  font-family: $font-mono;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.card-badges {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.frame-tag {
  font-family: $font-mono;
  font-size: 10px;
  color: var(--text-muted);
}

.card-text {
  font-size: $text-xs;
  color: var(--text-primary);
  line-height: $leading-normal;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;

  &.is-edited { font-style: italic; opacity: 0.85; }
}

.conf-heatmap {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  opacity: 0.7;
  border-radius: $radius-lg 0 0 $radius-lg;
  z-index: 0;
}

.selected-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary), $accent);
  opacity: 0;
  transition: opacity $duration-fast $ease-out-expo;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
