import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/styles/_variables.scss"; @import "@/assets/styles/_mixins.scss"; @import "@/assets/styles/_modal.scss";`,
        silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'legacy-js-api']
      }
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    // 优化：构建缓存加速增量编译
    cacheDir: '.vite-cache',
    // 优化：智能分包策略，减少初始加载体积
    rollupOptions: {
      output: {
        // 固定 assetFileNames，改善长期缓存命中率
        assetFileNames: (assetInfo) => {
          const name = typeof assetInfo.name === 'string' ? assetInfo.name : ''
          const ext = name.split('.').pop() || ''
          if (ext === 'css') return 'assets/[name]-[hash][extname]'
          if (ext === 'woff' || ext === 'woff2') return 'assets/fonts/[name]-[hash][extname]'
          if (ext === 'png' || ext === 'jpg' || ext === 'svg' || ext === 'gif') return 'assets/images/[name]-[hash][extname]'
          return 'assets/[name]-[hash][extname]'
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // OCR 引擎：WASM 体积大，独立 chunk 支持按需加载
            if (id.includes('tesseract.js')) return 'vendor-ocr'
            // Vue 生态：稳定依赖，缓存友好
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-demi')) return 'vendor-vue'
            // VueUse：工具函数库，tree-shaking 友好
            if (id.includes('@vueuse')) return 'vendor-vueuse'
          }
        }
      }
    },
    // 优化：禁用 modulePreload polyfill，减少额外 JS 体积
    modulePreload: {
      polyfill: false
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    // 优化：压缩标识符减小产物体积
    minifyIdentifiers: true
  },
  optimizeDeps: {
    // 优化：预构建稳定依赖加速冷启动
    // 注意：tesseract.js 含 WASM 不参与预构建，仅用 include 加速首次加载
    include: ['vue', 'pinia'],
    // 优化：排除 WASM 重型依赖，避免预构建阻塞
    exclude: ['tesseract.js']
  }
})
