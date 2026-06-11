# CaptionFab 优化方案

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 将 CaptionFab 从 v3.6.0 升级到 v4.0.0，引入 PaddleOCR/EasyOCR 本地引擎支持、WebAssembly 加速、AI 字幕校对、批量处理增强，同时保持 Tauri + Vue 3.5 + Rust 架构不变。

**Architecture:** 在现有 Tauri IPC 架构基础上，新增 Rust 原生 OCR 后端（通过 PyO3 桥接 PaddleOCR），前端保留 tesseract.js 作为 WASM 备选方案。新增 AI 校对模块调用本地 LLM API 对 OCR 结果进行纠错。

**Tech Stack:** Tauri 2.x · Vue 3.5 · Rust 2021 · TypeScript 5 · PaddleOCR 3.x · tesseract.js 5 · PyO3 · Vitest

---

## 一、项目现状分析

### 1.1 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 前端 | Vue 3.5 + TypeScript 5 + Vite 5 | v3.6.0 |
| 后端 | Rust (Tauri 2.x) | Tokio async |
| OCR | tesseract.js (WASM) | v5.0.0 |
| 场景检测 | Python (scenedetect) + Rust 直方图 | 双引擎 |
| 导出 | SRT/VTT/ASS/SSA/JSON/CSV/TXT/LRC/SBV | 9 种 |
| 测试 | Vitest (前端 18 测试文件) + Rust 单元测试 | 193 tests |

### 1.2 架构亮点

- **五阶段后处理管道**: normalize → filterJitter → mergeSplit → mergeSimilar → computeEndTime
- **置信度校准引擎**: CJK n-gram 异常检测、竖线检测、标点规范化
- **智能场景检测**: 直方图 + chi-square，自动跳过无字幕帧
- **LRU 缓存**: 相似度计算结果缓存，避免重复计算
- **ROI 预设系统**: 底部/顶部/左侧/右侧/中间/自定义

### 1.3 当前痛点

| 痛点 | 影响 | 优先级 |
|---|---|---|
| OCR 引擎单一 (仅 tesseract.js) | 中文识别准确率偏低 (~75%) | P0 |
| 无 AI 校对能力 | 错别字需手动修正 | P0 |
| 批量处理依赖 Python scenedetect | 需安装 Python 环境 | P1 |
| 无 GPU 加速支持 | 大文件处理慢 | P1 |
| 无实时预览 OCR 结果 | 需等待全部处理完 | P2 |

---

## 二、竞品分析与技术调研

### 2.1 竞品对比

| 工具 | OCR 引擎 | 语言 | 平台 | Stars | 特点 |
|---|---|---|---|---|---|
| **CaptionFab** | tesseract.js | TS/Rust | 桌面 | - | 当前项目 |
| video-subtitle-extractor | PaddleOCR | Python | CLI/WebUI | 6 | 深度学习，字幕区域检测 |
| GhostCut | 自研 | Python | Web | 10 | 视频翻译+字幕提取 |
| Bilingual Subtitle Suite | 多引擎 | Python | CLI/GUI | 0 | 双语字幕处理 |
| Subtitle Edit | Tesseract | C# | Windows | 3k+ | 功能全面，插件系统 |

### 2.2 技术方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|---|---|---|---|
| **PaddleOCR (Python)** | 中文准确率高 (95%+)，80+ 语言 | 需 Python 环境，启动慢 | 高精度批量处理 |
| **tesseract.js (WASM)** | 零依赖，浏览器运行 | 中文准确率一般 (~75%) | 轻量快速场景 |
| **EasyOCR (Python)** | GPU 加速，40+ 语言 | 模型体积大 | GPU 环境 |
| **Rust tesseract-rs** | 原生性能，无 Python 依赖 | 需编译，语言支持有限 | 纯 Rust 方案 |

### 2.3 推荐方案

**混合引擎架构**：
1. **P0 - PaddleOCR 桥接**：通过 PyO3 在 Rust 中调用 PaddleOCR，提供高精度中文识别
2. **P1 - AI 校对模块**：集成 LLM API 对 OCR 结果进行智能纠错
3. **P2 - WASM 加速**：保留 tesseract.js 作为轻量备选，支持离线使用

---

## 三、优化任务清单

### Phase 1: PaddleOCR 引擎集成 (P0)

#### Task 1.1: 创建 PyO3 桥接模块

**Objective:** 在 Rust 后端创建 PyO3 桥接层，调用 PaddleOCR 进行 OCR

**Files:**
- Create: `src-tauri/src/ocr/mod.rs`
- Create: `src-tauri/src/ocr/paddle.rs`
- Create: `src-tauri/src/ocr/tesseract.rs`
- Modify: `src-tauri/Cargo.toml` (添加 pyo3 依赖)

**Step 1: 添加 PyO3 依赖**

```toml
# src-tauri/Cargo.toml
[dependencies]
pyo3 = { version = "0.20", features = ["extension-module"] }
```

**Step 2: 创建 OCR 模块结构**

```rust
// src-tauri/src/ocr/mod.rs
pub mod paddle;
pub mod tesseract;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f32,
    pub bbox: BBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

pub trait OCREngine: Send + Sync {
    fn recognize(&self, image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String>;
    fn name(&self) -> &str;
}
```

**Step 3: 实现 PaddleOCR 桥接**

```rust
// src-tauri/src/ocr/paddle.rs
use pyo3::prelude::*;
use super::{OCRResult, BBox, OCREngine};

pub struct PaddleEngine {
    py: Python<'static>,
    detector: PyObject,
    recognizer: PyObject,
}

impl PaddleEngine {
    pub fn new() -> Result<Self, String> {
        Python::with_gil(|py| {
            let paddle = py.import("paddleocr").map_err(|e| e.to_string())?;
            let ocr = paddle.call_method1("PaddleOCR", (true,))?;
            Ok(PaddleEngine {
                py,
                detector: ocr.getattr("det")?.into(),
                recognizer: ocr.getattr("rec")?.into(),
            })
        })
    }
}

impl OCREngine for PaddleEngine {
    fn recognize(&self, image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String> {
        Python::with_gil(|py| {
            let result = self.detector.call_method1("ocr", (image_path, true))?;
            // 解析 PaddleOCR 输出格式
            let mut results = Vec::new();
            // ... 解析逻辑
            Ok(results)
        })
    }

    fn name(&self) -> &str {
        "PaddleOCR"
    }
}
```

**Step 4: 编译验证**

```bash
cd src-tauri && cargo check
```

**Step 5: Commit**

```bash
git add src-tauri/src/ocr/ src-tauri/Cargo.toml
git commit -m "feat(ocr): add PaddleOCR PyO3 bridge module"
```

---

#### Task 1.2: 创建 OCR 引擎管理器

**Objective:** 创建统一的 OCR 引擎管理器，支持动态切换引擎

**Files:**
- Create: `src-tauri/src/ocr/manager.rs`
- Modify: `src-tauri/src/ocr/mod.rs`

**Step 1: 实现引擎管理器**

```rust
// src-tauri/src/ocr/manager.rs
use std::sync::Arc;
use super::{OCRResult, OCREngine};
use super::paddle::PaddleEngine;
use super::tesseract::TesseractEngine;

pub enum EngineType {
    Paddle,
    Tesseract,
}

pub struct OCRManager {
    engines: Arc<Vec<Box<dyn OCREngine>>>,
    active_engine: EngineType,
}

impl OCRManager {
    pub fn new() -> Result<Self, String> {
        let mut engines: Vec<Box<dyn OCREngine>> = Vec::new();

        // 尝试初始化 PaddleOCR
        if let Ok(paddle) = PaddleEngine::new() {
            engines.push(Box::new(paddle));
        }

        // 初始化 Tesseract 作为备选
        if let Ok(tesseract) = TesseractEngine::new() {
            engines.push(Box::new(tesseract));
        }

        Ok(OCRManager {
            engines: Arc::new(engines),
            active_engine: EngineType::Paddle,
        })
    }

    pub fn recognize(&self, image_path: &str, lang: &str) -> Result<Vec<OCRResult>, String> {
        let engine = self.engines.iter()
            .find(|e| e.name() == match self.active_engine {
                EngineType::Paddle => "PaddleOCR",
                EngineType::Tesseract => "Tesseract",
            })
            .ok_or("No OCR engine available")?;

        engine.recognize(image_path, lang)
    }

    pub fn switch_engine(&mut self, engine_type: EngineType) {
        self.active_engine = engine_type;
    }
}
```

**Step 2: 集成到 lib.rs**

```rust
// src-tauri/src/lib.rs
mod ocr;

#[tauri::command]
async fn ocr_recognize(
    manager: tauri::State<'_, OCRManager>,
    image_path: String,
    lang: String,
) -> Result<Vec<OCRResult>, String> {
    manager.recognize(&image_path, &lang)
}
```

**Step 3: 测试**

```bash
cd src-tauri && cargo test
```

**Step 4: Commit**

```bash
git add src-tauri/src/ocr/manager.rs src-tauri/src/lib.rs
git commit -m "feat(ocr): add OCR engine manager with dynamic switching"
```

---

#### Task 1.3: 前端引擎选择 UI

**Objective:** 在 OCR 标签页添加引擎选择下拉框

**Files:**
- Modify: `src/components/layout/tabs/OCR.vue`
- Modify: `src/composables/useOCR.ts`

**Step 1: 更新 useOCR composable**

```typescript
// src/composables/useOCR.ts
export const ocrEngines: OCREngineInfo[] = [
  {
    id: 'paddle',
    name: 'PaddleOCR',
    shortName: 'PP',
    tech: '深度学习',
    recommended: true,
    speed: '快',
    accuracy: '高',
    langs: 80,
    description: '支持80+语言，适合字幕识别',
  },
  {
    id: 'tesseract',
    name: 'Tesseract.js',
    shortName: 'TS',
    tech: '传统算法',
    recommended: false,
    speed: '慢',
    accuracy: '中',
    langs: 100,
    description: '纯JS实现，无需服务器',
  },
  {
    id: 'easyocr',
    name: 'EasyOCR',
    shortName: 'EZ',
    tech: '深度学习',
    recommended: false,
    speed: '中',
    accuracy: '高',
    langs: 40,
    description: '支持40+语言，GPU加速',
  },
]
```

**Step 2: 更新 OCR.vue 组件**

```vue
<!-- src/components/layout/tabs/OCR.vue -->
<template>
  <div class="tab-content ocr-tab">
    <!-- Engine Selection -->
    <div class="section">
      <div class="section-title">
        <svg viewBox="0 0 16 16" fill="none" class="section-icon">
          <path d="M8 2L2 6v8h12V6L8 2z" stroke="currentColor" stroke-width="1.2"/>
        </svg>
        <span>OCR 引擎</span>
      </div>

      <div class="engine-list">
        <button
          v-for="engine in ocrEngines"
          :key="engine.id"
          :class="['engine-item', { active: selectedEngine === engine.id }]"
          @click="selectedEngine = engine.id"
        >
          <span class="engine-badge">{{ engine.shortName }}</span>
          <div class="engine-info">
            <div class="engine-name">{{ engine.name }}</div>
            <div class="engine-desc">{{ engine.description }}</div>
          </div>
          <span v-if="engine.recommended" class="engine-rec">推荐</span>
        </button>
      </div>
    </div>

    <!-- Language Selection -->
    <!-- ... existing language selector ... -->
  </div>
</template>
```

**Step 3: 测试**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/components/layout/tabs/OCR.vue src/composables/useOCR.ts
git commit -m "feat(ui): add OCR engine selection dropdown"
```

---

### Phase 2: AI 字幕校对模块 (P0)

#### Task 2.1: 创建 AI 校对服务

**Objective:** 创建 AI 校对模块，调用 LLM API 对 OCR 结果进行智能纠错

**Files:**
- Create: `src/core/AICorrector.ts`
- Create: `src/core/AICorrector.test.ts`
- Modify: `src/core/index.ts`

**Step 1: 实现 AI 校对器**

```typescript
// src/core/AICorrector.ts
/**
 * AICorrector — AI 字幕校对引擎
 * =================================
 * 调用本地 LLM API 对 OCR 结果进行智能纠错：
 * - 错别字修正
 * - 标点规范化
 * - 上下文一致性检查
 * - 多语言混合识别
 */

export interface AICorrectorConfig {
  apiEndpoint: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

export interface CorrectionResult {
  original: string
  corrected: string
  confidence: number
  changes: Array<{
    type: 'typo' | 'punctuation' | 'context'
    original: string
    corrected: string
  }>
}

export class AICorrector {
  private config: AICorrectorConfig

  constructor(config: AICorrectorConfig) {
    this.config = config
  }

  async correct(text: string, context?: string): Promise<CorrectionResult> {
    const prompt = this.buildPrompt(text, context)
    const response = await this.callLLM(prompt)
    return this.parseResponse(text, response)
  }

  private buildPrompt(text: string, context?: string): string {
    let prompt = `你是一个专业的字幕校对助手。请修正以下 OCR 识别结果中的错误：

原文：${text}

要求：
1. 修正错别字
2. 规范标点符号
3. 保持原意不变
4. 如果是多语言混合，保持语言一致性

请返回 JSON 格式：
{
  "corrected": "修正后的文本",
  "confidence": 0.95,
  "changes": [
    {
      "type": "typo|punctuation|context",
      "original": "原文",
      "corrected": "修正后"
    }
  ]
}`

    if (context) {
      prompt = `上下文：${context}\n\n${prompt}`
    }

    return prompt
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a professional subtitle proofreader.' },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  private parseResponse(original: string, response: string): CorrectionResult {
    try {
      const parsed = JSON.parse(response)
      return {
        original,
        corrected: parsed.corrected,
        confidence: parsed.confidence,
        changes: parsed.changes || [],
      }
    } catch {
      return {
        original,
        corrected: original,
        confidence: 0,
        changes: [],
      }
    }
  }
}
```

**Step 2: 编写测试**

```typescript
// src/core/AICorrector.test.ts
import { describe, it, expect, vi } from 'vitest'
import { AICorrector } from './AICorrector'

describe('AICorrector', () => {
  it('should correct typos', async () => {
    const corrector = new AICorrector({
      apiEndpoint: 'http://localhost:11434/api/chat',
      apiKey: '',
      model: 'llama3',
      temperature: 0.3,
      maxTokens: 1000,
    })

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              corrected: '今天天气真好',
              confidence: 0.95,
              changes: [{
                type: 'typo',
                original: '今天天气真好',
                corrected: '今天天气真好',
              }],
            }),
          },
        }],
      }),
    })

    const result = await corrector.correct('今天天汽真好')
    expect(result.corrected).toBe('今天天气真好')
    expect(result.confidence).toBeGreaterThan(0.9)
  })
})
```

**Step 3: 测试**

```bash
pnpm test src/core/AICorrector.test.ts
```

**Step 4: Commit**

```bash
git add src/core/AICorrector.ts src/core/AICorrector.test.ts
git commit -m "feat(ai): add AI subtitle correction module"
```

---

#### Task 2.2: 集成 AI 校对到提取流程

**Objective:** 在 OCR 提取完成后自动调用 AI 校对

**Files:**
- Modify: `src/composables/useExtractor.ts`
- Modify: `src/stores/project.ts`

**Step 1: 添加 AI 校对配置**

```typescript
// src/stores/project.ts
export interface ExtractOptions {
  // ... existing options
  aiCorrection: boolean
  aiEndpoint: string
  aiApiKey: string
  aiModel: string
}

export const DEFAULT_EXTRACT_OPTIONS: ExtractOptions = {
  // ... existing defaults
  aiCorrection: false,
  aiEndpoint: 'http://localhost:11434/api/chat',
  aiApiKey: '',
  aiModel: 'llama3',
}
```

**Step 2: 在提取流程中添加 AI 校对步骤**

```typescript
// src/composables/useExtractor.ts
import { AICorrector } from '@/core/AICorrector'

export function useExtractor() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()

  async function extractSubtitles(videoPath: string) {
    // ... existing extraction logic

    // Step 5: AI 校对（如果启用）
    if (projectStore.extractOptions.aiCorrection) {
      const corrector = new AICorrector({
        apiEndpoint: projectStore.extractOptions.aiEndpoint,
        apiKey: projectStore.extractOptions.aiApiKey,
        model: projectStore.extractOptions.aiModel,
        temperature: 0.3,
        maxTokens: 1000,
      })

      for (const sub of subtitleStore.subtitles) {
        const result = await corrector.correct(sub.text)
        if (result.confidence > 0.8) {
          sub.text = result.corrected
        }
      }
    }
  }

  return { extractSubtitles }
}
```

**Step 3: 测试**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/composables/useExtractor.ts src/stores/project.ts
git commit -m "feat(ai): integrate AI correction into extraction pipeline"
```

---

### Phase 3: 批量处理增强 (P1)

#### Task 3.1: Rust 原生场景检测

**Objective:** 用 Rust 实现场景检测，移除 Python 依赖

**Files:**
- Create: `src-tauri/src/scene_detect.rs`
- Modify: `src-tauri/src/lib.rs`
- Delete: `src-tauri/scripts/scene_detect.py`

**Step 1: 实现 Rust 场景检测**

```rust
// src-tauri/src/scene_detect.rs
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneChange {
    pub frame_index: u64,
    pub timestamp: f64,
    pub similarity: f32,
}

pub struct SceneDetector {
    threshold: f32,
    min_scene_length: u32,
    cooldown: u32,
}

impl SceneDetector {
    pub fn new(threshold: f32, min_scene_length: u32) -> Self {
        SceneDetector {
            threshold,
            min_scene_length,
            cooldown: 0,
        }
    }

    pub fn detect_scenes(&mut self, video_path: &str) -> Result<Vec<SceneChange>, String> {
        // 使用 ffmpeg 提取帧并计算直方图差异
        let frames = self.extract_frames(video_path)?;
        let mut scenes = Vec::new();
        let mut prev_hist: Option<Vec<f32>> = None;

        for (i, frame) in frames.iter().enumerate() {
            let curr_hist = self.compute_histogram(frame);

            if let Some(ref prev) = prev_hist {
                let distance = self.chi_square_distance(prev, &curr_hist);

                if distance > self.threshold && self.cooldown == 0 {
                    scenes.push(SceneChange {
                        frame_index: i as u64,
                        timestamp: i as f64 * 30.0, // 假设 30fps
                        similarity: 1.0 - distance,
                    });
                    self.cooldown = self.min_scene_length;
                }
            }

            if self.cooldown > 0 {
                self.cooldown -= 1;
            }

            prev_hist = Some(curr_hist);
        }

        Ok(scenes)
    }

    fn extract_frames(&self, video_path: &str) -> Result<Vec<Vec<u8>>, String> {
        // 使用 ffmpeg 提取关键帧
        let output = std::process::Command::new("ffmpeg")
            .args([
                "-i", video_path,
                "-vf", "select=eq(pict_type\\,I)",
                "-vsync", "vfn",
                "-f", "image2pipe",
                "-vcodec", "rawvideo",
                "-pix_fmt", "rgb24",
                "-"
            ])
            .output()
            .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

        // 解析 raw video frames
        let frames = self.parse_raw_frames(&output.stdout);
        Ok(frames)
    }

    fn compute_histogram(&self, frame: &[u8]) -> Vec<f32> {
        let mut hist = vec![0.0f32; 768]; // 256 * 3 channels
        for i in (0..frame.len()).step_by(3) {
            hist[frame[i] as usize] += 1.0;
            hist[256 + frame[i+1] as usize] += 1.0;
            hist[512 + frame[i+2] as usize] += 1.0;
        }
        // Normalize
        let total = frame.len() as f32 / 3.0;
        for h in &mut hist {
            *h /= total;
        }
        hist
    }

    fn chi_square_distance(&self, hist_a: &[f32], hist_b: &[f32]) -> f32 {
        let mut chi_square = 0.0;
        for (a, b) in hist_a.iter().zip(hist_b.iter()) {
            if *a > 0.0 {
                chi_square += (b - a).powi(2) / a;
            }
        }
        chi_square
    }

    fn parse_raw_frames(&self, data: &[u8]) -> Vec<Vec<u8>> {
        // 假设 1920x1080，每帧 1920*1080*3 字节
        let frame_size = 1920 * 1080 * 3;
        let mut frames = Vec::new();

        for chunk in data.chunks(frame_size) {
            if chunk.len() == frame_size {
                frames.push(chunk.to_vec());
            }
        }

        frames
    }
}
```

**Step 2: 集成到 Tauri**

```rust
// src-tauri/src/lib.rs
mod scene_detect;

#[tauri::command]
async fn detect_scenes(
    video_path: String,
    threshold: f32,
    min_scene_length: u32,
) -> Result<Vec<SceneChange>, String> {
    let mut detector = scene_detect::SceneDetector::new(threshold, min_scene_length);
    detector.detect_scenes(&video_path)
}
```

**Step 3: 测试**

```bash
cd src-tauri && cargo test
```

**Step 4: Commit**

```bash
git add src-tauri/src/scene_detect.rs src-tauri/src/lib.rs
git commit -m "feat(scene): implement Rust native scene detection"
```

---

#### Task 3.2: 批量处理并行化

**Objective:** 支持多视频并行处理，利用多核 CPU

**Files:**
- Modify: `src/composables/useBatchProc.ts`
- Modify: `src-tauri/src/commands/batch.rs`

**Step 1: 实现 Rust 并行处理**

```rust
// src-tauri/src/commands/batch.rs
use tokio::task;
use std::sync::Arc;
use super::ocr::OCRManager;

pub struct BatchProcessor {
    ocr_manager: Arc<OCRManager>,
    max_concurrent: usize,
}

impl BatchProcessor {
    pub fn new(ocr_manager: Arc<OCRManager>, max_concurrent: usize) -> Self {
        BatchProcessor {
            ocr_manager,
            max_concurrent,
        }
    }

    pub async fn process_batch(&self, video_paths: Vec<String>) -> Result<Vec<Vec<OCRResult>>, String> {
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.max_concurrent));
        let mut handles = Vec::new();

        for path in video_paths {
            let manager = self.ocr_manager.clone();
            let sem = semaphore.clone();

            let handle = task::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                // 处理单个视频
                manager.recognize(&path, "ch")
            });

            handles.push(handle);
        }

        let mut results = Vec::new();
        for handle in handles {
            let result = handle.await.map_err(|e| e.to_string())??;
            results.push(result);
        }

        Ok(results)
    }
}
```

**Step 2: 更新前端批量处理**

```typescript
// src/composables/useBatchProc.ts
export function useBatchProc() {
  const projectStore = useProjectStore()

  async function processBatch(videoPaths: string[]) {
    // 调用 Rust 后端并行处理
    const results = await invoke('process_batch', {
      videoPaths,
      maxConcurrent: navigator.hardwareConcurrency || 4,
    })

    return results
  }

  return { processBatch }
}
```

**Step 3: 测试**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/composables/useBatchProc.ts src-tauri/src/commands/batch.rs
git commit -m "feat(batch): add parallel batch processing"
```

---

### Phase 4: 性能优化 (P1)

#### Task 4.1: WebAssembly 加速图像预处理

**Objective:** 将图像预处理迁移到 WASM，提升前端处理速度

**Files:**
- Create: `src/wasm/image-proc.rs`
- Create: `src/wasm/Cargo.toml`
- Modify: `vite.config.ts`

**Step 1: 创建 Rust WASM 模块**

```toml
# src/wasm/Cargo.toml
[package]
name = "caption-fab-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = ["ImageData"] }
```

```rust
// src/wasm/image-proc.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn deskew(image_data: &[u8], width: u32, height: u32) -> Vec<u8> {
    // 实现图像倾斜校正算法
    let mut result = vec![0u8; image_data.len()];

    // 简化的水平投影法
    let mut angles = Vec::new();
    for angle in -10..=10 {
        let score = compute_projection_score(image_data, width, height, angle as f32 * 0.1);
        angles.push((angle as f32 * 0.1, score));
    }

    let best_angle = angles.iter()
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
        .unwrap()
        .0;

    // 应用旋转
    rotate_image(image_data, &mut result, width, height, best_angle);

    result
}

fn compute_projection_score(data: &[u8], w: u32, h: u32, angle: f32) -> f32 {
    // 计算投影直方图的方差
    let mut projection = vec![0u32; h as usize];
    let rad = angle.to_radians();
    let cos = rad.cos();
    let sin = rad.sin();

    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) as usize * 4;
            if data[idx] < 128 { // 假设黑色文字
                let new_y = (y as f32 * cos - x as f32 * sin) as u32;
                if new_y < h {
                    projection[new_y as usize] += 1;
                }
            }
        }
    }

    let mean = projection.iter().sum::<u32>() as f32 / h as f32;
    projection.iter()
        .map(|&x| (x as f32 - mean).powi(2))
        .sum::<f32>()
}

fn rotate_image(src: &[u8], dst: &mut [u8], w: u32, h: u32, angle: f32) {
    let rad = angle.to_radians();
    let cos = rad.cos();
    let sin = rad.sin();
    let cx = w as f32 / 2.0;
    let cy = h as f32 / 2.0;

    for y in 0..h {
        for x in 0..w {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;

            let src_x = (dx * cos + dy * sin + cx) as i32;
            let src_y = (-dx * sin + dy * cos + cy) as i32;

            if src_x >= 0 && src_x < w as i32 && src_y >= 0 && src_y < h as i32 {
                let src_idx = (src_y as u32 * w + src_x as u32) as usize * 4;
                let dst_idx = (y * w + x) as usize * 4;

                dst[dst_idx] = src[src_idx];
                dst[dst_idx + 1] = src[src_idx + 1];
                dst[dst_idx + 2] = src[src_idx + 2];
                dst[dst_idx + 3] = src[src_idx + 3];
            }
        }
    }
}
```

**Step 2: 构建 WASM**

```bash
cd src/wasm
wasm-pack build --target web
```

**Step 3: 集成到 Vite**

```typescript
// vite.config.ts
export default defineConfig({
  // ... existing config
  optimizeDeps: {
    include: ['vue', 'pinia', '@vueuse/core'],
    exclude: ['tesseract.js', 'caption-fab-wasm'],
  },
})
```

**Step 4: 测试**

```bash
pnpm test
```

**Step 5: Commit**

```bash
git add src/wasm/ vite.config.ts
git commit -m "perf(wasm): add WebAssembly image preprocessing"
```

---

#### Task 4.2: 内存优化与缓存策略

**Objective:** 优化大文件处理时的内存使用

**Files:**
- Modify: `src/composables/useExtractor.ts`
- Modify: `src/utils/lru-cache.ts`

**Step 1: 实现流式处理**

```typescript
// src/composables/useExtractor.ts
export function useExtractor() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()

  async function extractSubtitles(videoPath: string) {
    const BATCH_SIZE = 100 // 每批处理 100 帧

    // 获取视频元数据
    const metadata = await invoke('get_video_metadata', { path: videoPath })
    const totalFrames = metadata.totalFrames

    // 分批处理
    for (let startFrame = 0; startFrame < totalFrames; startFrame += BATCH_SIZE) {
      const endFrame = Math.min(startFrame + BATCH_SIZE, totalFrames)

      // 提取这一批帧
      const frames = await invoke('extract_frames', {
        path: videoPath,
        start: startFrame,
        end: endFrame,
      })

      // OCR 处理
      const results = await ocrRecognize(frames)

      // 添加到字幕列表
      subtitleStore.addSubtitles(results)

      // 更新进度
      projectStore.updateProgress(endFrame / totalFrames)

      // 主动释放内存
      frames.length = 0
    }
  }

  return { extractSubtitles }
}
```

**Step 2: 优化 LRU 缓存**

```typescript
// src/utils/lru-cache.ts
export class LRUCache<K, V> {
  private capacity: number
  private trimTo: number
  private cache: Map<K, { value: V; timestamp: number }>

  constructor(capacity: number, trimTo: number) {
    this.capacity = capacity
    this.trimTo = trimTo
    this.cache = new Map()
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (entry) {
      entry.timestamp = Date.now()
      return entry.value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.capacity) {
      this.trim()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  private trim(): void {
    // 按时间戳排序，删除最旧的条目
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toDelete = entries.length - this.trimTo
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
```

**Step 3: 测试**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/composables/useExtractor.ts src/utils/lru-cache.ts
git commit -m "perf(memory): optimize streaming processing and LRU cache"
```

---

### Phase 5: UI/UX 优化 (P2)

#### Task 5.1: 实时 OCR 预览

**Objective:** 在视频播放时实时显示 OCR 结果

**Files:**
- Modify: `src/components/layout/video/VideoPlayer.vue`
- Create: `src/components/layout/video/RealtimeOCR.vue`

**Step 1: 创建实时 OCR 组件**

```vue
<!-- src/components/layout/video/RealtimeOCR.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { usePlayer } from '@/composables/usePlayer'
import { useOCREngine } from '@/composables/useOCREngine'

const player = usePlayer()
const ocrEngine = useOCREngine()

const realtimeResults = ref<Array<{
  timestamp: number
  text: string
  confidence: number
}>>([])

let intervalId: ReturnType<typeof setInterval> | null = null

function startRealtimeOCR() {
  intervalId = setInterval(async () => {
    if (!player.isPlaying) return

    const currentTime = player.currentTime
    const frame = await player.captureFrame(currentTime)

    if (frame) {
      const results = await ocrEngine.processFrame(frame)
      realtimeResults.value.push({
        timestamp: currentTime,
        text: results.map(r => r.text).join(' '),
        confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      })

      // 只保留最近 10 条结果
      if (realtimeResults.value.length > 10) {
        realtimeResults.value.shift()
      }
    }
  }, 500) // 每 500ms 处理一帧
}

function stopRealtimeOCR() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

onMounted(() => {
  watch(() => player.isPlaying, (isPlaying) => {
    if (isPlaying) {
      startRealtimeOCR()
    } else {
      stopRealtimeOCR()
    }
  })
})

onUnmounted(() => {
  stopRealtimeOCR()
})
</script>

<template>
  <div class="realtime-ocr">
    <div class="ocr-header">
      <span class="ocr-title">实时 OCR 预览</span>
      <span class="ocr-status" :class="{ active: player.isPlaying }">
        {{ player.isPlaying ? '● 录制中' : '○ 已暂停' }}
      </span>
    </div>

    <div class="ocr-results">
      <div
        v-for="(result, index) in realtimeResults"
        :key="index"
        class="ocr-result"
        :class="{ low: result.confidence < 0.7 }"
      >
        <span class="result-time">{{ formatTime(result.timestamp) }}</span>
        <span class="result-text">{{ result.text }}</span>
        <span class="result-conf">{{ (result.confidence * 100).toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.realtime-ocr {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
}

.ocr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ocr-title {
  font-weight: 600;
  color: var(--text-primary);
}

.ocr-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.ocr-status.active {
  color: var(--color-success);
}

.ocr-results {
  max-height: 200px;
  overflow-y: auto;
}

.ocr-result {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color);
}

.ocr-result.low {
  opacity: 0.6;
}

.result-time {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 60px;
}

.result-text {
  flex: 1;
  color: var(--text-primary);
}

.result-conf {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
```

**Step 2: 集成到 VideoPlayer**

```vue
<!-- src/components/layout/video/VideoPlayer.vue -->
<template>
  <div class="video-player">
    <!-- ... existing video player ... -->

    <!-- Real-time OCR Preview -->
    <RealtimeOCR v-if="showRealtimeOCR" />
  </div>
</template>
```

**Step 3: 测试**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/components/layout/video/RealtimeOCR.vue src/components/layout/video/VideoPlayer.vue
git commit -m "feat(ui): add real-time OCR preview during playback"
```

---

#### Task 5.2: 导出格式增强

**Objective:** 新增导出格式：WebVTT (带样式)、JSONL (流式)

**Files:**
- Modify: `src/core/Exporter.ts`
- Modify: `src/stores/subtitle.ts`

**Step 1: 添加 WebVTT 样式支持**

```typescript
// src/core/Exporter.ts
export function exportVTTWithStyle(subs: SubtitleItem[], style: VTTStyle): string {
  const header = `WEBVTT

STYLE
::cue {
  background: ${style.background || 'rgba(0,0,0,0.8)'};
  color: ${style.color || 'white'};
  font-size: ${style.fontSize || '1.2em'};
  font-family: ${style.fontFamily || 'sans-serif'};
}
`

  const body = subs.map(sub => {
    const start = formatTimeVTT(sub.startTime)
    const end = formatTimeVTT(sub.endTime)
    return `${start} --> ${end}\n${sub.text}`
  }).join('\n\n')

  return header + body
}

export interface VTTStyle {
  background?: string
  color?: string
  fontSize?: string
  fontFamily?: string
}
```

**Step 2: 添加 JSONL 流式导出**

```typescript
// src/core/Exporter.ts
export function exportJSONL(subs: SubtitleItem[]): string {
  return subs.map(sub => JSON.stringify({
    start: sub.startTime,
    end: sub.endTime,
    text: sub.text,
    confidence: sub.confidence,
  })).join('\n')
}
```

**Step 3: 更新导出选项**

```typescript
// src/stores/subtitle.ts
export const exportFormats = shallowRef<ExportFormats>({
  srt: true,
  vtt: false,
  vtt_styled: false, // 新增
  ass: false,
  ssa: false,
  json: true,
  jsonl: false, // 新增
  txt: false,
  lrc: false,
  sbv: false,
  csv: false,
})
```

**Step 4: 测试**

```bash
pnpm test
```

**Step 5: Commit**

```bash
git add src/core/Exporter.ts src/stores/subtitle.ts
git commit -m "feat(export): add styled VTT and JSONL formats"
```

---

## 四、验证计划

### 4.1 单元测试

```bash
# 前端测试
pnpm test

# Rust 测试
cd src-tauri && cargo test

# 覆盖率
pnpm coverage
```

### 4.2 集成测试

```bash
# 启动开发模式
pnpm tauri dev

# 手动测试流程
1. 导入测试视频
2. 选择 OCR 引擎
3. 执行提取
4. 检查字幕质量
5. 导出各种格式
```

### 4.3 性能测试

```bash
# 大文件测试 (1GB 视频)
# 记录处理时间、内存使用
# 对比优化前后

# 批量测试 (10 个视频)
# 验证并行处理效果
```

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| PyO3 编译问题 | P0 | 提前测试编译环境，准备 Docker 方案 |
| PaddleOCR 模型体积大 | P1 | 支持按需下载，提供轻量模型选项 |
| LLM API 稳定性 | P1 | 实现重试机制，提供离线模式 |
| WASM 性能不达预期 | P2 | 保留 JS 回退方案 |

---

## 六、时间估算

| Phase | 任务数 | 预估时间 |
|---|---|---|
| Phase 1: PaddleOCR 集成 | 3 | 2 天 |
| Phase 2: AI 校对模块 | 2 | 1.5 天 |
| Phase 3: 批量处理增强 | 2 | 1.5 天 |
| Phase 4: 性能优化 | 2 | 1 天 |
| Phase 5: UI/UX 优化 | 2 | 1 天 |
| **总计** | **11** | **7 天** |

---

## 七、成功指标

| 指标 | 当前值 | 目标值 |
|---|---|---|
| 中文 OCR 准确率 | ~75% | 95%+ |
| 批量处理速度 | 单线程 | 4x 并行 |
| 内存使用 (1GB 视频) | ~2GB | <1GB |
| 导出格式数 | 9 | 11 |
| 测试覆盖率 | 193 | 250+ |

---

**Plan complete and saved.** 路径：`/home/ubuntu/workspace/CaptionFab/.hermes/plans/2026-06-11_153000-captionfab-optimization.md`

Ready to execute using subagent-driven-development — 我会按任务逐个派遣子代理执行，每个任务完成后进行双阶段审查（规格合规 + 代码质量）。是否开始执行？
