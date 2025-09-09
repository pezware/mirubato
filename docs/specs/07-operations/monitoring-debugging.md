# Operations: Monitoring & Debugging Specification

## Purpose

Effective operations ensure Mirubato runs reliably, performs optimally, and provides insights for continuous improvement. This specification defines our monitoring, debugging, and incident response strategies for a distributed edge computing environment.

## Why Operations Excellence Matters

Without proper operations:

- **Invisible failures**: Issues go unnoticed until users complain
- **Slow debugging**: Problems take hours to diagnose
- **Performance degradation**: Gradual slowdowns compound over time
- **Data loss risks**: Undetected corruption or sync failures
- **Poor user experience**: Frustration from unexplained errors

Operations excellence enables proactive issue detection, rapid resolution, and continuous optimization.

## Monitoring Architecture

### 1. Health Check System

**Purpose**: Continuous verification that all services are operational.

**Implementation Strategy**:

```typescript
interface HealthCheckSystem {
  // Service health endpoints
  endpoints: {
    '/livez': 'Basic liveness check',
    '/readyz': 'Ready to serve traffic',
    '/health': 'Comprehensive health status',
    '/health/detailed': 'Deep diagnostic information',
    '/metrics': 'Prometheus-format metrics'
  }

  // Health check implementation
  async performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkExternalServices(),
      this.checkResourceUsage(),
      this.runSmokeTests()
    ])

    return {
      status: this.determineOverallHealth(checks),
      timestamp: new Date().toISOString(),
      version: SERVICE_VERSION,
      environment: env.ENVIRONMENT,
      checks: this.formatCheckResults(checks),
      latency: Date.now() - startTime
    }
  }

  // Database health verification
  async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now()

    try {
      // Simple connectivity test
      await db.prepare('SELECT 1').first()

      // Table integrity check
      const tables = ['users', 'practice_sessions', 'goals']
      for (const table of tables) {
        const count = await db.prepare(
          `SELECT COUNT(*) as c FROM ${table}`
        ).first()

        if (count.c === undefined) {
          throw new Error(`Table ${table} inaccessible`)
        }
      }

      // Check for blocking queries
      const locks = await db.prepare(`
        SELECT COUNT(*) as locked
        FROM sqlite_master
        WHERE type = 'table' AND sql LIKE '%WITHOUT ROWID%'
      `).first()

      return {
        status: 'healthy',
        latency: Date.now() - start,
        details: { tables: tables.length, locks: locks.locked }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start
      }
    }
  }

  // Smoke tests for critical paths
  async runSmokeTests(): Promise<SmokeTestResults> {
    const tests = [
      {
        name: 'auth_flow',
        test: async () => {
          // Generate and verify a test JWT
          const token = await generateToken({ test: true })
          await verifyToken(token)
        }
      },
      {
        name: 'data_query',
        test: async () => {
          // Run a complex query
          await db.prepare(`
            SELECT COUNT(*) FROM practice_sessions
            WHERE created_at > datetime('now', '-7 days')
          `).first()
        }
      },
      {
        name: 'kv_operation',
        test: async () => {
          // Test KV read/write
          const key = '__health_test'
          await kv.put(key, Date.now().toString())
          await kv.get(key)
        }
      }
    ]

    const results = await Promise.allSettled(
      tests.map(t => t.test())
    )

    return {
      passed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      tests: tests.map((t, i) => ({
        name: t.name,
        status: results[i].status === 'fulfilled' ? 'passed' : 'failed',
        error: results[i].status === 'rejected' ? results[i].reason : null
      }))
    }
  }
}
```

### 2. Metrics Collection

**Purpose**: Track performance and usage patterns for optimization.

**Key Metrics**:

```typescript
interface MetricsCollection {
  // Performance Metrics
  performance: {
    requestDuration: Histogram // Response time distribution
    databaseLatency: Histogram // Query execution time
    cacheHitRate: Gauge // Cache effectiveness
    errorRate: Counter // Errors per endpoint
    concurrentRequests: Gauge // Active request count
  }

  // Business Metrics
  business: {
    activeUsers: Gauge // Daily active users
    practiceSessionsCreated: Counter // New practice sessions
    scoreUploads: Counter // PDF uploads
    goalCompletions: Counter // Achieved goals
    syncOperations: Counter // Sync events
  }

  // Resource Metrics
  resources: {
    cpuMilliseconds: Counter // CPU usage (Cloudflare)
    memoryUsage: Gauge // Memory consumption
    kvOperations: Counter // KV reads/writes
    r2Operations: Counter // Object storage ops
    d1Queries: Counter // Database queries
  }

  // Infrastructure Metrics
  infrastructure: {
    workerErrors: Counter // Worker crashes
    rateLimit: Counter // Rate limit hits
    coldStarts: Counter // Worker initializations
    edgeLocation: Labels // Request geography
  }
}

// Prometheus-compatible output
function formatMetrics(): string {
  return `
# HELP http_request_duration_seconds Request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} ${bucket_0_1}
http_request_duration_seconds_bucket{le="0.5"} ${bucket_0_5}
http_request_duration_seconds_bucket{le="1"} ${bucket_1}
http_request_duration_seconds_bucket{le="5"} ${bucket_5}
http_request_duration_seconds_bucket{le="+Inf"} ${bucket_inf}
http_request_duration_seconds_sum ${sum}
http_request_duration_seconds_count ${count}

# HELP active_users_total Current active users
# TYPE active_users_total gauge
active_users_total ${activeUsers}

# HELP error_rate Errors per second
# TYPE error_rate gauge
error_rate ${errorRate}
  `.trim()
}
```

### 3. Logging Strategy

**Purpose**: Capture detailed information for debugging and audit trails.

**Structured Logging**:

```typescript
interface LoggingStrategy {
  // Log levels and when to use them
  levels: {
    ERROR: 'Actionable errors requiring immediate attention',
    WARN: 'Potential issues or degraded performance',
    INFO: 'Normal operations and state changes',
    DEBUG: 'Detailed debugging information',
    TRACE: 'Very detailed execution flow'
  },

  // Structured log format
  logFormat(level: LogLevel, message: string, context: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: env.SERVICE_NAME,
      environment: env.ENVIRONMENT,
      requestId: context.requestId || crypto.randomUUID(),
      userId: context.userId,
      // Cloudflare specific
      rayId: context.headers?.['cf-ray'],
      colo: context.headers?.['cf-ipcountry'],
      // Execution context
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      duration: context.duration,
      // Error details
      error: context.error ? {
        message: context.error.message,
        stack: context.error.stack,
        type: context.error.constructor.name
      } : undefined,
      // Custom fields
      ...context.custom
    }
  },

  // Cloudflare logging
  async log(entry: LogEntry): Promise<void> {
    // Console for wrangler tail
    console.log(JSON.stringify(entry))

    // Send to Analytics Engine for aggregation
    if (env.ANALYTICS) {
      await env.ANALYTICS.writeDataPoint({
        blobs: [entry.message, entry.error?.message].filter(Boolean),
        doubles: [entry.duration, entry.statusCode].filter(Boolean),
        indexes: [entry.level, entry.endpoint].filter(Boolean)
      })
    }

    // Critical errors to external service
    if (entry.level === 'ERROR' && env.ERROR_WEBHOOK) {
      await this.sendErrorNotification(entry)
    }
  }
}
```

## Debugging Tools

### 1. Wrangler Tail - Real-time Logs

**Purpose**: Stream live logs from production Workers.

**Usage Patterns**:

```bash
# Basic tailing
wrangler tail --env production

# Filter for errors
wrangler tail --env production --status 500-599

# Search for specific user
wrangler tail --env production --search "user123"

# Format as JSON for processing
wrangler tail --env production --format json | jq '.logs[] | select(.level == "ERROR")'

# Save for analysis
wrangler tail --env production > debug-session.log

# Follow specific request
wrangler tail --env production --header "X-Request-Id:req-abc123"
```

**Advanced Debugging Session**:

```typescript
interface DebugSession {
  // Add debug headers to trace requests
  addDebugHeaders(response: Response): Response {
    response.headers.set('X-Worker-Version', env.VERSION)
    response.headers.set('X-Request-Id', this.requestId)
    response.headers.set('X-Execution-Time', `${Date.now() - this.startTime}ms`)
    response.headers.set('X-Database-Queries', this.queryCount.toString())
    response.headers.set('X-Cache-Status', this.cacheHit ? 'HIT' : 'MISS')
    response.headers.set('X-Edge-Location', this.edgeLocation)

    if (env.DEBUG_MODE) {
      response.headers.set('X-Debug-Info', JSON.stringify({
        queries: this.executedQueries,
        cacheKeys: this.accessedCacheKeys,
        externalCalls: this.externalApiCalls
      }))
    }

    return response
  },

  // Request tracing
  async traceRequest(request: Request): Promise<TraceData> {
    const trace = {
      id: crypto.randomUUID(),
      start: Date.now(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      steps: []
    }

    // Instrument each operation
    this.onOperation = (op) => {
      trace.steps.push({
        timestamp: Date.now() - trace.start,
        operation: op.type,
        details: op.details,
        duration: op.duration
      })
    }

    return trace
  }
}
```

### 2. Error Diagnosis

**Purpose**: Quickly identify and resolve production issues.

**Error Categories and Solutions**:

```typescript
interface ErrorDiagnosis {
  // Common Cloudflare Worker errors
  errors: {
    CPU_EXCEEDED: {
      symptoms: ['Worker exceeded CPU time limit', '503 errors']
      diagnosis: 'Check for infinite loops, optimize queries, use streaming'
      solution: `
        1. Profile code to find bottlenecks
        2. Implement pagination for large datasets
        3. Use KV cache for expensive computations
        4. Consider using Durable Objects for state
      `
    }

    MEMORY_LIMIT: {
      symptoms: ['Worker exceeded memory limit', 'Crash without error']
      diagnosis: 'Large data in memory, memory leaks'
      solution: `
        1. Stream large responses instead of buffering
        2. Clear references to large objects
        3. Use R2 for large file storage
        4. Implement chunked processing
      `
    }

    SUBREQUEST_LIMIT: {
      symptoms: ['Too many subrequests', 'API calls failing']
      diagnosis: 'Making too many external requests'
      solution: `
        1. Batch API calls with Promise.all()
        2. Implement request coalescing
        3. Cache external API responses
        4. Use queues for async processing
      `
    }

    D1_TIMEOUT: {
      symptoms: ['D1 query timeout', 'Database unresponsive']
      diagnosis: 'Complex queries, missing indexes'
      solution: `
        1. Add indexes to frequently queried columns
        2. Simplify complex queries
        3. Use EXPLAIN QUERY PLAN to analyze
        4. Implement query result caching
      `
    }

    KV_CONSISTENCY: {
      symptoms: ['Stale data after write', 'Race conditions']
      diagnosis: 'KV eventual consistency issues'
      solution: `
        1. Implement read-after-write patterns
        2. Use cache.waitUntil() for writes
        3. Add versioning to cached data
        4. Use D1 for strong consistency needs
      `
    }
  }

  // Diagnostic queries
  diagnosticQueries: {
    slowQueries: `
      SELECT sql, execution_time
      FROM query_log
      WHERE execution_time > 100
      ORDER BY execution_time DESC
      LIMIT 10
    `

    errorPatterns: `
      SELECT error_message, COUNT(*) as count
      FROM error_log
      WHERE timestamp > datetime('now', '-1 hour')
      GROUP BY error_message
      ORDER BY count DESC
    `

    userImpact: `
      SELECT user_id, COUNT(*) as error_count
      FROM error_log
      WHERE timestamp > datetime('now', '-1 hour')
      GROUP BY user_id
      HAVING error_count > 5
    `
  }
}
```

### 3. Performance Profiling

**Purpose**: Identify and resolve performance bottlenecks.

**Profiling Implementation**:

```typescript
class PerformanceProfiler {
  private timings: Map<string, number[]> = new Map()
  private marks: Map<string, number> = new Map()

  // Mark start of operation
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  // Measure operation duration
  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)
    if (!start) throw new Error(`Mark ${startMark} not found`)

    const duration = performance.now() - start

    if (!this.timings.has(name)) {
      this.timings.set(name, [])
    }
    this.timings.get(name)!.push(duration)

    return duration
  }

  // Get performance report
  getReport(): PerformanceReport {
    const report: PerformanceReport = {}

    for (const [name, durations] of this.timings) {
      report[name] = {
        count: durations.length,
        total: durations.reduce((a, b) => a + b, 0),
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      }
    }

    return report
  }

  // Database query profiling
  async profileQuery<T>(
    query: string,
    params: any[],
    db: D1Database
  ): Promise<T> {
    this.mark(`query_${query.substring(0, 50)}`)

    try {
      // Explain query plan
      if (env.PROFILE_MODE) {
        const plan = await db
          .prepare(`EXPLAIN QUERY PLAN ${query}`)
          .bind(...params)
          .all()

        console.log('Query plan:', plan)
      }

      // Execute query
      const result = await db
        .prepare(query)
        .bind(...params)
        .first()

      const duration = this.measure(
        'database_query',
        `query_${query.substring(0, 50)}`
      )

      // Log slow queries
      if (duration > 100) {
        console.warn(`Slow query (${duration}ms):`, query)
      }

      return result as T
    } catch (error) {
      this.measure('database_error', `query_${query.substring(0, 50)}`)
      throw error
    }
  }

  // API call profiling
  async profileFetch(url: string, options?: RequestInit): Promise<Response> {
    const urlObj = new URL(url)
    const endpoint = `${urlObj.hostname}${urlObj.pathname}`

    this.mark(`fetch_${endpoint}`)

    try {
      const response = await fetch(url, options)

      const duration = this.measure('external_api', `fetch_${endpoint}`)

      // Track by status
      this.measure(`api_${response.status}`, `fetch_${endpoint}`)

      return response
    } catch (error) {
      this.measure('api_error', `fetch_${endpoint}`)
      throw error
    }
  }
}
```

## Performance Optimization

### 1. Caching Strategy

**Purpose**: Reduce latency and computational overhead.

**Multi-layer Caching**:

```typescript
class CacheStrategy {
  // Cache layers from fastest to slowest
  layers = {
    memory: new MemoryCache(100), // In-request cache
    kv: env.CACHE_KV, // Edge KV namespace
    cdn: caches.default, // Cloudflare CDN cache
  }

  async get(key: string): Promise<any> {
    // Check memory cache
    const memoryHit = this.layers.memory.get(key)
    if (memoryHit) {
      this.metrics.cacheHit('memory')
      return memoryHit
    }

    // Check KV cache
    const kvHit = await this.layers.kv.get(key, 'json')
    if (kvHit) {
      this.metrics.cacheHit('kv')
      this.layers.memory.set(key, kvHit)
      return kvHit
    }

    // Check CDN cache
    const request = new Request(`https://cache.internal/${key}`)
    const cdnHit = await this.layers.cdn.match(request)
    if (cdnHit) {
      this.metrics.cacheHit('cdn')
      const data = await cdnHit.json()
      this.layers.memory.set(key, data)
      await this.layers.kv.put(key, JSON.stringify(data))
      return data
    }

    this.metrics.cacheMiss()
    return null
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Set in all layers
    this.layers.memory.set(key, value)

    await this.layers.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    })

    const response = new Response(JSON.stringify(value), {
      headers: {
        'Cache-Control': `public, max-age=${ttl}`,
        'Content-Type': 'application/json',
      },
    })

    const request = new Request(`https://cache.internal/${key}`)
    await this.layers.cdn.put(request, response)
  }

  // Cache invalidation
  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    this.layers.memory.clear(pattern)

    // Clear KV cache
    const keys = await this.layers.kv.list({ prefix: pattern })
    await Promise.all(keys.keys.map(key => this.layers.kv.delete(key.name)))

    // CDN cache purge (requires API call)
    await this.purgeCDNCache(pattern)
  }
}
```

### 2. Query Optimization

**Purpose**: Minimize database latency and resource usage.

**Optimization Techniques**:

```typescript
class QueryOptimizer {
  // Index management
  async analyzeIndexes(): Promise<IndexReport> {
    // Find missing indexes
    const slowQueries = await db
      .prepare(
        `
      SELECT sql, execution_time
      FROM query_log
      WHERE execution_time > 50
    `
      )
      .all()

    const recommendations = []

    for (const query of slowQueries.results) {
      const plan = await db.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all()

      if (plan.results.some(r => r.detail?.includes('SCAN'))) {
        recommendations.push({
          query: query.sql,
          suggestion: 'Add index to avoid table scan',
          impact: 'high',
        })
      }
    }

    return { recommendations }
  }

  // Query batching
  async batchQueries(queries: Query[]): Promise<any[]> {
    // Group similar queries
    const grouped = this.groupQueries(queries)

    const results = []

    for (const group of grouped) {
      if (group.length === 1) {
        // Single query
        results.push(
          await db
            .prepare(group[0].sql)
            .bind(...group[0].params)
            .first()
        )
      } else {
        // Batch with IN clause
        const ids = group.map(q => q.params[0])
        const batchResult = await db
          .prepare(
            `
          SELECT * FROM ${group[0].table}
          WHERE id IN (${ids.map(() => '?').join(',')})
        `
          )
          .bind(...ids)
          .all()

        results.push(...batchResult.results)
      }
    }

    return results
  }

  // Connection pooling simulation
  async withConnection<T>(
    operation: (db: D1Database) => Promise<T>
  ): Promise<T> {
    // D1 handles connection pooling internally
    // This wrapper adds retry logic

    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        return await operation(db)
      } catch (error) {
        attempts++

        if (error.message.includes('SQLITE_BUSY')) {
          // Database locked, wait and retry
          await this.delay(Math.pow(2, attempts) * 100)
          continue
        }

        throw error
      }
    }

    throw new Error('Database operation failed after retries')
  }
}
```

### 3. Resource Management

**Purpose**: Efficiently use Cloudflare Worker resources.

**Resource Optimization**:

```typescript
class ResourceManager {
  // Memory management
  async processLargeDataset(data: any[]): AsyncIterator<any> {
    // Use generators to avoid loading all data in memory
    async function* chunkedProcess() {
      const chunkSize = 100

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)

        // Process chunk
        const processed = await this.processChunk(chunk)

        // Yield results
        for (const item of processed) {
          yield item
        }

        // Allow other operations
        await scheduler.yield()
      }
    }

    return chunkedProcess()
  }

  // CPU management
  async cpuIntensiveTask(input: any): Promise<any> {
    // Check remaining CPU time
    const startCpu = performance.now()
    const cpuLimit = 50 // 50ms limit for Cloudflare Workers

    // Break task into smaller pieces
    const chunks = this.splitTask(input)
    const results = []

    for (const chunk of chunks) {
      // Process chunk
      const result = await this.processChunk(chunk)
      results.push(result)

      // Check CPU usage
      if (performance.now() - startCpu > cpuLimit * 0.8) {
        // Getting close to limit, defer remaining work
        await this.deferToQueue(chunks.slice(chunks.indexOf(chunk) + 1))
        break
      }
    }

    return results
  }

  // Streaming responses
  async streamLargeResponse(data: AsyncIterator<any>): Promise<Response> {
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    // Stream data asynchronously
    ctx.waitUntil(
      (async () => {
        try {
          await writer.write(new TextEncoder().encode('['))

          let first = true
          for await (const item of data) {
            if (!first) {
              await writer.write(new TextEncoder().encode(','))
            }
            await writer.write(new TextEncoder().encode(JSON.stringify(item)))
            first = false
          }

          await writer.write(new TextEncoder().encode(']'))
        } finally {
          await writer.close()
        }
      })()
    )

    return new Response(readable, {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

## Incident Response

### 1. Alert System

**Purpose**: Rapid notification of critical issues.

**Alert Configuration**:

```typescript
interface AlertSystem {
  // Alert levels and routing
  alerts: {
    critical: {
      conditions: [
        'error_rate > 0.1',
        'response_time_p95 > 5000',
        'database_connection_failed',
        'auth_service_down'
      ],
      channels: ['pagerduty', 'slack_critical', 'email_oncall'],
      response_time: '5 minutes'
    },

    warning: {
      conditions: [
        'error_rate > 0.05',
        'response_time_p95 > 2000',
        'cache_hit_rate < 0.5',
        'queue_depth > 1000'
      ],
      channels: ['slack_monitoring', 'email_team'],
      response_time: '30 minutes'
    },

    info: {
      conditions: [
        'deployment_complete',
        'backup_complete',
        'scale_event'
      ],
      channels: ['slack_general'],
      response_time: 'next business day'
    }
  },

  // Alert webhook handler
  async sendAlert(alert: Alert): Promise<void> {
    const payload = {
      level: alert.level,
      service: alert.service,
      environment: env.ENVIRONMENT,
      message: alert.message,
      timestamp: new Date().toISOString(),
      metrics: alert.metrics,
      runbook: this.getRunbookUrl(alert.type),
      dashboards: this.getDashboardUrls(alert.service)
    }

    // Send to appropriate channels
    await Promise.all(
      this.alerts[alert.level].channels.map(channel =>
        this.sendToChannel(channel, payload)
      )
    )
  }
}
```

### 2. Runbooks

**Purpose**: Standardized response procedures for common incidents.

**Example Runbook**:

````markdown
## Runbook: High Error Rate

### Alert Condition

Error rate exceeds 10% for more than 5 minutes

### Impact

Users experiencing failures when using the application

### Diagnosis Steps

1. Check wrangler tail for error patterns:
   ```bash
   wrangler tail --env production --status 500-599
   ```
````

2. Check health endpoints:

   ```bash
   curl https://api.mirubato.com/health
   ```

3. Review recent deployments:

   ```bash
   wrangler deployments list
   ```

4. Check external dependencies:
   - Google OAuth status
   - Resend email service
   - Cloudflare status page

### Mitigation Steps

#### Quick Fix (< 5 minutes)

1. Rollback to previous version:

   ```bash
   wrangler rollback --env production
   ```

2. Enable degraded mode:
   ```bash
   wrangler secret put DEGRADED_MODE true --env production
   ```

#### Investigation (< 30 minutes)

1. Identify error pattern in logs
2. Check for database issues
3. Verify external service connectivity
4. Review recent code changes

#### Resolution

1. Deploy fix
2. Verify error rate returns to normal
3. Document root cause
4. Update monitoring if needed

### Escalation

- After 15 minutes: Page on-call engineer
- After 30 minutes: Escalate to team lead
- After 1 hour: Executive notification

````

### 3. Post-Incident Review

**Purpose**: Learn from incidents to prevent recurrence.

**Review Template**:

```typescript
interface PostIncidentReview {
  incident: {
    id: string,
    title: string,
    severity: 'critical' | 'major' | 'minor',
    duration: number, // minutes
    impact: {
      usersAffected: number,
      requestsFailed: number,
      dataLoss: boolean
    }
  },

  timeline: [
    { time: '00:00', event: 'Alert triggered' },
    { time: '00:05', event: 'Engineer acknowledged' },
    { time: '00:15', event: 'Root cause identified' },
    { time: '00:30', event: 'Fix deployed' },
    { time: '00:45', event: 'Incident resolved' }
  ],

  rootCause: {
    description: string,
    category: 'code' | 'config' | 'infrastructure' | 'external',
    preventable: boolean
  },

  actionItems: [
    {
      description: 'Add monitoring for X',
      owner: 'engineering',
      deadline: '2024-12-31'
    },
    {
      description: 'Update runbook for Y',
      owner: 'operations',
      deadline: '2024-12-15'
    }
  ],

  lessonsLearned: [
    'Need better alerting for edge cases',
    'Deployment rollback was effective',
    'Communication channels worked well'
  ]
}
````

## Continuous Improvement

### Performance Benchmarks

```typescript
interface PerformanceBenchmarks {
  // Target metrics
  targets: {
    responseTime: {
      p50: 100,  // ms
      p95: 500,  // ms
      p99: 1000  // ms
    },
    errorRate: 0.001,     // 0.1%
    availability: 0.999,   // 99.9%
    cacheHitRate: 0.8,    // 80%
    deploymentSuccess: 0.95 // 95%
  },

  // Regular performance testing
  async runBenchmark(): Promise<BenchmarkResult> {
    const results = await this.loadTest({
      duration: '5m',
      rps: 100,
      endpoints: [
        '/health',
        '/api/logbook/entries',
        '/api/repertoire'
      ]
    })

    return {
      passed: this.checkTargets(results),
      metrics: results,
      recommendations: this.analyzeResults(results)
    }
  }
}
```

### Optimization Cycle

1. **Measure**: Collect metrics continuously
2. **Analyze**: Identify bottlenecks and issues
3. **Optimize**: Implement improvements
4. **Validate**: Confirm improvements work
5. **Document**: Update runbooks and docs
6. **Repeat**: Continuous improvement

## Success Metrics

**Operational Excellence**:

- Mean Time To Detection (MTTD) < 5 minutes
- Mean Time To Resolution (MTTR) < 30 minutes
- Alert accuracy > 95% (low false positives)
- Runbook coverage > 80% of incidents
- Post-incident reviews within 48 hours

**Performance Targets**:

- API response time p95 < 500ms
- Error rate < 0.1%
- Availability > 99.9%
- Cache hit rate > 80%
- Database query time p95 < 100ms

## Related Documentation

- [Architecture](../01-architecture/overview.md) - System design
- [Health Checks](../03-api/service-apis.md) - API endpoints
- [Database](../02-database/schema.md) - Query optimization
- [Third-Party](./third-party.md) - External services

---

_Last updated: 2025-09-09 | Version 1.7.6_
