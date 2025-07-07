# Monitoring Infrastructure Deployment Guide

This guide walks through deploying the Mirubato monitoring infrastructure from scratch.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Access to create D1 databases, KV namespaces, and R2 buckets

## Step 1: Create Cloudflare Resources

### 1.1 Create Analytics Engine Dataset

```bash
# This is done via Cloudflare dashboard
# Go to Analytics Engine and create a dataset named "mirubato_metrics"
```

### 1.2 Create D1 Database

```bash
# Production
wrangler d1 create mirubato-monitoring

# Staging
wrangler d1 create mirubato-monitoring-staging
```

Save the database IDs from the output.

### 1.3 Create KV Namespace

```bash
# Production
wrangler kv:namespace create "METRICS_CACHE"

# Staging
wrangler kv:namespace create "METRICS_CACHE" --preview
```

Save the namespace IDs from the output.

### 1.4 Create R2 Bucket

```bash
# Production
wrangler r2 bucket create mirubato-monitoring-reports

# Staging
wrangler r2 bucket create mirubato-monitoring-reports-staging
```

### 1.5 Create Queue

```bash
# Production
wrangler queues create monitoring-alerts

# Staging
wrangler queues create monitoring-alerts-staging
```

## Step 2: Update Configuration

Update `monitoring/wrangler.toml` with the IDs from Step 1:

```toml
# Production
[[d1_databases]]
binding = "DB"
database_name = "mirubato-monitoring"
database_id = "YOUR_PROD_DATABASE_ID"

[[kv_namespaces]]
binding = "METRICS_CACHE"
id = "YOUR_PROD_KV_ID"

# Staging
[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "mirubato-monitoring-staging"
database_id = "YOUR_STAGING_DATABASE_ID"

[[env.staging.kv_namespaces]]
binding = "METRICS_CACHE"
id = "YOUR_STAGING_KV_ID"
```

## Step 3: Set Secrets

### 3.1 Production Secrets

```bash
cd monitoring

# Slack webhook (optional)
wrangler secret put SLACK_WEBHOOK_URL
# Enter: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty key (optional)
wrangler secret put PAGERDUTY_KEY
# Enter: YOUR_PAGERDUTY_INTEGRATION_KEY

# Email API key (optional)
wrangler secret put EMAIL_API_KEY
# Enter: YOUR_EMAIL_SERVICE_API_KEY
```

### 3.2 Staging Secrets

```bash
# Repeat for staging environment
wrangler secret put SLACK_WEBHOOK_URL --env staging
wrangler secret put PAGERDUTY_KEY --env staging
wrangler secret put EMAIL_API_KEY --env staging
```

## Step 4: Deploy the Worker

### 4.1 Install Dependencies

```bash
cd monitoring
npm install
```

### 4.2 Deploy to Staging First

```bash
# Deploy to staging
wrangler deploy --env staging

# Run database migrations
wrangler d1 execute mirubato-monitoring-staging --file=./schema.sql --env staging
```

### 4.3 Test Staging Deployment

```bash
# Health check
curl https://monitoring-staging.mirubato.com/api/health

# Should return:
# {"status":"healthy","checks":{...},"timestamp":"..."}
```

### 4.4 Deploy to Production

```bash
# Deploy to production
wrangler deploy

# Run database migrations
wrangler d1 execute mirubato-monitoring --file=./schema.sql
```

## Step 5: Update Existing Workers

### 5.1 API Worker

Update `api/wrangler.toml`:

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "mirubato_metrics"

[observability.logs]
enabled = true
```

Update `api/src/index.ts`:

```typescript
import { createMonitor } from '../../shared/monitoring'

// Add monitoring to your Hono app
app.use('*', async (c, next) => {
  const monitor = createMonitor(c.env, c.req.raw)
  const startTime = Date.now()

  try {
    await next()

    await monitor.trackRequest(c.res.status, Date.now() - startTime, {
      path: new URL(c.req.url).pathname,
      method: c.req.method,
      worker: 'api',
    })
  } catch (error) {
    await monitor.trackError(error as Error, {
      worker: 'api',
      url: c.req.url,
    })
    throw error
  }
})
```

### 5.2 Scores Worker

Similar updates for `scores/wrangler.toml` and `scores/src/index.ts`.

### 5.3 Frontend Worker

Similar updates for `frontendv2/wrangler.toml` and `frontendv2/src/index.ts`.

## Step 6: Configure DNS

Add DNS records for the monitoring subdomain:

```
Type: CNAME
Name: monitoring
Content: monitoring.mirubato.workers.dev
Proxied: Yes

Type: CNAME
Name: monitoring-staging
Content: monitoring-staging.mirubato.workers.dev
Proxied: Yes
```

## Step 7: Verify Deployment

### 7.1 Check Health Endpoints

```bash
# Production
curl https://monitoring.mirubato.com/api/health

# API worker with monitoring
curl https://api.mirubato.com/health
```

### 7.2 Generate Test Traffic

Visit your application and perform various actions to generate metrics.

### 7.3 Check Dashboard

```bash
# View dashboard data
curl https://monitoring.mirubato.com/api/dashboard

# View recent metrics
curl https://monitoring.mirubato.com/api/metrics
```

### 7.4 Test Alerts

```bash
# Create a test alert
curl -X POST https://monitoring.mirubato.com/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alert",
    "metric": "test_metric",
    "condition": "greater_than",
    "threshold": 0,
    "severity": "info",
    "notification_channels": ["slack"]
  }'
```

## Step 8: Setup Grafana (Optional)

### 8.1 Add Data Source

In Grafana, add a new Prometheus data source:

- URL: `https://monitoring.mirubato.com/api/prometheus`
- HTTP Method: POST
- Custom HTTP Headers: Add any auth headers if needed

### 8.2 Import Dashboard

Import the example dashboard from `monitoring/grafana-dashboard.json`.

## Troubleshooting

### No Metrics Appearing

1. Check Analytics Engine binding in worker configs
2. Verify dataset name matches exactly
3. Check worker logs for errors: `wrangler tail`

### Alerts Not Working

1. Check Queue configuration
2. Verify webhook URLs are correct
3. Check alert rules are enabled
4. Review Queue logs: `wrangler tail --format pretty`

### Database Errors

1. Ensure migrations ran successfully
2. Check D1 binding configuration
3. Verify database IDs match

### Cost Concerns

1. Adjust sampling rates in worker code
2. Reduce data retention in cleanup job
3. Monitor costs via dashboard API

## Rollback Procedure

If issues occur:

```bash
# Rollback worker
wrangler rollback

# List previous deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback --deployment-id=<id>
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review cost reports
2. **Monthly**: Analyze performance trends
3. **Quarterly**: Review and adjust alert thresholds
4. **Yearly**: Archive old report data from R2

### Updating the Monitoring System

1. Always test in staging first
2. Monitor health checks during deployment
3. Have rollback plan ready
4. Communicate maintenance windows

## Security Considerations

1. **Secrets**: Never commit webhook URLs or API keys
2. **Access**: Limit who can modify alert rules
3. **Data**: Consider data retention policies
4. **Endpoints**: Add authentication if exposing sensitive metrics

## Support

For issues or questions:

1. Check logs: `wrangler tail`
2. Review health checks
3. Check Cloudflare status page
4. File issues in the repository
