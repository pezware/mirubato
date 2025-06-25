import { Hono } from 'hono'

export const healthHandler = new Hono<{ Bindings: Env }>()

// Liveness probe - simple check that service is alive
healthHandler.get('/livez', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Readiness probe - check if service is ready to handle requests
healthHandler.get('/readyz', async c => {
  const checks = {
    database: { status: 'unknown' as 'ok' | 'error', latency: 0 },
    storage: { status: 'unknown' as 'ok' | 'error', latency: 0 },
    cache: { status: 'unknown' as 'ok' | 'error', latency: 0 },
  }

  // Check database
  try {
    const start = Date.now()
    const result = await c.env.DB.prepare('SELECT 1').first()
    checks.database.latency = Date.now() - start
    checks.database.status = result ? 'ok' : 'error'
  } catch (error) {
    checks.database.status = 'error'
  }

  // Check cache
  try {
    const start = Date.now()
    await c.env.CACHE.put('health-check', Date.now().toString(), {
      expirationTtl: 60,
    })
    const value = await c.env.CACHE.get('health-check')
    checks.cache.latency = Date.now() - start
    checks.cache.status = value ? 'ok' : 'error'
  } catch (error) {
    checks.cache.status = 'error'
  }

  // Check storage
  try {
    const start = Date.now()
    // List with limit 1 to check R2 connectivity
    await c.env.SCORES_BUCKET.list({ limit: 1 })
    checks.storage.latency = Date.now() - start
    checks.storage.status = 'ok'
  } catch (error) {
    checks.storage.status = 'error'
  }

  const allHealthy = Object.values(checks).every(check => check.status === 'ok')

  return c.json(
    {
      ready: allHealthy,
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  )
})

// Comprehensive health check
healthHandler.get('/health', async c => {
  const checks: Record<string, any> = {
    database: { status: 'unknown', latency: 0, message: null },
    storage: { status: 'unknown', latency: 0, message: null },
    cache: { status: 'unknown', latency: 0, message: null },
  }

  // Database health check
  try {
    const start = Date.now()
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM scores'
    ).first()
    checks.database.latency = Date.now() - start
    checks.database.status = 'ok'
    checks.database.message = `${result?.count || 0} scores in database`
  } catch (error) {
    checks.database.status = 'error'
    checks.database.message =
      error instanceof Error ? error.message : 'Database connection failed'
  }

  // Storage health check
  try {
    const start = Date.now()
    await c.env.SCORES_BUCKET.list({ limit: 1 })
    checks.storage.latency = Date.now() - start
    checks.storage.status = 'ok'
    checks.storage.message = `R2 bucket accessible`
  } catch (error) {
    checks.storage.status = 'error'
    checks.storage.message =
      error instanceof Error ? error.message : 'Storage connection failed'
  }

  // Cache health check
  try {
    const start = Date.now()
    const testKey = 'health-check-' + Date.now()
    await c.env.CACHE.put(testKey, 'test', { expirationTtl: 60 })
    const value = await c.env.CACHE.get(testKey)
    await c.env.CACHE.delete(testKey)
    checks.cache.latency = Date.now() - start
    checks.cache.status = value === 'test' ? 'ok' : 'error'
    checks.cache.message = 'KV cache operational'
  } catch (error) {
    checks.cache.status = 'error'
    checks.cache.message =
      error instanceof Error ? error.message : 'Cache connection failed'
  }

  // Additional checks if available
  if (c.env?.BROWSER) {
    checks.browserRendering = {
      status: 'ok',
      message: 'Browser Rendering API available',
    }
  }

  if (c.env?.AI) {
    checks.workersAI = { status: 'ok', message: 'Workers AI available' }
  }

  if (c.env?.SCORE_QUEUE) {
    checks.queue = { status: 'ok', message: 'Queue service available' }
  }

  // Determine overall health status
  const criticalChecks = ['database', 'storage', 'cache']
  const allCriticalHealthy = criticalChecks.every(
    key => checks[key].status === 'ok'
  )
  const someCriticalHealthy = criticalChecks.some(
    key => checks[key].status === 'ok'
  )

  const overallStatus = allCriticalHealthy
    ? 'healthy'
    : someCriticalHealthy
      ? 'degraded'
      : 'unhealthy'
  const statusCode = allCriticalHealthy ? 200 : 503

  return c.json(
    {
      status: overallStatus,
      service: 'mirubato-scores',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      checks,
      version: '1.0.0',
    },
    statusCode
  )
})

// Metrics endpoint (basic)
healthHandler.get('/metrics', async c => {
  try {
    // Get basic metrics from database
    const metrics = await c.env.DB.prepare(
      `
      SELECT 
        (SELECT COUNT(*) FROM scores) as total_scores,
        (SELECT COUNT(*) FROM collections) as total_collections,
        (SELECT COUNT(*) FROM score_versions) as total_versions,
        (SELECT SUM(view_count) FROM score_analytics) as total_views,
        (SELECT SUM(download_count) FROM score_analytics) as total_downloads
    `
    ).first()

    // Format as Prometheus metrics
    const prometheusMetrics = `
# HELP scores_total Total number of scores
# TYPE scores_total gauge
scores_total ${metrics?.total_scores || 0}

# HELP collections_total Total number of collections
# TYPE collections_total gauge
collections_total ${metrics?.total_collections || 0}

# HELP score_versions_total Total number of score versions
# TYPE score_versions_total gauge
score_versions_total ${metrics?.total_versions || 0}

# HELP score_views_total Total number of score views
# TYPE score_views_total counter
score_views_total ${metrics?.total_views || 0}

# HELP score_downloads_total Total number of score downloads
# TYPE score_downloads_total counter
score_downloads_total ${metrics?.total_downloads || 0}
`.trim()

    return c.text(prometheusMetrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4',
    })
  } catch (error) {
    return c.text('# Error generating metrics', 500)
  }
})
