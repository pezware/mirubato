# MVP Final Sprint Plan 🚀

## Current Status Analysis

✅ **Completed**:

- Autocomplete system with KV caching
- German and Simplified Chinese localization
- Date picker for practice entries
- Clean composer data seeding

⚠️ **Needs Attention**:

- E2E tests (timing out)
- API security (scores service)
- Health monitoring (comprehensive)
- Caching strategy (performance)

## 1. Fix E2E Tests (Priority: High)

### Issue

E2E tests timing out due to new autocomplete UI elements and selectors

### Root Cause

- Tests were written for simple input fields
- Now using autocomplete components with different interaction patterns
- Need to wait for autocomplete dropdown loading states
- Mobile viewport tests may need different timeout values

### Tasks

- [ ] Update selectors in `frontendv2/tests/e2e/logbook.test.ts`
- [ ] Replace `input[placeholder="Piece title"]` with autocomplete-specific selectors
- [ ] Add wait conditions for autocomplete dropdown and loading states
- [ ] Test autocomplete keyboard navigation (arrow keys, enter, escape)
- [ ] Verify offline autocomplete fallback works in tests
- [ ] Update timeout values if needed (current: 60s global, 10s action, 30s navigation)

### Expected Outcome

All E2E tests pass consistently across desktop and mobile viewports

## 2. API Security Hardening (Priority: High)

### Issue

Scores service endpoints lack authentication protection

### Current Auth Strategy Analysis

- **Main API** (`/api`): Uses JWT tokens via `authMiddleware`
- **Scores Service** (`/scores/api`): Currently no auth protection
- **Frontend**: Uses same auth tokens for both services

### Unified Auth Strategy

#### Option A: Shared JWT Secret (Recommended)

```yaml
Environment Variables:
  - JWT_SECRET: shared across api/ and scores/
  - AUTH_SERVICE_URL: api.mirubato.com (for token validation)

Benefits:
  - Single token for user across all services
  - Consistent auth flow
  - Easy to manage

Implementation:
  - Copy authMiddleware from api/ to scores/
  - Use same JWT_SECRET in both wrangler.toml files
  - Maintain same token format and claims
```

#### Option B: Service-Specific Keys

```yaml
Environment Variables:
  - API_JWT_SECRET: for main api/ service
  - SCORES_JWT_SECRET: for scores/ service
  - CROSS_SERVICE_API_KEY: for service-to-service auth

Benefits:
  - Service isolation
  - Granular access control
  - Better security boundaries

Drawbacks:
  - More complex token management
  - Frontend needs multiple tokens
```

### Recommended Implementation (Option A)

#### Endpoints Needing Protection

```yaml
scores/ service:
  POST /api/scores: Require auth
  PUT /api/scores/:id: Require auth + ownership
  DELETE /api/scores/:id: Require auth + ownership
  POST /api/collections: Require auth
  PUT /api/collections/:id: Require auth + ownership
  DELETE /api/collections/:id: Require auth + ownership
  POST /api/import/*: Require auth (rate limited)

Public Endpoints (no auth):
  GET /api/scores: Browse scores
  GET /api/scores/:id: View score details
  GET /api/search: Search scores
  GET /api/collections: Browse collections
  GET /health: Health checks
```

#### Environment Configuration

```toml
# api/wrangler.toml - keep existing
[vars]
JWT_SECRET = "shared-secret-for-both-services"

# scores/wrangler.toml - add auth
[vars]
JWT_SECRET = "shared-secret-for-both-services"  # Same as API
AUTH_SERVICE_URL = "https://api.mirubato.com"  # For token validation
```

### Tasks

- [ ] Copy `authMiddleware` from `api/src/api/middleware.ts` to `scores/src/api/middleware.ts`
- [ ] Add JWT_SECRET to scores service environment configuration
- [ ] Protect write endpoints in scores service
- [ ] Add ownership checks for user-specific resources
- [ ] Test cross-service authentication flow
- [ ] Update API documentation with auth requirements

## 3. Comprehensive Health Monitoring (Priority: Medium)

### Current Status

Basic health check only tests:

- Database connection (`SELECT 1`)
- Auth secrets presence

### Enhanced Health Monitoring

#### Smoke Test Coverage

```yaml
Database Operations:
  - Connection test: SELECT 1
  - Read test: SELECT FROM sync_data LIMIT 1
  - Write test: INSERT temporary record + DELETE
  - Schema test: Verify required tables exist

KV Store Operations:
  - Connection test: Check MUSIC_CATALOG namespace
  - Read test: Get sample composer data
  - Write test: PUT/GET temporary key
  - Search test: Verify autocomplete data integrity

R2 Storage (scores service):
  - Bucket connectivity: List objects
  - Read test: Get sample file metadata
  - Write test: PUT temporary object + DELETE

External Dependencies:
  - Google OAuth: Verify client ID configuration
  - Rate Limiter: Test rate limit functionality
  - DNS resolution: Check internal service URLs

Performance Metrics:
  - Response time: < 200ms for /health
  - Memory usage: Available heap space
  - Connection pool: Active DB connections
```

#### Implementation Structure

```typescript
// Enhanced health check response
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  version: '1.0.0',
  environment: 'production',
  timestamp: '2025-06-27T...',
  uptime: 3600000,
  services: {
    database: {
      status: 'healthy',
      latency: 45,
      operations: {
        connection: 'ok',
        read: 'ok',
        write: 'ok',
        schema: 'ok'
      }
    },
    kv_store: {
      status: 'healthy',
      latency: 12,
      operations: {
        connection: 'ok',
        autocomplete_data: 'ok',
        write_test: 'ok'
      }
    },
    auth_service: {
      status: 'healthy',
      secrets_configured: true,
      google_oauth: 'configured'
    },
    rate_limiter: {
      status: 'healthy',
      test_result: 'ok'
    }
  },
  performance: {
    response_time_ms: 156,
    memory_usage_mb: 45,
    active_connections: 3
  }
}
```

### Tasks

- [ ] Enhance `api/src/api/handlers/health.ts` with comprehensive checks
- [ ] Add KV store health checks to main API
- [ ] Create `scores/src/api/handlers/health.ts` with R2 and storage checks
- [ ] Add performance metrics collection
- [ ] Implement graceful degradation (some checks can fail while service remains operational)
- [ ] Add alerting thresholds documentation

## 4. Cloudflare Caching Strategy (Priority: Medium)

### Current Caching Status

- No explicit cache headers
- Relying on default Cloudflare behavior
- Autocomplete results not cached
- Static assets not optimized

### Caching Strategy

#### Static Assets (Max Performance)

```yaml
Assets:
  - Images: *.{jpg,jpeg,png,svg,webp}
  - Fonts: *.{woff,woff2,ttf}
  - Icons: favicon.ico, apple-touch-icon.png

Headers:
  - Cache-Control: public, max-age=31536000, immutable
  - ETag: Based on file hash
  - Cloudflare: Cache for 1 year
```

#### API Response Caching

```yaml
Autocomplete Endpoints:
  - /api/autocomplete/composers
  - /api/autocomplete/pieces
  Headers:
    - Cache-Control: public, max-age=3600, s-maxage=86400
    - Vary: Accept-Encoding, Authorization
  Cloudflare: Edge cache 24h, browser cache 1h

Score Metadata:
  - GET /api/scores (list)
  - GET /api/search
  Headers:
    - Cache-Control: public, max-age=900, s-maxage=3600
  Cloudflare: Edge cache 1h, browser cache 15min

Health Endpoints:
  - /health, /livez, /readyz
  Headers:
    - Cache-Control: public, max-age=30, s-maxage=60
  Cloudflare: Edge cache 1min, browser cache 30s
```

#### Dynamic Content (User-Specific)

```yaml
User Data:
  - /api/sync/*
  - /api/user/*
  Headers:
    - Cache-Control: private, no-cache
    - Vary: Authorization
  Cloudflare: Bypass cache
```

### Implementation

#### Page Rules Configuration

```yaml
Static Assets:
  Pattern: '*.mirubato.com/*.{js,css,png,jpg,jpeg,svg,woff,woff2}'
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 1 year
    - Browser Cache TTL: 1 year

API Responses:
  Pattern: 'api.mirubato.com/api/autocomplete/*'
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 1 day
    - Browser Cache TTL: 1 hour
    - Respect Existing Headers: On
```

### Tasks

- [ ] Add cache headers to autocomplete endpoints
- [ ] Configure static asset caching headers in frontend build
- [ ] Set up Cloudflare page rules for optimal caching
- [ ] Add ETags for conditional requests
- [ ] Implement cache purging strategy for dynamic content updates
- [ ] Add cache performance monitoring

## Implementation Timeline

### Week 1: Critical Path (MVP Blockers)

**Days 1-2: E2E Tests & API Security**

- [ ] Fix E2E test selectors and flows
- [ ] Implement shared JWT auth strategy
- [ ] Protect scores service endpoints
- [ ] Test cross-service authentication

**Day 3: Integration & Testing**

- [ ] End-to-end testing of auth flow
- [ ] Verify all E2E tests pass
- [ ] Security audit of protected endpoints

### Week 2: Performance & Monitoring

**Days 4-5: Health Monitoring**

- [ ] Implement comprehensive health checks
- [ ] Add performance metrics
- [ ] Set up monitoring dashboards

**Day 6: Caching Optimization**

- [ ] Implement caching strategy
- [ ] Configure Cloudflare rules
- [ ] Performance testing and optimization

## Success Criteria

### MVP Ready Checklist

- [ ] All E2E tests pass consistently
- [ ] API security implemented across all services
- [ ] Comprehensive health monitoring operational
- [ ] Caching strategy improves performance metrics
- [ ] No security vulnerabilities in protected endpoints
- [ ] Production deployment successful

### Performance Targets

- [ ] Health endpoint responds < 200ms
- [ ] Autocomplete suggestions load < 100ms (cached)
- [ ] Page load time < 2s (mobile)
- [ ] 99.9% uptime for health checks

### Security Requirements

- [ ] All write operations require authentication
- [ ] JWT tokens validated consistently across services
- [ ] No sensitive data exposed in logs
- [ ] Rate limiting prevents abuse

---

## Notes

### Auth Token Sharing Strategy

Using **Option A (Shared JWT Secret)** because:

1. **Simpler UX**: Single login for all services
2. **Easier Management**: One secret to rotate
3. **Consistent**: Same auth flow everywhere
4. **Future-Proof**: Easy to add new services

### Environment Variable Naming

```bash
# Clear naming convention
JWT_SECRET=shared-across-all-services
API_SERVICE_URL=https://api.mirubato.com
SCORES_SERVICE_URL=https://scores.mirubato.com
```

### Risk Mitigation

- **E2E Test Failures**: Run tests in CI/CD pipeline before deployment
- **Auth Breaking Changes**: Maintain backward compatibility during transition
- **Performance Regression**: Monitor key metrics during caching implementation
- **Security Gaps**: Security audit before production deployment

---

**Estimated Total Time**: 6 days
**Risk Level**: Medium (auth changes require careful testing)
**Priority**: High (required for production-ready MVP)

Last Updated: 2025-06-27
