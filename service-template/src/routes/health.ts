import { Hono } from 'hono'
import type { Env, HealthCheckResponse } from '../types'
import { version } from '../../package.json'

export const healthRoutes = new Hono<{ Bindings: Env }>()

/**
 * Liveness probe - simple check that service is running
 */
healthRoutes.get('/livez', c => {
  return c.json({ status: 'ok' })
})

/**
 * Readiness probe - check if service can handle requests
 */
healthRoutes.get('/readyz', async c => {
  try {
    // Test database connection
    await c.env.DB.prepare('SELECT 1').first()

    return c.json({ status: 'ready' })
  } catch (error) {
    return c.json({ status: 'not ready', error: error.message }, 503)
  }
})

/**
 * Comprehensive health check
 */
healthRoutes.get('/health', async c => {
  const checks = {
    database: false,
    cache: false,
  }

  // Check database
  try {
    await c.env.DB.prepare('SELECT 1').first()
    checks.database = true
  } catch (error) {
    console.error('Database check failed:', error)
  }

  // Check cache
  try {
    const testKey = 'health-check-' + Date.now()
    await c.env.CACHE.put(testKey, 'ok', { expirationTtl: 60 })
    const value = await c.env.CACHE.get(testKey)
    if (value === 'ok') {
      checks.cache = true
      await c.env.CACHE.delete(testKey)
    }
  } catch (error) {
    console.error('Cache check failed:', error)
  }

  const allHealthy = Object.values(checks).every(v => v === true)

  const response: HealthCheckResponse = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version,
    environment: c.env.ENVIRONMENT,
    checks,
  }

  return c.json(response, allHealthy ? 200 : 503)
})

/**
 * Metrics endpoint (Prometheus format)
 */
healthRoutes.get('/metrics', async c => {
  const metrics: string[] = []

  // Basic metrics
  metrics.push('# HELP service_info Service information')
  metrics.push('# TYPE service_info gauge')
  metrics.push(`service_info{version="${version}",environment="${c.env.ENVIRONMENT}"} 1`)

  // You can add more metrics here
  // Example: request counts, response times, etc.

  return c.text(metrics.join('\n'), 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  })
})
