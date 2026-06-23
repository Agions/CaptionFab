<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSystemCheck } from '@/composables/useSystemCheck'
import { useTabNavigation } from '@/composables/useTabNavigation'
import { usePanelSections } from '@/composables/usePanelSections'

// Tab components
import FilesTab from './tabs/files.vue'
import ProgressTab from './tabs/progress.vue'
/* eslint-disable-line @typescript-eslint/ban-ts-comment -- Vue SFC template-only import */ // @ts-ignore ROITab used in Vue template (auto-unwrapped to <roi-tab>)
import ROITab from './tabs/roi.vue' // eslint-disable-line @typescript-eslint/no-unused-vars -- used in template
/* eslint-disable-line @typescript-eslint/ban-ts-comment -- Vue SFC template-only import */ // @ts-ignore OCRTab used in Vue template (auto-unwrapped to <ocr-tab>)
import OCRTab from './tabs/ocr.vue' // eslint-disable-line @typescript-eslint/no-unused-vars -- used in template
import ExportTab from './tabs/export.vue'
import SettingsTab from './tabs/settings.vue'

const settingsStore = useSettingsStore()
const { checkDependencies } = useSystemCheck()

// ── Tab State ──────────────────────────────────────────────
type TabKey = 'files' | 'progress' | 'roi' | 'ocr' | 'export' | 'settings'
const activeTab = ref<TabKey>('files')

// Settings tab local state
const localSettings = ref({ ...settingsStore.settings })

// ── Keyboard Navigation ────────────────────────────────────
const { tabRefs, handleTabKeydown } = useTabNavigation(activeTab)

// ── Panel Sections ──────────────────────────────────────────
const { sections } = usePanelSections()

// ── Lifecycle ──────────────────────────────────────────────
onMounted(() => {
  checkDependencies()
})

watch(localSettings, (newSettings) => {
  Object.assign(settingsStore.settings, newSettings)
}, { deep: true })

// ── Expose ─────────────────────────────────────────────────
defineExpose({
  setActiveTab: (tab: TabKey) => { activeTab.value = tab }
})
</script>

<template>
  <aside class="side-panel">
    <!-- Tab Bar -->
    <div
      class="tab-bar"
      role="tablist"
      @keydown="handleTabKeydown"
    >
      <button
        v-for="(tab, index) in sections"
        :key="tab.key"
        :ref="el => { if (el) tabRefs[index] = el as HTMLElement }"
        :class="['tab-item', { active: activeTab === tab.key }]"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :tabindex="activeTab === tab.key ? 0 : -1"
        @click="activeTab = tab.key as TabKey"
      >
        <svg v-if="tab.icon === 'file'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M12 3v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="tab.icon === 'chart'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 17V7m0 4V5m0 8V9m4-5V7m0 6V3m0 10V9m4-6V5m0 8V7m4-4V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="tab.icon === 'crop'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M6 3v11a1 1 0 001 1h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3 6h11a1 1 0 011 1v11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="tab.icon === 'ocr'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="tab.icon === 'export'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v10m0 0L6 9m4 4l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="tab.icon === 'settings'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 3v2m0 10v2M3 10h2m10 0h2M5.05 5.05l1.41 1.41m7.08 7.08l1.41 1.41M5.05 14.95l1.41-1.41m7.08-7.08l1.41-1.41" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <files-tab v-if="activeTab === 'files'" />
      <progress-tab v-else-if="activeTab === 'progress'" />
      <roi-tab v-else-if="activeTab === 'roi'" />
      <ocr-tab v-else-if="activeTab === 'ocr'" />
      <export-tab v-else-if="activeTab === 'export'" />
      <settings-tab v-else-if="activeTab === 'settings'" />
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.side-panel {
  width: $sidebar-width;
  background: $bg-surface;
  border-right: 1px solid $border;
  display: flex;
  @include flex-column;
  overflow: hidden;
}

// ── Tab Bar ─────────────────────────────────────────────────
.tab-bar {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
  animation: fade-up 0.3s ease-out both;
}

.tab-item {
  flex: 1;
  display: flex;
  @include flex-column;
  align-items: center;
  gap: 3px;
  padding: $space-2 $space-1;
  border-radius: $radius-md;
  color: $text-muted;
  transition: all $transition-base;

  &:hover {
    color: $text-secondary;
    background: $bg-overlay;
  }

  &.active {
    color: $primary;
    background: rgba($primary, 0.1);

    .tab-icon {
      filter: drop-shadow(0 0 4px rgba($primary, 0.4));
    }
  }

  .tab-icon {
    width: 18px;
    height: 18px;
    transition: filter $transition-base;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

// ── Tab Content ─────────────────────────────────────────────
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  @include custom-scrollbar;
  animation: fade-up 0.3s ease-out both;
}
</style>
