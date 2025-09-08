# WebSocket Protocol Specification

Status: ✅ Active

## Overview

Real-time sync is provided by a dedicated Sync Worker using Cloudflare Durable Objects. Clients authenticate with an API-issued JWT and maintain a stateful connection per user.

## How

- URLs
  - Production: `wss://sync.mirubato.com/sync/ws`
  - Staging: `wss://sync-staging.mirubato.com/sync/ws`
  - Local: `ws://localhost:8787/sync/ws`
- Authentication
  - Query params: `userId=<id>&token=<jwt>` (JWT must match `userId`)
  - The worker forwards the request to the per-user Durable Object
- Heartbeat & lifecycle
  - Server sends WELCOME and PONG; idle connections are cleaned up
  - Clients should periodically send PING and reconnect with backoff on close

## Message Model

- Client → Server event types
  - `ENTRY_CREATED`, `ENTRY_UPDATED`, `ENTRY_DELETED`
  - `PIECE_ADDED`, `PIECE_UPDATED`, `PIECE_REMOVED`, `PIECE_DISSOCIATED`
  - `BULK_SYNC`, `REPERTOIRE_BULK_SYNC`
  - `SYNC_REQUEST`, `PING`
- Server → Client event types
  - `WELCOME`, `PONG`, `SYNC_RESPONSE`, `ERROR`
- Schemas
  - Logbook entries: `sync-worker/src/schemas.ts` (`LogbookEntrySchema`)
  - Repertoire items: `sync-worker/src/schemas.ts` (`RepertoireItemSchema`)
  - Events: `sync-worker/src/schemas.ts` (`SyncEventSchema`, `ResponseEventSchema`)

## Failure Modes

- Auth mismatch: `userId` does not match JWT
- Invalid payloads: schema validation failures are dropped/logged
- Stale/idle connections: closed by the Durable Object

## Code References

- Entrypoint: `sync-worker/src/index.ts`
- Coordinator: `sync-worker/src/syncCoordinator.ts`
- Schemas: `sync-worker/src/schemas.ts`

## Related Documentation

- [REST API](./rest-api.md)
- [Authentication](./authentication.md)

---

Last updated: September 2025 | Source of truth: sync-worker code

