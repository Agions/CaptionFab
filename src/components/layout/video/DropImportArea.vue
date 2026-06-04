<script setup lang="ts">
defineOptions({ name: 'DropImportArea' })

interface Props {
  hasVideo: boolean
  isDragOver: boolean
}

defineProps<Props>()

defineEmits<{
  drop: [event: DragEvent]
  click: []
}>()
</script>

<template>
  <transition name="state">
    <div
      v-if="!hasVideo"
      class="empty-state"
      :class="{ 'drag-over': isDragOver }"
      @drop="$emit('drop', $event)"
      @click="$emit('click')"
    >
      <div class="empty-content">
        <div class="empty-icon">
          <svg viewBox="0 0 64 64" fill="none" class="empty-icon-svg">
            <rect x="8" y="16" width="48" height="32" rx="6" stroke="currentColor" stroke-width="2"/>
            <path d="M26 26l14 6-14 6V26z" fill="currentColor" opacity="0.8"/>
          </svg>
        </div>
        <h3 class="empty-title">导入视频开始提取</h3>
        <p class="empty-desc">拖拽视频文件到此处，或点击下方按钮选择</p>
        <button class="import-btn" @click="$emit('click')">
          <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
            <path d="M3 7v9a2 2 0 002 2h10a2 2 0 002-2V7M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          选择视频文件
        </button>
        <p class="empty-formats">支持 MP4 · MKV · AVI · MOV · WebM</p>
      </div>

      <!-- Drop Overlay -->
      <transition name="drop">
        <div v-if="isDragOver" class="drop-overlay">
          <div class="drop-inner">
            <svg viewBox="0 0 48 48" fill="none" class="drop-icon">
              <path d="M24 8v24M14 22l10 10 10-10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 36h32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="drop-text">释放以导入视频</span>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-xl);
  background: linear-gradient(
    135deg,
    rgba($primary, 0.02) 0%,
    rgba($accent, 0.02) 100%
  );
  position: relative;
  transition: border-color $duration-normal $ease-out-expo,
              background $duration-normal $ease-out-expo;
  cursor: pointer;

  &.drag-over {
    border-color: var(--primary);
    border-style: solid;
    background: rgba($primary, 0.04);
  }
}

.empty-content {
  text-align: center;
  max-width: 320px;
  @include entrance;
}

.empty-icon {
  margin-bottom: $space-6;
}

.empty-icon-svg {
  width: 64px;
  height: 64px;
  color: $gray-500;
  margin: 0 auto;
}

.empty-title {
  font-size: $text-base;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: $tracking-tight;
  margin-bottom: $space-2;
}

.empty-desc {
  font-size: $text-xs;
  color: $gray-500;
  margin-bottom: $space-6;
  line-height: $leading-relaxed;
}

.import-btn {
  @include btn-primary;
  padding: $space-3 $space-6;
  margin-bottom: $space-4;

  .btn-icon {
    width: 16px;
    height: 16px;
  }
}

.empty-formats {
  font-size: $text-2xs;
  color: $gray-600;
  letter-spacing: $tracking-wide;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($primary, 0.06);
  border-radius: var(--radius-xl);
  border: 2px solid var(--primary);
  backdrop-filter: blur(4px);
}

.drop-inner {
  display: flex;
  @include flex-column;
  align-items: center;
  gap: $space-3;
}

.drop-icon {
  width: 48px;
  height: 48px;
  color: var(--primary);
}

.drop-text {
  font-size: $text-sm;
  font-weight: 600;
  color: var(--primary);
}

.state-enter-active,
.state-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.state-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.state-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.2s ease;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
}
</style>
