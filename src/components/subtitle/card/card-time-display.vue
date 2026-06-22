<script setup lang="ts">
import { formatTimeShort } from '@/utils/time'

interface Props {
  start: number
  end: number
  format?: (time: number) => string
}

defineProps<Props>()
</script>

<template>
  <span class="card-time">
    {{ format ? format(start) : formatTimeShort(start) }}
    <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
      <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    {{ format ? format(end) : formatTimeShort(end) }}
  </span>
</template>

<style lang="scss" scoped>
.card-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-muted);

  .time-arrow {
    width: 12px;
    height: 12px;
    opacity: 0.4;
  }
}
</style>
