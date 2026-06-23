# 开发者指南

欢迎为 CaptionFab 贡献代码！本文档涵盖环境搭建、代码规范、测试和发布流程。

---

## 环境搭建

### 前置要求

| 工具 | 版本 | 安装方式 |
|:-----|:-----|:---------|
| Node.js | 18+ | [官网下载](https://nodejs.org/) |
| pnpm | 9+ | `npm install -g pnpm` |
| Rust | 1.82+ | [rustup](https://rustup.rs/) |
| FFmpeg | 6+ | 系统包管理器 |
| Git | 任意 | [官网下载](https://git-scm.com/) |

### 克隆仓库

```bash
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab
```

### 安装依赖

```bash
# 前端依赖
pnpm install

# Rust 依赖
cd src-tauri
cargo fetch
cd ..
```

### 启动开发环境

```bash
pnpm tauri dev
```

---

## 项目结构

```
CaptionFab/
├── src/
│   ├── components/             # Vue 组件
│   │   ├── common/             # 通用组件
│   │   ├── layout/             # 布局组件
│   │   ├── subtitle/           # 字幕组件
│   │   └── video/              # 视频组件
│   ├── composables/            # Vue 组合式函数
│   ├── core/                   # 核心业务逻辑
│   ├── stores/                 # Pinia 状态管理
│   ├── utils/                  # 工具函数
│   └── types/                  # TypeScript 类型定义
├── src-tauri/
│   └── src/
│       ├── commands/           # Tauri 命令
│       └── lib.rs              # 入口
├── docs/                       # 在线文档
└── package.json
```

---

## 代码规范

### 前端 (TypeScript + Vue)

- **类型检查**：`pnpm type-check`（`vue-tsc --noEmit`）零错误
- **Lint**：`pnpm lint` 零错误
- **测试**：`pnpm test` 全部通过（372 个）
- **组件语法**：使用 `<script setup lang="ts">`
- **类型**：避免 `any`，使用 `unknown` + 类型守卫
- **Composable**：使用 `use` 前缀，返回响应式对象

### 后端 (Rust)

- **编译检查**：`cargo check` 零警告
- **Clippy**：`cargo clippy` 零警告
- **测试**：`cargo test` 全部通过
- **错误处理**：使用 `thiserror` + `Result`，避免 `unwrap()`
- **异步 I/O**：使用 `tokio::fs` 和 `tokio::process::Command`

### 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增批量导出功能
fix: 修复空帧导致的 OCR 崩溃
refactor: 提取图像处理工具模块
docs: 更新架构文档
test: 添加 Pipeline 阶段测试
```

---

## 测试

### 前端测试

```bash
pnpm test              # 运行全部测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 覆盖率报告
```

**测试规范：**
- 测试文件与源码同目录：`Pipeline.test.ts` 测试 `Pipeline.ts`
- 新增功能需附带单元测试
- 核心层和工具层要求 100% 函数覆盖

### 后端测试

```bash
cd src-tauri
cargo test
```

---

## 调试

### 前端调试

- Vue DevTools：浏览器插件，检查组件状态
- 日志：`console.log` / `console.warn` / `console.error`
- 网络：浏览器 DevTools Network 面板

### 后端调试

```bash
# 启用 debug 日志
RUST_LOG=debug pnpm tauri dev

# 查看 Tauri 事件
RUST_LOG=tauri=debug pnpm tauri dev
```

---

## 构建

### 开发构建

```bash
pnpm tauri dev
```

### 生产构建

```bash
pnpm tauri build
```

### 前端构建

```bash
pnpm run build
```

构建产物位于 `dist/` 目录。

---

## 发布

### 版本号

遵循 [Semantic Versioning](https://semver.org/)：
- `MAJOR.MINOR.PATCH`
- Breaking change → MAJOR
- 新功能 → MINOR
- Bug 修复 → PATCH

### 发布流程

1. 更新 `CHANGELOG.md`
2. 更新 `package.json` 版本号
3. 提交并推送
4. 创建 GitHub Release
5. CI 自动构建多平台安装包

---

## 贡献流程

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
- [ ] PR 标题遵循 Conventional Commits

---

## 架构原则

- **分层架构**：组件 → 组合式函数 → 核心逻辑 → 工具函数
- **零 DOM 依赖**：核心层纯算法，可独立测试
- **单一职责**：每个模块只做一件事
- **可测试性**：核心逻辑 100% 单元测试覆盖
- **性能优先**：rAF 节流、LRU 缓存、响应式绕过
