<div align="center">

# 🎬 CaptionFab

**智能视频字幕提取工具** — 从视频中精准提取硬编码字幕，输出 9 种专业格式

[![Version](https://img.shields.io/github/v/release/Agions/CaptionFab?style=flat-square&color=0EA5E9)](https://github.com/Agions/CaptionFab/releases)
[![License](https://img.shields.io/github/license/Agions/CaptionFab?style=flat-square&color=10B981)](https://github.com/Agions/CaptionFab/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/Agions/CaptionFab?style=flat-square&logo=github)](https://github.com/Agions/CaptionFab/stargazers)
[![Downloads](https://img.shields.io/github/downloads/Agions/CaptionFab/total?style=flat-square&logo=github)](https://github.com/Agions/CaptionFab/releases)

---

![CaptionFab](https://raw.githubusercontent.com/Agions/CaptionFab/main/public/logo.svg)

</div>

---

## ✨ 核心特性

| 特性 | 说明 |
|:-----|:-----|
| 🤖 **多引擎 OCR** | PaddleOCR · EasyOCR · Tesseract.js — 80+ 语言，GPU 加速，智能切换 |
| ⚡ **五阶段后处理** | 标准化 → 去噪 → 合并 → 相似度融合 → 时间校准，流水线清洗 |
| 📦 **9 种导出格式** | SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV |
| 🎬 **智能场景检测** | 直方图 + 卡方检验，自动跳过无字幕帧，减少 60% 无效 OCR |
| 🔧 **纯 Rust 后端** | Tokio 异步 I/O，所有 I/O 操作非阻塞，零外部运行时依赖 |
| 🛡️ **置信度校准** | 混语 · 短文本 · 重复字符自动降权，可视化质量信号 |
| 📐 **ROI 预设** | 底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换 |
| 📹 **广泛格式支持** | MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP |

---

## 📦 下载

### 桌面应用

| 平台 | 下载链接 |
|:-----|:---------|
| Windows | [captionfab-v4.0.0-x64-setup.exe](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-x64-setup.exe) |
| macOS | [captionfab-v4.0.0-x64.dmg](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-x64.dmg) |
| Linux | [captionfab-v4.0.0-amd64.deb](https://github.com/Agions/CaptionFab/releases/download/v4.0.0/captionfab-v4.0.0-amd64.deb) |

### 开发构建

```bash
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab
npm install
npm run tauri dev    # 开发模式
npm run tauri build  # 生产构建
```

**前置依赖：** Node.js 18+ · Rust 1.70+ · FFmpeg

---

## 🎯 快速开始

### 1. 导入视频

拖拽视频文件到窗口，或点击「选择文件」按钮。

### 2. 设置 ROI 区域

选择字幕所在的屏幕区域（底部/顶部/左侧/右侧/中间/自定义）。

### 3. 选择 OCR 引擎

| 引擎 | 精度 | 速度 | 语言 | 推荐场景 |
|:-----|:-----|:-----|:-----|:---------|
| **Tesseract.js** | ⭐⭐⭐ | 🚀 最快 | 100+ | 快速预览、单语言 |
| **EasyOCR** | ⭐⭐⭐⭐ | ⚡ 中等 | 80+ | 多语言混合、高精度 |
| **PaddleOCR** | ⭐⭐⭐⭐⭐ | ⚡ 快 (GPU) | 80+ | 中文场景、批量处理 |

### 4. 导出字幕

选择输出格式（SRT/VTT/ASS/JSON 等），点击「导出」完成提取。

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CaptionFab v4.0.0                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                    前端 (Vue 3 + TypeScript)              │      │
│   │                                                            │      │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐ │      │
│   │  │  Files  │ │   ROI   │ │   OCR   │ │ Export  │ │ ⚙️  │ │      │
│   │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──┬──┘ │      │
│   │       │           │           │           │         │    │      │
│   │       └───────────┴─────┬─────┴───────────┘         │    │      │
│   │                         │ Tauri IPC                 │    │      │
│   └─────────────────────────┼───────────────────────────┘    │      │
│                             │                                 │      │
│   ┌─────────────────────────┼─────────────────────────────────┘      │
│   │                         │                                         │
│   │              ┌──────────┴──────────┐                             │
│   │              │  后端 (Rust + Tokio) │                             │
│   │              │                      │                             │
│   │              │  video │ scene │ export │ file │ system │ utils   │
│   │              │   ↓     ↓      ↓      ↓     ↓       ↓            │
│   │              │  ffprobe  Python  9格式  对话框  诊断   工具       │
│   │              └──────────────────────────────────┘                │
│   │                                                                   │
│   │              ┌──────────────────────────┐                        │
│   │              │   OCR 引擎 (前端 WASM)    │                        │
│   │              │  Tesseract.js · EasyOCR  │                        │
│   │              └──────────────────────────┘                        │
│   └─────────────────────────────────────────────────────────────────┘
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|:-----|:-----|:-----|
| **桌面框架** | Tauri 2.x | 轻量级桌面壳，Rust 后端 |
| **前端框架** | Vue 3 + TypeScript + Vite + Pinia | 响应式 UI，类型安全 |
| **后端运行时** | Rust + Tokio | 异步 I/O，零 GC，高性能 |
| **OCR 引擎** | Tesseract.js / EasyOCR / PaddleOCR | WASM + PyTorch + Native |
| **测试框架** | Vitest | 193 个单元测试，覆盖率 > 85% |
| **CI/CD** | GitHub Actions | 自动构建、测试、发布 |

---

## 📊 性能对比

| 指标 | CaptionFab | 竞品 A | 竞品 B |
|:-----|:-----------|:-------|:-------|
| 启动时间 | < 1s | 3-5s | 2-4s |
| 内存占用 | ~150MB | ~400MB | ~300MB |
| 安装包大小 | ~50MB | ~200MB | ~150MB |
| 支持格式 | 9 种 | 5 种 | 6 种 |
| 语言支持 | 80+ | 30+ | 50+ |
| 离线可用 | ✅ | ❌ | ⚠️ |

---

## 📚 文档

| 文档 | 说明 |
|:-----|:-----|
| [📖 用户指南](https://captionfab.dev/guide/getting-started) | 快速上手、功能详解、常见问题 |
| [🏗️ 架构文档](https://captionfab.dev/architecture) | 系统架构、数据流、接口定义 |
| [👨‍💻 开发者指南](https://captionfab.dev/developer-guide) | 环境搭建、调试、贡献代码 |
| [📝 CHANGELOG](https://github.com/Agions/CaptionFab/blob/main/CHANGELOG.md) | 版本变更记录 |

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

**开发规范：**
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- 所有代码需通过 `npm run lint` 和 `npm run test`
- 新增功能需附带单元测试

---

## 📜 开源协议

本项目采用 [MIT License](https://github.com/Agions/CaptionFab/blob/main/LICENSE) 开源。

---

## 🙏 致谢

- [Tauri](https://tauri.app) - 桌面应用框架
- [Vue.js](https://vuejs.org) - 前端框架
- [Tesseract.js](https://github.com/naptha/tesseract.js) - WASM OCR
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) - 深度学习 OCR
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - 百度 OCR 引擎
- [FFmpeg](https://ffmpeg.org) - 视频处理

---

<div align="center">

**Made with ❤️ by [Agions](https://github.com/Agions)**

[GitHub](https://github.com/Agions/CaptionFab) · [文档](https://captionfab.dev) · [Discord](https://discord.gg/captionfab) · [Twitter](https://twitter.com/captionfab)

</div>
