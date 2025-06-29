# Health Monitoring

## Overview

The Mirubato services (API and Scores) provide comprehensive health monitoring endpoints that allow you to check the status of each service and their dependencies. These endpoints are designed for use by monitoring systems, load balancers, and operational dashboards.

## Services

- **API Service**: `https://api.mirubato.com`
- **Scores Service**: `https://scores.mirubato.com` (staging: `https://scores-staging.mirubato.com`)

## Endpoints

### 1. Liveness Probe - `/livez`

**Purpose**: Simple check to verify the service is running and can respond to requests.

**Method**: `GET`

**Response**:

```json
{
  "status": "ok"
}
```

**Usage**: Kubernetes liveness probe, basic uptime monitoring

### 2. Readiness Probe - `/readyz`

**Purpose**: Check if the service is ready to handle traffic (database connectivity).

**Method**: `GET`

**Success Response** (200):

```json
{
  "status": "ready"
}
```

**Failure Response** (503):

```json
{
  "status": "not ready",
  "error": "Error: D1_ERROR: Connection refused"
}
```

**Usage**: Kubernetes readiness probe, load balancer health checks

### 3. Comprehensive Health Check - `/health`

**Purpose**: Full health status including all service dependencies and smoke tests.

**Method**: `GET`

**API Service Response** (200 if healthy, 503 if degraded):

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2024-06-27T05:10:00.000Z",
  "uptime": "N/A",
  "totalLatency": 245,
  "services": {
    "database": {
      "status": "healthy",
      "latency": 12
    },
    "auth": {
      "status": "healthy",
      "message": "All auth secrets configured"
    },
    "kvStore": {
      "status": "healthy",
      "latency": 34,
      "operation": "read/write test successful"
    },
    "rateLimiter": {
      "status": "healthy",
      "message": "Rate limiter not configured (optional)"
    },
    "smokeTests": {
      "status": "healthy",
      "tests": {
        "databaseQuery": true,
        "kvOperation": true,
        "authTokenGeneration": true
      },
      "message": "All smoke tests passed"
    }
  }
}
```

**Scores Service Response** (200 if healthy, 503 if degraded):

```json
{
  "status": "healthy",
  "service": "mirubato-scores",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2024-06-27T05:10:00.000Z",
  "uptime": "N/A",
  "totalLatency": 189,
  "services": {
    "database": {
      "status": "healthy",
      "latency": 15,
      "scoreCount": 1234
    },
    "storage": {
      "status": "healthy",
      "latency": 45,
      "accessible": true
    },
    "cache": {
      "status": "healthy",
      "latency": 23,
      "operation": "read/write test successful"
    },
    "auth": {
      "status": "healthy",
      "message": "JWT secret configured"
    },
    "smokeTests": {
      "status": "healthy",
      "tests": {
        "databaseQuery": true,
        "storageOperation": true,
        "cacheOperation": true,
        "authTokenValidation": true
      },
      "message": "All smoke tests passed"
    }
  }
}
```

**Features**:

- Parallel health checks for better performance
- Smoke tests for critical operations
- Latency measurements
- Graceful degradation (returns 503 but still provides diagnostic info)

### 4. Detailed Health Check - `/health/detailed`

**Purpose**: Extended health information for debugging and monitoring.

**Method**: `GET`

**Response**:

```json
{
  "timestamp": "2024-06-27T05:10:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "latency": 312,
  "system": {
    "cloudflareRay": "7e1234567890abcd",
    "colo": "US",
    "requestId": "req-1719465000000-abc123"
  },
  "database": {
    "tables": {
      "users": { "exists": true, "rowCount": 1523 },
      "practice_sessions": { "exists": true, "rowCount": 45678 },
      "goals": { "exists": true, "rowCount": 3421 },
      "sync_status": { "exists": true, "rowCount": 1523 }
    },
    "connectionPool": "healthy"
  },
  "api": {
    "endpoints": {
      "GET /auth/providers": "public endpoint",
      "GET /user/me": "requires authentication",
      "GET /logbook/entries": "requires authentication"
    },
    "rateLimit": "enabled"
  },
  "resources": {
    "memory": {
      "status": "managed by platform",
      "limit": "128MB per request",
      "monitoring": "Use Cloudflare Analytics for detailed metrics"
    },
    "cpu": "managed by Cloudflare"
  },
  "dependencies": {
    "required": {
      "database": "configured",
      "authentication": "configured"
    },
    "optional": {
      "kvStore": "configured",
      "emailService": "configured",
      "googleOAuth": "configured",
      "rateLimiter": "configured"
    }
  }
}
```

### 5. Metrics - `/metrics`

**Purpose**: Prometheus-compatible metrics endpoint.

**Method**: `GET`

**Response** (text/plain):

```
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
api_version{version="1.0.0",environment="production"} 1
```

## Monitoring Best Practices

### 1. Health Check Intervals

- **Liveness**: Every 30 seconds
- **Readiness**: Every 10 seconds
- **Comprehensive**: Every 60 seconds
- **Detailed**: On-demand or every 5 minutes

### 2. Alert Thresholds

```yaml
alerts:
  - name: API Down
    condition: /livez returns non-200 for 2 consecutive checks
    severity: critical

  - name: API Not Ready
    condition: /readyz returns 503 for 3 consecutive checks
    severity: warning

  - name: Service Degraded
    condition: /health returns "degraded" status
    severity: warning

  - name: Database Issues
    condition: database.status != "healthy" in /health
    severity: critical
```

### 3. Dashboard Metrics

Key metrics to display:

- Service status (healthy/degraded/down)
- Database latency from health checks
- KV store latency
- Number of failed smoke tests
- Table row counts (from detailed health)
- Missing dependencies

### 4. Integration Examples

**Kubernetes**:

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 8787
  initialDelaySeconds: 30
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /readyz
    port: 8787
  initialDelaySeconds: 5
  periodSeconds: 10
```

**Cloudflare Load Balancer**:

- Health check path: `/readyz`
- Expected status: 200
- Interval: 15 seconds
- Timeout: 10 seconds
- Retries: 2

**Grafana Query**:

```promql
# Service availability
up{job="mirubato-api"} == 1

# API version deployed
api_version{environment="production"}

# Request latency P95
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

## Service-Specific Health Checks

### API Service

- **Database**: Users, practice sessions, goals, sync status
- **KV Store**: Music catalog data
- **Auth**: JWT, Magic Link, Google OAuth secrets
- **Rate Limiter**: Optional Cloudflare rate limiting

### Scores Service

- **Database**: Scores, versions, collections, analytics
- **Storage (R2)**: Score files, versions, thumbnails
- **Cache (KV)**: Score metadata, collection data, analytics
- **Auth**: JWT secret for API integration

## Troubleshooting

### Common Issues

1. **Database unhealthy**: Check D1 service status, verify migrations
2. **KV store failures**: Check KV namespace binding, verify permissions
3. **Storage (R2) failures**: Check bucket binding, verify R2 permissions
4. **Auth unhealthy**: Verify all required secrets are set
5. **Smoke test failures**: Check specific test that failed, review logs

### Debug Commands

```bash
# Check API service health
curl https://api.mirubato.com/health

# Check Scores service health
curl https://scores.mirubato.com/health
curl https://scores-staging.mirubato.com/health  # staging

# Get detailed diagnostics
curl https://api.mirubato.com/health/detailed | jq
curl https://scores.mirubato.com/health/detailed | jq

# Check specific service component
curl https://api.mirubato.com/health | jq '.services.database'
curl https://scores.mirubato.com/health | jq '.services.storage'

# Monitor both services in real-time
watch -n 5 'echo "=== API ===" && curl -s https://api.mirubato.com/health | jq .status && echo "=== Scores ===" && curl -s https://scores.mirubato.com/health | jq .status'
```

## Security Considerations

- Health endpoints are public by design for monitoring
- No sensitive data is exposed
- Rate limiting applies to prevent abuse
- Detailed health check should be monitored for excessive calls

## Future Enhancements

1. Add custom metrics collection
2. Implement distributed tracing integration
3. Add performance baselines and anomaly detection
4. Include cache hit rates and queue depths
5. Add webhook notifications for status changes
