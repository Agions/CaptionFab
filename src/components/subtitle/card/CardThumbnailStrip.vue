<script setup lang="ts">
defineOptions({ name: 'CardThumbnailStrip' })

interface Props {
  urls: string[]
}

defineProps<Props>()
</script>

<template>
  <transition name="thumb">
    <div class="thumb-strip">
      <img
        v-for="(url, ti) in urls"
        :key="ti"
        :src="url"
        class="thumb-img"
        alt=""
      />
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.thumb-strip {
  display: flex;
  gap: 4px;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1px solid var(--border);
}

.thumb-img {
  width: 44px;
  height: 26px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  opacity: 0.75;
  transition: opacity $duration-fast $ease-out-expo;

  &:hover { opacity: 1; }
}

.thumb-enter-active,
.thumb-leave-active {
  transition: opacity $duration-fast $ease-out-expo;
}

.thumb-enter-from,
.thumb-leave-to {
  opacity: 0;
}
</style>
