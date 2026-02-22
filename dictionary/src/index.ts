/**
 * Music Dictionary Service - Worker Entry Point
 */

import { app } from './app'
import type { Env } from './types/env'

/**
 * Cloudflare Worker entry point
 */
export default {
  /**
   * Main fetch handler
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  /**
   * Scheduled handler for periodic tasks
   * Configure cron triggers in wrangler.toml to enable
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      // Handle seed processing schedules (both prod and staging)
      if (event.cron === '0 2,8,14,20 * * *' || event.cron === '0 12 * * *') {
        console.warn(
          `[Scheduled] Seed processing started for cron: ${event.cron}`
        )

        // Import dynamically to avoid loading in non-scheduled contexts
        const { SeedProcessor } = await import('./services/seed-processor')
        const { ErrorRecoveryService } = await import(
          './services/error-recovery'
        )

        const processor = new SeedProcessor(env)
        const recovery = new ErrorRecoveryService(env)

        // First, attempt to recover failed items
        ctx.waitUntil(
          recovery
            .recoverFailedItems(20) // Recover up to 20 failed items
            .then(recoveryResult => {
              console.warn(
                `[Scheduled] Recovery completed: ${recoveryResult.retry_scheduled} scheduled for retry, ${recoveryResult.moved_to_dlq} moved to DLQ`
              )
            })
            .catch(error => {
              console.error('[Scheduled] Error recovery failed:', error)
            })
        )

        // Then run normal processing
        ctx.waitUntil(
          processor
            .processSeedQueue()
            .then(result => {
              const avgQuality =
                result.quality_scores.length > 0
                  ? Math.round(
                      result.quality_scores.reduce((a, b) => a + b, 0) /
                        result.quality_scores.length
                    )
                  : 0

              console.warn(
                `[Scheduled] Seed processing completed: processed=${result.processed}, failed=${result.failed}, avgQuality=${avgQuality}`
              )
            })
            .catch(error => {
              console.error('[Scheduled] Seed processing failed:', error)
            })
        )
      }
      // Daily cleanup at midnight
      else if (event.cron === '0 0 * * *') {
        console.warn('[Scheduled] Daily maintenance started')

        // Clean up old token usage records (keep 30 days)
        ctx.waitUntil(
          env.DB.prepare(
            `DELETE FROM ai_token_usage
               WHERE date < date('now', '-30 days')`
          )
            .run()
            .then(result => {
              console.warn(
                `[Scheduled] Cleaned up ${result.meta.changes} old token usage records`
              )
            })
            .catch(error => {
              console.error(
                '[Scheduled] Failed to clean up token usage:',
                error
              )
            })
        )

        // Clean up completed seed queue items older than 7 days
        ctx.waitUntil(
          env.DB.prepare(
            `DELETE FROM seed_queue
               WHERE status = 'completed'
               AND completed_at < datetime('now', '-7 days')`
          )
            .run()
            .then(result => {
              console.warn(
                `[Scheduled] Cleaned up ${result.meta.changes} completed seed queue items`
              )
            })
            .catch(error => {
              console.error('[Scheduled] Failed to clean up seed queue:', error)
            })
        )
      } else {
        console.warn(`[Scheduled] Unknown cron trigger: ${event.cron}`)
      }
    } catch (error) {
      console.error('[Scheduled] Unhandled error in scheduled handler:', error)
    }
  },
}
