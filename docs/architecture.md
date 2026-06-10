# CaptionFab 系统架构

> 本文档描述 CaptionFab v4.0.0 的整体架构设计、模块职责和数据流。

---

## 系统概览

CaptionFab 是一个基于 Tauri 2.x 的桌面应用，采用 **前端 (Vue 3) + 后端 (Rust)** 的双进程架构。前端负责 UI 渲染和 OCR 处理，后端负责视频元数据提取、场景检测和文件 I/O。

```
┌──────────────────────────────────────────────────────────────────┐
│                       CaptionFab v4.0.0                          │
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
│  │  │  image · text · detection · lru-cache · time · math  │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │ Tauri IPC (invoke)                   │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │         后端进程 (Rust · Tokio 异步运行时)                  │  │
│  │                                                            │  │
│  │  commands/                                                  │  │
│  │  ├─ video.rs      FFprobe 视频元数据                       │  │
│  │  ├─ scene.rs      场景检测 (直方图 + 卡方检验)             │  │
│  │  ├─ export.rs     9 种格式导出引擎                         │  │
│  │  ├─ export_fmt.rs 格式化器 (SRT/VTT/ASS/SSA/JSON/CSV/TXT) │  │
│  │  ├─ file.rs       文件对话框 + 读写                        │  │
│  │  ├─ timestamp.rs  时间戳工具                               │  │
│  │  ├─ ffmpeg.rs     FFmpeg 命令封装                          │  │
│  │  └─ system.rs     系统依赖检测                             │  │
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

```
utils/
├── image.ts           # 核心像素操作：灰度、对比度(LUT)、模糊、自适应阈值、缩放
├── image-deskew.ts    # 文字倾斜矫正：投影方差法检测角度 + 旋转
├── image-morph.ts     # 形态学操作：腐蚀、膨胀、开运算
├── image-kernel.ts    # 共享内核工具：邻域遍历、方形内核生成
├── text.ts            # CJK 检测、标点规范化、langToScript 映射
├── lru-cache.ts       # 泛型 LRU 缓存（Pipeline 相似度计算复用）
├── detection.ts       # 帧分析：方差/亮度/边缘密度提取、空帧检测
├── confidence.ts      # 置信度等级划分 + 热力图颜色
├── subtitleSearch.ts  # 字幕二分查找（O(log n) 时间点查询）
├── math.ts            # 基础数学：clamp、pixelLuma
├── time.ts            # 时间格式化
├── constants.ts       # 常量定义
├── lang.ts            # OCR 语言代码映射
└── id.ts              # UUID 生成
```

### 状态层 (`stores/`)

| Store | 文件 | 职责 |
|:------|:-----|:-----|
| **useProjectStore** | `project.ts` | 视频文件状态、元数据、ROI 选区、播放状态 |
| **useSubtitleStore** | `subtitle.ts` | 字幕列表、CRUD、O(1) 索引映射、撤销/重做、导出格式 |
| **useSettingsStore** | `settings.ts` | 用户设置、localStorage 持久化、主题/语言 |

### 组件层 (`components/`)

```
components/
├── common/                    # 通用 UI 组件
│   ├── Button.vue             # 按钮（variant/size/loading）
│   ├── Modal.vue              # 模态框
│   ├── Toast.vue              # 通知提示
│   ├── AboutDialog.vue        # 关于对话框
│   └── ToggleSwitch.vue       # 开关
├── layout/                    # 布局组件
│   ├── Panel.vue              # 主面板（标签页容器）
│   ├── Toolbar.vue            # 顶部工具栏
│   ├── StatusBar.vue          # 底部状态栏
│   ├── VideoPreview.vue       # 视频预览区
│   ├── BatchProcessing.vue    # 批量处理面板
│   ├── tabs/                  # 标签页面板
│   │   ├── Files.vue          # 文件管理
│   │   ├── ROI.vue            # ROI 选区
│   │   ├── OCR.vue            # OCR 配置
│   │   ├── Export.vue         # 导出设置
│   │   ├── Progress.vue       # 进度显示
│   │   └── Settings.vue       # 设置面板
│   ├── batch/                 # 批量子组件
│   └── video/                 # 视频子组件
├── subtitle/                  # 字幕组件
│   ├── List.vue               # 字幕列表
│   ├── Card.vue               # 字幕卡片
│   ├── SubExport.vue          # 导出面板
│   └── card/                  # 卡片子组件
└── video/                     # 视频组件
    ├── TimelineController.vue # 时间轴控制器
    ├── ROISelector.vue        # ROI 选区器
    └── timeline/              # 时间轴子组件
```

---

## 后端架构

### 模块职责

| 模块 | 文件 | 职责 | Tauri 命令 |
|:-----|:-----|:-----|:-----------|
| **视频** | `video.rs` | FFprobe 元数据提取（分辨率/帧率/时长/编码） | `get_video_metadata` |
| **场景** | `scene.rs` | 直方图差异 + 卡方检验场景检测 | `detect_scenes` |
| **导出** | `export.rs` | 9 种字幕格式写入 | `export_subtitles` |
| **格式化** | `export_fmt.rs` | SRT/VTT/ASS/SSA/JSON/CSV/TXT/LRC/SBV 格式化 | — |
| **文件** | `file.rs` | 文件对话框 + 文本读写 | `open_file_dialog` `save_file_dialog` `write_text_file` |
| **FFmpeg** | `ffmpeg.rs` | FFmpeg 命令封装（帧提取/转码） | `extract_frame` |
| **系统** | `system.rs` | 系统依赖检测（FFmpeg/Node/Python） | `check_dependencies` |
| **时间** | `timestamp.rs` | SRT/VTT 时间戳格式化 | — |

### 错误处理

后端使用统一的 `AppError` 枚举，通过 `serde` 序列化后传递到前端：

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("FFprobe error: {0}")]
    FFprobe(String),
    #[error("Export error: {0}")]
    Export(String),
    // ...
}
```

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
        │       Tesseract.js WASM → 文本 + 置信度
        ├─→ Calibrator.calibrateEnhanced()    # 置信度校准
        │       CJK n-gram · 竖线检测 · 标点规范化
        ├─→ Pipeline.process()                # 后处理管道
        │       标准化 → 去噪 → 合并 → 融合 → 时间校准
        └─→ subtitleStore.addSubtitle()       # 写入状态
```

### 视频导入流程

```
拖拽文件 / 选择文件
        │
        ▼
useFileDrop.handleFileDrop()
        │
        ├─→ Tauri invoke: get_video_metadata
        │       FFprobe → { width, height, fps, duration, codec }
        ├─→ projectStore.setVideo(path, metadata)
        └─→ usePlayer.loadVideo(path)
                video.src = asset://localhost/...
```

---

## 命名规范

| 类型 | 规范 | 示例 |
|:-----|:-----|:-----|
| 组件文件 | PascalCase.vue | `TimelineController.vue` |
| Composable | useXxx.ts | `useExtractor.ts` |
| 工具函数 | camelCase.ts | `lru-cache.ts`, `subtitleSearch.ts` |
| Store | camelCase.ts | `subtitle.ts`, `project.ts` |
| 类型文件 | camelCase.ts | `subtitle.ts`, `video.ts` |
| Rust 模块 | snake_case.rs | `export_fmt.rs`, `timestamp.rs` |
| 函数 | camelCase | `processMultiPass`, `calibrateEnhanced` |
| 接口 | PascalCase | `SubtitleItem`, `PipelineOptions` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_PIPELINE_OPTIONS` |

---

## 性能优化

| 优化项 | 策略 |
|:-------|:-----|
| 相似度计算 | LRU 缓存 (3000 条)，避免重复 Levenshtein 计算 |
| 字幕查找 | 二分查找 O(log n)，利用 startTime 有序性 |
| 图像预处理 | Buffer 池复用，减少 GC 压力 |
| OCR | 多通道并行（不同缩放因子），高置信度提前退出 |
| 帧分析 | 2px 步进采样，O(1) ROI 像素访问 |
| 对比度增强 | 256 项预计算 LUT，O(1) 查表 |
