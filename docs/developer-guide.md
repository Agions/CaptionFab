# CaptionFab 开发者指南

> 面向贡献者的完整开发指南，涵盖环境搭建、调试、测试和发布流程。

---

## 1. 环境搭建

### 前置依赖

| 依赖 | 最低版本 | 说明 |
|:-----|:---------|:-----|
| **Node.js** | 18+ | JavaScript 运行时 |
| **pnpm** | 8+ | 包管理器（项目使用 pnpm，非 npm） |
| **Rust** | 1.82+ | Tauri 2.x 要求 |
| **FFmpeg** | 4.0+ | 视频处理（运行时依赖） |

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab

# 2. 安装前端依赖
pnpm install

# 3. 启动开发服务器（自动编译 Rust 后端）
pnpm tauri dev

# 4. 生产构建
pnpm tauri build
```

### 推荐工具

- **IDE**: VS Code + Volar 扩展 + rust-analyzer
- **调试**: Chrome DevTools（WebView 内置）+ `cargo test`

---

## 2. 项目结构

```
CaptionFab/
├── src/                          # 前端源码
│   ├── components/               # Vue 组件
│   │   ├── common/               # 通用组件 (Button, Modal, Toast)
│   │   ├── layout/               # 布局组件 (Panel, Toolbar, VideoPreview)
│   │   │   ├── tabs/             # 标签页面板
│   │   │   ├── batch/            # 批量子组件
│   │   │   └── video/            # 视频子组件
│   │   ├── subtitle/             # 字幕组件
│   │   │   ├── card/             # 字幕卡片子组件
│   │   │   └── list/             # 列表子组件
│   │   └── video/                # 视频组件
│   │       └── timeline/         # 时间轴子组件
│   ├── composables/              # Vue 组合式函数
│   ├── core/                     # 核心业务逻辑
│   ├── stores/                   # Pinia 状态管理
│   ├── utils/                    # 工具函数
│   │   ├── image.ts              # 核心像素操作
│   │   ├── image-deskew.ts       # 倾斜矫正
│   │   ├── image-morph.ts        # 形态学操作
│   │   ├── image-kernel.ts       # 共享内核工具
│   │   ├── text.ts               # CJK 检测 + 语言映射
│   │   ├── lru-cache.ts          # 泛型 LRU 缓存
│   │   ├── detection.ts          # 帧分析
│   │   └── subtitleSearch.ts     # 字幕二分查找
│   ├── types/                    # TypeScript 类型定义
│   └── themes/                   # 主题配置
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── commands/             # Tauri 命令模块
│   │   ├── lib.rs                # 库入口
│   │   └── main.rs               # 二进制入口
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                         # VitePress 文档站点
│   ├── .vitepress/               # VitePress 配置
│   ├── guide/                    # 用户指南
│   └── api/                      # API 文档
├── public/                       # 静态资源
├── vitest.config.ts              # 测试配置
├── package.json
└── README.md
```

---

## 3. 开发命令速查

| 命令 | 说明 |
|:-----|:-----|
| `pnpm tauri dev` | 启动开发服务器（前端热重载 + Rust 自动编译） |
| `pnpm tauri build` | 生产构建 |
| `pnpm test` | 运行全部测试（193 个） |
| `pnpm test:watch` | 测试监听模式 |
| `pnpm lint` | ESLint 检查 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm type-check` | TypeScript 类型检查（vue-tsc --noEmit） |
| `pnpm docs:dev` | 启动文档开发服务器 |

---

## 4. 核心模块开发指南

### 4.1 添加新的 Pipeline 阶段

Pipeline 位于 `src/core/Pipeline.ts`，每个阶段是一个纯函数：

```typescript
// 输入输出均为 SubtitleLite[]
function stage5_myNewStage(
  subs: SubtitleLite[],
  opts: PipelineOptions,
  cache: LRUCache<string, number>,
): SubtitleLite[] {
  // 实现逻辑
  return result
}
```

然后在 `Pipeline.process()` 中调用：

```typescript
result = stage5_myNewStage(result, this.opts, this._cache)
```

### 4.2 添加新的校准规则

Calibrator 位于 `src/core/Calibrator.ts`，规则通过 `_buildCJCRules` / `_buildNonCJCRules` / `_buildCommonRules` 构建：

```typescript
// 在 _buildCommonRules 中添加
{ condition: myCheck(ctx), factor: 0.85, reason: 'my new rule' }
```

### 4.3 添加新的图像处理操作

1. 在 `src/utils/image.ts` 中添加核心操作
2. 如果涉及内核操作，从 `image-kernel.ts` 导入 `forEachNeighbor` 和 `getSquareKernel`
3. 如果涉及形态学，添加到 `image-morph.ts`
4. 在 `usePreprocessor.ts` 中调用

### 4.4 添加新的 Tauri 命令

1. 在 `src-tauri/src/commands/` 下创建或编辑模块
2. 在 `src-tauri/src/commands/mod.rs` 中注册
3. 在 `src-tauri/src/lib.rs` 中注册到 `tauri::generate_handler!`
4. 前端通过 `invoke<ReturnType>('command_name', { args })` 调用

---

## 5. 测试

### 测试框架

项目使用 **Vitest**，配置位于 `vitest.config.ts`。

### 运行测试

```bash
pnpm test              # 运行全部 193 个测试
pnpm test:watch        # 监听模式
```

### 测试文件约定

- 测试文件与源码同目录，命名为 `*.test.ts`
- 示例：`src/core/Pipeline.test.ts` 测试 `src/core/Pipeline.ts`

### 编写测试

```typescript
import { describe, it, expect } from 'vitest'
import { Pipeline } from './Pipeline'

describe('Pipeline', () => {
  it('should filter jitter subtitles', () => {
    const pipeline = new Pipeline()
    const result = pipeline.process([
      { text: 'hi', startTime: 0, endTime: 0.1, confidence: 0.3, startFrame: 0, endFrame: 3 },
      { text: 'Hello world', startTime: 1, endTime: 3, confidence: 0.95, startFrame: 30, endFrame: 90 },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Hello world')
  })
})
```

### 测试覆盖目标

- 核心层 (`core/`): 100% 函数覆盖
- 工具层 (`utils/`): 100% 函数覆盖
- 组合层 (`composables/`): 关键路径覆盖

---

## 6. 代码规范

### TypeScript

- 使用 `vue-tsc --noEmit` 进行类型检查，目标 **零错误**
- 避免 `any` 类型，使用 `unknown` + 类型守卫
- 枚举导出使用 `export { MyEnum }`（非 `export type`）

### Vue 组件

- 使用 `<script setup lang="ts">` 语法
- Props 使用 `const props = defineProps<Props>()` 显式绑定（当 script 中需要访问时）
- SCSS 使用 `@use` 替代已废弃的 `@import`

### Rust

- 使用 `cargo clippy` 进行 lint 检查
- 错误处理使用 `thiserror` + `Result`，避免 `unwrap()`
- 异步 I/O 使用 `tokio::fs`，避免阻塞

### Git 提交

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增 xxx 功能
fix: 修复 xxx 问题
refactor: 重构 xxx 模块
docs: 更新 xxx 文档
test: 添加 xxx 测试
chore: 构建/依赖更新
```

---

## 7. 文档开发

文档使用 [VitePress](https://vitepress.dev/) 构建。

```bash
# 启动文档开发服务器
pnpm docs:dev

# 构建文档
pnpm docs:build
```

### 文档结构

```
docs/
├── .vitepress/
│   └── config.ts           # VitePress 配置
├── index.md                # 首页
├── architecture.md         # 架构文档
├── developer-guide.md      # 开发者指南（本文件）
├── guide/                  # 用户指南
│   ├── getting-started.md
│   ├── first-extraction.md
│   ├── roi.md
│   ├── ocr-engines.md
│   ├── export-formats.md
│   ├── keyboard-shortcuts.md
│   └── faq.md
└── api/                    # API 文档
    ├── pipeline.md
    ├── calibrator.md
    ├── scene-detect.md
    ├── exporter.md
    └── commands.md
```

---

## 8. 构建与发布

### 版本号管理

版本号在以下文件中同步更新：

| 文件 | 字段 |
|:-----|:-----|
| `package.json` | `version` |
| `src-tauri/Cargo.toml` | `version` |
| `src-tauri/tauri.conf.json` | `version` |

### 发布流程

```bash
# 1. 更新版本号
# 编辑 package.json, Cargo.toml, tauri.conf.json

# 2. 更新 CHANGELOG.md
# 添加新版本条目

# 3. 提交并打标签
git add -A
git commit -m "release: v4.1.0"
git tag v4.1.0
git push origin main --tags

# 4. GitHub Actions 自动构建并创建 Release
```

---

## 9. 常见问题

### Q: `pnpm tauri dev` 报错 "Rust toolchain not found"

安装 Rust：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Q: TypeScript 报 `Cannot find module` 错误

运行 `pnpm install` 确保依赖已安装。如果问题持续，删除 `node_modules` 重新安装。

### Q: 测试失败但代码逻辑正确

检查是否是测试文件引用了旧的 API。运行 `pnpm type-check` 查看类型错误。

### Q: 如何添加新的导出格式？

1. 在 `src-tauri/src/commands/export_fmt.rs` 添加格式化函数
2. 在 `src/types/subtitle.ts` 的 `ExportFormat` 联合类型中添加
3. 在 `src/stores/subtitle.ts` 的 `exportFormats` 中添加默认值
4. 添加单元测试

---

## 10. 贡献指南

详见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

**核心原则：**

1. 所有代码需通过 `pnpm lint` 和 `pnpm test`
2. 新增功能需附带单元测试
3. 提交前运行 `pnpm type-check` 确保零类型错误
4. 遵循 Conventional Commits 规范
5. PR 标题清晰描述变更内容
