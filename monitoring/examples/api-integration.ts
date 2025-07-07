// Example: Integrating monitoring into the API worker
// This shows how to add monitoring to the existing API service

import { createMonitor } from '@shared/monitoring'
import type { Env as ApiEnv } from '../../api/src/types'

// Extend the API environment to include Analytics Engine
interface MonitoringEnv extends ApiEnv {
  ANALYTICS: AnalyticsEngineDataset
}

// Example middleware for Hono to add monitoring
export function monitoringMiddleware() {
  return async (c: any, next: any) => {
    const env = c.env as MonitoringEnv
    const monitor = createMonitor(env, c.req.raw)
    const startTime = Date.now()

    // Store monitor in context for use in routes
    c.set('monitor', monitor)

    try {
      await next()

      // Track the request
      const responseTime = Date.now() - startTime
      await monitor.trackRequest(c.res.status, responseTime, {
        path: new URL(c.req.url).pathname,
        method: c.req.method,
        worker: 'api',
        user_id: c.get('userId') || 'anonymous',
      })

      // Track specific business metrics
      const pathname = new URL(c.req.url).pathname
      if (pathname.startsWith('/api/practice-sessions')) {
        await monitor.trackBusiness('practice_session_created', 1, {
          instrument: c.req.query('instrument') || 'unknown',
        })
      }

      // Track resource usage
      await monitor.trackResource('d1_reads', 1, { worker: 'api' })
      if (['POST', 'PUT', 'DELETE'].includes(c.req.method)) {
        await monitor.trackResource('d1_writes', 1, { worker: 'api' })
      }
    } catch (error) {
      await monitor.trackError(error as Error, {
        worker: 'api',
        url: c.req.url,
        method: c.req.method,
      })
      throw error
    }
  }
}

// Example: Add to your existing API worker
/*
// In api/src/index.ts:

import { Hono } from 'hono'
import { monitoringMiddleware } from '../../monitoring/examples/api-integration'

const app = new Hono<{ Bindings: MonitoringEnv }>()

// Add monitoring middleware
app.use('*', monitoringMiddleware())

// Your existing routes...
app.get('/api/health', async (c) => {
  const monitor = c.get('monitor')
  
  // Track health check
  await monitor.trackBusiness('health_check', 1, { worker: 'api' })
  
  return c.json({ status: 'healthy' })
})

// Update wrangler.toml to include Analytics Engine:
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "mirubato_metrics"
*/
