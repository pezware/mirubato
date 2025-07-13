import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    environment: 'node',
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
          environment: 'local',
        },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*', '**/mockData.ts', 'dist/'],
    },
  },
})
