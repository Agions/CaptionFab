# CaptionFab 5-Feature Enhancement Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add 5 major features to CaptionFab: auto subtitle region detection, multi-mode processing, GPU acceleration, batch processing, and subtitle translation.

**Architecture:** Extend existing Tauri 2.x + Vue 3.5 + Rust architecture with Python scripts for heavy processing (auto-detection, translation), enhance frontend composable layer for mode selection, and add CUDA support via PaddleOCR configuration.

**Tech Stack:** Tauri 2.x · Vue 3.5 · Rust 2021 · TypeScript 5 · PaddleOCR 3.x · Python 3.12+ · Vitest

---

## Feature 1: Auto Subtitle Region Detection

### Overview
Add automatic subtitle region detection that analyzes video frames to find where subtitles appear, eliminating the need for manual ROI selection.

### Task 1.1: Create Python auto-detection script

**Objective:** Create a Python script that uses edge detection and projection analysis to find subtitle regions.

**Files:**
- Create: `src-tauri/scripts/auto_detect_roi.py`

**Implementation:**

```python
#!/usr/bin/env python3
"""
Auto-detect subtitle region in video frames.
Uses horizontal projection profile to find text-dense areas.

Usage:
    python3 auto_detect_roi.py <image_path> <width> <height>

Output: JSON object with detected ROI:
{"x": 0, "y": 85, "width": 100, "height": 15, "confidence": 0.95}
"""

import sys
import json
import os
import subprocess

def detect_subtitle_region(image_path: str, frame_width: int, frame_height: int) -> dict:
    """Detect subtitle region using horizontal projection."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        # Fallback: return default bottom region
        return {"x": 0, "y": 85, "width": 100, "height": 15, "confidence": 0.5}

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        return {"x": 0, "y": 85, "width": 100, "height": 15, "confidence": 0.5}

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply edge detection
    edges = cv2.Canny(gray, 100, 200)

    # Horizontal projection (sum pixels per row)
    h_proj = np.sum(edges > 0, axis=1)

    # Smooth the projection
    kernel_size = max(3, frame_height // 50)
    if kernel_size % 2 == 0:
        kernel_size += 1
    h_proj_smooth = np.convolve(h_proj, np.ones(kernel_size)/kernel_size, mode='same')

    # Find rows with significant edge content (potential text)
    threshold = np.max(h_proj_smooth) * 0.1
    text_rows = np.where(h_proj_smooth > threshold)[0]

    if len(text_rows) == 0:
        return {"x": 0, "y": 85, "width": 100, "height": 15, "confidence": 0.5}

    # Find the main text cluster (subtitle region)
    # Subtitles are typically in the bottom 30% of the frame
    bottom_third_start = frame_height * 2 // 3
    bottom_text_rows = text_rows[text_rows >= bottom_third_start]

    if len(bottom_text_rows) > 0:
        y_min = int(np.min(bottom_text_rows) / frame_height * 100)
        y_max = int(np.max(bottom_text_rows) / frame_height * 100)
        height = y_max - y_min
        # Ensure minimum height
        if height < 5:
            height = 5
        confidence = min(1.0, len(bottom_text_rows) / (frame_height * 0.1))
        return {"x": 0, "y": y_min, "width": 100, "height": height, "confidence": confidence}
    else:
        # Use all text rows
        y_min = int(np.min(text_rows) / frame_height * 100)
        y_max = int(np.max(text_rows) / frame_height * 100)
        height = y_max - y_min
        if height < 5:
            height = 5
        confidence = min(1.0, len(text_rows) / (frame_height * 0.1))
        return {"x": 0, "y": y_min, "width": 100, "height": height, "confidence": confidence}


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: auto_detect_roi.py <image_path> <width> <height>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    width = int(sys.argv[2])
    height = int(sys.argv[3])

    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    try:
        result = detect_subtitle_region(image_path, width, height)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "x": 0, "y": 85, "width": 100, "height": 15, "confidence": 0.5}))
        sys.exit(1)


if __name__ == "__main__":
    main()
```

**Step 2: Create Rust command for auto-detection**

**Files:**
- Create: `src-tauri/src/commands/auto_roi.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Implementation:**

```rust
// src-tauri/src/commands/auto_roi.rs
use serde::{Deserialize, Serialize};
use std::path::Path;
use super::utils::{find_python_binary, find_script};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedROI {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub confidence: f32,
}

#[tauri::command]
pub async fn auto_detect_roi(
    video_path: String,
    timestamp: f64,
) -> Result<DetectedROI, String> {
    let path = Path::new(&video_path);
    if !path.exists() {
        return Err(format!("File not found: {}", video_path));
    }

    tracing::info!("Auto-detecting ROI at timestamp: {}", timestamp);

    // Extract frame at timestamp using ffmpeg
    let temp_dir = std::env::temp_dir();
    let frame_path = temp_dir.join("captionfab_roi_frame.png");

    let output = tokio::process::Command::new("ffmpeg")
        .args([
            "-ss", &timestamp.to_string(),
            "-i", &video_path,
            "-vframes", "1",
            "-y",
            frame_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        return Err("Failed to extract frame".to_string());
    }

    // Get video dimensions
    let meta_output = tokio::process::Command::new("ffprobe")
        .args([
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            &video_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    let meta_json: serde_json::Value = serde_json::from_slice(&meta_output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let width = meta_json["streams"][0]["width"].as_u64().unwrap_or(1920) as u32;
    let height = meta_json["streams"][0]["height"].as_u64().unwrap_or(1080) as u32;

    // Run auto-detection Python script
    let python = find_python_binary().await?;
    let script = find_script("auto_detect_roi.py")?;
    let script_path = script.to_str().ok_or("Invalid script path")?;

    let output = tokio::process::Command::new(&python)
        .args([
            script_path,
            frame_path.to_str().unwrap(),
            &width.to_string(),
            &height.to_string(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run auto_detect_roi.py: {}", e))?;

    // Clean up temp file
    let _ = tokio::fs::remove_file(&frame_path).await;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Auto-detection failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let roi: DetectedROI = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse ROI output: {}\nOutput: {}", e, stdout))?;

    tracing::info!("Detected ROI: y={}, height={}, confidence={}", roi.y, roi.height, roi.confidence);
    Ok(roi)
}
```

**Step 3: Update mod.rs**

```rust
// Add to src-tauri/src/commands/mod.rs
pub mod auto_roi;
```

**Step 4: Update lib.rs**

```rust
// Add to src-tauri/src/lib.rs
commands::auto_roi::auto_detect_roi,
```

**Step 5: Add frontend composable**

**Files:**
- Create: `src/composables/useAutoROI.ts`

```typescript
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useProjectStore } from '@/stores/project'
import type { ROI } from '@/types/video'

export function useAutoROI() {
  const projectStore = useProjectStore()
  const isDetecting = ref(false)
  const detectedROI = ref<ROI | null>(null)

  async function detectROI(videoPath: string, timestamp: number = 0) {
    isDetecting.value = true
    try {
      const result = await invoke<{
        x: number
        y: number
        width: number
        height: number
        confidence: number
      }>('auto_detect_roi', { videoPath, timestamp })

      if (result.confidence > 0.3) {
        const roi: ROI = {
          id: 'auto-detected',
          name: `自动检测 (${Math.round(result.confidence * 100)}%)`,
          type: 'bottom',
          x: result.x,
          y: result.y,
          width: result.width,
          height: result.height,
          unit: 'percent',
          enabled: true,
        }
        detectedROI.value = roi
        return roi
      }
    } catch (e) {
      console.error('[AutoROI] Detection failed:', e)
    } finally {
      isDetecting.value = false
    }
    return null
  }

  function applyDetectedROI() {
    if (detectedROI.value) {
      projectStore.setCustomROI(detectedROI.value)
    }
  }

  return {
    isDetecting,
    detectedROI,
    detectROI,
    applyDetectedROI,
  }
}
```

**Step 6: Add UI button in ROI tab**

**Files:**
- Modify: `src/components/layout/tabs/ROI.vue`

Add auto-detect button after the presets section:

```vue
<!-- Auto-detect section -->
<div class="section">
  <div class="section-title">
    <svg viewBox="0 0 16 16" fill="none" class="section-icon">
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
      <path d="M8 4v8M4 8h8" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    <span>自动检测</span>
  </div>

  <button
    class="auto-detect-btn"
    :disabled="isDetecting || !projectStore.videoPath"
    @click="handleAutoDetect"
  >
    <span v-if="isDetecting" class="detecting">
      <span class="spinner"></span>
      检测中...
    </span>
    <span v-else>
      🎯 一键检测字幕区域
    </span>
  </button>

  <div v-if="detectedROI" class="detected-result">
    <div class="result-info">
      <span class="result-label">检测结果:</span>
      <span class="result-value">Y {{ detectedROI.y.toFixed(1) }}% - H {{ detectedROI.height.toFixed(1) }}%</span>
    </div>
    <button class="apply-btn" @click="applyDetectedROI">
      ✅ 应用此区域
    </button>
  </div>
</div>
```

**Step 7: Commit**

```bash
git add src-tauri/scripts/auto_detect_roi.py src-tauri/src/commands/auto_roi.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src/composables/useAutoROI.ts src/components/layout/tabs/ROI.vue
git commit -m "feat(roi): add auto subtitle region detection

- Add Python script for edge-based subtitle detection
- Add Rust command for frame extraction and detection
- Add useAutoROI composable for frontend integration
- Add auto-detect button in ROI tab"
```

---

## Feature 2: Multi-Mode Processing

### Overview
Add three processing modes (fast/standard/precise) that balance speed vs accuracy.

### Task 2.1: Define processing modes

**Files:**
- Modify: `src/types/video.ts`

```typescript
// Add to ExtractOptions interface
export interface ExtractOptions {
  // ... existing options
  processingMode: 'fast' | 'standard' | 'precise'
}

// Add mode presets
export const PROCESSING_MODES = {
  fast: {
    name: '快速模式',
    description: '跳帧更多，速度快，可能遗漏少量字幕',
    frameInterval: 3,
    multiPass: false,
    sceneThreshold: 0.4,
    confidenceThreshold: 0.6,
  },
  standard: {
    name: '标准模式',
    description: '平衡速度与准确率（推荐）',
    frameInterval: 2,
    multiPass: false,
    sceneThreshold: 0.3,
    confidenceThreshold: 0.5,
  },
  precise: {
    name: '精准模式',
    description: '逐帧检测，最准确，速度较慢',
    frameInterval: 1,
    multiPass: true,
    sceneThreshold: 0.2,
    confidenceThreshold: 0.4,
  },
} as const

export type ProcessingMode = keyof typeof PROCESSING_MODES
```

**Step 2: Update project store**

**Files:**
- Modify: `src/stores/project.ts`

```typescript
// Add to DEFAULT_EXTRACT_OPTIONS
processingMode: 'standard' as ProcessingMode,
```

**Step 3: Update extractor to use mode presets**

**Files:**
- Modify: `src/composables/useExtractor.ts`

```typescript
import { PROCESSING_MODES } from '@/types/video'

// In startExtraction():
const modeConfig = PROCESSING_MODES[opts.processingMode]
const effectiveFrameInterval = modeConfig.frameInterval
const effectiveMultiPass = modeConfig.multiPass
const effectiveSceneThreshold = modeConfig.sceneThreshold
const effectiveConfThreshold = modeConfig.confidenceThreshold

// Use these values instead of opts directly
```

**Step 4: Add mode selector UI**

**Files:**
- Modify: `src/components/layout/tabs/OCR.vue`

Add mode selection section:

```vue
<!-- Processing Mode -->
<div class="section">
  <div class="section-title">
    <svg viewBox="0 0 16 16" fill="none" class="section-icon">
      <path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <span>处理模式</span>
  </div>

  <div class="mode-list">
    <button
      v-for="(mode, key) in processingModes"
      :key="key"
      :class="['mode-item', { active: selectedMode === key }]"
      @click="selectedMode = key"
    >
      <div class="mode-header">
        <span class="mode-name">{{ mode.name }}</span>
        <span class="mode-speed" :class="key">
          {{ key === 'fast' ? '🚀' : key === 'standard' ? '⚖️' : '🎯' }}
        </span>
      </div>
      <div class="mode-desc">{{ mode.description }}</div>
    </button>
  </div>
</div>
```

**Step 5: Commit**

```bash
git add src/types/video.ts src/stores/project.ts src/composables/useExtractor.ts src/components/layout/tabs/OCR.vue
git commit -m "feat(mode): add fast/standard/precise processing modes

- Define PROCESSING_MODES with frame intervals and thresholds
- Update ExtractOptions with processingMode field
- Update extractor to use mode-specific settings
- Add mode selector UI in OCR tab"
```

---

## Feature 3: GPU Acceleration

### Overview
Add CUDA support for PaddleOCR to significantly speed up OCR processing.

### Task 3.1: Add GPU detection and configuration

**Files:**
- Modify: `src-tauri/scripts/paddle_ocr.py`

```python
# Add GPU support to paddle_ocr.py
def main():
    # ... existing code ...

    try:
        from paddleocr import PaddleOCR
        import paddle

        # Check GPU availability
        use_gpu = paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0

        # Map language codes
        lang_map = {'ch': 'ch', 'en': 'en', 'ja': 'japan', 'ko': 'korean'}
        paddle_lang = lang_map.get(lang, 'ch')

        # Initialize with GPU support
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=paddle_lang,
            show_log=False,
            use_gpu=use_gpu,  # Enable GPU if available
            gpu_mem=500,      # Limit GPU memory to 500MB
        )

        # ... rest of OCR processing ...
```

**Step 2: Add GPU status check command**

**Files:**
- Modify: `src-tauri/src/commands/system.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GPUCapability {
    pub available: bool,
    pub name: Option<String>,
    pub memory: Option<u64>,
    pub cuda_version: Option<String>,
}

#[tauri::command]
pub async fn check_gpu_capability() -> GPUCapability {
    let python = find_python_binary().await.unwrap_or_default();
    let script = r#"
import sys
try:
    import paddle
    import json
    result = {
        "available": paddle.device.is_compiled_with_cuda() and paddle.device.cuda.device_count() > 0,
        "name": None,
        "memory": None,
        "cuda_version": paddle.version.get_cuda_info() if hasattr(paddle.version, 'get_cuda_info') else None
    }
    if result["available"]:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        result["name"] = pynvml.nvmlDeviceGetName(handle)
        result["memory"] = info.total
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"available": False, "error": str(e)}))
"#;

    let output = tokio::process::Command::new(&python)
        .args(["-c", script])
        .output()
        .await
        .ok();

    if let Some(out) = output {
        if let Ok(result) = serde_json::from_slice::<GPUCapability>(&out.stdout) {
            return result;
        }
    }

    GPUCapability {
        available: false,
        name: None,
        memory: None,
        cuda_version: None,
    }
}
```

**Step 3: Add GPU toggle in settings**

**Files:**
- Modify: `src/components/layout/tabs/Settings.vue`

```vue
<!-- GPU Settings -->
<div class="section" v-if="gpuCapability.available">
  <div class="section-title">
    <svg viewBox="0 0 16 16" fill="none" class="section-icon">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/>
      <path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    <span>GPU 加速</span>
    <span class="gpu-badge">可用</span>
  </div>

  <div class="gpu-info">
    <div class="gpu-detail">
      <span class="label">设备:</span>
      <span class="value">{{ gpuCapability.name }}</span>
    </div>
    <div class="gpu-detail">
      <span class="label">显存:</span>
      <span class="value">{{ formatMemory(gpuCapability.memory) }}</span>
    </div>
  </div>

  <div class="setting-row">
    <label>启用 GPU 加速</label>
    <ToggleSwitch v-model="useGPU" />
  </div>
</div>
```

**Step 4: Commit**

```bash
git add src-tauri/scripts/paddle_ocr.py src-tauri/src/commands/system.rs src/components/layout/tabs/Settings.vue
git commit -m "feat(gpu): add CUDA acceleration support for PaddleOCR

- Add GPU detection in paddle_ocr.py
- Add check_gpu_capability command
- Add GPU info display and toggle in Settings"
```

---

## Feature 4: Batch Processing Enhancement

### Overview
Enhance existing batch processing with better concurrency, progress tracking, and error recovery.

### Task 4.1: Enhance batch processor composable

**Files:**
- Modify: `src/composables/useBatchProcessor.ts`

```typescript
// Add to BatchOptions interface
export interface BatchOptions {
  // ... existing options
  processingMode: 'fast' | 'standard' | 'precise'
  aiCorrection: boolean
  aiEndpoint?: string
  aiApiKey?: string
  aiModel?: string
}

// Update processJob to use mode presets
async function processJob(job: BatchJob, options: BatchOptions) {
  const modeConfig = PROCESSING_MODES[options.processingMode]

  // Use mode-specific settings
  const sceneThreshold = modeConfig.sceneThreshold
  const frameInterval = modeConfig.frameInterval

  // ... rest of processing with these settings
}
```

**Step 2: Add job priority and retry logic**

```typescript
// Add priority field to BatchJob
export interface BatchJob {
  // ... existing fields
  priority: 'low' | 'normal' | 'high'
  retryCount: number
  maxRetries: number
}

// Update processJob with retry logic
async function processJob(job: BatchJob, options: BatchOptions) {
  try {
    // ... existing processing
  } catch (error) {
    if (job.retryCount < job.maxRetries) {
      job.retryCount++
      job.status = 'pending'
      job.error = `重试 ${job.retryCount}/${job.maxRetries}: ${error.message}`
      // Re-queue the job
      jobs.value.push(job)
    } else {
      throw error
    }
  }
}
```

**Step 3: Add batch progress visualization**

**Files:**
- Modify: `src/components/layout/batch/BatchProgressDialog.vue`

```vue
<!-- Add ETA display -->
<div class="progress-info">
  <div class="progress-bar">
    <div class="progress-fill" :style="{ width: overallProgress + '%' }"></div>
  </div>
  <div class="progress-stats">
    <span>{{ stats.completed }}/{{ stats.total }} 完成</span>
    <span v-if="estimatedTimeRemaining">
      预计剩余: {{ formatTime(estimatedTimeRemaining) }}
    </span>
  </div>
</div>
```

**Step 4: Commit**

```bash
git add src/composables/useBatchProcessor.ts src/components/layout/batch/BatchProgressDialog.vue
git commit -m "feat(batch): enhance batch processing with retry and ETA

- Add processingMode to BatchOptions
- Add job priority and retry logic
- Add ETA calculation and display"
```

---

## Feature 5: Subtitle Translation

### Overview
Add bilingual subtitle support with translation API integration.

### Task 5.1: Create translation service

**Files:**
- Create: `src/core/Translator.ts`

```typescript
/**
 * Translator — Subtitle translation service
 * ==========================================
 * Supports multiple translation APIs:
 * - Google Translate (free tier)
 * - DeepL API
 * - OpenAI/compatible APIs
 */

export interface TranslatorConfig {
  provider: 'google' | 'deepl' | 'openai'
  apiKey?: string
  sourceLang: string
  targetLang: string
  endpoint?: string
}

export interface TranslationResult {
  original: string
  translated: string
  confidence: number
}

export class Translator {
  private config: TranslatorConfig

  constructor(config: TranslatorConfig) {
    this.config = config
  }

  async translate(text: string): Promise<TranslationResult> {
    switch (this.config.provider) {
      case 'google':
        return this.translateGoogle(text)
      case 'deepl':
        return this.translateDeepL(text)
      case 'openai':
        return this.translateOpenAI(text)
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`)
    }
  }

  async translateBatch(texts: string[]): Promise<TranslationResult[]> {
    const results: TranslationResult[] = []
    for (const text of texts) {
      results.push(await this.translate(text))
    }
    return results
  }

  private async translateGoogle(text: string): Promise<TranslationResult> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${this.config.sourceLang}&tl=${this.config.targetLang}&dt=t&q=${encodeURIComponent(text)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.status}`)
    }

    const data = await response.json()
    const translated = data[0].map((item: any[]) => item[0]).join('')

    return {
      original: text,
      translated,
      confidence: 0.9,
    }
  }

  private async translateDeepL(text: string): Promise<TranslationResult> {
    const url = this.config.endpoint || 'https://api-free.deepl.com/v2/translate'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: this.config.sourceLang.toUpperCase(),
        target_lang: this.config.targetLang.toUpperCase(),
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepL error: ${response.status}`)
    }

    const data = await response.json()
    return {
      original: text,
      translated: data.translations[0].text,
      confidence: 0.95,
    }
  }

  private async translateOpenAI(text: string): Promise<TranslationResult> {
    const url = this.config.endpoint || 'https://api.openai.com/v1/chat/completions'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional subtitle translator. Translate the following text from ${this.config.sourceLang} to ${this.config.targetLang}. Keep the translation natural and suitable for subtitles.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`)
    }

    const data = await response.json()
    return {
      original: text,
      translated: data.choices[0].message.content,
      confidence: 0.9,
    }
  }
}
```

**Step 2: Create bilingual subtitle composable**

**Files:**
- Create: `src/composables/useBilingual.ts`

```typescript
import { ref, computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { Translator, type TranslatorConfig } from '@/core/Translator'

export function useBilingual() {
  const subtitleStore = useSubtitleStore()
  const isTranslating = ref(false)
  const translationProgress = ref(0)

  async function translateSubtitles(config: TranslatorConfig) {
    if (subtitleStore.subtitles.length === 0) return

    isTranslating.value = true
    translationProgress.value = 0

    try {
      const translator = new Translator(config)
      const texts = subtitleStore.subtitles.map(s => s.text)

      const results = await translator.translateBatch(texts)

      // Add translated text as secondary field
      for (let i = 0; i < subtitleStore.subtitles.length; i++) {
        subtitleStore.subtitles[i].translatedText = results[i].translated
      }

      translationProgress.value = 100
    } catch (e) {
      console.error('[Bilingual] Translation failed:', e)
      throw e
    } finally {
      isTranslating.value = false
    }
  }

  function clearTranslations() {
    for (const sub of subtitleStore.subtitles) {
      sub.translatedText = undefined
    }
  }

  return {
    isTranslating,
    translationProgress,
    translateSubtitles,
    clearTranslations,
  }
}
```

**Step 3: Add translation to subtitle type**

**Files:**
- Modify: `src/types/subtitle.ts`

```typescript
export interface SubtitleItem {
  // ... existing fields
  translatedText?: string
}
```

**Step 4: Add translation UI**

**Files:**
- Modify: `src/components/layout/tabs/Export.vue`

```vue
<!-- Bilingual Export -->
<div class="section">
  <div class="section-title">
    <svg viewBox="0 0 16 16" fill="none" class="section-icon">
      <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    <span>双语字幕</span>
  </div>

  <div class="translation-settings">
    <div class="setting-row">
      <label>翻译服务</label>
      <select v-model="translationConfig.provider">
        <option value="google">Google 翻译</option>
        <option value="deepl">DeepL</option>
        <option value="openai">OpenAI</option>
      </select>
    </div>

    <div class="setting-row" v-if="translationConfig.provider !== 'google'">
      <label>API Key</label>
      <input v-model="translationConfig.apiKey" type="password" placeholder="输入 API Key" />
    </div>

    <div class="setting-row">
      <label>目标语言</label>
      <select v-model="translationConfig.targetLang">
        <option value="zh">中文</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
      </select>
    </div>

    <button
      class="translate-btn"
      :disabled="isTranslating || subtitleStore.subtitles.length === 0"
      @click="handleTranslate"
    >
      {{ isTranslating ? `翻译中 ${translationProgress}%` : '🌐 翻译字幕' }}
    </button>

    <button
      v-if="hasTranslations"
      class="clear-btn"
      @click="clearTranslations"
    >
      🗑️ 清除翻译
    </button>
  </div>
</div>
```

**Step 5: Update export to include translations**

**Files:**
- Modify: `src/core/Exporter.ts`

```typescript
// Add bilingual export functions
export function exportBilingualSRT(subs: SubtitleItem[]): string {
  return subs.map((sub, i) => {
    const start = formatTimeSRT(sub.startTime)
    const end = formatTimeSRT(sub.endTime)
    const text = sub.translatedText
      ? `${sub.text}\n${sub.translatedText}`
      : sub.text
    return `${i + 1}\n${start} --> ${end}\n${text}`
  }).join('\n\n') + '\n'
}

export function exportBilingualVTT(subs: SubtitleItem[]): string {
  const header = 'WEBVTT\n\n'
  const body = subs.map(sub => {
    const start = formatTimeVTT(sub.startTime)
    const end = formatTimeVTT(sub.endTime)
    const text = sub.translatedText
      ? `${sub.text}\n${sub.translatedText}`
      : sub.text
    return `${start} --> ${end}\n${text}`
  }).join('\n\n')
  return header + body + '\n'
}
```

**Step 6: Commit**

```bash
git add src/core/Translator.ts src/composables/useBilingual.ts src/types/subtitle.ts src/components/layout/tabs/Export.vue src/core/Exporter.ts
git commit -m "feat(translate): add bilingual subtitle support

- Add Translator service with Google/DeepL/OpenAI support
- Add useBilingual composable
- Add translation UI in Export tab
- Add bilingual SRT/VTT export formats"
```

---

## Verification Plan

### Unit Tests

```bash
# Frontend tests
pnpm test

# Rust tests
cd src-tauri && cargo test
```

### Integration Tests

```bash
# Start dev mode
pnpm tauri dev

# Manual testing:
1. Load video → click "一键检测字幕区域" → verify ROI detected
2. Switch between fast/standard/precise modes → verify settings change
3. Check GPU status in Settings (if CUDA available)
4. Add multiple videos to batch → process → verify progress
5. Enable translation → translate subtitles → export bilingual SRT
```

### Performance Benchmarks

```bash
# Test processing speed for each mode
# Fast mode: ~3x faster than standard
# Standard mode: baseline
# Precise mode: ~2x slower but more accurate

# GPU acceleration test (if available)
# Compare OCR speed with/without GPU
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenCV not installed | P1 | Graceful fallback to default ROI |
| GPU memory issues | P1 | Limit GPU memory to 500MB |
| Translation API rate limits | P2 | Add retry with exponential backoff |
| Batch processing memory | P1 | Process files sequentially by default |

---

**Plan complete and saved.** Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
