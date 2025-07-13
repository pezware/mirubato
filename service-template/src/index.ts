import { app } from './app'
import type { Env } from './types'

/**
 * Cloudflare Worker entry point
 */
export default {
  /**
   * Main fetch handler
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  /**
   * Queue consumer (uncomment if using queues)
   */
  // async queue(
  //   batch: MessageBatch,
  //   env: Env,
  //   ctx: ExecutionContext
  // ): Promise<void> {
  //   for (const message of batch.messages) {
  //     try {
  //       // Process message
  //       await processMessage(message.body, env)
  //       message.ack()
  //     } catch (error) {
  //       console.error('Queue processing error:', error)
  //       message.retry()
  //     }
  //   }
  // },

  /**
   * Scheduled handler (uncomment if using cron triggers)
   */
  // async scheduled(
  //   event: ScheduledEvent,
  //   env: Env,
  //   ctx: ExecutionContext
  // ): Promise<void> {
  //   switch (event.cron) {
  //     case '0 * * * *': // Every hour
  //       await hourlyTask(env)
  //       break
  //     case '0 0 * * *': // Daily at midnight
  //       await dailyTask(env)
  //       break
  //   }
  // },
}
