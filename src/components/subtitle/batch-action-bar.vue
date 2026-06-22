<template>
  <div class="batch-action-bar">
    <button
      class="action-btn"
      @click="$emit('export')"
    >
      导出字幕
    </button>
    <button
      class="action-btn secondary"
      @click="$emit('batch')"
    >
      批量处理
    </button>
  </div>
</template>

<style lang="scss" scoped>
.batch-action-bar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease-out;

  &:hover {
    opacity: 0.9;
  }

  &.secondary {
    background: var(--bg-muted);
    color: var(--text);
  }
}
</style>
