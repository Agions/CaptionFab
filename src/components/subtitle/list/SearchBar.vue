<script setup lang="ts">
import { useSubtitleStore } from '@/stores/subtitle'
import { useSubtitleList } from '@/composables/useSubList'

const subtitleStore = useSubtitleStore()
const { filteredCount } = useSubtitleList()
</script>

<template>
  <div class="search-bar">
    <svg class="search-icon" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
      <path d="M15 15l-2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <input
      id="subtitle-search-input"
      v-model="subtitleStore.searchQuery"
      type="text"
      placeholder="搜索字幕内容..."
      class="search-input"
      aria-label="搜索字幕内容"
    />
    <span v-if="subtitleStore.searchQuery" class="search-count">
      {{ filteredCount }} 条
    </span>
  </div>
</template>

<style lang="scss" scoped>
.search-bar {
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  gap: $space-2;
  border-bottom: 1px solid var(--border);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: $text-xs;
  color: var(--text-primary);

  &::placeholder { color: var(--text-muted); }
  &:focus { outline: none; }
}

.search-count {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
</style>
