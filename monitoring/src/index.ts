import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { Monitor } from '@shared/monitoring'
import type { Env, AlertMessage } from './types'
import {
  aggregateRecentMetrics,
  calculateHourlyCosts,
  cleanupOldData,
  generateWeeklyReport,
} from './aggregation'
import {
  handleMetricsQuery,
  handleCostQuery,
  handleAlertConfig,
  handleHealthCheck,
  handleDashboardData,
} from './api'
import { processAlert } from './alerts'
import { MetricAggregator } from './durable-objects'

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use(
  '*',
  cors({
    origin: origin => {
      if (!origin) return '*'
      const allowed = [
        'https://mirubato.com',
        'https://www.mirubato.com',
        'https://monitoring.mirubato.com',
        'http://localhost:3000',
        'http://localhost:4000',
      ]
      return allowed.includes(origin) ? origin : allowed[0]
    },
    credentials: true,
  })
)

// API Routes
app.get('/api/metrics', async c => {
  return handleMetricsQuery(c.req.raw, c.env)
})

app.get('/api/costs', async c => {
  return handleCostQuery(c.req.raw, c.env)
})

app.get('/api/alerts', async c => {
  return handleAlertConfig(c.req.raw, c.env, 'GET')
})

app.post('/api/alerts', async c => {
  return handleAlertConfig(c.req.raw, c.env, 'POST')
})

app.put('/api/alerts/:id', async c => {
  return handleAlertConfig(c.req.raw, c.env, 'PUT')
})

app.delete('/api/alerts/:id', async c => {
  return handleAlertConfig(c.req.raw, c.env, 'DELETE')
})

app.get('/api/health', async c => {
  return handleHealthCheck(c.env)
})

app.get('/api/dashboard', async c => {
  return handleDashboardData(c.req.raw, c.env)
})

// Prometheus-compatible metrics endpoint
app.get('/api/prometheus', async c => {
  const metrics = await getPrometheusMetrics(c.env)
  return c.text(metrics, 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  })
})

// Root route
app.get('/', c => {
  return c.json({
    service: 'Mirubato Monitoring',
    version: '1.0.0',
    endpoints: [
      '/api/metrics',
      '/api/costs',
      '/api/alerts',
      '/api/health',
      '/api/dashboard',
      '/api/prometheus',
    ],
  })
})

// Export handlers
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const monitor = new Monitor(env.ANALYTICS, `cron-${Date.now()}`)

    try {
      switch (event.cron) {
        case '*/5 * * * *':
          // Aggregate recent metrics every 5 minutes
          ctx.waitUntil(aggregateRecentMetrics(env, monitor))
          break
        case '0 * * * *':
          // Calculate costs every hour
          ctx.waitUntil(calculateHourlyCosts(env, monitor))
          break
        case '0 0 * * *':
          // Daily cleanup
          ctx.waitUntil(cleanupOldData(env, monitor))
          break
        case '0 6 * * MON':
          // Weekly reports
          ctx.waitUntil(generateWeeklyReport(env, monitor))
          break
      }
    } catch (error) {
      await monitor.trackError(error as Error, {
        cron: event.cron,
        worker: 'monitoring',
      })
    }
  },

  async queue(batch: MessageBatch<AlertMessage>, env: Env) {
    // Process alert notifications
    for (const message of batch.messages) {
      try {
        await processAlert(message.body, env)
        message.ack()
      } catch (error) {
        console.error('Failed to process alert:', error)
        message.retry()
      }
    }
  },
}

// Durable Object export
export { MetricAggregator }

// Prometheus metrics formatter
async function getPrometheusMetrics(env: Env): Promise<string> {
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Query recent metrics
  const metrics = await env.DB.prepare(
    `
    SELECT worker, metric, sum, count, p50, p95, p99
    FROM metrics_hourly
    WHERE timestamp >= ?
    ORDER BY timestamp DESC
  `
  )
    .bind(hourAgo.toISOString())
    .all()

  let output = ''

  // Format as Prometheus metrics
  for (const row of metrics.results || []) {
    const { worker, metric, sum, count, p50, p95, p99 } = row
    const prefix = `mirubato_${metric.replace(/[^a-zA-Z0-9_]/g, '_')}`

    output += `# TYPE ${prefix}_total counter\n`
    output += `${prefix}_total{worker="${worker}"} ${count}\n`

    if (sum !== null) {
      output += `# TYPE ${prefix}_sum counter\n`
      output += `${prefix}_sum{worker="${worker}"} ${sum}\n`
    }

    if (p50 !== null) {
      output += `# TYPE ${prefix}_quantile gauge\n`
      output += `${prefix}_quantile{worker="${worker}",quantile="0.5"} ${p50}\n`
      output += `${prefix}_quantile{worker="${worker}",quantile="0.95"} ${p95}\n`
      output += `${prefix}_quantile{worker="${worker}",quantile="0.99"} ${p99}\n`
    }
  }

  // Add cost metrics
  const costs = await env.DB.prepare(
    `
    SELECT worker, resource_type, sum(cost_usd) as total_cost
    FROM cost_tracking
    WHERE date = ?
    GROUP BY worker, resource_type
  `
  )
    .bind(now.toISOString().split('T')[0])
    .all()

  for (const row of costs.results || []) {
    const { worker, resource_type, total_cost } = row
    output += `# TYPE mirubato_cost_usd gauge\n`
    output += `mirubato_cost_usd{worker="${worker}",resource="${resource_type}"} ${total_cost}\n`
  }

  return output
}
