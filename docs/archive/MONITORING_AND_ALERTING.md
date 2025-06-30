# Monitoring and Alerting Setup for Mirubato

## Overview

This document outlines the monitoring and alerting setup for the Mirubato PDF rendering system on Cloudflare Workers.

## Key Metrics to Monitor

### 1. Worker Metrics

#### Performance Metrics

- **Request Rate**: Number of requests per minute
- **Response Time**: P50, P95, P99 latencies
- **Error Rate**: 4xx and 5xx errors per minute
- **CPU Time**: Worker execution time
- **Memory Usage**: Worker memory consumption

#### PDF Rendering Specific

- **Render Success Rate**: Successful renders / Total render requests
- **Render Time**: Time to render each PDF page
- **Cache Hit Rate**: Cached responses / Total requests
- **Browser Rendering API Usage**: Sessions created/closed

### 2. Queue Metrics

#### PDF Processing Queue

- **Queue Depth**: Number of messages waiting
- **Processing Rate**: Messages processed per minute
- **Dead Letter Queue (DLQ) Count**: Failed messages
- **Processing Time**: Average time to process a PDF

### 3. Storage Metrics

#### R2 Storage

- **Storage Usage**: Total storage used
- **Request Rate**: GET/PUT operations per minute
- **Bandwidth**: Data transfer rates

#### KV Namespace

- **Key Count**: Number of cached items
- **Read/Write Rate**: Operations per minute
- **Hit Rate**: Successful reads / Total reads

### 4. Database Metrics (D1)

- **Query Performance**: Slow queries
- **Connection Count**: Active connections
- **Storage Size**: Database size

## Cloudflare Dashboard Setup

### 1. Analytics Dashboard

Navigate to your Cloudflare Dashboard → Workers & Pages → Analytics

**Default Metrics Available:**

- Requests
- Errors
- Subrequests
- Duration
- Data transfer

### 2. Custom Dashboards

Create custom dashboards for:

#### PDF Rendering Performance

```javascript
// Track render performance in your worker
export async function trackRenderMetrics(env: Env, metrics: {
  scoreId: string
  pageNumber: number
  renderTime: number
  cacheHit: boolean
  success: boolean
}) {
  // Log to Analytics Engine (if enabled)
  const event = {
    timestamp: Date.now(),
    scoreId: metrics.scoreId,
    pageNumber: metrics.pageNumber,
    renderTime: metrics.renderTime,
    cacheHit: metrics.cacheHit,
    success: metrics.success,
  }

  // Send to Analytics Engine
  if (env.ANALYTICS) {
    await env.ANALYTICS.writeDataPoint(event)
  }
}
```

#### Queue Health

```javascript
// Monitor queue depth
export async function checkQueueHealth(env: Env) {
  const queueStats = await env.PDF_QUEUE.getStats()

  if (queueStats.backlog > 1000) {
    // Alert: Queue is backing up
    await sendAlert(env, {
      level: 'warning',
      message: `Queue depth high: ${queueStats.backlog} messages`,
    })
  }

  if (queueStats.dlq > 0) {
    // Alert: Messages in DLQ
    await sendAlert(env, {
      level: 'error',
      message: `${queueStats.dlq} messages in Dead Letter Queue`,
    })
  }
}
```

## Alert Configuration

### 1. Worker Error Alerts

Set up alerts for:

```yaml
Worker 5xx Errors:
  Condition: error_rate > 1%
  Window: 5 minutes
  Action: Email + Slack notification

Worker Timeout:
  Condition: duration_p99 > 25s
  Window: 5 minutes
  Action: PagerDuty alert

Memory Limit:
  Condition: memory_usage > 120MB
  Window: 1 minute
  Action: Email notification
```

### 2. PDF Rendering Alerts

```yaml
Render Failure Rate:
  Condition: failure_rate > 5%
  Window: 10 minutes
  Action: Email + investigate logs

Browser API Timeout:
  Condition: browser_timeout_count > 10
  Window: 5 minutes
  Action: Check Browser API health

Cache Miss Rate High:
  Condition: cache_hit_rate < 50%
  Window: 15 minutes
  Action: Review caching strategy
```

### 3. Queue Alerts

```yaml
Queue Depth Critical:
  Condition: queue_depth > 5000
  Window: Immediate
  Action: Scale workers or pause uploads

DLQ Messages:
  Condition: dlq_count > 0
  Window: Immediate
  Action: Investigate failed messages

Processing Lag:
  Condition: oldest_message_age > 10 minutes
  Window: 5 minutes
  Action: Check worker health
```

## Implementation Examples

### 1. Health Check Endpoint

```typescript
// scores/src/api/handlers/health.ts enhancement
export async function enhancedHealthCheck(c: Context) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    metrics: {},
  }

  // Check Worker health
  health.services.worker = {
    status: 'healthy',
    memory: process.memoryUsage?.() || 'N/A',
  }

  // Check Queue health
  try {
    const queueStats = await c.env.PDF_QUEUE.getStats()
    health.services.queue = {
      status: queueStats.backlog < 1000 ? 'healthy' : 'degraded',
      backlog: queueStats.backlog,
      dlq: queueStats.dlq,
    }
  } catch (error) {
    health.services.queue = { status: 'error', error: error.message }
  }

  // Check R2 health
  try {
    const testKey = '__health_check_test'
    await c.env.SCORES_BUCKET.put(testKey, 'test')
    await c.env.SCORES_BUCKET.delete(testKey)
    health.services.r2 = { status: 'healthy' }
  } catch (error) {
    health.services.r2 = { status: 'error', error: error.message }
  }

  // Check rendering metrics
  const renderMetrics = await getRenderMetrics(c.env)
  health.metrics.rendering = renderMetrics

  // Determine overall health
  const hasUnhealthy = Object.values(health.services).some(
    s => s.status !== 'healthy'
  )
  health.status = hasUnhealthy ? 'degraded' : 'healthy'

  return c.json(health, hasUnhealthy ? 503 : 200)
}
```

### 2. Metrics Collection

```typescript
// scores/src/utils/metrics.ts
export class MetricsCollector {
  constructor(private env: Env) {}

  async recordRenderTime(
    scoreId: string,
    pageNumber: number,
    duration: number
  ) {
    const key = `metrics:render:${scoreId}:${pageNumber}`
    const data = {
      duration,
      timestamp: Date.now(),
    }

    // Store in KV with TTL
    await this.env.CACHE.put(key, JSON.stringify(data), {
      expirationTtl: 3600, // 1 hour
    })

    // Update aggregates
    await this.updateAggregates('render_time', duration)
  }

  async recordCacheHit(hit: boolean) {
    const key = `metrics:cache:${Date.now()}`
    await this.env.CACHE.put(key, JSON.stringify({ hit }), {
      expirationTtl: 3600,
    })
  }

  private async updateAggregates(metric: string, value: number) {
    // Implement sliding window aggregation
    const window = Math.floor(Date.now() / 60000) // 1-minute windows
    const key = `metrics:aggregate:${metric}:${window}`

    const existing = (await this.env.CACHE.get(key, { type: 'json' })) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
    }

    existing.count++
    existing.sum += value
    existing.min = Math.min(existing.min, value)
    existing.max = Math.max(existing.max, value)

    await this.env.CACHE.put(key, JSON.stringify(existing), {
      expirationTtl: 3600,
    })
  }
}
```

### 3. Alerting Integration

```typescript
// scores/src/utils/alerting.ts
export class AlertManager {
  constructor(private env: Env) {}

  async sendAlert(alert: {
    level: 'info' | 'warning' | 'error' | 'critical'
    title: string
    message: string
    details?: any
  }) {
    // Slack webhook integration
    if (this.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert)
    }

    // Email integration (using Cloudflare Email Workers)
    if (this.env.ALERT_EMAIL) {
      await this.sendEmailAlert(alert)
    }

    // Log to persistent storage
    await this.logAlert(alert)
  }

  private async sendSlackAlert(alert: any) {
    const color = {
      info: '#36a64f',
      warning: '#ff9800',
      error: '#f44336',
      critical: '#d32f2f',
    }[alert.level]

    await fetch(this.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            fields: alert.details
              ? Object.entries(alert.details).map(([k, v]) => ({
                  title: k,
                  value: String(v),
                  short: true,
                }))
              : [],
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    })
  }

  private async logAlert(alert: any) {
    const key = `alerts:${Date.now()}:${crypto.randomUUID()}`
    await this.env.CACHE.put(
      key,
      JSON.stringify({
        ...alert,
        timestamp: new Date().toISOString(),
      }),
      {
        expirationTtl: 86400 * 7, // Keep for 7 days
      }
    )
  }
}
```

## Monitoring Dashboard URLs

1. **Cloudflare Analytics**: `https://dash.cloudflare.com/[account-id]/workers/services/view/mirubato-scores/production`
2. **Queue Dashboard**: `https://dash.cloudflare.com/[account-id]/queues`
3. **R2 Dashboard**: `https://dash.cloudflare.com/[account-id]/r2/buckets`
4. **D1 Dashboard**: `https://dash.cloudflare.com/[account-id]/d1`

## Best Practices

1. **Set Up Dashboards Early**: Configure monitoring before issues arise
2. **Use Structured Logging**: Make logs searchable and parseable
3. **Monitor Business Metrics**: Track PDF renders, not just technical metrics
4. **Set Realistic Thresholds**: Avoid alert fatigue with proper thresholds
5. **Test Alerts**: Regularly verify alerts are working
6. **Document Runbooks**: Create guides for responding to each alert type

## Incident Response

### PDF Rendering Failures

1. Check Browser Rendering API status
2. Verify R2 bucket accessibility
3. Review worker logs for errors
4. Check queue depth and DLQ
5. Verify PDF validity

### High Queue Depth

1. Check worker scaling
2. Verify no infinite loops
3. Review processing times
4. Consider temporary rate limiting
5. Monitor memory usage

### Performance Degradation

1. Check cache hit rates
2. Review worker CPU usage
3. Analyze slow queries
4. Check external API latencies
5. Review recent deployments

## Cost Monitoring

Track these cost drivers:

1. **Worker Invocations**: Monitor request patterns
2. **Browser Rendering Sessions**: Track usage vs limits
3. **R2 Operations**: Monitor storage and bandwidth
4. **D1 Queries**: Track read/write operations
5. **Queue Messages**: Monitor message volume

## Summary

Effective monitoring and alerting is crucial for maintaining a reliable PDF rendering service. Focus on:

1. **Proactive Monitoring**: Catch issues before users notice
2. **Smart Alerting**: Alert on symptoms, not just errors
3. **Quick Recovery**: Have runbooks ready
4. **Continuous Improvement**: Learn from incidents

Remember to review and update monitoring as the system evolves.
