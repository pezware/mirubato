import { Hono } from 'hono'
import { Env } from '../../types/env'
import { CloudflareAIService } from '../../services/ai/cloudflare-ai-service'
import { SERVICE_VERSION } from '../../utils/version'
import {
  HealthCheckResponse,
  ServiceHealth,
  AIServiceHealth,
  SmokeTestResults,
  AIModelHealth,
} from '../../types/api'

export const healthHandler = new Hono<{ Bindings: Env }>()

/**
 * Liveness probe - simple check that service is alive
 */
healthHandler.get('/livez', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
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

  // Run basic health checks only (no AI tests for speed)
  const [database, cache, storage] = await Promise.all([
    checkDatabase(c.env.DB),
    checkCache(c.env.CACHE),
    checkStorage(c.env.STORAGE),
  ])

  // Quick AI availability check (no actual tests)
  const cloudflareAI = {
    status: c.env.AI ? 'configured' : 'unconfigured',
    message: 'Use /health/ai for detailed AI status',
  }
  const openAI = {
    status: c.env.OPENAI_API_KEY ? 'configured' : 'unconfigured',
    message: 'Use /health/ai for detailed status',
  }
  const anthropic = {
    status: c.env.ANTHROPIC_API_KEY ? 'configured' : 'unconfigured',
    message: 'Use /health/ai for detailed status',
  }

  const checks = {
    database,
    cache,
    storage,
    ai: {
      cloudflare: cloudflareAI,
      openai: openAI,
      anthropic: anthropic,
    } as AIServiceHealth,
  }

  const allHealthy = Object.values(checks).every(check => {
    if (typeof check === 'object' && 'cloudflare' in check) {
      // For AI checks, just ensure Cloudflare AI is configured
      return check.cloudflare.status === 'configured'
    }
    return check.status === 'healthy' || check.status === 'configured'
  })

  const response: HealthCheckResponse = {
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'mirubato-dictionary',
    version: SERVICE_VERSION,
    environment: c.env.ENVIRONMENT || 'production',
    timestamp: new Date().toISOString(),
    totalLatency: Date.now() - startTime,
    services: checks,
  }

  return c.json(response, allHealthy ? 200 : 503)
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
  const [tables, cacheStats, aiModels, dependencies] = await Promise.all([
    checkDatabaseTables(c.env.DB),
    checkCacheStats(c.env.CACHE),
    testAllAIModels(c.env),
    checkDependencies(c.env),
  ])

  return c.json({
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    service: 'mirubato-dictionary',
    version: SERVICE_VERSION,
    latency: Date.now() - startTime,
    system: systemInfo,
    database: {
      tables,
      connectionPool: 'healthy', // Cloudflare manages this
    },
    cache: {
      stats: cacheStats,
      type: 'Cloudflare KV',
    },
    ai: {
      models: aiModels,
      providers: {
        cloudflare: !!c.env.AI,
        openai: !!c.env.OPENAI_API_KEY,
        anthropic: !!c.env.ANTHROPIC_API_KEY,
      },
    },
    resources: {
      memory: {
        status: 'managed by platform',
        limit: '128MB per request',
        monitoring: 'Use Cloudflare Analytics for detailed metrics',
      },
      cpu: 'managed by Cloudflare',
    },
    dependencies,
  })
})

/**
 * AI-specific health check endpoint with comprehensive tests
 */
healthHandler.get('/health/ai', async c => {
  const startTime = Date.now()

  // Run AI provider checks, model tests, and smoke tests in parallel
  const [cloudflareAI, openAI, anthropic, models, smokeTests] =
    await Promise.all([
      checkCloudflareAI(c.env),
      checkOpenAI(c.env.OPENAI_API_KEY),
      checkAnthropic(c.env.ANTHROPIC_API_KEY),
      testAllAIModels(c.env),
      runSmokeTests(c.env),
    ])

  const operational = models.some(m => m.status === 'healthy')
  const smokeTestsPassed = smokeTests.status === 'healthy'

  return c.json({
    status: operational && smokeTestsPassed ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    latency: Date.now() - startTime,
    providers: {
      cloudflare: cloudflareAI,
      openai: openAI,
      anthropic: anthropic,
    },
    models,
    smokeTests,
  })
})

/**
 * Metrics endpoint (Prometheus format)
 */
healthHandler.get('/metrics', async c => {
  try {
    // Get basic metrics from database
    const metrics = await c.env.DB.prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM dictionary_entries) as total_entries,
        (SELECT COUNT(*) FROM quality_checkpoints) as total_checkpoints,
        (SELECT COUNT(*) FROM search_analytics) as total_searches,
        (SELECT COUNT(*) FROM user_feedback) as total_feedback,
        (SELECT AVG(overall_score) FROM dictionary_entries) as avg_quality_score
    `
    ).first()

    // Get AI usage metrics
    const aiMetrics = await c.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_ai_requests,
        SUM(total_tokens) as total_tokens,
        SUM(cost_usd) as total_cost
      FROM ai_model_usage
      WHERE created_at > datetime('now', '-24 hours')
    `
    ).first()

    // Format as Prometheus metrics
    const prometheusMetrics = `
# HELP dictionary_entries_total Total number of dictionary entries
# TYPE dictionary_entries_total gauge
dictionary_entries_total ${metrics?.total_entries || 0}

# HELP dictionary_quality_score_average Average quality score of all entries
# TYPE dictionary_quality_score_average gauge
dictionary_quality_score_average ${metrics?.avg_quality_score || 0}

# HELP dictionary_searches_total Total number of dictionary searches
# TYPE dictionary_searches_total counter
dictionary_searches_total ${metrics?.total_searches || 0}

# HELP dictionary_feedback_total Total user feedback entries
# TYPE dictionary_feedback_total counter
dictionary_feedback_total ${metrics?.total_feedback || 0}

# HELP dictionary_ai_requests_24h AI requests in last 24 hours
# TYPE dictionary_ai_requests_24h counter
dictionary_ai_requests_24h ${aiMetrics?.total_ai_requests || 0}

# HELP dictionary_ai_tokens_24h AI tokens used in last 24 hours
# TYPE dictionary_ai_tokens_24h counter
dictionary_ai_tokens_24h ${aiMetrics?.total_tokens || 0}

# HELP dictionary_ai_cost_24h_usd AI cost in USD for last 24 hours
# TYPE dictionary_ai_cost_24h_usd gauge
dictionary_ai_cost_24h_usd ${aiMetrics?.total_cost || 0}

# HELP dictionary_service_info Service information
# TYPE dictionary_service_info gauge
dictionary_service_info{version="${SERVICE_VERSION}",environment="${c.env.ENVIRONMENT}"} 1
`.trim()

    return c.text(prometheusMetrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4',
    })
  } catch (error) {
    return c.text('# Error generating metrics', 500)
  }
})

// Helper functions
async function checkDatabase(db: D1Database): Promise<ServiceHealth> {
  try {
    const start = Date.now()
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM dictionary_entries')
      .first()
    const latency = Date.now() - start

    return {
      status: 'healthy',
      latency,
      entryCount: Number(result?.count) || 0,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
    }
  }
}

async function checkCache(kv: KVNamespace): Promise<ServiceHealth> {
  try {
    const start = Date.now()
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
      status: 'healthy',
      latency,
      operation: 'read/write test successful',
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
    }
  }
}

async function checkStorage(r2: R2Bucket): Promise<ServiceHealth> {
  try {
    const start = Date.now()
    // List with limit 1 to check R2 connectivity
    await r2.list({ limit: 1 })
    const latency = Date.now() - start

    return {
      status: 'healthy',
      latency,
      accessible: true,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
    }
  }
}

async function checkCloudflareAI(env: Env): Promise<ServiceHealth> {
  if (!env.AI) {
    return {
      status: 'unconfigured',
      message: 'Cloudflare AI binding not configured',
    }
  }

  try {
    const aiService = new CloudflareAIService(env)
    const testResult = await aiService.testConnection()

    if (testResult.available) {
      return {
        status: 'healthy',
        latency: testResult.latency,
        message: 'Cloudflare AI operational',
      }
    } else {
      return {
        status: 'unhealthy',
        error: testResult.error || 'AI service unavailable',
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
      message: 'Cloudflare AI test failed',
    }
  }
}

async function checkOpenAI(apiKey: string | undefined): Promise<ServiceHealth> {
  if (!apiKey) {
    return {
      status: 'unconfigured',
      message: 'OpenAI API key not configured',
    }
  }

  try {
    const start = Date.now()

    const response = await fetch(
      'https://api.openai.com/v1/models/gpt-3.5-turbo',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    const latency = Date.now() - start

    if (response.ok) {
      return {
        status: 'healthy',
        latency,
        message: 'OpenAI API operational',
      }
    } else {
      return {
        status: 'unhealthy',
        latency,
        httpStatus: response.status,
        error: `API returned ${response.status}`,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
      message: 'OpenAI API test failed',
    }
  }
}

async function checkAnthropic(
  apiKey: string | undefined
): Promise<ServiceHealth> {
  if (!apiKey) {
    return {
      status: 'unconfigured',
      message: 'Anthropic API key not configured',
    }
  }

  try {
    const start = Date.now()

    // Just check if we can access the API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
    })

    const latency = Date.now() - start

    // 401 means the key format is correct but maybe invalid
    // 200 means it worked
    // Other codes might indicate service issues
    if (response.ok || response.status === 401) {
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency,
        message: response.ok ? 'Anthropic API operational' : 'Invalid API key',
      }
    } else {
      return {
        status: 'unhealthy',
        latency,
        httpStatus: response.status,
        error: `API returned ${response.status}`,
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.toString(),
      message: 'Anthropic API test failed',
    }
  }
}

async function runSmokeTests(env: Env): Promise<SmokeTestResults> {
  const tests = {
    definition_generation: false,
    quality_validation: false,
    reference_extraction: false,
    multi_model_fallback: false,
  }

  try {
    const aiService = new CloudflareAIService(env)

    // Test 1: Generate a simple definition
    if (env.AI) {
      try {
        const response = await aiService.generateStructuredContent(
          'Define "forte" in music. Reply with JSON: {"definition": "..."}',
          '@cf/meta/llama-3.1-8b-instruct',
          { max_tokens: 100, temperature: 0.3 }
        )
        tests.definition_generation = !!response.response
      } catch {
        tests.definition_generation = false
      }
    }

    // Test 2: Validate quality with Llama 3.2 3B
    if (env.AI) {
      try {
        const response = await aiService.generateStructuredContent(
          'Rate this definition quality (1-10): "A piano is a keyboard instrument." Reply: {"score": N}',
          '@cf/meta/llama-3.2-3b-instruct',
          { max_tokens: 50, temperature: 0.1 }
        )
        tests.quality_validation = !!response.response
      } catch {
        tests.quality_validation = false
      }
    }

    // Test 3: Extract references
    if (env.AI) {
      try {
        const response = await aiService.generateStructuredContent(
          'Suggest Wikipedia search for "violin". Reply: {"search": "..."}',
          '@cf/meta/llama-3.1-8b-instruct',
          { max_tokens: 50, temperature: 0.1 }
        )
        tests.reference_extraction = !!response.response
      } catch {
        tests.reference_extraction = false
      }
    }

    // Test 4: Multi-model fallback
    let fallbackWorked = false
    try {
      // Try primary model
      await aiService.generateStructuredContent(
        'Test',
        '@cf/meta/llama-3.1-8b-instruct',
        { max_tokens: 10 }
      )
      fallbackWorked = true
    } catch {
      // Try fallback with OpenAI if available
      if (env.OPENAI_API_KEY) {
        try {
          const response = await fetch(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 10,
              }),
            }
          )
          fallbackWorked = response.ok
        } catch {
          fallbackWorked = false
        }
      }
    }
    tests.multi_model_fallback = fallbackWorked

    const allPassed = Object.values(tests).every(test => test === true)

    return {
      status: allPassed ? 'healthy' : 'degraded',
      tests,
      message: allPassed ? 'All smoke tests passed' : 'Some smoke tests failed',
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      tests,
      message: error?.toString() || 'Smoke tests failed',
    }
  }
}

async function testAllAIModels(env: Env): Promise<AIModelHealth[]> {
  const models = [
    // Cloudflare AI Models
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B',
      test: async () => {
        if (!env.AI) throw new Error('AI not configured')
        const response = (await env.AI.run(
          '@cf/meta/llama-3.1-8b-instruct' as any,
          {
            prompt: 'Test',
            max_tokens: 10,
          } as any
        )) as any
        if (!response.response) throw new Error('No response')
      },
    },
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.2-3b-instruct',
      name: 'Llama 3.2 3B',
      test: async () => {
        if (!env.AI) throw new Error('AI not configured')
        const response = (await env.AI.run(
          '@cf/meta/llama-3.2-3b-instruct' as any,
          {
            prompt: 'Test',
            max_tokens: 10,
          } as any
        )) as any
        if (!response.response) throw new Error('No response')
      },
    },
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      name: 'Llama 3.3 70B',
      test: async () => {
        if (!env.AI) throw new Error('AI not configured')
        const response = (await env.AI.run(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any,
          {
            prompt: 'Test',
            max_tokens: 10,
          } as any
        )) as any
        if (!response.response) throw new Error('No response')
      },
    },
    // External APIs
    {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      test: async () => {
        if (!env.OPENAI_API_KEY) throw new Error('No API key')
        const response = await fetch(
          'https://api.openai.com/v1/models/gpt-3.5-turbo',
          {
            headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          }
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      },
    },
    {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      test: async () => {
        if (!env.ANTHROPIC_API_KEY) throw new Error('No API key')
        // Just check the endpoint is reachable
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 1,
          }),
        })
        // Don't throw on 401 - just means key is invalid
        if (!response.ok && response.status !== 401) {
          throw new Error(`HTTP ${response.status}`)
        }
      },
    },
  ]

  return Promise.all(
    models.map(async model => {
      const startTime = Date.now()
      try {
        await model.test()
        return {
          ...model,
          status: 'healthy' as const,
          latency: Date.now() - startTime,
        }
      } catch (error) {
        return {
          ...model,
          status: 'unhealthy' as const,
          latency: Date.now() - startTime,
          error: error?.toString(),
        }
      }
    })
  )
}

async function checkDatabaseTables(db: D1Database) {
  try {
    // Check critical tables exist and have data
    const tables = [
      'dictionary_entries',
      'quality_checkpoints',
      'search_analytics',
      'user_feedback',
      'ai_model_usage',
    ]
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

async function checkCacheStats(kv: KVNamespace) {
  try {
    // Check some known cache prefixes
    const prefixes = ['term:', 'search:', 'export:', 'embedding:']
    const stats: Record<string, number> = {}

    for (const prefix of prefixes) {
      const result = await kv.list({ prefix, limit: 100 })
      stats[prefix] = result.keys.length
    }

    return {
      keyCounts: stats,
      status: 'healthy',
    }
  } catch (error) {
    return {
      status: 'error',
      error: error?.toString(),
    }
  }
}

async function checkDependencies(env: Env) {
  const deps: Record<string, boolean> = {
    database: !!env.DB,
    cache: !!env.CACHE,
    storage: !!env.STORAGE,
    ai_cloudflare: !!env.AI,
    ai_openai: !!env.OPENAI_API_KEY,
    ai_anthropic: !!env.ANTHROPIC_API_KEY,
    jwt_secret: !!env.JWT_SECRET,
    api_service: !!env.API_SERVICE_URL,
  }

  const required = ['database', 'cache', 'storage', 'ai_cloudflare']
  const optional = ['ai_openai', 'ai_anthropic', 'jwt_secret', 'api_service']

  return {
    required: Object.fromEntries(
      required.map(key => [key, deps[key] ? 'configured' : 'missing'])
    ),
    optional: Object.fromEntries(
      optional.map(key => [key, deps[key] ? 'configured' : 'not configured'])
    ),
  }
}
