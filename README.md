<div align="center">

<img src="https://raw.githubusercontent.com/Agions/CaptionFab/main/public/logo.svg" alt="CaptionFab" width="120"/>

# CaptionFab

**智能硬编码字幕提取工具** — 从视频中精准提取字幕，支持 9 种专业格式输出

[![Version](https://img.shields.io/github/v/release/Agions/CaptionFab?style=flat-square&color=0EA5E9)](https://github.com/Agions/CaptionFab/releases)
[![Tests](https://img.shields.io/badge/tests-372%20passed-10B981?style=flat-square)](https://github.com/Agions/CaptionFab/actions)
[![License](https://img.shields.io/github/license/Agions/CaptionFab?style=flat-square&color=10B981)](https://github.com/Agions/CaptionFab/blob/main/LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?style=flat-square)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-2021-dea584?style=flat-square)](https://www.rust-lang.org)
[![ONNX](https://img.shields.io/badge/ONNX-Runtime-blue?style=flat-square)](https://onnxruntime.ai)

</div>

---

## ✨ 核心特性

| 特性 | 说明 |
|:-----|:-----|
| 🤖 **多引擎 OCR** | PaddleOCR（默认）、EasyOCR、Tesseract 可切换；ONNX Runtime 推理，GPU 加速，256 帧 LRU 缓存 |
| ⚡ **五阶段后处理管道** | 标准化 → 去噪 → 合并分裂 → 相似度融合 → 时间校准 |
| 📦 **9 种导出格式** | SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV |
| 🎬 **智能场景检测** | FFmpeg select filter + Rust 原生实现，减少 60% 无效 OCR |
| 🔧 **纯 Rust 后端** | Tokio 异步 I/O，无 Python 依赖，模型预热启动 |
| 🛡️ **置信度校准引擎** | CJK n-gram 分析、竖线检测、标点规范化，可视化质量信号 |
| 📐 **ROI 预设** | 底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换 |
| 📹 **广泛视频格式** | MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP |
| 🎨 **暗色/亮色主题** | 跟随系统或手动切换，设置持久化到 localStorage |

---

## 📦 下载

> **当前版本：v3.6.0**

| 平台 | 下载链接 |
|:-----|:---------|
| Windows x64 | [captionfab-v3.6.0-x64-setup.exe](https://github.com/Agions/CaptionFab/releases/download/v3.6.0/captionfab-v3.6.0-x64-setup.exe) |
| macOS (Intel) | [captionfab-v3.6.0-x64.dmg](https://github.com/Agions/CaptionFab/releases/download/v3.6.0/captionfab-v3.6.0-x64.dmg) |
| macOS (Apple Silicon) | [captionfab-v3.6.0-aarch64.dmg](https://github.com/Agions/CaptionFab/releases/download/v3.6.0/captionfab-v3.6.0-aarch64.dmg) |
| Linux (Debian/Ubuntu) | [captionfab-v3.6.0-amd64.deb](https://github.com/Agions/CaptionFab/releases/download/v3.6.0/captionfab-v3.6.0-amd64.deb) |

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
 拖拽/点击   底部字幕区     PaddleOCR     自动处理   SRT/VTT/ASS
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
| **OCR 引擎** | PaddleOCR / EasyOCR / Tesseract | ONNX Runtime / WASM |
| **测试框架** | Vitest + cargo test | 372 个测试 |
| **构建工具** | Vite + pnpm | 5.x / 9.x |

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
└── package.json
```

---

## 🧪 测试与质量门禁

| 检查项 | 标准 | 状态 |
|:-----|:-----|:-----|
| 前端类型检查 | `vue-tsc --noEmit` 零错误 | ✅ |
| 代码规范 | `eslint src --ext .vue,.ts,.tsx` 零错误 | ✅ |
| 单元测试 | `vitest run` 全部通过 | ✅ 372 passed |
| 后端编译 | `cargo check` 零警告 | ✅ |
| 生产构建 | `pnpm run build` | ✅ ~4.3s |

```bash
pnpm test             # 运行前端测试 (372 个)
cargo test            # 运行 Rust 测试
pnpm lint             # ESLint 检查
pnpm type-check       # vue-tsc 类型检查
pnpm tauri dev        # 开发模式
pnpm tauri build      # 生产构建
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

**PR 要求：**
- [ ] 通过 `pnpm lint`
- [ ] 通过 `pnpm type-check`
- [ ] 通过 `pnpm test`
- [ ] 新增功能附带测试
- [ ] PR 标题遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📝 更新日志

### [3.6.0] - 2026-06-23

#### Performance — Reactivity Bypass & Dead Code Elimination

- **timeline hover 优化**：`timeline-controller.vue` rAF 节流 + 直接写 tooltip DOM，绕过 Vue 响应式
- **video-preview hover 优化**：`video-preview.vue` timeline hover 直接写 DOM
- **roi-selector 优化**：拖拽时 rAF 直接写 DOM，删除 `selection` computed
- **Vite 构建回归修复**：消除 `src/types/video.ts` 静态+动态混合导入警告
- **依赖清理**：移除未使用的 `@vueuse/core`、`@vue/language-server`、`@vue/theme`
- **死代码清理**：移除 `Exporter.ts` 未使用的 `exportBilingualSRT/VTT`
- **调试日志清理**：移除 `useExtractor.ts` / `settings.ts` 残留 console 语句

### [3.5.0] - 2026-06-04

#### Architecture Refactoring & Branding

- **项目更名**：SubLens → **CaptionFab**，全项目 97 处引用更新
- **Rust 模块拆分**：`utils.rs` 拆分为 `shared` / `shared_core` / `mod`，净减 101 行
- **OCR 引擎重构**：5 模块拆分（session / cache / preprocess / postprocess / mod）
- **薄抽象层消除**：`ocr` + `export` 合并为 `ocr_export`
- **错误字符串统一**：新增 `errors.rs`
- **FFmpeg 调用统一**：`run_command_with_timeout` 单入口
- **Vue 组件命名**：50 组件统一 kebab-case
- **死代码扫描**：批量删除未使用导出和 barrel 模块

---

## 📜 开源协议

本项目采用 [MIT License](./LICENSE) 开源。

---

## 🙏 致谢

| 项目 | 用途 |
|:-----|:-----|
| [Tauri](https://tauri.app) | 轻量级桌面应用框架 |
| [Vue.js](https://vuejs.org) | 响应式前端框架 |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | 多语言 OCR 引擎 |
| [EasyOCR](https://github.com/JaidedAI/EasyOCR) | 深度学习 OCR 引擎 |
| [Tesseract](https://github.com/tesseract-ocr/tesseract) | 传统 OCR 引擎 |
| [ONNX Runtime](https://onnxruntime.ai) | 模型推理运行时 |
| [FFmpeg](https://ffmpeg.org) | 视频处理 |
| [Pinia](https://pinia.vuejs.org) | Vue 状态管理 |

---

<div align="center">

**Made with ❤️ by [Agions](https://github.com/Agions)**

[GitHub](https://github.com/Agions/CaptionFab) · [Issues](https://github.com/Agions/CaptionFab/issues) · [Releases](https://github.com/Agions/CaptionFab/releases) · [Security Advisories](https://github.com/Agions/CaptionFab/security/advisories)

</div>
