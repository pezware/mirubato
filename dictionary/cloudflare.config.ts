import { bindings, defineConfig, triggers } from 'cf/config'

/**
 * cf CLI configuration. Mirrors wrangler.toml, which stays in place (and is
 * what Workers Builds deploys) until cf has been validated on staging.
 *
 * `--mode` maps to the wrangler environments:
 *   development → [env.local]  (Vite's default mode for `cf dev`; Vite
 *                               reserves `local` as a mode name)
 *   staging     → [env.staging]
 *   prod        → [env.production]
 * Any other mode throws, so a bare `cf deploy` (Vite mode `production`)
 * can never ship to production by accident.
 */

const base = {
  compatibilityDate: '2024-12-01',
  compatibilityFlags: ['nodejs_compat'],
  entrypoint: 'src/index.ts',
}

export default defineConfig(({ mode }) => {
  switch (mode ?? 'development') {
    case 'development':
      return {
        worker: {
          ...base,
          name: 'mirubato-dictionary-local',
          observability: { logs: { enabled: false } },
          env: {
            QUALITY_THRESHOLD: bindings.text('50'),
            CACHE_TTL: bindings.text('300'),
            ENVIRONMENT: bindings.text('local'),
            JWT_SECRET: bindings.text('local-jwt-secret-for-development-only'),
            FRONTEND_URL: bindings.text('http://www-mirubato.localhost:4000'),
            API_SERVICE_URL: bindings.text(
              'http://api-mirubato.localhost:9797'
            ),
            DICTIONARY_URL: bindings.text(
              'http://dictionary-mirubato.localhost:9799'
            ),
            CORS_ORIGIN: bindings.text(
              'http://www-mirubato.localhost:4000,http://localhost:4000,http://localhost:3000'
            ),
            SEED_ENABLED: bindings.text('false'),
            SEED_DAILY_LIMIT: bindings.text('5'),
            SEED_PRIORITY_THRESHOLD: bindings.text('10'),
            SEED_BATCH_SIZE: bindings.text('1'),
            QUALITY_MIN_THRESHOLD: bindings.text('90'),
            AI: bindings.ai(),
            DB: bindings.d1({ name: 'mirubato-dictionary-local', id: 'local' }),
            STORAGE: bindings.r2({ name: 'mirubato-dictionary-local' }),
            CACHE: bindings.kv({ id: 'local' }),
          },
        },
      }
    case 'staging':
      return {
        worker: {
          ...base,
          name: 'mirubato-dictionary-staging',
          observability: { logs: { enabled: true } },
          domains: ['dictionary-staging.mirubato.com'],
          triggers: [
            // Seed processing at noon UTC; daily cleanup at midnight
            triggers.scheduled({ schedule: '0 12 * * *' }),
            triggers.scheduled({ schedule: '0 0 * * *' }),
          ],
          env: {
            QUALITY_THRESHOLD: bindings.text('70'),
            CACHE_TTL: bindings.text('7200'),
            ENVIRONMENT: bindings.text('staging'),
            API_SERVICE_URL: bindings.text('https://api-staging.mirubato.com'),
            FRONTEND_URL: bindings.text('https://staging.mirubato.com'),
            CORS_ORIGIN: bindings.text(
              'https://staging.mirubato.com,https://www-staging.mirubato.com'
            ),
            SEED_ENABLED: bindings.text('true'),
            SEED_DAILY_LIMIT: bindings.text('10'),
            SEED_PRIORITY_THRESHOLD: bindings.text('10'),
            SEED_BATCH_SIZE: bindings.text('2'),
            QUALITY_MIN_THRESHOLD: bindings.text('90'),
            AI: bindings.ai(),
            DB: bindings.d1({
              name: 'mirubato-dictionary-staging',
              id: '2378ddbf-1950-47af-8911-5923474085a4',
            }),
            STORAGE: bindings.r2({ name: 'mirubato-dictionary-staging' }),
            CACHE: bindings.kv({ id: 'e9c7178482e344dab8248969bb1f58e1' }),
          },
        },
      }
    case 'prod':
      return {
        worker: {
          ...base,
          name: 'mirubato-dictionary',
          observability: { logs: { enabled: true } },
          domains: ['dictionary.mirubato.com'],
          triggers: [
            // Seed processing at 2,8,14,20 UTC; daily cleanup at midnight
            triggers.scheduled({ schedule: '0 2,8,14,20 * * *' }),
            triggers.scheduled({ schedule: '0 0 * * *' }),
          ],
          env: {
            QUALITY_THRESHOLD: bindings.text('80'),
            CACHE_TTL: bindings.text('86400'),
            ENVIRONMENT: bindings.text('production'),
            API_SERVICE_URL: bindings.text('https://api.mirubato.com'),
            FRONTEND_URL: bindings.text('https://mirubato.com'),
            CORS_ORIGIN: bindings.text(
              'https://mirubato.com,https://www.mirubato.com'
            ),
            SEED_ENABLED: bindings.text('true'),
            SEED_DAILY_TOKEN_BUDGET: bindings.text('5000'),
            SEED_PRIORITY_THRESHOLD: bindings.text('8'),
            SEED_BATCH_SIZE: bindings.text('5'),
            QUALITY_MIN_THRESHOLD: bindings.text('85'),
            AI: bindings.ai(),
            DB: bindings.d1({
              name: 'mirubato-dictionary-production',
              id: '1cc0df2f-aac5-41a9-b6d5-405f7d40b740',
            }),
            STORAGE: bindings.r2({ name: 'mirubato-dictionary-production' }),
            CACHE: bindings.kv({ id: '598693e0de544dd9858a724ecbc556ba' }),
          },
        },
      }
    default:
      throw new Error(
        `Unknown cf mode "${mode}". Use --mode development, staging or prod.`
      )
  }
})
