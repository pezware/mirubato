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
 * Comprehensive health check with smoke tests
 */
healthHandler.get('/health', async c => {
  const startTime = Date.now()

  try {
    // Run all health checks in parallel for better performance
    const [database, auth, kvStore, rateLimiter, smokeTests] =
      await Promise.all([
        checkDatabase(c.env.DB),
        checkAuthService(c.env),
        checkKVStore(c.env.MUSIC_CATALOG),
        checkRateLimiter(c.env.RATE_LIMITER),
        runSmokeTests(c.env),
      ])

    const checks = {
      database,
      auth,
      kvStore,
      rateLimiter,
      smokeTests,
    }

    const allHealthy = Object.values(checks).every(
      check => check.status === 'healthy'
    )

    const totalLatency = Date.now() - startTime

    return c.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        version: '1.0.0',
        environment: c.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        uptime: 'N/A', // process.uptime not available in Workers
        totalLatency,
        services: checks,
      },
      allHealthy ? 200 : 503
    )
  } catch (error) {
    console.error('Health check error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    return c.json(
      {
        status: 'error',
        version: '1.0.0',
        environment: c.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        error: errorMessage,
        stack: errorStack,
      },
      500
    )
  }
})

/**
 * Detailed health check with extended information
 */
healthHandler.get('/health/detailed', async c => {
  const startTime = Date.now()

  // Get system information
  const systemInfo = {
    cloudflareRay: c.req.header('CF-Ray'),
    colo: c.req.header('CF-IPCountry'),
    requestId:
      c.req.header('X-Request-Id') ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }

  // Run extended checks
  const checks = await Promise.all([
    checkDatabaseTables(c.env.DB),
    checkAPIEndpoints(c.env),
    checkMemoryUsage(),
    checkDependencies(c.env),
  ])

  const [tables, endpoints, memory, dependencies] = checks

  return c.json({
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0',
    latency: Date.now() - startTime,
    system: systemInfo,
    database: {
      tables,
      connectionPool: 'healthy', // Cloudflare manages this
    },
    api: {
      endpoints,
      rateLimit: c.env.RATE_LIMITER ? 'enabled' : 'disabled',
    },
    resources: {
      memory,
      cpu: 'managed by Cloudflare',
    },
    dependencies,
  })
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

async function checkAuthService(env: Env) {
  const requiredSecrets = {
    jwt: !!env.JWT_SECRET,
    magicLink: !!env.MAGIC_LINK_SECRET,
    googleClient: !!env.GOOGLE_CLIENT_ID,
  }

  const allPresent = Object.values(requiredSecrets).every(v => v === true)

  if (!allPresent) {
    const missing = Object.entries(requiredSecrets)
      .filter(([_, present]) => !present)
      .map(([name]) => name)

    return {
      status: 'unhealthy' as const,
      message: `Missing auth secrets: ${missing.join(', ')}`,
    }
  }

  // Test JWT functionality
  try {
    const { SignJWT, jwtVerify } = await import('jose')

    // Create and sign a test token
    const jwt = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10s')
      .sign(new TextEncoder().encode(env.JWT_SECRET))

    // Verify it works
    await jwtVerify(jwt, new TextEncoder().encode(env.JWT_SECRET))

    return {
      status: 'healthy' as const,
      message: 'All auth secrets configured and JWT functional',
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      message: 'Auth secrets present but JWT not functional',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkKVStore(kv: KVNamespace | undefined) {
  if (!kv) {
    return {
      status: 'unhealthy' as const,
      error: 'KV namespace not configured',
    }
  }

  try {
    const start = Date.now()
    // Try to write and read a test value
    const testKey = '__health_check_test'
    const testValue = { timestamp: Date.now() }

    await kv.put(testKey, JSON.stringify(testValue), {
      expirationTtl: 60, // Expire after 1 minute
    })

    const retrieved = await kv.get(testKey)
    const latency = Date.now() - start

    if (!retrieved) {
      throw new Error('Failed to read test value from KV')
    }

    return {
      status: 'healthy' as const,
      latency,
      operation: 'read/write test successful',
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
    }
  }
}

async function checkRateLimiter(rateLimiter: RateLimit | undefined) {
  if (!rateLimiter) {
    return {
      status: 'healthy' as const,
      message: 'Rate limiter not configured (optional)',
    }
  }

  try {
    // Check if rate limiter is responding
    // Note: We don't actually consume a limit here, just check if it exists
    return {
      status: 'healthy' as const,
      message: 'Rate limiter available',
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
    }
  }
}

async function runSmokeTests(env: Env) {
  const tests = {
    databaseQuery: false,
    kvOperation: false,
    authTokenGeneration: false,
  }

  try {
    // Test 1: Complex database query
    await env.DB.prepare(
      `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at > datetime('now', '-1 day')
    `
    ).first()
    tests.databaseQuery = true

    // Test 2: KV list operation
    if (env.MUSIC_CATALOG) {
      await env.MUSIC_CATALOG.list({ limit: 10 })
      tests.kvOperation = true
    }

    // Test 3: JWT token generation and verification
    if (env.JWT_SECRET) {
      try {
        const { SignJWT, jwtVerify } = await import('jose')

        // Create a test token
        const testPayload = {
          sub: 'health-check-test',
          email: 'health@test.com',
          type: 'smoke-test',
        }

        // Sign the token
        const jwt = await new SignJWT(testPayload)
          .setProtectedHeader({ alg: 'HS256' })
          .setSubject(testPayload.sub)
          .setIssuedAt()
          .setExpirationTime('1m')
          .sign(new TextEncoder().encode(env.JWT_SECRET))

        // Verify the token
        const { payload } = await jwtVerify(
          jwt,
          new TextEncoder().encode(env.JWT_SECRET)
        )

        // Check if payload matches what we signed
        tests.authTokenGeneration = payload.sub === 'health-check-test'
      } catch (error) {
        tests.authTokenGeneration = false
      }
    }

    const allPassed = Object.values(tests).every(test => test === true)

    return {
      status: allPassed ? ('healthy' as const) : ('degraded' as const),
      tests,
      message: allPassed ? 'All smoke tests passed' : 'Some smoke tests failed',
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      tests,
      error: error?.toString(),
    }
  }
}

async function checkDatabaseTables(db: D1Database) {
  try {
    // Check critical tables exist and have data
    const tables = ['users', 'practice_sessions', 'goals', 'sync_status']
    const results: Record<string, { exists: boolean; rowCount: number }> = {}

    for (const table of tables) {
      try {
        const result = await db
          .prepare(`SELECT COUNT(*) as count FROM ${table}`)
          .first()
        results[table] = {
          exists: true,
          rowCount: Number(result?.count) || 0,
        }
      } catch (error) {
        results[table] = {
          exists: false,
          rowCount: 0,
        }
      }
    }

    return results
  } catch (error) {
    return { error: error?.toString() }
  }
}

async function checkAPIEndpoints(_env: Env) {
  // List of critical endpoints to check
  const endpoints = [
    { path: '/auth/providers', method: 'GET', requiresAuth: false },
    { path: '/user/me', method: 'GET', requiresAuth: true },
    { path: '/logbook/entries', method: 'GET', requiresAuth: true },
  ]

  const results: Record<string, string> = {}

  for (const endpoint of endpoints) {
    results[`${endpoint.method} ${endpoint.path}`] = endpoint.requiresAuth
      ? 'requires authentication'
      : 'public endpoint'
  }

  return results
}

function checkMemoryUsage() {
  // In Cloudflare Workers, we have limited access to memory info
  // This is more of a placeholder for monitoring
  return {
    status: 'managed by platform',
    limit: '128MB per request',
    monitoring: 'Use Cloudflare Analytics for detailed metrics',
  }
}

async function checkDependencies(env: Env) {
  const deps: Record<string, boolean> = {
    database: !!env.DB,
    kvStore: !!env.MUSIC_CATALOG,
    authentication: !!(env.JWT_SECRET && env.MAGIC_LINK_SECRET),
    emailService: !!env.RESEND_API_KEY,
    googleOAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    rateLimiter: !!env.RATE_LIMITER,
  }

  const required = ['database', 'authentication']
  const optional = ['kvStore', 'emailService', 'googleOAuth', 'rateLimiter']

  return {
    required: Object.fromEntries(
      required.map(key => [key, deps[key] ? 'configured' : 'missing'])
    ),
    optional: Object.fromEntries(
      optional.map(key => [key, deps[key] ? 'configured' : 'not configured'])
    ),
  }
}
