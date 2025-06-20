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
    // Disable coverage for now due to Cloudflare Workers environment limitations
    // The v8 provider requires node:inspector which is not available in Workers
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'json', 'html'],
    //   include: ['src/**/*.ts'],
    //   exclude: [
    //     '**/*.d.ts',
    //     '**/*.test.ts',
    //     '**/*.spec.ts',
    //     '**/test-utils/**',
    //     '**/__tests__/**',
    //     '**/__mocks__/**',
    //     '**/node_modules/**',
    //     '**/dist/**',
    //     '**/src/types/**',
    //   ],
    //   thresholds: {
    //     branches: 80,
    //     functions: 80,
    //     lines: 80,
    //     statements: 80,
    //   },
    // },
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
