import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import path from 'path'

export default defineWorkersConfig({
  test: {
    globals: true,
    root: './src',
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/integration/d1-uat.test.ts', // Has its own config
    ],
    setupFiles: [
      './test-utils/setup-crypto.ts',
      './test-utils/vitest-setup.ts',
    ],
    // Coverage is currently disabled due to Cloudflare Workers environment limitations
    // Neither v8 nor c8 providers work properly with @cloudflare/vitest-pool-workers
    // The Workers runtime doesn't support node:inspector (required by v8) or the
    // necessary Node.js modules for coverage collection
    // TODO: Investigate alternative coverage strategies or integration test approach
    testTimeout: 10000,
    poolOptions: {
      workers: {
        singleWorker: true,
        wrangler: {
          configPath: './wrangler.toml',
          environment: 'local',
        },
        miniflare: {
          d1Persist: false,
          kvPersist: false,
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mirubato/shared/types': path.resolve(
        __dirname,
        '../shared/types/index.ts'
      ),
      '../../../shared/types': path.resolve(
        __dirname,
        '../shared/types/index.ts'
      ),
      '../../shared/types': path.resolve(__dirname, '../shared/types/index.ts'),
    },
  },
})
