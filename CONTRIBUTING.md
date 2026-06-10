# 贡献指南

感谢你对 CaptionFab 的关注！以下是参与贡献的方式。

---

## 报告问题

使用 [GitHub Issues](https://github.com/Agions/CaptionFab/issues/new) 报告 bug，请包含：

1. 操作系统和版本
2. CaptionFab 版本
3. 复现步骤
4. 期望行为 vs 实际行为
5. 截图或日志（如有）

---

## 提交代码

### 流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 分支命名

| 前缀 | 用途 | 示例 |
|:-----|:-----|:-----|
| `feature/` | 新功能 | `feature/batch-export` |
| `fix/` | Bug 修复 | `fix/ocr-crash-on-empty-frame` |
| `refactor/` | 重构 | `refactor/extract-image-utils` |
| `docs/` | 文档 | `docs/update-architecture` |

---

## 开发环境

```bash
# 前置依赖：Node.js 18+ · pnpm · Rust 1.82+ · FFmpeg
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab
pnpm install
pnpm tauri dev
```

---

## 代码规范

### 前端 (TypeScript + Vue)

- **类型检查**：`pnpm type-check`（vue-tsc --noEmit）零错误
- **Lint**：`pnpm lint` 零错误
- **测试**：`pnpm test` 全部通过（193 个）
- 使用 `<script setup lang="ts">` 语法
- 避免 `any` 类型
- Composable 使用 `use` 前缀

### 后端 (Rust)

- **Clippy**：`cargo clippy` 零警告
- **测试**：`cargo test` 全部通过
- 错误处理使用 `thiserror` + `Result`，避免 `unwrap()`
- 异步 I/O 使用 `tokio::fs`

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

```bash
pnpm test              # 运行全部测试
pnpm test:watch        # 监听模式
```

- 测试文件与源码同目录：`Pipeline.test.ts` 测试 `Pipeline.ts`
- 新增功能需附带单元测试
- 核心层和工具层要求 100% 函数覆盖

---

## 文档

文档使用 VitePress 构建：

```bash
pnpm docs:dev          # 本地预览
pnpm docs:build        # 构建
```

文档位于 `docs/` 目录，修改后请同步更新相关文档。

---

## Pull Request 要求

- [ ] 通过 `pnpm lint`
- [ ] 通过 `pnpm type-check`
- [ ] 通过 `pnpm test`
- [ ] 新增功能附带测试
- [ ] 更新相关文档
- [ ] PR 标题遵循 Conventional Commits

---

## 许可证

提交代码即表示你同意将代码以 [MIT License](./LICENSE) 开源。
