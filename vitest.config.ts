import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
    // 优化：启用测试覆盖率报告（需安装 @vitest/coverage-v8）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/test-setup.ts',
        'src/types/**',
        'src/assets/**',
        'src/components/**',
        'src/composables/**',
        'src/stores/**',
      ],
      // 优化：覆盖率阈值仅针对核心逻辑（src/core + src/utils），
      // Vue 组件、composables、stores 因架构原因难以单元测试，不纳入阈值。
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
