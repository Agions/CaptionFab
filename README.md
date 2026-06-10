<div align="center">

<img src="https://raw.githubusercontent.com/Agions/CaptionFab/main/public/logo.svg" alt="CaptionFab" width="120"/>

# CaptionFab

**智能硬编码字幕提取工具** — 从视频中精准提取字幕，支持 9 种专业格式输出

[![Version](https://img.shields.io/github/v/release/Agions/CaptionFab?style=flat-square&color=0EA5E9)](https://github.com/Agions/CaptionFab/releases)
[![Tests](https://img.shields.io/badge/tests-193%20passed-10B981?style=flat-square)](https://github.com/Agions/CaptionFab/actions)
[![License](https://img.shields.io/github/license/Agions/CaptionFab?style=flat-square&color=10B981)](https://github.com/Agions/CaptionFab/blob/main/LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?style=flat-square&logo=tauri)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square&logo=vue.js)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-2021-dea584?style=flat-square&logo=rust)](https://www.rust-lang.org)

</div>

---

## ✨ 核心特性

| 特性 | 说明 |
|:-----|:-----|
| 🤖 **多引擎 OCR** | Tesseract.js (WASM) — 100+ 语言，浏览器端运行，零外部依赖 |
| ⚡ **五阶段后处理管道** | 标准化 → 去噪 → 合并分裂 → 相似度融合 → 时间校准 |
| 📦 **9 种导出格式** | SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV |
| 🎬 **智能场景检测** | 直方图 + 卡方检验，自动跳过无字幕帧，减少 60% 无效 OCR |
| 🔧 **纯 Rust 后端** | Tokio 异步 I/O，所有文件/视频操作非阻塞 |
| 🛡️ **置信度校准引擎** | CJK n-gram 分析、竖线检测、标点规范化，可视化质量信号 |
| 📐 **ROI 预设** | 底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换 |
| 📹 **广泛视频格式** | MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP |
| 🎨 **暗色/亮色主题** | 跟随系统或手动切换，设置持久化到 localStorage |

---

## 📦 下载

> **当前版本：v4.0.0** · [查看更新日志](./CHANGELOG.md)

| 平台 | 下载链接 |
|:-----|:---------|
| Windows x64 | [captionfab-v4.0.0-x64-setup.exe](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-x64-setup.exe) |
| macOS (Intel) | [captionfab-v4.0.0-x64.dmg](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-x64.dmg) |
| macOS (Apple Silicon) | [captionfab-v4.0.0-aarch64.dmg](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-aarch64.dmg) |
| Linux (Debian/Ubuntu) | [captionfab-v4.0.0-amd64.deb](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-amd64.deb) |

---

## 🚀 快速开始

### 安装开发环境

```bash
# 前置依赖：Node.js 18+ · pnpm · Rust 1.82+ · FFmpeg
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab
pnpm install
pnpm tauri dev     # 开发模式（热重载）
pnpm tauri build   # 生产构建
```

### 使用流程

```
导入视频 → 选择 ROI 区域 → 选择 OCR 引擎 → 开始提取 → 导出字幕
   ↓           ↓              ↓              ↓          ↓
 拖拽/点击   底部字幕区     Tesseract.js    自动处理   SRT/VTT/ASS
```

---

## 🏗️ 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                       CaptionFab v4.0.0                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               前端 (Vue 3.5 + TypeScript + Vite)           │  │
│  │                                                            │  │
│  │  components/          composables/        core/            │  │
│  │  ├─ layout/           ├─ useExtractor.ts  ├─ Pipeline.ts   │  │
│  │  │  ├─ Panel.vue      ├─ useOCREngine.ts  ├─ Calibrator.ts│  │
│  │  │  ├─ Toolbar.vue    ├─ usePlayer.ts     ├─ SceneDetect.ts│  │
│  │  │  ├─ VideoPreview   ├─ useBatchProc.ts  └─ Exporter.ts  │  │
│  │  │  └─ StatusBar.vue  ├─ usePreprocessor.ts               │  │
│  │  ├─ subtitle/         ├─ useSubList.ts    stores/          │  │
│  │  │  ├─ List.vue       ├─ useHotkeys.ts    ├─ project.ts   │  │
│  │  │  ├─ Card.vue       └─ useTheme.ts      ├─ subtitle.ts  │  │
│  │  │  └─ SubExport.vue                      └─ settings.ts  │  │
│  │  └─ video/                                                │  │
│  │     ├─ TimelineController   utils/                        │  │
│  │     └─ ROISelector          ├─ image/ (deskew, morph,     │  │
│  │                              │         kernel, pixel ops)  │  │
│  │                              ├─ text.ts (CJK, langToScript)│  │
│  │                              ├─ lru-cache.ts              │  │
│  │                              └─ detection.ts              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                          │ Tauri IPC                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               后端 (Rust + Tokio)                          │  │
│  │                                                            │  │
│  │  commands/                                                 │  │
│  │  ├─ video.rs     FFprobe 元数据提取                        │  │
│  │  ├─ scene.rs     场景检测（直方图+卡方检验）               │  │
│  │  ├─ export.rs    9 种格式导出                              │  │
│  │  ├─ file.rs      文件对话框 + 读写                        │  │
│  │  ├─ system.rs    系统依赖检测                              │  │
│  │  └─ ffmpeg.rs    FFmpeg 命令封装                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|:-----|:-----|:-----|
| **桌面框架** | Tauri | 2.x |
| **前端框架** | Vue 3 + TypeScript 5.9 + Vite 5 | Vue 3.5 |
| **状态管理** | Pinia | 2.x |
| **路由** | GoRouter (Tauri 侧) | — |
| **后端语言** | Rust + Tokio | 2021 edition |
| **OCR 引擎** | Tesseract.js (WASM) | 5.x |
| **测试框架** | Vitest | 193 个测试 |
| **文档** | VitePress | 1.x |

---

## 📂 项目结构

```
CaptionFab/
├── src/                        # 前端源码
│   ├── components/             # Vue 组件
│   │   ├── common/             # 通用组件 (Button, Modal, Toast...)
│   │   ├── layout/             # 布局组件 (Panel, Toolbar, VideoPreview...)
│   │   ├── subtitle/           # 字幕组件 (List, Card, SubExport...)
│   │   └── video/              # 视频组件 (Timeline, ROISelector...)
│   ├── composables/            # Vue 组合式函数
│   ├── core/                   # 核心业务逻辑 (Pipeline, Calibrator, Exporter)
│   ├── stores/                 # Pinia 状态管理
│   ├── utils/                  # 工具函数
│   │   ├── image.ts            # 图像处理 (灰度/对比度/模糊/缩放)
│   │   ├── image-deskew.ts     # 文字倾斜矫正
│   │   ├── image-morph.ts      # 形态学操作
│   │   ├── text.ts             # CJK 检测 + 标点规范化
│   │   ├── lru-cache.ts        # 泛型 LRU 缓存
│   │   └── detection.ts        # 帧分析 + 空帧检测
│   └── types/                  # TypeScript 类型定义
├── src-tauri/                  # Rust 后端
│   ├── src/commands/           # Tauri 命令模块
│   └── Cargo.toml
├── docs/                       # VitePress 文档站点
├── public/                     # 静态资源
└── package.json
```

---

## 📚 文档

| 文档 | 说明 |
|:-----|:-----|
| [📖 用户指南](./docs/guide/getting-started.md) | 快速上手、功能详解、常见问题 |
| [🏗️ 架构文档](./docs/architecture.md) | 系统架构、数据流、模块职责 |
| [👨‍💻 开发者指南](./docs/developer-guide.md) | 环境搭建、调试、贡献代码 |
| [📝 更新日志](./CHANGELOG.md) | 版本变更记录 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

```bash
# 开发流程
pnpm install          # 安装依赖
pnpm test             # 运行测试 (193 个)
pnpm lint             # 代码检查
pnpm tauri dev        # 启动开发服务器
```

---

## 📜 开源协议

本项目采用 [MIT License](./LICENSE) 开源。

---

## 🙏 致谢

| 项目 | 用途 |
|:-----|:-----|
| [Tauri](https://tauri.app) | 轻量级桌面应用框架 |
| [Vue.js](https://vuejs.org) | 响应式前端框架 |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | WASM OCR 引擎 |
| [FFmpeg](https://ffmpeg.org) | 视频处理 |
| [Pinia](https://pinia.vuejs.org) | Vue 状态管理 |

---

<div align="center">

**Made with ❤️ by [Agions](https://github.com/Agions)**

[GitHub](https://github.com/Agions/CaptionFab) · [Issues](https://github.com/Agions/CaptionFab/issues) · [Releases](https://github.com/Agions/CaptionFab/releases)

</div>
