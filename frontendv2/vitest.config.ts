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

    // Use forks pool with reduced parallelism for memory efficiency
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2, // Reduced from 4 to prevent memory exhaustion
        minForks: 1,
        // Enable isolation to prevent state leakage between tests
        isolate: true,
      },
    },

    // Memory optimization settings
    isolate: true, // Run each test file in isolation
    clearMocks: true, // Clear mock call history between tests
    restoreMocks: true, // Restore original implementations
    unstubEnvs: true, // Restore environment variables
    unstubGlobals: true, // Restore global stubs

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
