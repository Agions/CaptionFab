<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TopToolbar from './components/layout/TopToolbar.vue';
import VideoPlayer from './components/video/VideoPlayer.vue';
import SubtitleTimelineList from './components/subtitle/SubtitleTimelineList.vue';
import SettingsModal from './components/layout/SettingsModal.vue';
import UpdateModal from './components/layout/UpdateModal.vue';
import { PipelineEngine } from './core/PipelineEngine';
import { useSubtitleStore } from './stores/subtitleStore';
import { UpdaterService, type UpdateInfo } from './services/updaterService';

const subtitleStore = useSubtitleStore();
const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null);

const isSettingsOpen = ref(false);
const isUpdateOpen = ref(false);
const currentUpdateInfo = ref<UpdateInfo | null>(null);

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
    alert(`提取硬字幕提示: ${errMsg}`);
    if (errMsg.includes('API Key')) {
      isSettingsOpen.value = true;
    }
  }
}

function handleUpdateFound(info: UpdateInfo) {
  currentUpdateInfo.value = info;
  isUpdateOpen.value = true;
}

function loadDemoPresentationData() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  // 绘制沉浸式电影场景图层
  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.4, '#1e293b');
  grad.addColorStop(0.8, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(640, 260, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(640, 480, 480, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // 绘制画面底部的真实中文字幕
  ctx.font = 'bold 38px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('欢迎使用 Distill 智能硬字幕蒸馏提取工具', 640, 620);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('欢迎使用 Distill 智能硬字幕蒸馏提取工具', 640, 620);

  const dataUrl = canvas.toDataURL('image/png');

  subtitleStore.videoUrl = dataUrl;
  subtitleStore.videoPoster = dataUrl;
  subtitleStore.videoFileName = 'Distill_Demo_4K_Movie.mp4';
  subtitleStore.videoDuration = 185.5;
  subtitleStore.currentTime = 14.2;
  subtitleStore.isRoiActive = true;
  subtitleStore.setROI({ x: 0.10, y: 0.70, width: 0.80, height: 0.20 });
  subtitleStore.subtitles = [
    { id: 'sub_1', startTime: 3200, endTime: 6800, text: '欢迎使用 Distill 智能硬字幕蒸馏提取工具', confidence: 98 },
    { id: 'sub_2', startTime: 7200, endTime: 11500, text: '自动识别视频硬字幕区域与多语言文本', confidence: 96 },
    { id: 'sub_3', startTime: 12000, endTime: 16800, text: '支持 AI 错别字校对与多格式字幕实时导出', confidence: 95 }
  ];
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    (window as any).__subtitleStore = subtitleStore;
    (window as any).__loadDemoData = loadDemoPresentationData;

    // 如果 URL 包含 ?demo=1，自动加载中文视频与字幕展示数据
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === '1') {
      loadDemoPresentationData();
    }
  }

  // 静默后台检查软件最新版本
  try {
    const info = await UpdaterService.check();
    if (info.available) {
      handleUpdateFound(info);
    }
  } catch (err) {
    console.warn('后台检查更新静默跳过:', err);
  }
});
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
      @update-found="handleUpdateFound"
    />

    <!-- 软件自动更新与升级弹窗 -->
    <UpdateModal
      :is-open="isUpdateOpen"
      :update-info="currentUpdateInfo"
      @close="isUpdateOpen = false"
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
