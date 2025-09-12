---
Spec-ID: SPEC-API-001
Title: REST API Specification
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# REST API Specification

Status: ✅ Active

## What

Public HTTP interface for authentication, data sync, user preferences, repertoire, goals, autocomplete, and service health.

## Why

- Edge-first: low latency on Cloudflare Workers
- Offline-first: sync-centric writes via batched endpoints
- Simple auth: JWT via cookie or Bearer token

## How

- Base URLs:
  - Production: https://api.mirubato.com
  - Staging: https://api-staging.mirubato.com
  - Local: http://api-mirubato.localhost:9797
- Authentication:
  - Browser: httpOnly cookies (`auth-token`, `refresh-token`)
  - API: `Authorization: Bearer <jwt>` also accepted
  - See [Authentication](./authentication.md)
- Sync patterns:
  - Prefer `POST /api/sync/push` with `X-Idempotency-Key` for retriable writes
  - Data stored in `sync_data` by `entity_type` (e.g., `logbook_entry`, `goal`)

## Endpoints Overview

- Auth
  - `POST /api/auth/request-magic-link`
  - `POST /api/auth/verify-magic-link`
  - `POST /api/auth/google`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- Sync
  - `POST /api/sync/pull`
  - `POST /api/sync/push`
  - `POST /api/sync/batch`
  - `GET /api/sync/status`
- User
  - `GET /api/user/me`
  - `GET /api/user/preferences`
  - `PUT /api/user/preferences`
  - `DELETE /api/user/me`
- Repertoire
  - `GET /api/repertoire`
  - `GET /api/repertoire/:scoreId/stats`
  - `POST /api/repertoire`
  - `PUT /api/repertoire/:scoreId`
  - `DELETE /api/repertoire/:scoreId`
  - `DELETE /api/repertoire/:scoreId/dissociate`
- Goals
  - `GET /api/goals`
  - `GET /api/goals/:id`
  - `POST /api/goals`
  - `PUT /api/goals/:id`
  - `POST /api/goals/:id/progress`
  - `DELETE /api/goals/:id`
- Autocomplete
  - `GET /api/autocomplete/composers`
  - `GET /api/autocomplete/pieces`
- Pieces Utilities
  - `PUT /api/pieces/update-name`
- Health & Metrics
  - `GET /health`, `GET /health/detailed`, `GET /livez`, `GET /readyz`
  - `GET /metrics` (Prometheus format)

Note: There are no REST endpoints for logbook CRUD; log data is managed via Sync.

## Response Conventions

- Responses may be raw objects or `{ success, ... }` depending on endpoint (see OpenAPI).
- For exact schemas, use `/openapi.json` or see `api/src/api/openapi.ts`.

## Operational Limits

- Idempotency: provide `X-Idempotency-Key` on `POST /api/sync/push` for safe retries
- Cookies: httpOnly, SameSite=Lax; access/refresh tokens currently 30 days TTL
- Rate limiting: applied to select auth endpoints; no global X-RateLimit headers yet

## Failure Modes

- Auth: missing/invalid/expired JWT, Google tokeninfo invalid `aud/exp`
- Sync: D1 write failures, checksum duplicate prevented, idempotent replay
- Repertoire/Goals: validation errors, not found, unique constraint

## Code References

- Router: `api/src/api/routes.ts`
- OpenAPI: `api/src/api/openapi.ts`
- Auth: `api/src/api/handlers/auth.ts`, `api/src/utils/auth.ts`
- Sync: `api/src/api/handlers/sync.ts`, `api/src/utils/database.ts`
- User: `api/src/api/handlers/user.ts`
- Repertoire: `api/src/api/handlers/repertoire.ts`
- Goals: `api/src/api/handlers/goals.ts`
- Health: `api/src/api/handlers/health.ts`

## Decisions

- **JWT over sessions** (2024-01): Stateless auth for edge computing
- **Sync-centric design** (2024-03): Offline-first requires batch sync operations
- **Idempotency keys** (2024-08): Prevent duplicate sync operations
- **Cookie + Bearer auth** (2024-04): Support both browser and API clients

## Non-Goals

- GraphQL API (REST is sufficient)
- Webhook callbacks (use WebSocket for real-time)
- Pagination (client-side filtering preferred)
- API versioning (single version, backward compatible)

## Open Questions

- Should we add OpenAPI client generation?
- When to implement rate limit headers?
- How to handle API deprecation notices?

## Security & Privacy Considerations

- **Auth**: JWT in HttpOnly cookies, 30-day expiry
- **CORS**: Explicit origin allowlist
- **Rate limiting**: Applied per endpoint
- **Data isolation**: User ID validated on all queries
- **Audit**: Request IDs for tracing

## Related Documentation

- [Authentication](./authentication.md)
- [WebSocket](./websocket.md)
- [Service APIs](./service-apis.md)
- [API Client Examples](./client-examples.md)

---

Last updated: 2025-09-11 | Version 1.7.6
