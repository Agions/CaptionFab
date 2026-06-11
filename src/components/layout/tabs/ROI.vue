<script setup lang="ts">
import { useROI } from '@/composables/useROI'
import { useAutoROI } from '@/composables/useAutoROI'
import { useProjectStore } from '@/stores/project'

const { roiPresets, selectedROI, selectPreset } = useROI()
const { isDetecting, detectedROI, error: autoROIError, detectROI, applyDetectedROI } = useAutoROI()
const projectStore = useProjectStore()

function handleAutoDetect() {
  if (!projectStore.videoPath) return
  detectROI(projectStore.videoPath, projectStore.currentTime)
}
</script>

<template>
  <div class="tab-content">
    <!-- Auto-detect section -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">自动检测</span>
      </div>

      <div class="auto-detect-card">
        <button
          class="btn btn-primary btn-detect"
          :disabled="!projectStore.videoPath || isDetecting"
          @click="handleAutoDetect"
        >
          <span v-if="isDetecting" class="spinner" />
          <span v-else>🎯</span>
          {{ isDetecting ? '检测中...' : '一键检测字幕区域' }}
        </button>

        <div v-if="autoROIError" class="detect-error">
          ⚠️ {{ autoROIError }}
        </div>

        <div v-if="detectedROI && !isDetecting" class="detect-result">
          <div class="detect-result-info">
            <span>检测结果：X {{ detectedROI.x.toFixed(1) }}% · Y {{ detectedROI.y.toFixed(1) }}%</span>
            <span>W {{ detectedROI.width.toFixed(1) }}% · H {{ detectedROI.height.toFixed(1) }}%</span>
            <span class="confidence">置信度 {{ (detectedROI.confidence * 100).toFixed(0) }}%</span>
          </div>
          <button class="btn btn-success btn-apply" @click="applyDetectedROI">
            ✅ 应用此区域
          </button>
        </div>
      </div>
    </div>

    <!-- Presets section -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">字幕区域预设</span>
      </div>

      <div class="roi-cards">
        <button
          v-for="preset in roiPresets"
          :key="preset.id"
          :class="['roi-card', { active: selectedROI?.id === preset.id }]"
          @click="selectPreset(preset.id)"
        >
          <!-- ROI preview illustration -->
          <div class="roi-preview">
            <div
              class="roi-zone"
              :style="{
                top: preset.rect.y + '%',
                left: preset.rect.x + '%',
                width: preset.rect.width + '%',
                height: preset.rect.height + '%',
              }"
            />
          </div>
          <span class="roi-name">{{ preset.name }}</span>
          <span class="roi-check">
            <svg v-if="selectedROI?.id === preset.id" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </div>

    <div class="section" v-if="selectedROI">
      <div class="section-header">
        <span class="section-title">当前区域详情</span>
      </div>
      <div class="roi-detail-card">
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <span class="detail-value">{{ selectedROI.type }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">坐标</span>
          <span class="detail-value">X {{ selectedROI.x.toFixed(1) }}% · Y {{ selectedROI.y.toFixed(1) }}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">尺寸</span>
          <span class="detail-value">W {{ selectedROI.width.toFixed(1) }}% · H {{ selectedROI.height.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-detect {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-primary, #4f8cf7);
  color: white;
}

.btn-detect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auto-detect-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detect-error {
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 0.8rem;
}

.detect-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.08);
  gap: 0.5rem;
}

.detect-result-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  color: var(--color-text, #333);
}

.confidence {
  color: var(--color-primary, #4f8cf7);
  font-weight: 600;
}

.btn-apply {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-apply:hover {
  background: rgba(34, 197, 94, 0.25);
}
</style>
