<script setup lang="ts">
/**
 * SkeletonCard - 字幕卡片骨架屏组件
 */
</script>

<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <div class="sk sk-index"/>
      <div class="sk sk-time"/>
      <div class="sk sk-badge"/>
    </div>
    <div class="sk sk-text"/>
    <div class="sk sk-text sk-short"/>
  </div>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

.skeleton-card {
  position: relative;
  padding: $space-3;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--bg-elevated);
    animation: skeleton-pulse 1.8s ease-in-out infinite;
  }

  .skeleton-header {
    position: relative;
    display: flex;
    gap: $space-2;
    margin-bottom: $space-2;
    z-index: 1;
  }
}

.sk {
  position: relative;
  background: var(--bg-overlay);
  border-radius: var(--radius-sm);
  z-index: 1;

  &-index { 
    width: 22px; 
    height: 22px; 
    flex-shrink: 0; 
    border-radius: $radius-sm;
  }
  &-time { 
    width: 72px; 
    height: 12px; 
  }
  &-badge { 
    width: 32px; 
    height: 16px; 
    border-radius: $radius-full; 
    margin-left: auto; 
  }
  &-text { 
    width: 90%; 
    height: 12px; 
    margin-bottom: 6px; 
  }
  &-short { 
    width: 55%; 
  }
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
