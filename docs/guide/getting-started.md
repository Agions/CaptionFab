# 快速开始

欢迎使用 CaptionFab！本文档将帮助你快速搭建开发环境并运行项目。

---

## 环境要求

| 依赖 | 版本要求 | 说明 |
|:-----|:---------|:-----|
| Node.js | 18+ | 前端运行环境 |
| pnpm | 9+ | 包管理器 |
| Rust | 1.82+ | 后端编译环境 |
| FFmpeg | 6+ | 视频元数据提取 |

---

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/Agions/CaptionFab.git
cd CaptionFab
```

### 2. 安装前端依赖

```bash
pnpm install
```

### 3. 安装 Rust 依赖

```bash
cd src-tauri
cargo fetch
cd ..
```

### 4. 运行开发环境

```bash
pnpm tauri dev
```

开发模式下，前端会启动热重载服务器，Rust 后端会重新编译并自动重启。

---

## 项目验证

### 前端质量门禁

```bash
# 类型检查
pnpm type-check

# 代码规范
pnpm lint

# 单元测试
pnpm test
```

### 后端编译检查

```bash
cd src-tauri
cargo check
cargo test
```

### 生产构建

```bash
pnpm tauri build
```

构建产物位于：
- Windows: `src-tauri/target/release/bundle/msi/*.exe`
- macOS: `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux: `src-tauri/target/release/bundle/deb/*.deb`

---

## 目录结构

```
CaptionFab/
├── src/                        # 前端源码
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
├── src-tauri/                  # Rust 后端
│   └── src/commands/           # Tauri 命令模块
└── package.json
```

---

## 常见问题

**Q: 开发环境启动失败，提示 `FFmpeg not found`**

A: 请确保 FFmpeg 已安装并加入 PATH。在终端运行 `ffmpeg -version` 验证。

**Q: Rust 编译报错 `linker link.exe not found`**

A: Windows 用户请安装 Visual Studio Build Tools，或使用 `rustup default stable-msvc`。

**Q: `pnpm install` 速度慢**

A: 建议配置 pnpm 镜像源：
```bash
pnpm config set registry https://registry.npmmirror.com
```

---

## 下一步

- 阅读 [用户指南](/guide/workflow) 了解使用流程
- 查看 [架构文档](/architecture) 了解系统设计
- 阅读 [开发者指南](/developer-guide) 了解如何贡献代码
