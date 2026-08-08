<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
    <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
        <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          Distill 全局设置与安全密钥管理
        </h3>
        <button class="text-slate-400 hover:text-white transition cursor-pointer" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5 text-xs text-slate-300">
        <!-- 云端 API Key -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-200 block">云端 API Key (Gemini / OpenAI Vision)</label>
          <input
            v-model="tempApiKey"
            type="password"
            placeholder="输入您的 API Key"
            class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none transition font-mono"
          />
          <p class="text-[11px] text-slate-500">凭据通过本地 AES 方式加密存储，仅在进行识别时发起 HTTPS 请求。</p>
        </div>

        <!-- Custom Cloud Endpoint -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-200 block">云端 API Endpoint URL</label>
          <input
            v-model="tempEndpoint"
            type="text"
            placeholder="https://..."
            class="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none transition font-mono"
          />
        </div>

        <!-- 软件版本与自动检查更新 -->
        <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span class="font-semibold text-slate-200 block">软件版本信息</span>
            <span class="text-[11px] text-slate-500 font-mono">当前安装版本: v0.0.1</span>
          </div>
          <button
            :disabled="isCheckingUpdate"
            class="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 rounded-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            @click="onCheckForUpdates"
          >
            <svg class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{{ isCheckingUpdate ? '检测中...' : '检查更新' }}</span>
          </button>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
        <button
          class="px-3 py-1.5 text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg transition cursor-pointer"
          @click="onClearCredentials"
        >
          抹除所有密钥
        </button>

        <div class="flex items-center gap-3">
          <button
            class="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition cursor-pointer"
            @click="onSave"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSecurityStore } from '../../stores/securityStore';
import { UpdaterService } from '../../services/updaterService';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close', 'saved', 'updateFound']);

const securityStore = useSecurityStore();

const tempApiKey = ref('');
const tempEndpoint = ref('');
const isCheckingUpdate = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      tempApiKey.value = securityStore.apiKey;
      tempEndpoint.value = securityStore.cloudEndpoint;
    }
  }
);

function onSave() {
  securityStore.saveApiKey(tempApiKey.value, tempEndpoint.value);
  emit('saved');
  emit('close');
}

function onClearCredentials() {
  securityStore.clearCredentials();
  tempApiKey.value = '';
  emit('saved');
}

async function onCheckForUpdates() {
  isCheckingUpdate.value = true;
  try {
    const info = await UpdaterService.check();
    if (info.available) {
      emit('updateFound', info);
      emit('close');
    } else {
      alert(`已是最新版本！当前已是最新 v${info.currentVersion}`);
    }
  } catch {
    alert('检测版本更新失败，请检查网络连接');
  } finally {
    isCheckingUpdate.value = false;
  }
}
</script>
