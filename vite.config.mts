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
        additionalData: `@import "@/assets/styles/_variables.scss"; @import "@/assets/styles/_mixins.scss";`,
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
    // Performance: enable build caching for faster rebuilds
    cacheDir: '.vite-cache',
    // Performance: rollup options for better code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // OCR engine: heavy WASM, lazy-load friendly
            if (id.includes('tesseract.js')) return 'vendor-ocr'
            // Vue ecosystem: stable, rarely changes
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-demi')) return 'vendor-vue'
            // VueUse: utility functions, tree-shakeable
            if (id.includes('@vueuse')) return 'vendor-vueuse'
          }
        }
      }
    },
    // Performance: reduce initial JS payload
    modulePreload: {
      polyfill: false
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    // Performance: minify identifiers in production
    minifyIdentifiers: true
  },
  optimizeDeps: {
    include: ['vue', 'pinia', '@vueuse/core', 'tesseract.js'],
    // Performance: exclude heavy WASM libs from pre-bundling
    exclude: ['tesseract.js']
  }
})
