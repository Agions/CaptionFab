# 系统架构

本文档描述 caption-fab v3.6.0 的整体架构设计、模块职责和数据流。

---

## 系统概览

caption-fab 是一个基于 Tauri 2.x 的桌面应用，采用 **前端 (Vue 3) + 后端 (Rust)** 的双进程架构。前端负责 UI 渲染和 OCR 处理，后端负责视频元数据提取、场景检测和文件 I/O。

```
┌──────────────────────────────────────────────────────────────────┐
│                       caption-fab v3.6.0                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         前端进程 (WebView · Vue 3.5 · TypeScript)          │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ 组件层   │  │ 组合层   │  │ 核心层   │  │ 状态层   │  │  │
│  │  │components│→│composables│→│  core/   │→│ stores/  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │       ↕              ↕             ↕                      │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │                    utils/                            │ │  │
│  │  │  image · text · detection · lru-cache · time · math │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │ Tauri IPC (invoke)                   │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │         后端进程 (Rust · Tokio 异步运行时)                  │  │
│  │                                                            │  │
│  │  commands/                                                  │  │
│  │  ├─ video.rs      FFprobe 视频元数据                       │  │
│  │  ├─ scene.rs      场景检测（直方图+卡方检验）               │  │
│  │  ├─ export.rs     9 种格式导出                              │  │
│  │  ├─ file.rs       文件对话框 + 读写                        │  │
│  │  ├─ system.rs     系统依赖检测                              │  │
│  │  └─ ffmpeg.rs     FFmpeg 命令封装                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 前端架构

### 分层设计

| 层级 | 目录 | 职责 | 依赖方向 |
|:-----|:-----|:-----|:---------|
| **组件层** | `components/` | UI 渲染、用户交互 | → 组合层 |
| **组合层** | `composables/` | 业务逻辑编排、状态管理 | → 核心层 + stores |
| **核心层** | `core/` | 纯算法（管道、校准、场景检测、导出） | → utils |
| **工具层** | `utils/` | 纯函数（图像处理、文本、缓存） | 无依赖 |
| **状态层** | `stores/` | Pinia 全局状态 | 无依赖 |

### 核心层 (`core/`)

核心层包含所有业务算法，**零 DOM 依赖**，可独立测试。

| 模块 | 文件 | 职责 |
|:-----|:-----|:-----|
| **Pipeline** | `Pipeline.ts` | 五阶段后处理管道：标准化 → 去噪 → 合并分裂 → 相似度融合 → 时间校准 |
| **Calibrator** | `Calibrator.ts` | 置信度校准引擎：规则引擎 + CJK n-gram 分析 + 竖线检测 |
| **SceneDetect** | `SceneDetect.ts` | 场景检测：直方图差异 + 卡方检验，自动跳过无字幕帧 |
| **Exporter** | `Exporter.ts` | 导出引擎：9 种格式（SRT/VTT/ASS/SSA/JSON/CSV/TXT/LRC/SBV） |

### 组合层 (`composables/`)

| 模块 | 文件 | 职责 |
|:-----|:-----|:-----|
| **useExtractor** | `useExtractor.ts` | 字幕提取主流程编排（视频帧 → OCR → Pipeline → Store） |
| **useOCREngine** | `useOCREngine.ts` | Tesseract.js 生命周期 + 多通道 OCR + 校准 |
| **usePlayer** | `usePlayer.ts` | 视频播放控制（播放/暂停/跳转/截帧） |
| **usePreprocessor** | `usePreprocessor.ts` | 图像预处理管道（灰度/对比度/模糊/二值化/形态学） |
| **useBatchProcessor** | `useBatchProcessor.ts` | 批量处理队列（并发槽位管理） |
| **useSubList** | `useSubList.ts` | 字幕列表 UI 状态（分页/搜索/选择） |
| **useHotkeys** | `useHotkeys.ts` | 全局键盘快捷键 |
| **useTheme** | `useTheme.ts` | 主题切换（暗色/亮色） |

### 工具层 (`utils/`)

工具层全部为**纯函数**，无副作用，无 Vue 依赖。

| 模块 | 职责 |
|:-----|:-----|
| `image.ts` | 核心像素操作：灰度、对比度(LUT)、模糊、自适应阈值、缩放 |
| `image-deskew.ts` | 文字倾斜矫正：投影方差法检测角度 + 旋转 |
| `image-morph.ts` | 形态学操作：腐蚀、膨胀、开运算 |
| `image-kernel.ts` | 共享内核工具：邻域遍历、方形内核生成 |
| `text.ts` | CJK 检测、标点规范化、langToScript 映射 |
| `lru-cache.ts` | 泛型 LRU 缓存（Pipeline 相似度计算复用） |
| `detection.ts` | 帧分析：方差/亮度/边缘密度提取、空帧检测 |
| `confidence.ts` | 置信度等级划分 + 热力图颜色 |
| `subtitleSearch.ts` | 字幕二分查找（O(log n) 时间点查询） |
| `math.ts` | 基础数学：clamp、pixelLuma |
| `time.ts` | 时间格式化 |
| `constants.ts` | 常量定义 |
| `lang.ts` | OCR 语言代码映射 |
| `id.ts` | UUID 生成 |

### 状态层 (`stores/`)

| Store | 职责 |
|:------|:-----|
| **useProjectStore** | 视频文件状态、元数据、ROI 选区、播放状态 |
| **useSubtitleStore** | 字幕列表、CRUD、O(1) 索引映射、撤销/重做、导出格式 |
| **useSettingsStore** | 用户设置、localStorage 持久化、主题/语言 |

### 组件层 (`components/`)

| 目录 | 职责 |
|:-----|:-----|
| `common/` | 通用 UI 组件：Button, Modal, Toast, ToggleSwitch |
| `layout/` | 布局组件：Panel, Toolbar, StatusBar, VideoPreview, BatchProcessing |
| `subtitle/` | 字幕组件：List, Card, SubExport |
| `video/` | 视频组件：TimelineController, ROISelector |

---

## 后端架构

### 模块职责

| 模块 | 文件 | Tauri 命令 | 职责 |
|:-----|:-----|:-----------|:-----|
| **视频** | `video.rs` | `get_video_metadata` | FFprobe 元数据提取 |
| **场景** | `scene.rs` | `detect_scenes` | 直方图差异 + 卡方检验 |
| **导出** | `export.rs` | `export_subtitles` | 9 种字幕格式写入 |
| **格式化** | `export_fmt.rs` | — | SRT/VTT/ASS/SSA/JSON/CSV/TXT/LRC/SBV 格式化 |
| **文件** | `file.rs` | `open_file_dialog`, `save_file_dialog`, `read_text_file`, `write_text_file` | 文件对话框 + 读写 |
| **时间** | `timestamp.rs` | — | SRT/VTT 时间戳格式化 |
| **FFmpeg** | `ffmpeg.rs` | `extract_frame` | FFmpeg 命令封装 |
| **系统** | `system.rs` | `check_dependencies`, `get_tesseract_languages` | 系统依赖检测 |

### 错误处理

后端使用统一的 `AppError` 枚举，通过 `serde` 序列化后传递到前端。

---

## 数据流

### 字幕提取主流程

```
用户点击"开始提取"
        │
        ▼
useExtractor.startExtraction()
        │
        ├─→ usePlayer.seekToFrame(frame)     # 逐帧跳转
        ├─→ usePreprocessor.preprocess()      # 图像预处理
        │       灰度 → 对比度 → 模糊 → 二值化 → 形态学
        ├─→ useOCREngine.processImageData()   # OCR 识别
        │       PaddleOCR → 文本 + 置信度
        ├─→ Calibrator.calibrateEnhanced()    # 置信度校准
        │       CJK n-gram + 竖线检测 + 标点规范化
        ├─→ Pipeline.process()                 # 后处理管道
        │       标准化 → 去噪 → 合并分裂 → 相似度融合 → 时间校准
        └─→ subtitleStore.setSubtitles()       # 更新 UI
```

### 场景检测流程

```
输入：prevFrame, currFrame
  │
  ├─→ 构建直方图（256 bin）
  ├─→ 计算卡方距离
  ├─→ 判断是否超过 triggerThreshold
  │
  ├─ 触发场景变化
  │   └─→ 更新 cooldownRemaining
  │
  └─→ 冷却期内不检测
```

### 导出流程

```
subtitleStore.subtitles
        │
        ▼
Exporter.export(format, subtitles, outputPath)
        │
        ├─→ formatSRT()      # SubRip 格式
        ├─→ formatVTT()      # WebVTT 格式
        ├─→ formatASS()      # ASS 高级字幕
        ├─→ formatSSA()      # SSA 高级字幕
        ├─→ formatJSON()     # JSON 结构化
        ├─→ formatCSV()      # CSV 表格
        ├─→ formatTXT()      # TXT 纯文本
        ├─→ formatLRC()      # LRC 歌词
        └─→ formatSBV()      # SBV YouTube 格式
        │
        ▼
file.writeTextFile(outputPath, content)
```

---

## 性能优化

### 前端优化

- **rAF 节流**：hover/drag 事件使用 `requestAnimationFrame` 节流
- **响应式绕过**：高频 DOM 操作直写 `$el`，绕过 Vue 响应式
- **LRU 缓存**：256 帧 OCR 缓存，相同帧不重复识别
- **事件节流**：滚动、resize 事件采用节流策略

### 后端优化

- **异步 I/O**：所有文件/视频操作使用 `tokio::fs` / `tokio::process`
- **零拷贝**：帧数据通过内存共享，避免重复拷贝
- **模型预热**：OCR 引擎初始化后常驻内存

---

## 扩展点

### 新增 OCR 引擎

1. 在 `src/composables/useOCREngine.ts` 实现 `processWithNewEngine()`
2. 在 OCR 标签页添加引擎选项
3. 在 `src-tauri/src/commands/` 添加 Tauri 命令（如需要）

### 新增导出格式

1. 在 `src/core/Exporter.ts` 实现 `exportNewFormat()`
2. 在导出标签页添加格式选项
3. 更新 `docs/guide/export-formats.md`

### 新增后处理阶段

1. 在 `src/core/Pipeline.ts` 的 `process()` 中添加新阶段
2. 更新架构文档和数据流图
