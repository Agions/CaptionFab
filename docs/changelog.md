# 更新日志

所有 notable changes 都记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [3.6.0] - 2026-06-23

### Performance — Reactivity Bypass & Dead Code Elimination

- **timeline hover 优化**：`timeline-controller.vue` rAF 节流 + 直接写 tooltip DOM，绕过 Vue 响应式
- **video-preview hover 优化**：`video-preview.vue` timeline hover 直接写 DOM
- **roi-selector 优化**：拖拽时 rAF 直接写 DOM，删除 `selection` computed
- **Vite 构建回归修复**：消除 `src/types/video.ts` 静态+动态混合导入警告
- **依赖清理**：移除未使用的 `@vueuse/core`、`@vue/language-server`、`@vue/theme`
- **死代码清理**：移除 `Exporter.ts` 未使用的 `exportBilingualSRT/VTT`
- **调试日志清理**：移除 `useExtractor.ts` / `settings.ts` 残留 console 语句

### Documentation

- **文档重构**：删除 VitePress 站点，整合为单一 `README.md`
- **README 改进**：修正版本号、测试数、OCR 引擎说明、外部链接验证

---

## [3.5.0] - 2026-06-04

### Architecture Refactoring & Branding

- **项目更名**：SubLens → **CaptionFab**，全项目 97 处引用更新
- **Rust 模块拆分**：`utils.rs` 拆分为 `shared` / `shared_core` / `mod`，净减 101 行
- **OCR 引擎重构**：5 模块拆分（session / cache / preprocess / postprocess / mod）
- **薄抽象层消除**：`ocr` + `export` 合并为 `ocr_export`
- **错误字符串统一**：新增 `errors.rs`
- **FFmpeg 调用统一**：`run_command_with_timeout` 单入口
- **Vue 组件命名**：50 组件统一 kebab-case
- **死代码扫描**：批量删除未使用导出和 barrel 模块

---

## [3.4.0] - 2026-04-14

### ⚡ Performance — Async I/O

- 所有 `std::process::Command` 和 `std::fs` 替换为 `tokio::` 异步版本
- Rust 侧完全异步化：`video.rs`、`scene.rs`、`export.rs`、`file.rs`、`system.rs`、`ffmpeg.rs`

---

## [3.3.1] - 2026-04-10

### 🏗️ Architecture Refactor

- 共享 `types.rs` / `utils.rs` 模块，消除 3 处重复代码
- `ocr.rs` 完全重写，简化 temp 文件管理
- 删除 8 个历史失败 action runs

---

## [3.3.0] - 2026-04-10

### 🎨 Design System v2.0

- UI 设计系统全面重构：OKLCH 色彩空间，专业字体（DM Sans/Geist）
- 组件微交互对齐：Button hover、Modal 背透、StatusBar 脉冲
- CI 三路并行：quality / build / rust-test 完全并行

---

## [3.2.1] - 2026-04-08

### Refactor

- Project renamed: VisionSub -> HardSubX (repository, documentation, source files)
- TypeScript Strict Mode: all `any` type violations fixed (7 files)
- GitHub branding: 18 professional topics, English SEO description, SVG logo

---

## [3.2.0] - 2026-04-04

### Added

- Confidence level filter + batch operations (Phase 3/4)
- Advanced OCR post-processing pipeline (Phase 4)
- `filterJitterSubtitles`: removes short-duration OCR noise frames
