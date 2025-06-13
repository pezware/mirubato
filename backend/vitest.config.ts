import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // D1 databases will be created and persisted in memory during tests
          d1Persist: false,
        },
      },
    },
  },
})
