import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CaptionFab',
  description: '智能硬编码字幕提取工具 — 从视频中精准提取字幕',
  lang: 'zh-CN',
  base: '/',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '架构', link: '/architecture' },
      { text: '开发者', link: '/developer-guide' },
      { text: 'API', link: '/api/pipeline' },
      { text: '更新日志', link: '/changelog' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '用户指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '使用流程', link: '/guide/workflow' },
            { text: '导出格式', link: '/guide/export-formats' },
            { text: 'OCR 引擎', link: '/guide/ocr-engines' },
            { text: 'ROI 配置', link: '/guide/roi' },
            { text: '键盘快捷键', link: '/guide/shortcuts' },
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Pipeline', link: '/api/pipeline' },
            { text: 'SceneDetect', link: '/api/scene-detect' },
            { text: 'Calibrator', link: '/api/calibrator' },
            { text: 'Exporter', link: '/api/exporter' },
            { text: 'Commands', link: '/api/commands' },
          ],
        },
      ],
      '/': [
        { text: '指南', link: '/guide/getting-started' },
        { text: '架构', link: '/architecture' },
        { text: '开发者', link: '/developer-guide' },
        { text: 'API', link: '/api/pipeline' },
        { text: '更新日志', link: '/changelog' },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/CaptionFab' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Agions',
    },

    editLink: {
      pattern: 'https://github.com/Agions/CaptionFab/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    lineNumbers: true,
  },
})
