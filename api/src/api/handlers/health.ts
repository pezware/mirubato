import { Hono } from 'hono'
import type { Env } from '../../index'

export const healthHandler = new Hono<{ Bindings: Env }>()

/**
 * Liveness probe - simple check that service is running
 */
healthHandler.get('/livez', c => {
  return c.json({ status: 'ok' })
})

/**
 * Readiness probe - check if service is ready to handle requests
 */
healthHandler.get('/readyz', async c => {
  try {
    // Check database connection
    await c.env.DB.prepare('SELECT 1').first()

    return c.json({ status: 'ready' })
  } catch (error) {
    return c.json({ status: 'not ready', error: error?.toString() }, 503)
  }
})

/**
 * Comprehensive health check
 */
healthHandler.get('/health', async c => {
  const checks = {
    database: await checkDatabase(c.env.DB),
    auth: checkAuthService(c.env),
  }

  const allHealthy = Object.values(checks).every(
    check => check.status === 'healthy'
  )

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: '1.0.0',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      services: checks,
    },
    allHealthy ? 200 : 503
  )
})

/**
 * Metrics endpoint (Prometheus format)
 */
healthHandler.get('/metrics', c => {
  // Basic metrics - in production, use a proper metrics library
  const metrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 0

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 0
http_request_duration_seconds_bucket{le="0.5"} 0
http_request_duration_seconds_bucket{le="1"} 0
http_request_duration_seconds_bucket{le="+Inf"} 0

# HELP api_version API version info
# TYPE api_version gauge
api_version{version="1.0.0",environment="${c.env.ENVIRONMENT}"} 1
`.trim()

  return c.text(metrics, 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  })
})

// Helper functions
async function checkDatabase(db: D1Database) {
  try {
    const start = Date.now()
    await db.prepare('SELECT 1').first()
    const latency = Date.now() - start

    return {
      status: 'healthy' as const,
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
    }
  }
}

function checkAuthService(env: Env) {
  const hasRequiredSecrets = !!(
    env.JWT_SECRET &&
    env.MAGIC_LINK_SECRET &&
    env.GOOGLE_CLIENT_ID
  )

  return {
    status: hasRequiredSecrets ? ('healthy' as const) : ('unhealthy' as const),
    message: hasRequiredSecrets
      ? 'All auth secrets configured'
      : 'Missing auth secrets',
  }
}
