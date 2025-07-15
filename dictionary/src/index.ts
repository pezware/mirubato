/**
 * Music Dictionary Service - Worker Entry Point
 */

import { app } from './app'
import type { Env } from './types/env'
import type { MessageBatch } from '@cloudflare/workers-types'

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
        const data = message.body as any

        // Handle different message types
        switch (data.type) {
          case 'enhance_entry':
            // Enhancement logic would go here
            console.log(`Enhancing entry: ${data.entryId}`)
            // TODO: Implement actual enhancement logic
            break

          case 'batch_import':
            // Batch import logic would go here
            console.log(`Batch importing: ${data.entries?.length || 0} entries`)
            // TODO: Implement actual batch import logic
            break

          case 'analytics_aggregation':
            // Analytics aggregation logic
            console.log('Running analytics aggregation')
            // TODO: Implement analytics aggregation
            break

          default:
            console.warn(`Unknown message type: ${data.type}`)
        }

        // Acknowledge the message
        message.ack()
      } catch (error) {
        console.error('Error processing queue message:', error)
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
    console.log(
      `Scheduled event triggered: ${event.cron} at ${new Date().toISOString()}`
    )

    try {
      switch (event.cron) {
        // Production schedule: 4 times daily
        case '0 2,8,14,20 * * *':
        // Staging schedule: Once daily at noon
        case '0 12 * * *': {
          console.log('Starting seed processing job')

          // Import dynamically to avoid loading in non-scheduled contexts
          const { SeedProcessor } = await import('./services/seed-processor')
          const processor = new SeedProcessor(env)

          // Run processing in background
          ctx.waitUntil(
            processor
              .processSeedQueue()
              .then(result => {
                console.log('Seed processing completed:', result)

                // Send metrics if monitoring is configured
                if (result.processed > 0) {
                  const avgQuality =
                    result.quality_scores.length > 0
                      ? Math.round(
                          result.quality_scores.reduce((a, b) => a + b, 0) /
                            result.quality_scores.length
                        )
                      : 0

                  console.log(`Seed processing metrics:
                    - Terms processed: ${result.processed}
                    - Success rate: ${Math.round((result.succeeded / result.processed) * 100)}%
                    - Average quality: ${avgQuality}%
                    - Tokens used: ${result.token_usage}
                  `)
                }
              })
              .catch(error => {
                console.error('Seed processing failed:', error)
              })
          )
          break
        }

        // Weekly quality enhancement (future implementation)
        case '0 0 * * 0': {
          console.log('Weekly quality enhancement job (not yet implemented)')
          // TODO: Implement quality enhancement for low-scoring entries
          break
        }

        // Daily analytics and cleanup
        case '0 0 * * *': {
          console.log('Daily maintenance job')

          // Clean up old token usage records (keep 30 days)
          ctx.waitUntil(
            env.DB.prepare(
              `DELETE FROM ai_token_usage 
               WHERE date < date('now', '-30 days')`
            )
              .run()
              .then(result => {
                console.log(
                  `Cleaned up ${result.meta.changes || 0} old token usage records`
                )
              })
              .catch(error => {
                console.error('Failed to clean up token usage:', error)
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
                console.log(
                  `Cleaned up ${result.meta.changes || 0} completed seed queue items`
                )
              })
              .catch(error => {
                console.error('Failed to clean up seed queue:', error)
              })
          )
          break
        }

        default:
          console.log(`Unknown cron pattern: ${event.cron}`)
      }
    } catch (error) {
      console.error('Error in scheduled handler:', error)
    }
  },
}
