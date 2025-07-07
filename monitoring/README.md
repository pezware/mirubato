# Mirubato Monitoring Infrastructure

A lightweight, cost-effective monitoring solution for Cloudflare Workers with <1ms overhead per metric.

## Features

- **Minimal Overhead**: <1ms per metric write
- **Zero Dependencies**: Uses only native Cloudflare APIs
- **Intelligent Sampling**: Reduce costs while maintaining visibility
- **Cost Tracking**: Built-in cost analysis and projections
- **Multi-Channel Alerts**: Slack, PagerDuty, and email support
- **Dashboard API**: Ready for Grafana or custom dashboards
- **Type-Safe**: Full TypeScript support

## Quick Start

### 1. Deploy the Monitoring Worker

```bash
cd monitoring
npm install
wrangler deploy

# Run database migrations
wrangler d1 execute mirubato-monitoring --file=./schema.sql
```

### 2. Add Monitoring to Your Workers

Update your worker's `wrangler.toml`:

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "mirubato_metrics"
```

Add monitoring to your worker:

```typescript
import { createMonitor } from '@shared/monitoring'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const monitor = createMonitor(env, request)
    const startTime = Date.now()

    try {
      const response = await handleRequest(request, env)

      await monitor.trackRequest(response.status, Date.now() - startTime, {
        path: new URL(request.url).pathname,
        method: request.method,
        worker: 'api',
      })

      return response
    } catch (error) {
      await monitor.trackError(error as Error, {
        worker: 'api',
        url: request.url,
      })

      return new Response('Internal Server Error', { status: 500 })
    }
  },
}
```

## Monitoring Library API

### Basic Usage

```typescript
// Create monitor instance
const monitor = createMonitor(env, request)

// Track requests
await monitor.trackRequest(status, responseTime, metadata)

// Track errors
await monitor.trackError(error, context)

// Track business metrics
await monitor.trackBusiness('signup', 1, { plan: 'pro' })

// Track resource usage
await monitor.trackResource('d1_reads', 5, { table: 'users' })

// Track performance
await monitor.trackPerformance('pdf_render', 1234, { pages: 10 })
```

### Sampling

Control costs with intelligent sampling:

```typescript
// Sample 10% of successful requests, 100% of errors
await monitor.track('request', {
  sample: status >= 500 ? 1.0 : 0.1,
  blobs: { status: status.toString() },
  doubles: { responseTime },
})

// Adaptive sampling based on traffic
const sampleRate = getAdaptiveSampleRate(requestsPerMinute)
```

### Batch Operations

For efficient bulk metrics:

```typescript
const batch = new BatchMetricWriter(monitor)

batch.add('metric1', { doubles: { value: 1 } })
batch.add('metric2', { doubles: { value: 2 } })
batch.add('metric3', { doubles: { value: 3 } })

await batch.flush()
```

## Dashboard API

### Endpoints

- `GET /api/metrics` - Query historical metrics
- `GET /api/costs` - Cost analysis and projections
- `GET /api/alerts` - Alert configuration
- `GET /api/dashboard` - Aggregated dashboard data
- `GET /api/prometheus` - Prometheus-compatible metrics
- `GET /api/health` - Service health check

### Query Examples

```bash
# Get metrics for the last hour
curl https://monitoring.mirubato.com/api/metrics?start=1h

# Get cost breakdown
curl https://monitoring.mirubato.com/api/costs?breakdown=true

# Get dashboard data
curl https://monitoring.mirubato.com/api/dashboard
```

## Alert Configuration

### Creating Alerts

```bash
curl -X POST https://monitoring.mirubato.com/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Error Rate",
    "metric": "error_rate",
    "condition": "greater_than",
    "threshold": 0.01,
    "window_minutes": 5,
    "severity": "critical",
    "notification_channels": ["slack", "pagerduty"]
  }'
```

### Built-in Alert Types

- **High Error Rate**: Triggers when error rate exceeds threshold
- **High Response Time**: Monitors P95 response times
- **Low Success Rate**: Tracks overall success percentage
- **High Queue Depth**: Monitors queue backlogs
- **Cost Alerts**: Triggers on spending thresholds

## Cost Management

### Estimated Costs (10M requests/month)

- Analytics Engine writes: ~$2.50
- D1 storage and queries: ~$1.00
- Worker invocations: ~$1.50
- **Total: ~$5/month**

### Cost Optimization

1. **Sampling Strategy**:
   - 100% of errors
   - 10% of successful requests
   - 50% of business metrics

2. **Data Retention**:
   - Raw metrics: 7 days
   - Hourly aggregates: 30 days
   - Daily summaries: 1 year

3. **Index Optimization**:
   - Keep indexes under 96 bytes
   - Use compound indexes for related queries

## Grafana Integration

Add as a Prometheus data source:

```yaml
apiVersion: 1
datasources:
  - name: Mirubato Monitoring
    type: prometheus
    url: https://monitoring.mirubato.com/api/prometheus
    jsonData:
      httpMethod: POST
```

## Architecture

```
Application Workers → Analytics Engine → Monitoring Worker → Dashboard/Alerts
                           ↓                    ↓
                      (metrics data)      D1 Database
                                         KV Cache
                                         R2 Reports
```

## Configuration

### Environment Variables

Set these as Worker secrets:

```bash
# Slack notifications
wrangler secret put SLACK_WEBHOOK_URL

# PagerDuty integration
wrangler secret put PAGERDUTY_KEY

# Email notifications (optional)
wrangler secret put EMAIL_API_KEY
```

### Worker Bindings

Required bindings in `wrangler.toml`:

- `ANALYTICS`: Analytics Engine dataset
- `DB`: D1 database
- `METRICS_CACHE`: KV namespace
- `ALERT_QUEUE`: Queue for alerts
- `REPORTS`: R2 bucket
- Service bindings to monitored workers

## Troubleshooting

### Common Issues

1. **No metrics appearing**:
   - Check Analytics Engine binding
   - Verify dataset name matches
   - Check for errors in worker logs

2. **Alerts not firing**:
   - Verify alert rules are enabled
   - Check notification channel configuration
   - Review alert history in database

3. **High costs**:
   - Adjust sampling rates
   - Reduce data retention
   - Optimize metric cardinality

### Debug Mode

Enable console errors for debugging:

```typescript
const monitor = createMonitor(env, request, {
  enableConsoleErrors: true,
})
```

## Development

### Running Locally

```bash
cd monitoring
npm install
npm run dev
```

### Running Tests

```bash
npm test
npm run test:coverage
```

### Database Migrations

```bash
# Local
npm run db:migrate

# Staging
npm run db:migrate:staging

# Production
npm run db:migrate:production
```

## Best Practices

1. **Always wrap monitoring code in try-catch** - Monitoring should never break your app
2. **Use appropriate sampling rates** - Balance visibility with cost
3. **Keep metric names consistent** - Use lowercase with underscores
4. **Limit cardinality** - Avoid high-cardinality labels in indexes
5. **Batch where possible** - Use BatchMetricWriter for bulk operations

## License

MIT
