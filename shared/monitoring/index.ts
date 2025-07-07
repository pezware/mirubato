// Lightweight monitoring library for Cloudflare Workers
// Designed for minimal overhead (<1ms) and zero dependencies

export interface MetricOptions {
  index?: string
  sample?: number // 0-1, percentage to sample
  blobs?: Record<string, string>
  doubles?: Record<string, number>
}

export interface MonitorConfig {
  maxPointsPerInvocation?: number
  defaultSampleRate?: number
  enableConsoleErrors?: boolean
}

export class Monitor {
  private analyticsEngine: AnalyticsEngineDataset
  private requestId: string
  private invocationStart: number
  private dataPointCount = 0
  private readonly maxPointsPerInvocation: number
  private readonly defaultSampleRate: number
  private readonly enableConsoleErrors: boolean

  constructor(
    analyticsEngine: AnalyticsEngineDataset,
    requestId: string,
    config: MonitorConfig = {}
  ) {
    this.analyticsEngine = analyticsEngine
    this.requestId = requestId
    this.invocationStart = Date.now()
    this.maxPointsPerInvocation = config.maxPointsPerInvocation ?? 25
    this.defaultSampleRate = config.defaultSampleRate ?? 1
    this.enableConsoleErrors = config.enableConsoleErrors ?? false
  }

  // Track a metric with automatic sampling
  async track(event: string, options: MetricOptions = {}): Promise<void> {
    // Respect the 25 data points per invocation limit
    if (this.dataPointCount >= this.maxPointsPerInvocation) {
      return
    }

    // Apply sampling
    const sampleRate = options.sample ?? this.defaultSampleRate
    if (sampleRate < 1 && Math.random() > sampleRate) {
      return
    }

    try {
      const blobs = {
        event,
        requestId: this.requestId,
        ...options.blobs,
      }

      const doubles = {
        timestamp: Date.now(),
        ...options.doubles,
      }

      // Index optimization: combine high-cardinality fields
      const index = options.index || event

      this.analyticsEngine.writeDataPoint({
        indexes: [index],
        blobs,
        doubles,
      })

      this.dataPointCount++
    } catch (error) {
      // Fail silently to not impact application
      if (this.enableConsoleErrors) {
        console.error('Monitoring error:', error)
      }
    }
  }

  // Track request completion with automatic metrics
  async trackRequest(
    status: number,
    responseTime: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const cpuTime = Date.now() - this.invocationStart

    await this.track('request', {
      index: `request:${status >= 500 ? 'error' : status >= 400 ? 'client_error' : 'success'}`,
      blobs: {
        status: status.toString(),
        path: metadata.path || 'unknown',
        method: metadata.method || 'unknown',
        worker: metadata.worker || 'unknown',
        ...metadata,
      },
      doubles: {
        responseTime,
        cpuTime,
        status,
      },
      sample: status >= 500 ? 1 : 0.1, // Always track errors, sample 10% of success
    })
  }

  // Track errors with full context
  async trackError(
    error: Error,
    context: Record<string, any> = {}
  ): Promise<void> {
    await this.track('error', {
      index: `error:${error.name}`,
      blobs: {
        message: error.message.substring(0, 1000), // Limit size
        stack: error.stack?.substring(0, 4000) || '',
        worker: context.worker || 'unknown',
        ...context,
      },
      doubles: {
        timestamp: Date.now(),
      },
      sample: 1, // Always track errors
    })
  }

  // Track custom business metrics
  async trackBusiness(
    metric: string,
    value: number,
    dimensions: Record<string, string> = {}
  ): Promise<void> {
    await this.track('business', {
      index: `business:${metric}`,
      blobs: {
        metric,
        ...dimensions,
      },
      doubles: {
        value,
      },
      sample: 0.5, // Sample 50% of business metrics
    })
  }

  // Track resource usage
  async trackResource(
    resource: string,
    usage: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.track('resource', {
      index: `resource:${resource}`,
      blobs: {
        resource,
        worker: metadata.worker || 'unknown',
        ...metadata,
      },
      doubles: {
        usage,
      },
      sample: 0.2, // Sample 20% of resource metrics
    })
  }

  // Track performance metrics
  async trackPerformance(
    operation: string,
    duration: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.track('performance', {
      index: `performance:${operation}`,
      blobs: {
        operation,
        worker: metadata.worker || 'unknown',
        ...metadata,
      },
      doubles: {
        duration,
      },
      sample: metadata.sample ?? 0.1, // Default 10% sampling
    })
  }

  // Get current metrics count
  getDataPointCount(): number {
    return this.dataPointCount
  }

  // Get elapsed time since monitor creation
  getElapsedTime(): number {
    return Date.now() - this.invocationStart
  }
}

// Helper to create monitor instance
export function createMonitor(
  env: { ANALYTICS: AnalyticsEngineDataset },
  request: Request,
  config?: MonitorConfig
): Monitor {
  const requestId = request.headers.get('cf-ray') || crypto.randomUUID()
  return new Monitor(env.ANALYTICS, requestId, config)
}

// Adaptive sampling based on traffic
export function getAdaptiveSampleRate(requestsPerMinute: number): number {
  if (requestsPerMinute < 100) return 1.0 // Sample everything
  if (requestsPerMinute < 1000) return 0.5 // Sample 50%
  if (requestsPerMinute < 10000) return 0.1 // Sample 10%
  return 0.01 // Sample 1%
}

// Cost tracking helpers
export const CLOUDFLARE_COSTS = {
  requests: 0.15 / 1_000_000, // $0.15 per million requests
  cpu_time: 0.02 / 1_000_000, // $0.02 per million CPU milliseconds
  d1_reads: 0.001 / 1_000_000, // $0.001 per million D1 reads
  d1_writes: 1.0 / 1_000_000, // $1.00 per million D1 writes
  r2_storage: 0.015 / 1_000_000_000, // $0.015 per GB-month
  r2_operations: 0.36 / 1_000_000, // $0.36 per million operations
  analytics_writes: 0.25 / 1_000_000, // $0.25 per million writes
  analytics_queries: 0.001, // $0.001 per query
  kv_reads: 0.5 / 1_000_000, // $0.50 per million reads
  kv_writes: 5.0 / 1_000_000, // $5.00 per million writes
  kv_storage: 0.5, // $0.50 per GB-month
  browser_api: 0.02 / 1_000, // $0.02 per 1000 operations
  ai_operations: 0.01 / 1_000, // $0.01 per 1000 tokens
}

// Calculate cost for a resource
export function calculateCost(resource: string, usage: number): number {
  return (
    usage * (CLOUDFLARE_COSTS[resource as keyof typeof CLOUDFLARE_COSTS] || 0)
  )
}

// Batch metric writer for efficient bulk operations
export class BatchMetricWriter {
  private batch: Array<{
    event: string
    options: MetricOptions
  }> = []
  private monitor: Monitor

  constructor(monitor: Monitor) {
    this.monitor = monitor
  }

  add(event: string, options: MetricOptions = {}): void {
    this.batch.push({ event, options })
  }

  async flush(): Promise<void> {
    for (const { event, options } of this.batch) {
      await this.monitor.track(event, options)
    }
    this.batch = []
  }

  size(): number {
    return this.batch.length
  }
}

// Types for TypeScript support
export interface AnalyticsEngineDataset {
  writeDataPoint(point: {
    indexes: string[]
    blobs?: Record<string, string>
    doubles?: Record<string, number>
  }): void
}

export interface MonitoringEnv {
  ANALYTICS: AnalyticsEngineDataset
}
