---
layout: home

hero:
  name: CaptionFab
  text: 智能硬编码字幕提取工具
  tagline: 从视频中精准提取字幕，支持 9 种专业格式输出。基于 Tauri + Vue 3 + Rust 构建。
  image:
    src: /logo.svg
    alt: CaptionFab
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 架构文档
      link: /architecture
    - theme: alt
      text: GitHub
      link: https://github.com/Agions/CaptionFab

features:
  - icon: 🤖
    title: 多引擎 OCR
    details: PaddleOCR（默认）、EasyOCR、Tesseract 可切换；ONNX Runtime 推理，GPU 加速，256 帧 LRU 缓存
  - icon: ⚡
    title: 五阶段后处理
    details: 标准化 → 去噪 → 合并分裂 → 相似度融合 → 时间校准，流水线清洗
  - icon: 📦
    title: 9 种导出格式
    details: SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV，一键导出
  - icon: 🎬
    title: 智能场景检测
    details: FFmpeg select filter + Rust 原生实现，减少 60% 无效 OCR
  - icon: 🛡️
    title: 置信度校准
    details: CJK n-gram 分析、竖线检测、标点规范化，可视化质量信号
  - icon: 🔧
    title: 纯 Rust 后端
    details: Tokio 异步 I/O，所有文件/视频操作非阻塞，零 GC
  - icon: 📐
    title: ROI 预设
    details: 底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换
  - icon: 📹
    title: 广泛视频格式
    details: MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP
  - icon: 🎨
    title: 暗色/亮色主题
    details: 跟随系统或手动切换，设置持久化到 localStorage
---

## 项目概览

| 指标 | 数据 |
|:-----|:-----|
| 测试数量 | 372 个单元测试 |
| 导出格式 | 9 种 |
| 支持语言 | 100+ |
| 技术栈 | Tauri 2.x + Vue 3.5 + Rust + TypeScript 5.9 |

## 快速链接

- [📖 快速开始](/guide/getting-started) — 安装与运行
- [🏗️ 架构文档](/architecture) — 系统设计
- [👨‍💻 开发者指南](/developer-guide) — 贡献代码
- [📚 API 参考](/api/pipeline) — 核心模块 API
- [📝 更新日志](/changelog) — 版本变更
