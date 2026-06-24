<script setup lang="ts">
interface Props {
  isOpen: boolean
  title: string
  contentMinWidth?: number | string | null
  contentMaxWidth?: number | string | null
}

withDefaults(defineProps<Props>(), {
  contentMinWidth: 360,
  contentMaxWidth: 480,
})

defineEmits<{
  close: []
}>()
</script>

<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="base-modal" role="dialog" aria-modal="true">
        <div class="modal-content" :style="{ minWidth: contentMinWidth ? `${contentMinWidth}px` : undefined, maxWidth: contentMaxWidth ? `${contentMaxWidth}px` : undefined }">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="modal-close" @click="$emit('close')" aria-label="关闭">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style lang="scss" scoped>
.base-modal {
  @include modal-wrapper;
}

.modal-content {
  @include modal-content;
}

.modal-header {
  @include modal-header;
}

.modal-close {
  @include icon-btn;
}

.modal-body {
  @include modal-body;
}

@include modal-fade('modal-fade');
</style>
