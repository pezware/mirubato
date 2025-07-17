/**
 * Music Dictionary Service - Worker Entry Point
 */

import { app } from './app'
import type { Env } from './types/env'
import type { MessageBatch } from '@cloudflare/workers-types'

// Define message body types
interface QueueMessage {
  type: 'enhance_entry' | 'batch_import' | 'analytics_aggregation'
  entryId?: string
  entries?: unknown[]
}

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
   * Queue consumer for batch processing
   */
  async queue(
    batch: MessageBatch,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    // Processing messages from queue

    for (const message of batch.messages) {
      try {
        // Process each message
        const data = message.body as QueueMessage

        // Handle different message types
        switch (data.type) {
          case 'enhance_entry':
            // Enhancement logic would go here
            // TODO: Implement actual enhancement logic
            break

          case 'batch_import':
            // Batch import logic would go here
            // TODO: Implement actual batch import logic
            break

          case 'analytics_aggregation':
            // Analytics aggregation logic
            // TODO: Implement analytics aggregation
            break

          default:
          // Unknown message type - log to monitoring if available
        }

        // Acknowledge the message
        message.ack()
      } catch (error) {
        // Retry the message
        message.retry()
      }
    }
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
    // Scheduled event triggered

    try {
      // Handle seed processing schedules (both prod and staging)
      if (event.cron === '0 2,8,14,20 * * *' || event.cron === '0 12 * * *') {
        // Log seed processing start

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
              console.log(
                `Recovery completed: ${recoveryResult.retry_scheduled} scheduled for retry, ${recoveryResult.moved_to_dlq} moved to DLQ`
              )
            })
            .catch(error => {
              console.error('Error recovery failed:', error)
            })
        )

        // Then run normal processing
        ctx.waitUntil(
          processor
            .processSeedQueue()
            .then(result => {
              // Seed processing completed
              // Metrics can be sent to monitoring service if configured
              if (result.processed > 0) {
                const _avgQuality =
                  result.quality_scores.length > 0
                    ? Math.round(
                        result.quality_scores.reduce((a, b) => a + b, 0) /
                          result.quality_scores.length
                      )
                    : 0

                // Log metrics to monitoring service
                // TODO: Send to proper monitoring/analytics service with _avgQuality
              }
            })
            .catch(_error => {
              // Log error to monitoring service
              // TODO: Send error to proper error tracking service
            })
        )
      }
      // Weekly quality enhancement (future implementation)
      else if (event.cron === '0 0 * * 0') {
        // Weekly quality enhancement job (not yet implemented)
        // TODO: Implement quality enhancement for low-scoring entries
      }
      // Daily analytics and cleanup
      else if (event.cron === '0 0 * * *') {
        // Daily maintenance job

        // Clean up old token usage records (keep 30 days)
        ctx.waitUntil(
          env.DB.prepare(
            `DELETE FROM ai_token_usage 
               WHERE date < date('now', '-30 days')`
          )
            .run()
            .then(_result => {
              // Successfully cleaned up old token usage records
              // Could log to monitoring: _result.meta.changes
            })
            .catch(_error => {
              // Failed to clean up token usage
              // TODO: Send error to monitoring service
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
            .then(_result => {
              // Successfully cleaned up completed seed queue items
              // Could log to monitoring: _result.meta.changes
            })
            .catch(_error => {
              // Failed to clean up seed queue
              // TODO: Send error to monitoring service
            })
        )
      }
    } catch (_error) {
      // Error in scheduled handler
      // TODO: Send error to monitoring service
    }
  },
}
