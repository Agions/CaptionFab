<script setup lang="ts">
defineOptions({ name: 'ToggleSwitch' })

interface Props {
  modelValue: boolean
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="toggle-wrapper" :class="{ disabled }">
    <button
      class="toggle-switch"
      :class="{ on: modelValue }"
      @click="toggle"
      :disabled="disabled"
      :aria-pressed="modelValue"
    >
      <span class="toggle-thumb" />
    </button>
    <span v-if="label" class="toggle-label">{{ label }}</span>
  </div>
</template>

<style lang="scss" scoped>
.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: $space-2;

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: $bg-overlay;
  @include card-border;
  border-radius: $radius-full;
  padding: 2px;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;
  border: none;
  outline: none;

  &:hover:not(:disabled) {
    background: $bg-elevated;
  }

  &.on {
    background: $primary;
    border-color: $primary;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.toggle-thumb {
  display: block;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform $transition-base;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

  .toggle-switch.on & {
    transform: translateX(16px);
  }
}

.toggle-label {
  font-size: $text-sm;
  color: $text-secondary;
  user-select: none;
}
</style>
