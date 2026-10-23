import { bindings, defineConfig } from 'cf/config'

/**
 * cf CLI configuration. Mirrors wrangler.toml, which stays in place (and is
 * what Workers Builds deploys) until cf has been validated on staging.
 *
 * `--mode` maps to the wrangler environments:
 *   development → [env.local]  (Vite's default mode for `cf dev`; Vite
 *                               reserves `local` as a mode name)
 *   dev         → [env.dev]
 *   staging     → [env.staging]
 *   prod        → [env.production]
 * Any other mode throws, so a bare `cf deploy` (Vite mode `production`)
 * can never ship to production by accident.
 *
 * Static assets come from the Vite client build (see vite.config.ts), so
 * there is no assets directory to configure here.
 */

const base = {
  compatibilityDate: '2025-01-01',
  entrypoint: 'src/index.js',
}

export default defineConfig(({ mode }) => {
  switch (mode ?? 'development') {
    case 'development':
      return {
        worker: {
          ...base,
          name: 'mirubato-frontendv2-local',
          workersDev: true,
          observability: { logs: { enabled: false } },
          env: {
            API_URL: bindings.text('http://api-mirubato.localhost:9797'),
            SCORES_URL: bindings.text('http://scores-mirubato.localhost:9788'),
            DICTIONARY_URL: bindings.text(
              'http://dictionary-mirubato.localhost:9799'
            ),
            ASSETS: bindings.assets(),
          },
        },
      }
    case 'dev':
      return {
        worker: {
          ...base,
          name: 'mirubato-frontendv2-dev',
          workersDev: true,
          observability: { logs: { enabled: true } },
          // wrangler's [env.dev] inherits the production custom domains from
          // the top-level routes; this worker is served from workers.dev only.
          env: {
            API_URL: bindings.text('http://localhost:8787'),
            DICTIONARY_URL: bindings.text('http://localhost:9799'),
            ASSETS: bindings.assets(),
          },
        },
      }
    case 'staging':
      return {
        worker: {
          ...base,
          name: 'mirubato-frontendv2-staging',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['staging.mirubato.com'],
          env: {
            API_URL: bindings.text('https://api-staging.mirubato.com'),
            SCORES_URL: bindings.text('https://scores-staging.mirubato.com'),
            DICTIONARY_URL: bindings.text(
              'https://dictionary-staging.mirubato.com'
            ),
            ASSETS: bindings.assets(),
          },
        },
      }
    case 'prod':
      return {
        worker: {
          ...base,
          name: 'mirubato-frontendv2',
          workersDev: false,
          observability: { logs: { enabled: true } },
          domains: ['mirubato.com', 'www.mirubato.com'],
          env: {
            API_URL: bindings.text('https://api.mirubato.com'),
            SCORES_URL: bindings.text('https://scores.mirubato.com'),
            DICTIONARY_URL: bindings.text('https://dictionary.mirubato.com'),
            ASSETS: bindings.assets(),
          },
        },
      }
    default:
      throw new Error(
        `Unknown cf mode "${mode}". Use --mode development, dev, staging or prod.`
      )
  }
})
