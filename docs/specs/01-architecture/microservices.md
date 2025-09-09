# Microservices Architecture

**What**: Five independent Cloudflare Workers providing domain-specific functionality for music education.

**Why**:

- Service isolation enables independent deployment and scaling
- Domain boundaries align with team expertise and feature sets
- Edge-first architecture provides sub-50ms global latency
- Worker isolation prevents cascading failures

**How**:

- Each service runs as a Cloudflare Worker with specific bindings
- Services communicate via HTTP with JWT/service token authentication
- Real-time updates flow through WebSocket connections
- Async processing handled by Cloudflare Queues

## Service Inventory

| Service     | Domain              | Port (Local) | Production URL          | Primary Bindings           |
| ----------- | ------------------- | ------------ | ----------------------- | -------------------------- |
| Frontend    | SPA + Static Assets | 4000¹        | mirubato.com            | ASSETS                     |
| API         | Core Business Logic | 9797         | api.mirubato.com        | DB, KV, RATE_LIMITER       |
| Scores      | Sheet Music         | 9788         | scores.mirubato.com     | DB, R2, AI, BROWSER, QUEUE |
| Dictionary  | Music Terms         | 9799         | dictionary.mirubato.com | DB, KV, AI, QUEUE, R2      |
| Sync Worker | Real-time Sync      | 8787         | sync.mirubato.com       | DB, SYNC_COORDINATOR       |

¹ Frontend dev server runs on port 5173 (Vite), Worker serves on 4000

**Code References**:

- Service configurations: `*/wrangler.toml` — Worker bindings and environment settings
- Local ports: `*/package.json` — Dev script configurations

## Service Details

### 1. Frontend Service

**What**: Cloudflare Worker serving React SPA with ASSETS binding for static files.

**Why**:

- Zero cold starts for global SPA delivery
- Built-in CDN caching for static assets
- Worker handles SPA routing without origin server

**How**:

- Vite builds React app to static files
- Worker serves index.html for all client routes
- ASSETS binding provides static file serving

**Code References**:

- `frontendv2/src/index.js` — Worker entry point with SPA routing
- `frontendv2/wrangler.toml` — ASSETS binding configuration
- `frontendv2/src/services/webSocketSync.ts:24-48` — WebSocket client implementation
- `frontendv2/src/stores/` — Zustand state management stores

**Technology Stack**:

- React 18 + TypeScript + Vite
- Tailwind CSS + Headless UI components
- Zustand for state management
- Native Fetch API for HTTP requests

**Operational Limits**:

- Static assets: Cached at edge for 1 year
- Service Worker: Offline-first with IndexedDB storage
- Bundle optimization: Code splitting and lazy loading

### 2. API Service

**What**: Core business logic server handling authentication, sync, and data operations.

**Why**:

- Central authority for user authentication and authorization
- Sync coordination between client and database
- Rate limiting protection for auth endpoints
- Session management with secure cookies

**How**:

- Hono framework for routing and middleware
- D1 for user data with sync_data pattern
- KV for public/API response caching (MUSIC_CATALOG)
- Cloudflare Rate Limiter for auth protection

**Code References**:

- `api/src/api/routes.ts` — Complete route definitions
- `api/src/api/handlers/auth.ts` — Magic link and Google OAuth flows
- `api/src/api/handlers/sync.ts` — Sync pull/push/batch operations
- `api/src/api/middleware.ts:89-127` — Rate limit middleware
- `api/migrations/0001_initial_schema.sql` — Base schema
- `api/migrations/0008_repertoire_and_annotations.sql` — Current data model

**Core Endpoints**:

```typescript
// Authentication (with rate limiting)
POST   /api/auth/request-magic-link
POST   /api/auth/verify-magic-link
POST   /api/auth/google
POST   /api/auth/refresh
POST   /api/auth/logout

// Sync API (replaces direct CRUD)
POST   /api/sync/pull      // Get latest data
POST   /api/sync/push      // Send changes
POST   /api/sync/batch     // Bulk operations
GET    /api/sync/status    // Sync health

// Repertoire
GET    /api/repertoire
GET    /api/repertoire/:scoreId/stats
POST   /api/repertoire
PUT    /api/repertoire/:scoreId
DELETE /api/repertoire/:scoreId
DELETE /api/repertoire/:scoreId/dissociate

// Goals
GET    /api/goals
GET    /api/goals/:id
POST   /api/goals
PUT    /api/goals/:id
POST   /api/goals/:id/progress
DELETE /api/goals/:id
```

**Database Tables**:

- `sync_data` — Universal sync table with entity_type discrimination
- `sync_metadata` — Sync state tracking per user
- `user_repertoire` — User's repertoire with status tracking
- `score_annotations` — User notes on scores
- `goals` & `goal_progress` — Goal tracking system

**Operational Limits**:

- Rate limit: 10 requests/minute for auth endpoints
- JWT expiry: 30 days (both access and refresh tokens)
- Cookie expiry: 30 days on login, 7 days on refresh
- Cookie security: HttpOnly, Secure, SameSite=Lax

### 3. Scores Service

**What**: Sheet music processor with AI metadata extraction and PDF management.

**Why**:

- Specialized PDF processing without blocking main API
- AI-powered metadata extraction for cataloging
- R2 storage for cost-effective file hosting
- Browser rendering for complex PDF operations

**How**:

- Split processing: Browser API for rendering, AI for metadata
- R2 for file storage with public/private access
- Queue-based async processing for large files
- KV cache for frequently accessed metadata

**Code References**:

- `scores/src/api/routes.ts` — All route definitions
- `scores/src/api/handlers/import.ts` — Main import orchestration
- `scores/src/api/handlers/import-enhanced.ts` — Enhanced import with AI/Browser API
- `scores/src/services/enhancedRateLimiter.ts` — KV-backed rate limiting
- `scores/wrangler.toml` — R2, AI, BROWSER, QUEUE bindings

**Core Endpoints**:

```typescript
// Import (all support URL or base64)
POST   /api/import          // Auto-detect type
POST   /api/import/images   // Image batch processing
POST   /api/import/pdf      // PDF with Browser API
POST   /api/import/imslp    // IMSLP catalog import
POST   /api/import/batch    // Bulk operations

// Scores Management
GET    /api/scores
GET    /api/scores/:id
PUT    /api/scores/:id
DELETE /api/scores/:id

// Search & Discovery
GET    /api/search

// Test Data (development)
GET    /api/test-data/:filename
```

**Processing Pipeline**:

```
Input → Validation → Rate Check → Process → Store → Index
  ↓         ↓            ↓          ↓        ↓       ↓
URL/B64  Type Check  KV Limiter  AI/Browser  R2    D1 DB
```

**Operational Limits**:

- Max file size: 50MB per PDF
- AI processing: 1000 tokens per extraction
- Browser rendering: 30 second timeout
- Rate limit: 1 import per 10 minutes (unauthenticated) with failure backoff and ban

### 4. Dictionary Service

**What**: AI-powered music terminology service with multi-language support.

**Why**:

- Dynamic content generation reduces manual curation
- Semantic search enables concept discovery
- Multi-language support for global users
- Quality scoring ensures accurate definitions

**How**:

- AI models for definition generation and embeddings
- KV cache for frequently accessed terms
- Service-to-service auth with header tokens
- Batch processing via queues and cron triggers

**Code References**:

- `dictionary/src/routes/dictionary.ts` — All v1 API routes
- `dictionary/src/api/handlers/terms.ts` — Term generation and retrieval
- `dictionary/src/api/handlers/search.ts` — Semantic search implementation
- `dictionary/src/middleware/auth.ts:45-73` — Service auth validation
- `dictionary/src/index.ts:68-105` — Queue and scheduled handlers
- `dictionary/wrangler.toml` — Queue and cron trigger configuration

**Core Endpoints** (all prefixed with `/api/v1`):

```typescript
// Terms
GET    /api/v1/terms/:term
POST   /api/v1/terms/:id/feedback

// Search
GET    /api/v1/search
POST   /api/v1/search/semantic

// Batch Operations
POST   /api/v1/batch        // Bulk term operations
POST   /api/v1/export       // Export definitions
POST   /api/v1/enhance      // Enhance with AI (auth required)

// Admin (service auth required)
PUT    /api/v1/admin/terms/:term
DELETE /api/v1/admin/terms/:id
POST   /api/v1/admin/bulk
POST   /api/v1/admin/seed/initialize
POST   /api/v1/admin/seed/process
```

**Service Authentication**:

- Header-based: `X-Service-Name` + `X-Service-Token`
- Token validation: SHA-256 hash comparison
- Not JWT-based (unlike user auth)

**Operational Limits**:

- AI generation: 500 tokens per definition
- Semantic search: 100 results max
- Cache TTL: 1 hour for popular terms
- Batch size: 50 terms per request

### 5. Sync Worker Service

**What**: WebSocket server using Durable Objects for real-time per-user synchronization.

**Why**:

- Real-time sync eliminates 30-second polling overhead
- Durable Objects provide stateful WebSocket management
- Per-user isolation prevents data leakage
- Automatic reconnection handles network interruptions

**How**:

- Worker routes WebSocket upgrades to Durable Objects
- Each user gets dedicated DO instance for connections
- Messages persist to D1 with conflict resolution
- Broadcast limited to same-user devices

**Code References**:

- `sync-worker/src/index.ts:15-55` — WebSocket upgrade handler
- `sync-worker/src/syncCoordinator.ts` — Durable Object implementation
- `sync-worker/src/syncCoordinator.ts:189-286` — Database persistence
- `sync-worker/src/syncCoordinator.ts:288-351` — Message broadcasting
- `sync-worker/wrangler.toml` — DO binding and migrations

**WebSocket Endpoint**:

```
ws://localhost:8787/sync/ws?userId=<USER_ID>&token=<JWT_TOKEN>
wss://sync.mirubato.com/sync/ws?userId=<USER_ID>&token=<JWT_TOKEN>
```

**Message Protocol**:

```typescript
// Logbook Events
type: 'ENTRY_CREATED' | 'ENTRY_UPDATED' | 'ENTRY_DELETED'

// Repertoire Events
type: 'PIECE_ADDED' | 'PIECE_UPDATED' | 'PIECE_REMOVED' | 'PIECE_DISSOCIATED'

// Sync Operations
type: 'BULK_SYNC' | 'REPERTOIRE_BULK_SYNC' | 'SYNC_REQUEST'

// Connection Management
type: 'PING' | 'PONG' | 'WELCOME' | 'ERROR' | 'SYNC_RESPONSE'
```

**Persistence Strategy**:

- Upsert to `sync_data` table on every change
- Soft delete with `deleted_at` timestamp
- Last-write-wins conflict resolution
- Direct database writes (no retry queue)

**Operational Limits**:

- Max connections per user: 10 devices
- Message size: 1MB max
- Ping interval: 30 seconds
- Connection timeout: ~5 minutes idle (via alarm-based cleanup)

## Inter-Service Communication

**What**: HTTP-based service mesh with authentication and async processing.

**Why**:

- Loose coupling allows independent deployment
- Authentication prevents unauthorized access
- Async queues handle heavy processing without blocking

**How**:

- User requests: JWT tokens in Authorization header
- Service-to-service: Custom header tokens (Dictionary only, others planned)
- Async work: Cloudflare Queues for PDF processing
- Real-time: WebSocket with JWT query param

**Code References**:

- `api/src/api/middleware.ts:34-58` — JWT validation middleware
- `dictionary/src/middleware/auth.ts:45-73` — Service token validation
- `scores/src/api/handlers/import.ts` — Queue producer example
- `sync-worker/src/index.ts:32-36` — WebSocket auth validation

**Communication Patterns**:

```typescript
// User → API (JWT in cookie/header)
Authorization: Bearer <jwt_token>

// API → Dictionary (service headers)
X-Service-Name: api
X-Service-Token: <hashed_secret>

// Scores → Queue (async processing)
await env.PDF_QUEUE.send({ scoreId, operation: 'extract' })

// Client → Sync (WebSocket with JWT)
ws://sync.mirubato.com/sync/ws?token=<jwt_token>
```

## Service Health & Monitoring

**What**: Standardized health endpoints across all services for monitoring.

**Why**:

- Proactive issue detection before user impact
- Dependency health visibility
- Deployment verification
- SLA monitoring

**How**:

- Each service exposes /health, /livez, /readyz endpoints
- Health checks verify critical dependencies
- Structured JSON responses for parsing
- Request ID propagation for tracing

**Code References**:

- `api/src/api/handlers/health.ts` — Comprehensive health implementation
- `scores/src/api/handlers/health.ts` — Storage and cache checks
- `dictionary/src/api/handlers/health.ts` — AI and KV health
- `sync-worker/src/index.ts:57-75` — WebSocket health endpoint

**Health Check Response** (API example):

```typescript
// GET /health
{
  "service": "api",
  "version": "1.7.6",
  "environment": "production",
  "timestamp": "2024-12-01T00:00:00Z",
  "status": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 45,
      "message": "Connection successful"
    },
    "kvStore": {
      "status": "healthy",
      "latency": 12
    },
    "rateLimiter": {
      "status": "healthy"
    },
    "auth": {
      "status": "healthy",
      "message": "JWT validation working"
    },
    "smokeTests": {
      "status": "healthy",
      "tests": ["database_tables", "basic_operations"]
    }
  },
  "metadata": {
    "tables": ["sync_data", "sync_metadata", "users"],
    "requestId": "uuid"
  }
}
```

**Monitoring Integration**:

- Cloudflare Analytics: Request metrics and error rates
- Structured logs: JSON format with correlation IDs
- Custom metrics: Analytics Engine (when configured)
- Alerts: Webhook notifications on health degradation

## Deployment Strategy

**What**: Independent service deployment with zero-downtime updates.

**Why**:

- Service autonomy enables rapid iteration
- Rollback capability ensures stability
- Gradual rollout minimizes risk
- No coordination required between teams

**How**:

- Wrangler CLI for deployments
- Cloudflare automatic deployments (when configured)
- Atomic updates with instant rollback
- Previous version kept warm

**Details**: See [Deployment](./deployment.md) for complete deployment procedures, commands, and environment configurations.

**Version Strategy**:

- All services at v1.7.6 (unified December 2024)
- Backward compatibility maintained
- Version in health endpoints for verification

## Scaling Characteristics

**What**: Automatic edge scaling without configuration.

**Why**:

- Handle traffic spikes without intervention
- Pay only for actual usage
- No capacity planning required
- Global distribution by default

**How**:

- Workers auto-scale to millions of requests
- Durable Objects provide horizontal scaling for WebSockets
- R2 and KV scale independently
- Queue consumers scale with backlog

**Service-Specific Patterns**:

| Service     | Bottleneck            | Scaling Factor  | Mitigation                   |
| ----------- | --------------------- | --------------- | ---------------------------- |
| API         | D1 queries            | Connection pool | Prepared statements, indexes |
| Scores      | AI processing         | Token limits    | Queue batching, caching      |
| Dictionary  | AI generation         | API rate limits | KV cache, batch processing   |
| Sync Worker | WebSocket connections | DO memory       | Per-user isolation           |
| Frontend    | Bundle size           | Download time   | Code splitting, CDN cache    |

**Operational Limits**:

- Worker CPU: 50ms per request (10ms p50)
- Worker Memory: 128MB per invocation
- Subrequests: 50 per request
- WebSocket: 1MB message size
- Durable Object: 128MB memory per instance

## Security Considerations

**What**: Defense-in-depth security across service boundaries.

**Why**:

- Service compromise doesn't cascade
- User data remains isolated
- Rate limiting prevents abuse
- Audit trail for compliance

**How**:

- Separate databases per service
- JWT HS256 with 30-day tokens (HttpOnly cookies)
- Service-specific auth tokens (Dictionary only)
- Rate limiting at edge

**Code References**:

- `api/src/api/middleware.ts:89-127` — Rate limiting implementation
- `api/src/api/handlers/auth.ts:246-273` — Cookie security settings
- `api/src/index.ts:19-29` — CORS configuration
- `scores/src/index.ts:34-44` — CORS allowed origins

**Security Layers**:

1. **Network**:
   - TLS 1.3 minimum
   - CORS with explicit origins
   - WSS for WebSocket

2. **Authentication**:
   - JWT HS256 signing (shared secret)
   - HttpOnly, Secure cookies
   - SameSite=Lax CSRF protection

3. **Authorization**:
   - User ID validation per request
   - Service token verification
   - Role-based access (admin routes)

4. **Rate Limiting**:
   - Cloudflare Rate Limiter (API auth)
   - KV-backed limiter (Scores imports)
   - Per-user connection limits (Sync)

**Failure Modes**:

- Invalid JWT → 401 Unauthorized
- Rate limit exceeded → 429 Too Many Requests
- Service token invalid → 403 Forbidden
- CORS violation → Blocked by browser

## Related Documentation

- [System Overview](./overview.md) - High-level architecture
- [Cloudflare Services](./cloudflare-services.md) - Platform services
- [Service APIs](../03-api/service-apis.md) - Inter-service communication
- [REST API](../03-api/rest-api.md) - Public API endpoints
- [WebSocket Protocol](../03-api/websocket.md) - Real-time sync protocol

---

_Last updated: 2025-09-09 | Version 1.7.6_
