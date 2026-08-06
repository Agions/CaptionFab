# 快速开始

欢迎使用 Distill！本文档将帮助你快速搭建开发环境并运行项目。

---

## 环境要求

| 依赖 | 版本要求 | 说明 |
|:-----|:---------|:-----|
| Node.js | 18+ | 前端运行环境 |
| npm / pnpm | 9+ | 包管理器 |
| Rust | 1.82+ | 后端编译环境 |
| FFmpeg | 6+ | 视频元数据提取 |

---

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/Agions/Distill.git
cd Distill
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 运行开发环境

```bash
npm run dev
```

---

## 项目验证

### 前端质量门禁

```bash
# 类型检查
npm run type-check

# 代码规范
npm run lint

# 单元测试
npx vitest run
```

---

## 目录结构

```
Distill/
├── src/                        # 前端源码
│   ├── core/                   # 核心业务逻辑 (Pipeline, ROI)
│   ├── services/               # OCR 引擎架构 (Local & Cloud)
│   ├── stores/                 # Pinia 状态管理
│   ├── components/             # Vue 组件 (Video, Subtitle, Layout)
│   └── utils/                  # 工具函数 (Exporter, Timecode)
├── src-tauri/                  # Rust 后端
└── package.json
```

---

## 下一步

- 阅读 [用户指南](/guide/workflow) 了解使用流程
- 查看 [架构文档](/architecture) 了解系统设计
- 阅读 [开发者指南](/developer-guide) 了解如何贡献代码
