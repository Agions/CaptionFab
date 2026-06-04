---
layout: home
title: CaptionFab — 智能视频字幕提取工具
titleTemplate: CaptionFab | 专业字幕提取
---

## Hero Section

```html
<div class="hero-section">
  <div class="hero-content">
    <h1 class="hero-title">
      <span class="hero-brand">Caption</span><span class="hero-accent">Fab</span>
    </h1>
    <p class="hero-subtitle">智能视频字幕提取工具</p>
    <p class="hero-tagline">从视频中精准提取硬编码字幕，输出 9 种专业格式</p>
    <div class="hero-actions">
      <a href="/guide/getting-started" class="btn btn-primary">
        <span>快速开始</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
      <a href="/architecture" class="btn btn-secondary">查看架构</a>
      <a href="https://github.com/Agions/CaptionFab" class="btn btn-outline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  </div>
  <div class="hero-visual">
    <img src="/logo.svg" alt="CaptionFab Logo" class="hero-logo"/>
  </div>
</div>
```

---

## Features Grid

### 🎯 多引擎 OCR

PaddleOCR · EasyOCR · Tesseract.js — 80+ 语言支持，GPU 加速，智能引擎切换

### ⚡ 五阶段后处理

标准化 → 去噪 → 合并 → 相似度融合 → 时间校准，流水线式字幕清洗

### 📦 9 种导出格式

SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV — 覆盖所有主流场景

### 🎬 智能场景检测

直方图 + 卡方检验，自动跳过无字幕帧，减少 60% 无效 OCR 计算

### 🔧 纯 Rust 后端

Tokio 异步 I/O，所有 I/O 操作非阻塞，零外部运行时依赖，内存安全

### 🛡️ 置信度校准

混语 · 短文本 · 重复字符自动降权，可视化质量信号，结果更可靠

---

## Stats

| 指标 | 数值 |
|:-----|:-----|
| 📦 支持格式 | 9 种 |
| 🌍 语言支持 | 80+ |
| ✅ 单元测试 | 193 个 |
| ⚡ 启动时间 | < 1s |
| 💾 内存占用 | ~150MB |

---

## Quick Links

| 文档 | 说明 |
|:-----|:-----|
| [📖 用户指南](/guide/getting-started) | 快速上手、功能详解、常见问题 |
| [🏗️ 架构文档](/architecture) | 系统架构、数据流、接口定义 |
| [👨‍💻 开发者指南](/developer-guide) | 环境搭建、调试、贡献代码 |
| [📝 CHANGELOG](https://github.com/Agions/CaptionFab/blob/main/CHANGELOG.md) | 版本变更记录 |

---

<style>
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rem 2rem;
  gap: 3rem;
}

.hero-content {
  flex: 1;
  max-width: 600px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.hero-brand {
  color: #1E40AF;
}

.hero-accent {
  color: #0EA5E9;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #64748B;
  margin: 0 0 1rem 0;
  font-weight: 500;
}

.hero-tagline {
  font-size: 1.125rem;
  color: #94A3B8;
  margin: 0 0 2rem 0;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #1E40AF, #0EA5E9);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
}

.btn-secondary {
  background: #F1F5F9;
  color: #1E293B;
}

.btn-secondary:hover {
  background: #E2E8F0;
}

.btn-outline {
  border: 2px solid #CBD5E1;
  color: #475569;
}

.btn-outline:hover {
  border-color: #0EA5E9;
  color: #0EA5E9;
}

.hero-visual {
  flex-shrink: 0;
}

.hero-logo {
  width: 200px;
  height: 200px;
  border-radius: 2rem;
  box-shadow: 0 20px 40px rgba(30, 64, 175, 0.15);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.feature-card {
  background: #F8FAFC;
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid #E2E8F0;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.feature-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1E293B;
  margin: 0 0 0.5rem 0;
}

.feature-desc {
  font-size: 0.875rem;
  color: #64748B;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    justify-content: center;
  }
}
</style>
