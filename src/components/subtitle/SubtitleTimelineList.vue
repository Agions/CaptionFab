<template>
  <div class="flex flex-col w-full h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
    <!-- 顶部 Header 工具条 -->
    <div class="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span class="text-sm font-semibold text-slate-100">字幕识别结果 ({{ subtitleStore.subtitleCount }})</span>
      </div>

      <!-- 快速导出菜单 Dropdown -->
      <div class="flex items-center gap-2">
        <button
          v-if="subtitleStore.subtitleCount > 0"
          class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-rose-400 rounded transition border border-slate-700"
          @click="subtitleStore.clearSubtitles"
        >
          清空
        </button>

        <div class="relative group">
          <button
            :disabled="subtitleStore.subtitleCount === 0"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow transition"
          >
            <span>导出字幕</span>
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
          </button>

          <!-- 导出格式下拉列表 -->
          <div class="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-emerald-600 hover:text-white transition"
              @click="exportAs('srt')"
            >
              导出为 .SRT
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-emerald-600 hover:text-white transition"
              @click="exportAs('vtt')"
            >
              导出为 .VTT
            </button>
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-emerald-600 hover:text-white transition"
              @click="exportAs('txt')"
            >
              导出为 .TXT
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提取进度条动画 -->
    <div v-if="subtitleStore.isExtracting" class="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-1.5">
      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-emerald-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          提取进度 (Extracting)
        </span>
        <span class="text-slate-300 font-bold">{{ subtitleStore.progressPercent }}%</span>
      </div>
      <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
          :style="{ width: `${subtitleStore.progressPercent}%` }"
        ></div>
      </div>
    </div>

    <!-- 列表空状态 -->
    <div v-if="subtitleStore.subtitleCount === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-3">
      <svg class="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <p class="text-xs">暂无字幕识别记录</p>
      <p class="text-[11px] text-slate-600 max-w-xs">框选视频字幕区域后，点击顶部“开始提取”按键即可自动抽取时间轴字幕</p>
    </div>

    <!-- 时间轴字幕卡片列表 -->
    <div v-else class="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
      <div
        v-for="item in subtitleStore.subtitles"
        :key="item.id"
        class="pt-2.5 first:pt-0 group flex flex-col gap-1.5 p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-lg transition"
      >
        <!-- 卡片 Top 时间码 & 置信度 Badge -->
        <div class="flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-2 text-emerald-400">
            <span class="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/60 text-[11px]">
              {{ formatTime(item.startTime) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <!-- 置信度分值 -->
            <span
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded font-mono',
                item.confidence >= 90 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              ]"
            >
              准确度 {{ item.confidence }}%
            </span>

            <button
              class="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1"
              title="删除此条"
              @click="subtitleStore.removeSubtitle(item.id)"
            >
              <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- 文本内联编辑框 -->
        <textarea
          :value="item.text"
          rows="2"
          class="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-slate-100 text-xs rounded p-2 resize-none focus:outline-none transition font-sans"
          @input="onTextChange(item.id, $event)"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSubtitleStore } from '../../stores/subtitleStore';
import { TimecodeConverter } from '../../utils/TimecodeConverter';
import { SubtitleExporter, type ExportFormat } from '../../utils/SubtitleExporter';
import { TauriBridge } from '../../services/tauriBridge';

const subtitleStore = useSubtitleStore();

function formatTime(ms: number): string {
  return TimecodeConverter.msToSRT(ms).split(',')[0];
}

function onTextChange(id: string, e: Event) {
  const target = e.target as HTMLTextAreaElement;
  subtitleStore.updateSubtitleText(id, target.value);
}

async function exportAs(format: ExportFormat) {
  const content = SubtitleExporter.exportToString(subtitleStore.subtitles, format);
  const name = subtitleStore.videoFileName
    ? `${subtitleStore.videoFileName.replace(/\.[^/.]+$/, '')}.${format}`
    : `distill_subtitles.${format}`;

  if (TauriBridge.isTauriEnv()) {
    await TauriBridge.saveSubtitlesDialog(content, name);
  } else {
    SubtitleExporter.downloadFile(content, name);
  }
}
</script>
