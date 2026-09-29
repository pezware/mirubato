import { bindings, defineConfig, exports } from 'cf/config'

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
  compatibilityDate: '2025-08-21',
  compatibilityFlags: ['nodejs_compat'],
  entrypoint: 'src/index.ts',
  // SyncCoordinator was created by wrangler migration `v1` with
  // `new_classes`, i.e. the key-value storage backend. It must stay
  // `legacy-kv`: an existing namespace can't be switched to SQLite, and
  // declaring it as such would fail the deploy or orphan its state.
  exports: {
    SyncCoordinator: exports.durableObject({ storage: 'legacy-kv' }),
  },
}

const syncCoordinator = (workerName: string) =>
  bindings.durableObject({ worker: workerName, exportName: 'SyncCoordinator' })

const rateLimiter = (limit: number) =>
  bindings.rateLimit({ namespace: '1234', simple: { limit, period: 60 } })

export default defineConfig(({ mode }) => {
  switch (mode ?? 'development') {
    case 'development':
      return {
        accountId: '1362434665780520e89f9f06b1057d24',
        worker: {
          ...base,
          name: 'mirubato-sync-worker-local',
          observability: { logs: { enabled: false } },
          env: {
            ENVIRONMENT: bindings.text('local'),
            API_URL: bindings.text('http://api-mirubato.localhost:9797'),
            FRONTEND_URL: bindings.text('http://www-mirubato.localhost:4000'),
            JWT_SECRET: bindings.text('local-jwt-secret-for-development-only'),
            DB: bindings.d1({ name: 'mirubato-dev', id: 'local-db' }),
            SYNC_COORDINATOR: syncCoordinator('mirubato-sync-worker-local'),
            RATE_LIMITER: rateLimiter(1000),
          },
        },
      }
    case 'staging':
      return {
        accountId: '1362434665780520e89f9f06b1057d24',
        worker: {
          ...base,
          name: 'mirubato-sync-worker-staging',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['sync-staging.mirubato.com'],
          env: {
            ENVIRONMENT: bindings.text('staging'),
            API_URL: bindings.text('https://api-staging.mirubato.com'),
            FRONTEND_URL: bindings.text('https://staging.mirubato.com'),
            DB: bindings.d1({
              name: 'mirubato-dev',
              id: '4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e',
            }),
            SYNC_COORDINATOR: syncCoordinator('mirubato-sync-worker-staging'),
            RATE_LIMITER: rateLimiter(100),
          },
        },
      }
    case 'prod':
      return {
        accountId: '1362434665780520e89f9f06b1057d24',
        worker: {
          ...base,
          name: 'mirubato-sync-worker',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['sync.mirubato.com'],
          env: {
            ENVIRONMENT: bindings.text('production'),
            API_URL: bindings.text('https://api.mirubato.com'),
            FRONTEND_URL: bindings.text('https://mirubato.com'),
            DB: bindings.d1({
              name: 'mirubato-prod',
              id: '31ecc854-aecf-4994-8bda-7a9cd3055122',
            }),
            SYNC_COORDINATOR: syncCoordinator('mirubato-sync-worker'),
            RATE_LIMITER: rateLimiter(100),
          },
        },
      }
    default:
      throw new Error(
        `Unknown cf mode "${mode}". Use --mode development, staging or prod.`
      )
  }
})
