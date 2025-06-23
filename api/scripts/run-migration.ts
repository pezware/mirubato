/**
 * Wrangler-compatible migration runner
 * This script runs the backend-to-sync migration using Wrangler's D1 connection
 *
 * Usage:
 *   wrangler d1 execute mirubato-prod --local --file=./scripts/run-migration.sql
 *   OR
 *   npm run migrate:sync
 */

import type { Env } from '../src/index'

export interface MigrationEnv extends Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: MigrationEnv): Promise<Response> {
    const url = new URL(request.url)

    // Parse query parameters
    const dryRun = url.searchParams.get('dryRun') === 'true'
    const batchSize = parseInt(url.searchParams.get('batchSize') || '1000')
    const userFilter = url.searchParams.get('user') || undefined
    const entityType = url.searchParams.get('entity') || undefined

    try {
      const { BackendToSyncDataMigration } = await import(
        './migrate-backend-to-sync-data'
      )

      const migration = new BackendToSyncDataMigration(env.DB, {
        dryRun,
        batchSize,
        userFilter,
        entityTypes: entityType ? [entityType as any] : undefined,
        environment: 'production',
      })

      await migration.run()

      return new Response('Migration completed successfully', { status: 200 })
    } catch (error) {
      console.error('Migration failed:', error)
      return new Response(`Migration failed: ${error.message}`, { status: 500 })
    }
  },
}
