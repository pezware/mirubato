import { bindings, defineConfig, triggers } from 'cf/config'

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
 */

const base = {
  compatibilityDate: '2024-12-01',
  compatibilityFlags: ['nodejs_compat'],
  entrypoint: 'src/index.ts',
}

const pdfQueueConsumer = (queue: string) =>
  triggers.queue({
    name: queue,
    maxBatchSize: 10,
    maxBatchTimeout: 30,
    maxRetries: 3,
    deadLetterQueue: `${queue}-dlq`,
  })

export default defineConfig(({ mode }) => {
  switch (mode ?? 'development') {
    case 'development':
      return {
        worker: {
          ...base,
          name: 'mirubato-scores-local',
          observability: { logs: { enabled: false } },
          env: {
            ENVIRONMENT: bindings.text('local'),
            JWT_SECRET: bindings.text('local-jwt-secret-for-development-only'),
            FRONTEND_URL: bindings.text('http://www-mirubato.localhost:4000'),
            API_SERVICE_URL: bindings.text(
              'http://api-mirubato.localhost:9797'
            ),
            SCORES_URL: bindings.text('http://scores-mirubato.localhost:9788'),
            DICTIONARY_URL: bindings.text(
              'http://dictionary-mirubato.localhost:9799'
            ),
            BROWSER: bindings.browser(),
            AI: bindings.ai(),
            DB: bindings.d1({ name: 'mirubato-scores-local', id: 'local' }),
            SCORES_BUCKET: bindings.r2({ name: 'mirubato-scores-local' }),
            CACHE: bindings.kv({ id: 'local' }),
          },
        },
      }
    case 'dev':
      return {
        worker: {
          ...base,
          name: 'mirubato-scores-dev',
          observability: { logs: { enabled: true } },
          triggers: [
            triggers.fetch({
              pattern: 'scores-dev.pezware.workers.dev',
              zone: 'pezware.workers.dev',
            }),
            pdfQueueConsumer('pdf-processing-dev'),
          ],
          env: {
            ENVIRONMENT: bindings.text('development'),
            API_SERVICE_URL: bindings.text('https://api-staging.mirubato.com'),
            DICTIONARY_URL: bindings.text(
              'https://dictionary-staging.mirubato.com'
            ),
            BROWSER: bindings.browser(),
            AI: bindings.ai(),
            DB: bindings.d1({
              name: 'mirubato-scores-dev',
              id: 'bcb9546e-c5ef-43f7-a462-3472fa3fae89',
            }),
            SCORES_BUCKET: bindings.r2({ name: 'mirubato-scores-dev' }),
            CACHE: bindings.kv({ id: '395e4bee05ed4e68b15f35ba7b3ba832' }),
            PDF_QUEUE: bindings.queue({ name: 'pdf-processing-dev' }),
          },
        },
      }
    case 'staging':
      return {
        worker: {
          ...base,
          name: 'mirubato-scores-staging',
          observability: { logs: { enabled: true } },
          domains: ['scores-staging.mirubato.com'],
          triggers: [pdfQueueConsumer('pdf-processing-staging')],
          env: {
            ENVIRONMENT: bindings.text('staging'),
            API_SERVICE_URL: bindings.text('https://api-staging.mirubato.com'),
            FRONTEND_URL: bindings.text('https://staging.mirubato.com'),
            DICTIONARY_URL: bindings.text(
              'https://dictionary-staging.mirubato.com'
            ),
            BROWSER: bindings.browser(),
            AI: bindings.ai(),
            DB: bindings.d1({
              name: 'mirubato-scores-staging',
              id: 'eb2baa9e-c67f-45e1-bf79-cd2cf781e92e',
            }),
            SCORES_BUCKET: bindings.r2({ name: 'mirubato-scores-staging' }),
            CACHE: bindings.kv({ id: 'ecf57add945f48e2ad0ecaf2ca91ec95' }),
            PDF_QUEUE: bindings.queue({ name: 'pdf-processing-staging' }),
          },
        },
      }
    case 'prod':
      return {
        worker: {
          ...base,
          name: 'mirubato-scores',
          observability: { logs: { enabled: true } },
          domains: ['scores.mirubato.com'],
          // [env.production] in wrangler.toml declares no queue consumer
          // (wrangler doesn't inherit the top-level one), so neither does
          // this mode. Confirm before the first `--mode prod` deploy.
          env: {
            ENVIRONMENT: bindings.text('production'),
            API_SERVICE_URL: bindings.text('https://api.mirubato.com'),
            FRONTEND_URL: bindings.text('https://mirubato.com'),
            DICTIONARY_URL: bindings.text('https://dictionary.mirubato.com'),
            BROWSER: bindings.browser(),
            AI: bindings.ai(),
            DB: bindings.d1({
              name: 'mirubato-scores-production',
              id: 'aac4662e-d14a-4397-971c-c544d8c79104',
            }),
            SCORES_BUCKET: bindings.r2({ name: 'mirubato-scores-production' }),
            CACHE: bindings.kv({ id: '1f30ff61b4a04dc4a9a269ad6f828fe4' }),
            PDF_QUEUE: bindings.queue({ name: 'pdf-processing' }),
          },
        },
      }
    default:
      throw new Error(
        `Unknown cf mode "${mode}". Use --mode development, dev, staging or prod.`
      )
  }
})
