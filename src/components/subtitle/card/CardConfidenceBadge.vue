<script setup lang="ts">
import { getConfidenceLevel } from '@/utils/confidence'

interface Props {
  confidence: number
}

defineProps<Props>()
</script>

<template>
  <span :class="['conf-pill', `conf-${getConfidenceLevel(confidence)}`]">
    {{ Math.round(confidence * 100) }}%
  </span>
</template>

<style lang="scss" scoped>
.conf-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-size: 10px;
  font-weight: 700;
  font-family: $font-mono;

  &.conf-high {
    background: rgba($success, 0.15);
    color: $success;
    border: 1px solid rgba($success, 0.3);
  }

  &.conf-mid {
    background: rgba($warning, 0.15);
    color: $warning;
    border: 1px solid rgba($warning, 0.3);
  }

  &.conf-low {
    background: rgba($error, 0.15);
    color: $error;
    border: 1px solid rgba($error, 0.3);
  }
}
</style>
