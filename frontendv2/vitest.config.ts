import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    exclude: ['node_modules/**', 'tests/e2e/**', '**/*.e2e.test.ts'],

    // Use forks pool for better stability with complex module graphs
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4, // Allow parallel test execution
        minForks: 1,
      },
    },

    // Reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
