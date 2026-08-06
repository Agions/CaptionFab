# 系统架构

本文档描述 Distill v0.0.1 的整体架构设计、模块职责和数据流。

---

## 系统概览

Distill 是一个基于 Tauri 2.x 的专业桌面应用，采用 **前端 (Vue 3 + TypeScript) + 后端 (Rust)** 的双进程架构。前端负责 UI 渲染、8 点 ROI 手柄交互与云端/本地 OCR 抽象层，后端负责视频元数据提取、场景检测和文件 I/O。

```
┌──────────────────────────────────────────────────────────────────┐
│                           Distill v0.0.1                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         前端进程 (WebView · Vue 3.5 · TypeScript)          │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ UI 渲染层│  │ 核心引擎 │  │ 服务接口 │  │ 状态配置 │  │  │
│  │  │components│→│  core/   │→│services/ │→│ stores/  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │       ↕              ↕             ↕                      │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │                    utils/                            │ │  │
│  │  │  TimecodeConverter · SubtitleExporter · Denoise     │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │ Tauri IPC (invoke)                   │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │         后端进程 (Rust · Tokio 异步运行时)                  │  │
│  │                                                            │  │
│  │  commands/                                                  │  │
│  │  ├─ video.rs      FFprobe 视频元数据                       │  │
│  │  ├─ scene.rs      场景检测（直方图+卡方检验）               │  │
│  │  ├─ ocr_engine.rs ONNX 原生推理                            │  │
│  │  ├─ file.rs       文件对话框 + 读写                        │  │
│  │  └─ system.rs     系统依赖检测                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 模块化 5 层架构

为了彻底遵循 SOLID 原则，将系统严格划分为 5 个相互独立、职责清晰的模块层：

### 1. 核心引擎层 (`src/core/`)
- `PipelineEngine.ts`: 负责按时间步长抽取视频帧、对比画面差异与 OCR 识别任务调度。
- `ROIManager.ts`: 负责选区坐标归一化 (0~1)、缩放映射与图像区域裁剪。

### 2. API 服务层 (`src/services/`)
- `IOCREngine.ts`: 统一接口定义 `IOCREngineProvider`.
- `LocalOCREngine.ts`: 基于离线引擎（Tesseract/Native ONNX）的字幕识别。
- `CloudOCREngine.ts`: 基于 API Key 的云端视觉大模型 / 云端 OCR 服务（Gemini / OpenAI Vision）。
- `OCREngineFactory.ts`: 引擎工厂，实现双模式无缝切换。
- `tauriBridge.ts`: Tauri 2.x 原生 IPC 桥接层。

### 3. UI 渲染层 (`src/components/`)
- `DarkStudioLayout`: 沉浸式暗黑影视风格双栏布局（左侧视频 Preview + Canvas ROI 选框 / 右侧字幕时间轴列表）。
- `VideoCanvasOverlay.vue`: 8 点手柄（Handles）字幕选框拖拽与归一化 (0~1) 坐标计算。
- `SubtitleTimelineList.vue`: 时间轴字幕卡片、内联编辑与导出。

### 4. 配置与安全管理层 (`src/stores/`)
- `securityStore.ts`: AES 本地加密 API Key 存储与快速抹除机制。
- `subtitleStore.ts`: 字幕列表、ROI 选区与提取状态控制。

### 5. 工具与导出库 (`src/utils/`)
- `SubtitleExporter.ts`: 导出 SRT、VTT、TXT、JSON 格式字幕。
- `TimecodeConverter.ts`: 格式化毫秒与时间轴字符串 (`HH:MM:SS,mmm`)。
