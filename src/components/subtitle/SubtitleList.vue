<script setup lang="ts">
import { watch } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useSubtitleList } from '@/composables/useSubList'
import SubtitleListFooter from './ListFooter.vue'
import BatchActionBar from './BatchActionBar.vue'
import SearchBar from './list/SearchBar.vue'

const subtitleStore = useSubtitleStore()
const {
  displayCount,
  visibleSubtitles,
  hasMore,
  totalCount,
  filteredCount,
  isFiltered,
  lowConfCount,
  loadMore,
  resetDisplayCount,
} = useSubtitleList()

// Reset pagination when filter changes
watch(() => subtitleStore.confidenceFilter, resetDisplayCount)
</script>

<template>
  <aside class="subtitle-panel">
    <!-- Header -->
    <header class="panel-header">
      <div class="header-left">
        <h3 class="panel-title">字幕列表</h3>
        <span class="count-badge">
          <template v-if="isFiltered">{{ filteredCount }} / {{ totalCount }}</template>
          <template v-else>{{ totalCount }}</template>
          条
        </span>
        <button
          v-if="lowConfCount > 0"
          class="alert-badge"
          :class="{ active: subtitleStore.confidenceFilter === 'low' }"
          @click="subtitleStore.setConfidenceFilter('low')"
          title="查看低置信度字幕"
        >
          <svg viewBox="0 0 12 12" fill="none" class="alert-icon">
            <path d="M6 1L1 10h10L6 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M6 5v2M6 8.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          {{ lowConfCount }} 低置信度
        </button>
      </div>

      <div class="header-actions">
        <button
          class="icon-btn"
          :disabled="!subtitleStore.canUndo"
          @click="subtitleStore.undo()"
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="icon-svg">
            <path d="M4 9H14a3 3 0 010 6H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M7 6L4 9l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="icon-btn"
          :disabled="!subtitleStore.canRedo"
          @click="subtitleStore.redo()"
          title="重做 (Ctrl+Y)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="icon-svg">
            <path d="M16 9H6a3 3 0 000 6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13 6l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Search -->
    <SearchBar />

    <!-- Confidence Filter -->
    <slot v-if="totalCount > 0" name="confidence-filter" />

    <!-- Subtitle List -->
    <div class="subtitle-list" role="list">
      <!-- Skeleton -->
      <template v-if="subtitleStore.isExtracting">
        <slot name="skeleton" />
      </template>

      <!-- Cards -->
      <template v-else>
        <slot name="cards" :subtitles="visibleSubtitles" />

        <!-- Load more -->
        <button v-if="hasMore" class="load-more-btn" @click="loadMore">
          <svg viewBox="0 0 20 20" fill="none" class="load-icon">
            <path d="M5 10h10M5 10l3-3M5 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          加载更多 ({{ subtitleStore.filteredSubtitles.length - displayCount }} 剩余)
        </button>
      </template>

      <!-- Empty state -->
      <slot v-if="!subtitleStore.isExtracting && filteredCount === 0" name="empty" />
    </div>

    <!-- Footer -->
    <footer class="panel-footer">
      <BatchActionBar />
      <SubtitleListFooter />
    </footer>
  </aside>
</template>

<style lang="scss" scoped>
.subtitle-panel {
  width: $subtitle-panel-width;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: $space-4;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.panel-title {
  font-size: $text-xs;
  font-weight: 700;
  color: var(--text-primary);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: $radius-full;
  background: rgba($primary, 0.1);
  color: $primary;
  font-size: 10px;
  font-weight: 600;
  font-family: $font-mono;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: $radius-full;
  background: rgba($warning, 0.1);
  color: $warning;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all $duration-fast $ease-out-expo;

  &:hover { background: rgba($warning, 0.15); }
  &.active { background: rgba($warning, 0.2); border-color: $warning; }
  .alert-icon { width: 12px; height: 12px; }
}

.header-actions {
  display: flex;
  gap: $space-1;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all $duration-fast $ease-out-expo;

  &:hover:not(:disabled) { background: var(--bg-overlay); color: var(--text-primary); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  .icon-svg { width: 16px; height: 16px; }
}

.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.load-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  width: 100%;
  padding: $space-3 $space-4;
  margin-top: $space-2;
  background: $bg-elevated;
  border: 1px dashed $border;
  border-radius: $radius-md;
  color: $text-secondary;
  font-size: $text-sm;
  cursor: pointer;
  transition: all $transition-base;

  .load-icon { width: 16px; height: 16px; }
  &:hover { background: $bg-overlay; border-color: $primary; color: $primary; }
}

.panel-footer {
  padding: $space-3 $space-4;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
</style>
