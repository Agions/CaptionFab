<script setup lang="ts">
defineOptions({ name: 'BatchDropZone' })

interface Props {
  dropZoneActive: boolean
  selectedFiles: string[]
}

defineProps<Props>()

defineEmits<{
  drop: [event: DragEvent]
  click: []
  remove: [index: number]
  'update:dropZoneActive': [value: boolean]
}>()
</script>

<template>
  <section class="panel-section">
    <div class="section-header">
      <span class="section-label">视频文件</span>
      <span class="file-count">{{ selectedFiles.length }} 个</span>
    </div>

    <div
      :class="['drop-zone', { active: dropZoneActive }]"
      @dragover.prevent="$emit('update:dropZoneActive', true)"
      @dragleave="$emit('update:dropZoneActive', false)"
      @drop="$emit('drop', $event)"
      @click="$emit('click')"
    >
      <div class="drop-content">
        <svg class="drop-icon" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
          <path d="M24 14v14M18 22l6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 36h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p class="drop-main">拖拽视频文件到这里</p>
        <p class="drop-sub">或点击选择文件</p>
        <p class="drop-formats">支持 MP4 · MKV · AVI · MOV · WebM</p>
      </div>

      <transition name="drop-fade">
        <div v-if="dropZoneActive" class="drop-overlay-inner">
          <svg class="drop-overlay-icon" viewBox="0 0 48 48" fill="none">
            <path d="M24 12v18M15 21l9 9 9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>释放以添加</span>
        </div>
      </transition>
    </div>

    <transition-group name="file-list" tag="div" class="file-list" v-if="selectedFiles.length > 0">
      <div
        v-for="(file, index) in selectedFiles"
        :key="file"
        class="file-card"
      >
        <div class="file-icon-wrap">
          <svg class="file-icon" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 9l5 3-5 3V9z" fill="currentColor" opacity="0.7"/>
          </svg>
        </div>
        <span class="file-name">{{ file.split('/').pop() ?? file }}</span>
        <button class="file-remove" @click.stop="$emit('remove', index)" title="移除">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </transition-group>
  </section>
</template>

<style lang="scss" scoped>
.panel-section {
  @include panel-section;
}

.section-header {
  @include section-header;
}

.section-label {
  @include section-label;
}

.file-count {
  font-size: $text-xs;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 8px;
  border-radius: $radius-full;
}

.drop-zone {
  border: 2px dashed $border;
  border-radius: $radius-md;
  padding: $space-6;
  text-align: center;
  cursor: pointer;
  transition: all $transition-base;
  background: rgba($bg-overlay, 0.3);

  &:hover, &.active {
    border-color: $primary;
    background: rgba($primary, 0.05);
  }
}

.drop-content {
  display: flex;
  @include flex-column;
  align-items: center;
  gap: $space-3;
}

.drop-icon {
  width: 48px;
  height: 48px;
  color: $text-muted;
  opacity: 0.5;
}

.drop-main {
  font-size: $text-base;
  font-weight: 600;
  color: $text-secondary;
}

.drop-sub {
  font-size: $text-sm;
  color: $text-muted;
}

.drop-formats {
  font-size: $text-xs;
  color: $text-muted;
}

.drop-overlay-inner {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  background: rgba($primary, 0.1);
  border-radius: $radius-md;
}

.drop-overlay-icon {
  width: 48px;
  height: 48px;
  color: $primary;
}

.drop-fade-enter-active,
.drop-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drop-fade-enter-from,
.drop-fade-leave-to {
  opacity: 0;
}

.file-list {
  margin-top: $space-3;
  display: flex;
  @include flex-column;
  gap: $space-2;
  max-height: 200px;
  overflow-y: auto;
}

.file-card {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-sm;
  animation: card-enter 0.2s ease-out;
}

.file-icon-wrap {
  flex-shrink: 0;
}

.file-icon {
  width: 24px;
  height: 24px;
  color: $primary;
  opacity: 0.7;
}

.file-name {
  flex: 1;
  font-size: $text-sm;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  @include icon-btn(24px, $radius-full, rgba($error, 0.1), $error);
}

.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.2s ease;
}

.file-list-enter-from,
.file-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
