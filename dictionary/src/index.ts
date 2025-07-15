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
   * Uncomment and configure cron triggers in wrangler.toml to use
   */
  // async scheduled(
  //   event: ScheduledEvent,
  //   env: Env,
  //   ctx: ExecutionContext
  // ): Promise<void> {
  //   switch (event.cron) {
  //     case '0 */6 * * *': // Every 6 hours
  //       console.log('Running cache cleanup')
  //       // TODO: Implement cache cleanup logic
  //       break
  //
  //     case '0 0 * * 0': // Weekly on Sunday at midnight
  //       console.log('Running weekly quality enhancement')
  //       // TODO: Implement quality enhancement for low-scoring entries
  //       break
  //
  //     case '0 0 * * *': // Daily at midnight
  //       console.log('Running daily analytics aggregation')
  //       // TODO: Implement analytics aggregation
  //       break
  //
  //     default:
  //       console.log(`Unknown cron pattern: ${event.cron}`)
  //   }
  // },
}
