<script setup lang="ts">
import { ref } from 'vue';
import TopToolbar from './components/layout/TopToolbar.vue';
import VideoPlayer from './components/video/VideoPlayer.vue';
import SubtitleTimelineList from './components/subtitle/SubtitleTimelineList.vue';
import SettingsModal from './components/layout/SettingsModal.vue';
import { PipelineEngine } from './core/PipelineEngine';
import { useSubtitleStore } from './stores/subtitleStore';

const subtitleStore = useSubtitleStore();
const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null);
const isSettingsOpen = ref(false);

const pipeline = new PipelineEngine();

async function handleStartExtraction() {
  const videoEl = videoPlayerRef.value?.getVideoElement();
  if (!videoEl || !subtitleStore.videoUrl) {
    alert('请先导入视频文件');
    return;
  }

  try {
    await pipeline.startExtraction(videoEl, subtitleStore.roi);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    alert(`提取硬字幕失败: ${errMsg}`);
  }
}
</script>

<template>
  <div class="distill-app w-screen h-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
    <!-- 顶部 Toolbar 控制栏 -->
    <TopToolbar
      @start-extraction="handleStartExtraction"
      @open-settings="isSettingsOpen = true"
    />

    <!-- 主工作台：左侧视频 Preview & ROI 选区 / 右侧字幕时间轴结果 -->
    <main class="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden bg-slate-950">
      <!-- 左侧 65% 视频预览区 -->
      <section class="flex-1 flex flex-col min-w-0 min-h-0">
        <VideoPlayer ref="videoPlayerRef" />
      </section>

      <!-- 右侧 35% 字幕结果与时间轴控制面板 -->
      <aside class="w-[420px] shrink-0 flex flex-col min-h-0">
        <SubtitleTimelineList />
      </aside>
    </main>

    <!-- 设置与 API 密钥 Modal -->
    <SettingsModal
      :is-open="isSettingsOpen"
      @close="isSettingsOpen = false"
    />
  </div>
</template>

<style>
@import 'assets/styles/global.scss';

.distill-app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #090d16;
  color: #f8fafc;
  overflow: hidden;
}
</style>
