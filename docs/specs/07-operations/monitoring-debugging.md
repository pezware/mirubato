---
Spec-ID: SPEC-OPS-001
Title: Monitoring & Debugging
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# Monitoring & Debugging Specification

Status: ✅ Active

## What

Comprehensive monitoring, logging, and debugging strategy for distributed edge services running on Cloudflare Workers.

## Why

- Proactive issue detection before users report problems
- Rapid debugging in distributed edge environment
- Performance optimization through data-driven insights
- Compliance with SLA and reliability targets
- Cost optimization through usage tracking

## How

- Native Cloudflare tools (Analytics, Logs, Trace)
- Health check endpoints in every service
- Request ID propagation for tracing
- Structured logging with severity levels
- Incident response procedures

## Monitoring Architecture

### Health Check System

**Standard Endpoints** (all services):

- `/livez` - Basic liveness check (is service running?)
- `/readyz` - Readiness check (can serve traffic?)
- `/health` - Comprehensive health with dependencies
- `/health/detailed` - Deep diagnostics (admin only)
- `/metrics` - Prometheus-format metrics (future)

**Health Response Structure**:

```json
{
  "status": "healthy|degraded|unhealthy",
  "service": "api|scores|dictionary|sync",
  "version": "1.7.6",
  "environment": "production|staging|local",
  "timestamp": "ISO 8601",
  "checks": {
    "database": { "status": "...", "latency": "ms" },
    "cache": { "status": "...", "hit_rate": "%" },
    "external": { "status": "...", "details": {} }
  }
}
```

**Code**: `*/src/api/handlers/health.ts`

### Logging Strategy

**Log Levels**:

- **ERROR**: Service failures, unhandled exceptions
- **WARN**: Degraded performance, retry scenarios
- **INFO**: Normal operations, user actions
- **DEBUG**: Detailed diagnostics (dev only)

**Structured Format**:

- Request ID for correlation
- User ID (hashed for privacy)
- Service and version
- Timestamp and duration
- Error stack traces

**Implementation**:

- Console output captured by Cloudflare
- Wrangler tail for real-time streaming
- No PII in logs

### Request Tracing

**Request ID Propagation**:

1. Generate UUID at edge
2. Add to headers: `X-Request-ID`
3. Pass through all service calls
4. Include in all log entries
5. Return in error responses

**Service Chain Tracking**:

- Frontend → API → Scores → AI
- Each hop logged with timing
- Waterfall visualization possible

## Cloudflare Native Tools

### Analytics Dashboard

**Built-in Metrics**:

- Request count and trends
- Response times (p50, p95, p99)
- Error rates by status code
- Geographic distribution
- Cache hit rates

**Custom Analytics** (via Analytics Engine):

- User activity patterns
- Feature usage metrics
- AI token consumption
- Database query patterns

### Wrangler Tail

**Real-time Log Streaming**:

```bash
wrangler tail --env production
wrangler tail --env production --search "error"
wrangler tail --env production --status 500
wrangler tail --env production --format json
```

**Use Cases**:

- Live debugging
- Error investigation
- Performance analysis
- User session tracking

### Workers Trace

**Distributed Tracing**:

- Request flow visualization
- Service dependency mapping
- Latency breakdown
- Error propagation

**Future Integration**:

- OpenTelemetry support
- Jaeger compatibility
- Custom trace attributes

## Error Monitoring

### Error Classification

| Type         | Examples                 | Action                | Priority |
| ------------ | ------------------------ | --------------------- | -------- |
| **Critical** | Auth failures, data loss | Page immediately      | P0       |
| **Major**    | Service degradation      | Investigate within 1h | P1       |
| **Minor**    | Single user issues       | Next business day     | P2       |
| **Warning**  | High latency             | Monitor trends        | P3       |

### Error Aggregation

**Patterns to Detect**:

- Error rate spikes
- New error types
- Geographic clusters
- User-specific issues
- Time-based patterns

**Alert Thresholds**:

- Error rate > 1% (5 min window)
- P95 latency > 5 seconds
- Health check failures (2 consecutive)
- Queue depth > 1000

## Performance Monitoring

### Key Metrics

**Service Level Indicators (SLIs)**:

- Availability: % successful requests
- Latency: P95 response time
- Throughput: Requests per second
- Error rate: % failed requests

**Service Level Objectives (SLOs)**:

- 99.9% availability (43 min/month downtime)
- P95 latency < 500ms
- Error rate < 0.1%
- AI response < 5s

### Performance Tracking

**Worker Metrics**:

- CPU time per request
- Memory usage
- Subrequest count
- Cache performance

**Database Metrics**:

- Query execution time
- Connection pool usage
- Lock contention
- Storage growth

## Debugging Tools

### Local Development

**Tools Available**:

- Wrangler dev with --local flag
- Console.log debugging
- Chrome DevTools (via --inspect)
- Miniflare for unit testing

### Production Debugging

**Safe Techniques**:

- Read-only database queries
- Temporary debug logs (auto-expire)
- Canary deployments
- Feature flags for testing

**Debug Headers**:

- `X-Debug-Mode`: Enable verbose logging
- `X-Force-Error`: Trigger error paths
- `X-Bypass-Cache`: Skip caching

## Incident Response

### Severity Levels

1. **SEV1**: Complete outage, data loss risk
2. **SEV2**: Major feature broken, degraded performance
3. **SEV3**: Minor feature issues, workaround available
4. **SEV4**: Cosmetic issues, no user impact

### Response Procedures

**Detection → Triage → Mitigate → Resolve → Review**

1. **Detection**: Automated alerts or user reports
2. **Triage**: Assess impact and assign severity
3. **Mitigate**: Quick fix or rollback
4. **Resolve**: Root cause fix
5. **Review**: Postmortem and prevention

### Runbooks

**Common Scenarios**:

- High error rate → Check recent deployments
- Database timeout → Review slow queries
- AI quota exceeded → Disable AI features
- Auth failures → Verify secrets

## Code References

- Health handlers: `*/src/api/handlers/health.ts`
- Logging utilities: `*/src/utils/logger.ts`
- Request ID middleware: `*/src/middleware/requestId.ts`
- Error handlers: `*/src/middleware/errorHandler.ts`

## Operational Limits

- Log retention: 7 days (Cloudflare)
- Analytics retention: 90 days
- Trace sampling: 1% of requests
- Debug mode timeout: 5 minutes
- Alert cooldown: 15 minutes

## Failure Modes

- **Monitoring blind spots**: Service health lies
- **Log overflow**: Rate limiting kicks in
- **Alert fatigue**: Too many false positives
- **Cascade failures**: One service takes down others
- **Debug overhead**: Logging impacts performance

## Decisions

- **Cloudflare-native first** (2024-01): Use built-in tools before external
- **No APM yet** (2024-06): Cost and complexity not justified
- **Request IDs everywhere** (2024-07): Essential for debugging
- **Health checks mandatory** (2024-08): Every service must implement
- **No sensitive data in logs** (2024-09): Privacy and security first

## Non-Goals

- Real-time dashboards (use Analytics)
- Custom metrics database
- Log aggregation service
- Distributed tracing backend
- On-call rotation management

## Open Questions

- When to add external monitoring (Datadog, New Relic)?
- Should we implement SLO tracking?
- How to monitor client-side errors?
- Need for synthetic monitoring?
- Cost threshold for monitoring tools?

## Security & Privacy Considerations

- **No PII in logs**: Hash user IDs, redact emails
- **Secure debug endpoints**: Auth required for detailed health
- **Log access control**: Limited to ops team
- **Audit logging**: Track who accesses logs
- **Compliance**: GDPR-compliant log retention

## Related Documentation

- [Performance](./performance.md) - Optimization strategies
- [Architecture](../01-architecture/overview.md) - System design
- [API Specification](../03-api/rest-api.md) - Health endpoints

---

Last updated: 2025-09-11 | Version 1.7.6
