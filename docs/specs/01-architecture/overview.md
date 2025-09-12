---
Spec-ID: SPEC-ARCH-001
Title: System Architecture Overview
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# System Architecture Overview

Status: ✅ Active

## What

Edge-first music education platform running entirely on Cloudflare Workers.

## Why

- Musicians need consistent practice tracking across all devices
- Sheet music management requires specialized PDF processing
- Global accessibility demands low-latency performance
- Real-time sync enables seamless multi-device workflows

## How

- Five microservices deployed as Cloudflare Workers
- Edge SQL (D1) for data persistence
- WebSocket (Durable Objects) for real-time sync
- AI integration for intelligent features

## Architecture Principles

### Edge-First Design

**Why**: Sub-50ms response times globally without infrastructure management.
**How**: All compute runs in Cloudflare's 300+ edge locations using V8 isolates.

### Microservices Architecture

**Why**: Independent teams can deploy without coordination.
**How**: Five services with separate databases, clear API contracts, and isolated failure domains.

### Offline-First Frontend

**Why**: Musicians practice anywhere, often without reliable internet.
**How**: IndexedDB for local storage, optimistic updates, and background sync queues.

### Real-Time Synchronization

**Why**: Seamless experience across phone, tablet, and desktop.
**How**: WebSocket connections via Durable Objects with last-write-wins conflict resolution.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│                    (300+ Global Locations)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────┬────────────┬────────────┐
    │                 │             │            │            │            │
┌───▼──────────┐  ┌──▼──────────┐  ┌▼──────────┐ ┌▼──────────┐ ┌▼──────────┐
│  Frontend     │  │   API       │  │  Scores   │ │Dictionary │ │Sync Worker│
│  Worker       │  │   Worker    │  │  Worker   │ │  Worker   │ │  Worker   │
│ (React SPA)   │  │ (Sync API)  │  │(PDF + AI) │ │(AI Terms) │ │(WebSocket)│
└───┬──────────┘  └──┬──────────┘  └─┬─────────┘ └─┬─────────┘ └─┬─────────┘
    │                 │               │             │             │
┌───▼──────────┐  ┌──▼──────────┐  ┌─▼─────────┐ ┌─▼─────────┐ ┌─▼─────────┐
│    ASSETS     │  │ D1 Database │  │D1 + R2    │ │D1 + KV    │ │  Durable  │
│   Binding     │  │ KV (Cache)  │  │AI + Queue │ │AI + Queue │ │  Objects  │
└───────────────┘  └──────────────┘  └───────────┘ └───────────┘ └───────────┘
```

## Core Services Summary

| Service         | Purpose                  | Key Technologies        | Code References                       |
| --------------- | ------------------------ | ----------------------- | ------------------------------------- |
| **Frontend**    | React SPA delivery       | Worker + ASSETS binding | `frontendv2/src/index.js`             |
| **API**         | Auth & sync coordination | Hono, D1, JWT (HS256)   | `api/src/api/routes.ts`               |
| **Scores**      | PDF processing & AI      | R2, Browser API, AI     | `scores/src/api/handlers/import.ts`   |
| **Dictionary**  | Music terms with AI      | D1, AI embeddings       | `dictionary/src/routes/dictionary.ts` |
| **Sync Worker** | Real-time WebSocket      | Durable Objects         | `sync-worker/src/syncCoordinator.ts`  |

**Service Details**: See [Microservices Architecture](./microservices.md) for comprehensive service documentation.

## Technology Stack

### Cloudflare Platform Services

- **Workers**: All microservices (automatic scaling, zero cold starts)
- **D1**: Edge SQL database (SQLite-compatible)
- **R2**: Object storage for PDFs and images
- **KV**: Key-value cache for public API responses
- **Durable Objects**: WebSocket state management
- **AI**: LLM for metadata extraction and definitions
- **Queues**: Async PDF processing
- **Browser Rendering**: PDF to image conversion

### Application Technologies

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand stores + IndexedDB persistence
- **Backend**: Hono framework (edge-optimized)
- **Auth**: JWT (HS256) with HttpOnly cookies
- **Real-time**: WebSocket with automatic reconnection

**Code References**:

- Platform bindings: `*/wrangler.toml`
- Frontend stack: `frontendv2/package.json`
- Backend framework: `api/src/index.ts`, `scores/src/index.ts`

## Critical Data Flows

### Sync Flow (Primary User Interaction)

```
Client → API /sync/push → D1 sync_data → WebSocket broadcast → Other devices
         ↓                      ↓                ↓
    Offline queue         Conflict resolution  Real-time update
```

**Code**: `api/src/api/handlers/sync.ts`, `sync-worker/src/syncCoordinator.ts:189-286`

### PDF Import Flow

```
Upload → Validation → Browser API/AI → R2 storage → D1 metadata
           ↓              ↓              ↓            ↓
      Rate limit    Extract/render   scores bucket  Search index
```

**Code**: `scores/src/api/handlers/import.ts`, `scores/src/api/handlers/import-enhanced.ts`

### Authentication Flow

```
Magic link request → Rate limit → Send email → Verify token → JWT cookie (30d)
                        ↓            ↓            ↓              ↓
                  10 req/min    Resend API   15 min expiry  HttpOnly, Secure
```

**Code**: `api/src/api/handlers/auth.ts:145-215`

## Security Implementation

**Authentication**:

- JWT (HS256) with 30-day expiry — `api/src/utils/auth.ts`
- HttpOnly cookies (SameSite=Lax) — `api/src/api/handlers/auth.ts:246-273`
- Magic link (15 min expiry) + Google OAuth — `api/src/api/handlers/auth.ts`

**Rate Limiting**:

- Auth endpoints: 10 req/min (Cloudflare binding) — `api/src/api/middleware.ts:89-127`
- Import API: 1 per 10 min (KV-backed) — `scores/src/services/enhancedRateLimiter.ts`

**Data Isolation**:

- User ID validation on all queries — `api/src/api/handlers/sync.ts`
- Service auth headers (Dictionary) — `dictionary/src/middleware/auth.ts:45-73`
- CORS with explicit origins — `api/src/index.ts:19-29`

## Performance Metrics

**Edge Performance**:

- Worker CPU: 50ms limit, 10ms p50 typical
- Memory: 128MB per invocation
- Cold start: 0ms (V8 isolates always warm)
- Global latency: <50ms from 300+ locations

**Frontend Performance**:

- Bundle size: ~500KB gzipped
- Static assets: 1-year cache headers
- Code splitting: Lazy-loaded routes
- Offline: IndexedDB with background sync

**Database Performance**:

- D1 queries: <10ms for indexed queries
- KV reads: <10ms globally
- R2 uploads: 50MB max file size
- WebSocket: 1MB max message size

**Operational Limits**: See [Microservices Architecture](./microservices.md#operational-limits)

## Scaling Architecture

**Automatic Scaling**:

- Workers scale to millions of requests without configuration
- Durable Objects provide per-user WebSocket isolation
- Queues auto-scale with backlog
- R2/KV scale independently

**Service Bottlenecks**:
| Service | Constraint | Mitigation |
|---------|-----------|------------|
| API | D1 connection pool | Prepared statements, indexes |
| Scores | AI token limits | Queue batching, caching |
| Sync | DO memory (128MB) | Per-user isolation |

**Cost Model**:

- Requests: $0.50 per million (10M free)
- CPU: $0.02 per million ms (30M free)
- Storage: D1 5GB free, R2 10GB free

## Deployment & Development

### Environments

| Environment | Purpose     | Domain               | Persistence |
| ----------- | ----------- | -------------------- | ----------- |
| Local       | Development | \*.localhost         | Ephemeral   |
| Staging     | Testing     | staging.mirubato.com | Persistent  |
| Production  | Live users  | mirubato.com         | Persistent  |

### Local Development URLs

```bash
# Services (from */package.json dev scripts)
http://www-mirubato.localhost:4000      # Frontend (HMR: 4001)
http://api-mirubato.localhost:9797      # API
http://scores-mirubato.localhost:9788   # Scores
http://dictionary-mirubato.localhost:9799 # Dictionary
ws://localhost:8787/sync/ws?userId=<id>&token=<jwt> # WebSocket

# Quick start
./start-scorebook.sh  # Starts all services with test data
```

**Code References**:

- Port configs: `*/package.json` (dev scripts)
- Service URLs: `*/wrangler.toml` ([env.local].vars)
- Frontend API targets: `frontendv2/.env.development`
- Vite config: `frontendv2/vite.config.ts:68-72`

### Deployment Pipeline

```
GitHub Push → GitHub Actions → Wrangler Deploy → Cloudflare Edge
                    ↓                ↓              ↓
              Build & Test    Gradual rollout  Instant rollback
```

**Zero Downtime**: Workers update atomically with automatic traffic shifting.

## Monitoring & Health

**Health Endpoints** (all services):

- `/health` — Comprehensive status with dependency checks
- `/livez` — Simple liveness check
- `/readyz` — Ready to serve traffic

**Health Response Structure**:

```typescript
{
  service: string,
  version: "1.7.6",
  status: "healthy" | "unhealthy",
  services: {  // Nested health checks
    database: { status, latency, message },
    cache: { status, latency },
    ...
  }
}
```

**Code References**:

- API health: `api/src/api/handlers/health.ts`
- Scores health: `scores/src/api/handlers/health.ts`
- Dictionary health: `dictionary/src/api/handlers/health.ts`
- Sync health: `sync-worker/src/index.ts:57-75`

**Observability**:

- Cloudflare Analytics for request metrics
- Wrangler tail for real-time logs
- Request ID propagation for tracing
- Custom metrics via Analytics Engine

## Decisions

- **Edge-first over traditional cloud** (2024-01): Chose Cloudflare Workers for global performance without infrastructure management
- **Microservices over monolith** (2024-02): Enables independent scaling and deployment of features
- **WebSocket via Durable Objects** (2025-07): Replaced polling with real-time sync for better UX (PR #521)
- **JWT with HS256** (2024-03): Simpler than RS256, sufficient for our security needs
- **IndexedDB for offline** (2024-04): Better performance than localStorage for large datasets

## Non-Goals

- Multi-tenancy (single user per account only)
- Native mobile apps (PWA-only strategy)
- Self-hosting support (Cloudflare-specific architecture)
- End-to-end encryption (trust Cloudflare's security)
- Federated authentication providers beyond Google

## Open Questions

- Should we implement user data export for GDPR compliance?
- When to add subscription/payment processing?
- How to handle >50MB PDF files given R2 limits?

## Security & Privacy Considerations

- **Data sensitivity**: Musical practice data is low-sensitivity PII
- **Auth**: JWT tokens expire after 30 days, magic links after 15 minutes
- **Encryption**: TLS in transit, encrypted at rest in Cloudflare
- **Logging**: No PII in logs, 30-day retention
- **User isolation**: Strict user_id validation on all queries

## Related Documentation

- [Cloudflare Services](./cloudflare-services.md) - Detailed Cloudflare service usage
- [Microservices](./microservices.md) - Service-specific architecture
- [Deployment](./deployment.md) - Deployment and CI/CD details
- [Database Schema](../02-database/schema.md) - Complete database design

---

Last updated: 2025-09-11 | Version 1.7.6
