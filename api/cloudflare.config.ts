import { bindings, defineConfig } from 'cf/config'

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

const GOOGLE_CLIENT_ID =
  '588179480764-kqduhkmbjh34po7kgfond5anarg1b4vm.apps.googleusercontent.com'

const base = {
  compatibilityDate: '2024-01-01',
  compatibilityFlags: ['nodejs_compat'],
  entrypoint: 'src/index.ts',
}

const RATE_LIMITER = bindings.rateLimit({
  namespace: '1234',
  simple: { limit: 10, period: 60 },
})

export default defineConfig(({ mode }) => {
  switch (mode ?? 'development') {
    case 'development':
      return {
        worker: {
          ...base,
          name: 'mirubato-api-local',
          observability: { logs: { enabled: false } },
          env: {
            ENVIRONMENT: bindings.text('local'),
            JWT_SECRET: bindings.text('local-jwt-secret-for-development-only'),
            MAGIC_LINK_SECRET: bindings.text(
              'local-magic-link-secret-for-development-only'
            ),
            GOOGLE_CLIENT_ID: bindings.text(GOOGLE_CLIENT_ID),
            API_URL: bindings.text('http://api-mirubato.localhost:9797'),
            FRONTEND_URL: bindings.text('http://www-mirubato.localhost:4000'),
            SCORES_URL: bindings.text('http://scores-mirubato.localhost:9788'),
            DICTIONARY_URL: bindings.text(
              'http://dictionary-mirubato.localhost:9799'
            ),
            DB: bindings.d1({ name: 'mirubato-dev', id: 'local-db' }),
            MUSIC_CATALOG: bindings.kv({ id: 'music-catalog-local' }),
            RATE_LIMITER,
          },
        },
      }
    case 'staging':
      return {
        worker: {
          ...base,
          name: 'mirubato-api-staging',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['api-staging.mirubato.com'],
          env: {
            ENVIRONMENT: bindings.text('staging'),
            GOOGLE_CLIENT_ID: bindings.text(GOOGLE_CLIENT_ID),
            API_URL: bindings.text('https://api-staging.mirubato.com'),
            FRONTEND_URL: bindings.text('https://staging.mirubato.com'),
            SCORES_URL: bindings.text('https://scores-staging.mirubato.com'),
            DICTIONARY_URL: bindings.text(
              'https://dictionary-staging.mirubato.com'
            ),
            DB: bindings.d1({
              name: 'mirubato-dev',
              id: '4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e',
            }),
            MUSIC_CATALOG: bindings.kv({
              id: 'b5c8ff95b5ab4ac7a1a632e6b1465f7d',
            }),
            RATE_LIMITER,
          },
        },
      }
    case 'prod':
      return {
        worker: {
          ...base,
          name: 'mirubato-api',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['api.mirubato.com'],
          env: {
            ENVIRONMENT: bindings.text('production'),
            GOOGLE_CLIENT_ID: bindings.text(GOOGLE_CLIENT_ID),
            API_URL: bindings.text('https://api.mirubato.com'),
            FRONTEND_URL: bindings.text('https://mirubato.com'),
            SCORES_URL: bindings.text('https://scores.mirubato.com'),
            DICTIONARY_URL: bindings.text('https://dictionary.mirubato.com'),
            DB: bindings.d1({
              name: 'mirubato-prod',
              id: '31ecc854-aecf-4994-8bda-7a9cd3055122',
            }),
            MUSIC_CATALOG: bindings.kv({
              id: 'b04ae504f7884fc180d27c9320b378f6',
            }),
            RATE_LIMITER,
          },
        },
      }
    default:
      throw new Error(
        `Unknown cf mode "${mode}". Use --mode development, staging or prod.`
      )
  }
})
