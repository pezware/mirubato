# Service APIs Specification

Status: 🚧 Experimental (parts planned)

## What

Patterns and contracts for inter-service communication between API, Scores, Dictionary, and Sync services.

## Why

- Keep public APIs stable while enabling internal evolution
- Prepare for service-to-service auth and internal-only endpoints

## How (Current)

- Services expose public `/api/...` endpoints (per service)
- API callers authenticate primarily via user JWTs
- No dedicated service-token scheme or `/internal/...` endpoints are enforced in production today

## Planned

- Service tokens (JWT with `iss/sub/aud/scope`) via shared secret
- Internal routes (e.g., `/internal/scores/...`, `/internal/dictionary/...`, `/internal/sync/...`) protected by service tokens
- Aggregation/gateway patterns from API → Scores/Dictionary
- Circuit breaker and request tracing across services

## Failure Modes

- Token audience/scope mismatch (planned service tokens)
- Upstream dependency errors; apply retries and circuit breaking (planned)

## Code References

- API: `api/src/api/routes.ts`, `api/src/api/handlers/*`
- Scores service: `scores/src` (public `/api/...` endpoints)
- Dictionary service: `dictionary/src` (public `/api/...` endpoints)
- Sync Worker: `sync-worker/src` (WebSocket handling)

## Related Documentation

- [REST API](./rest-api.md)
- [WebSocket](./websocket.md)
- [Architecture: Microservices](../01-architecture/microservices.md)

---

Last updated: September 2025 | Current status reflects production behavior
