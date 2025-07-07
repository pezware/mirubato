import type {
  DurableObjectState,
  DurableObjectStorage,
} from '@cloudflare/workers-types'

interface MetricPoint {
  timestamp: number
  value: number
  worker: string
  metric: string
}

interface AggregatedMetric {
  count: number
  sum: number
  min: number
  max: number
  values: number[] // For percentile calculations
}

export class MetricAggregator {
  state: DurableObjectState
  storage: DurableObjectStorage
  metrics: Map<string, MetricPoint[]>
  aggregationWindow: number = 5 * 60 * 1000 // 5 minutes

  constructor(state: DurableObjectState) {
    this.state = state
    this.storage = state.storage
    this.metrics = new Map()
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    switch (path) {
      case '/add':
        return this.handleAdd(request)
      case '/aggregate':
        return this.handleAggregate(request)
      case '/flush':
        return this.handleFlush()
      case '/status':
        return this.handleStatus()
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  // Add a metric point
  async handleAdd(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as MetricPoint
      const key = `${body.worker}:${body.metric}`

      if (!this.metrics.has(key)) {
        this.metrics.set(key, [])
      }

      this.metrics.get(key)!.push(body)

      // Schedule aggregation if we have enough data
      const points = this.metrics.get(key)!
      if (points.length >= 100) {
        await this.aggregateMetrics(key)
      }

      return Response.json({ success: true, key, count: points.length })
    } catch (error) {
      return Response.json(
        { error: 'Failed to add metric', details: error },
        { status: 500 }
      )
    }
  }

  // Manually trigger aggregation
  async handleAggregate(request: Request): Promise<Response> {
    try {
      const results = []

      for (const [key, points] of this.metrics.entries()) {
        if (points.length > 0) {
          const result = await this.aggregateMetrics(key)
          results.push(result)
        }
      }

      return Response.json({ aggregated: results })
    } catch (error) {
      return Response.json(
        { error: 'Failed to aggregate', details: error },
        { status: 500 }
      )
    }
  }

  // Flush all metrics
  async handleFlush(): Promise<Response> {
    try {
      const count = this.metrics.size
      this.metrics.clear()
      return Response.json({ flushed: true, count })
    } catch (error) {
      return Response.json(
        { error: 'Failed to flush', details: error },
        { status: 500 }
      )
    }
  }

  // Get current status
  async handleStatus(): Promise<Response> {
    const status = {
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, points]) => [
          key,
          {
            count: points.length,
            oldest:
              points.length > 0
                ? new Date(points[0].timestamp).toISOString()
                : null,
            newest:
              points.length > 0
                ? new Date(points[points.length - 1].timestamp).toISOString()
                : null,
          },
        ])
      ),
      totalPoints: Array.from(this.metrics.values()).reduce(
        (sum, points) => sum + points.length,
        0
      ),
    }

    return Response.json(status)
  }

  // Aggregate metrics for a specific key
  async aggregateMetrics(key: string): Promise<any> {
    const points = this.metrics.get(key)
    if (!points || points.length === 0) return null

    // Sort by value for percentile calculations
    const values = points.map(p => p.value).sort((a, b) => a - b)

    const aggregated: AggregatedMetric = {
      count: points.length,
      sum: values.reduce((sum, v) => sum + v, 0),
      min: values[0],
      max: values[values.length - 1],
      values: values,
    }

    // Calculate percentiles
    const p50 = this.percentile(values, 0.5)
    const p95 = this.percentile(values, 0.95)
    const p99 = this.percentile(values, 0.99)

    // Store aggregated result
    const [worker, metric] = key.split(':')
    const result = {
      key,
      worker,
      metric,
      timestamp: new Date().toISOString(),
      count: aggregated.count,
      sum: aggregated.sum,
      avg: aggregated.sum / aggregated.count,
      min: aggregated.min,
      max: aggregated.max,
      p50,
      p95,
      p99,
    }

    // Store in Durable Object storage for persistence
    await this.storage.put(`aggregate:${key}:${Date.now()}`, result)

    // Clear the processed points
    this.metrics.set(key, [])

    return result
  }

  // Calculate percentile
  percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0

    const index = Math.ceil(sortedValues.length * p) - 1
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]
  }

  // Alarm handler for scheduled aggregation
  async alarm() {
    // Aggregate all metrics periodically
    for (const [key, points] of this.metrics.entries()) {
      if (points.length > 0) {
        await this.aggregateMetrics(key)
      }
    }
  }
}
