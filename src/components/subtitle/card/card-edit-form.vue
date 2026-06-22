<script setup lang="ts">
defineOptions({ name: 'CardEditForm' })

interface Props {
  editText: string
  editStartTime: string
  editEndTime: string
}

defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  save: []
}>()
</script>

<template>
  <transition name="edit">
    <div class="edit-form" @click.stop>
      <div class="edit-time">
        <input v-model="editStartTime" type="text" class="time-input" placeholder="00:00:00,000" />
        <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
          <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <input v-model="editEndTime" type="text" class="time-input" placeholder="00:00:00,000" />
      </div>
      <textarea
        v-model="editText"
        class="edit-textarea"
        rows="3"
        @keydown.esc="emit('cancel')"
        @keydown.ctrl.enter="emit('save')"
      />
      <div class="edit-footer">
        <span class="edit-hint">Ctrl+Enter 保存 · Esc 取消</span>
        <div class="edit-actions">
          <button class="btn btn-ghost" @click="emit('cancel')">取消</button>
          <button class="btn btn-primary" @click="emit('save')">保存</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.edit-form {
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.edit-time {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.time-input {
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  padding: $space-2;
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-primary);
  transition: border-color $duration-fast $ease-out-expo;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: $glow-sm;
  }
}

.time-arrow {
  width: 12px;
  height: 12px;
  opacity: 0.4;
}

.edit-textarea {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  padding: $space-2;
  font-size: $text-xs;
  color: var(--text-primary);
  font-family: inherit;
  resize: none;
  line-height: $leading-normal;
  transition: border-color $duration-fast $ease-out-expo;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: $glow-sm;
  }
}

.edit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.edit-actions {
  display: flex;
  gap: $space-2;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $space-1 $space-3;
  border-radius: $radius-sm;
  font-size: $text-xs;
  font-weight: 600;
  cursor: pointer;
  transition: all $duration-fast $ease-out-expo;
  border: 1px solid transparent;
}

.btn-ghost {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);

  &:hover {
    background: var(--primary-dark);
  }
}

.edit-enter-active,
.edit-leave-active {
  transition: opacity $duration-fast $ease-out-expo, transform $duration-fast $ease-out-expo;
}

.edit-enter-from,
.edit-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
