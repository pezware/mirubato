# Data Synchronization Strategy

## Overview

Mirubato uses an offline-first sync model combining:

- Real-time updates via WebSockets and Durable Objects (Sync Worker)
- Authoritative HTTP sync endpoints in the API service
- Offline queueing on clients with eventual consistency

All operations are idempotent where possible, and schema changes are additive.

## Architecture

```
Client (IndexedDB/Queue) ↔ API (/api/sync/*) ↔ D1 (sync_data/sync_metadata)
                         ↕
                   WebSocket (Sync Worker + DO)
```

### Channels

- WebSocket (real-time): best-effort propagation between a user’s devices; stateful per-user DO.
- HTTP (authoritative): pull/push/batch endpoints maintain the source of truth in D1.

## Real-Time Synchronization

### WebSocket

- Endpoint: `/sync/ws?userId=<id>&token=<jwt>` (local: `ws://localhost:8787`)
- Auth: JWT (HS256) validated before upgrading; userId in query must match token subject
- Transport: per-user Durable Object coordinates all device connections
- Persistence: DO writes recent changes to `sync_data` for recovery/bulk sync

Message types (selected):

- Entries: `ENTRY_CREATED` | `ENTRY_UPDATED` | `ENTRY_DELETED`
- Repertoire: `PIECE_ADDED` | `PIECE_UPDATED` | `PIECE_REMOVED` | `PIECE_DISSOCIATED`
- Bulk: `BULK_SYNC` | `REPERTOIRE_BULK_SYNC` | `SYNC_REQUEST`
- Control: `PING` | `PONG` | `WELCOME` | `ERROR` | `SYNC_RESPONSE`

## Authoritative HTTP Sync

Endpoints (API):

- `POST /api/sync/pull` — returns user entries and sync token
- `POST /api/sync/push` — upserts entries/goals; supports `X-Idempotency-Key` and optional `X-Device-ID`
- `POST /api/sync/batch` — last-write-wins batch semantics
- `GET /api/sync/status` — sync metadata and counts

Key behaviors:

- Idempotency: if `X-Idempotency-Key` matches prior request hash, cached response is returned (`X-Idempotent-Replay: true`)
- Duplicate prevention: server checksum dedupes replays
- Normalization: score IDs normalized from title+composer
- Conflict model: last-write-wins based on version/checksum; client should refetch and reapply on conflict

## Offline-First (Client)

Clients persist entities in IndexedDB and queue changes while offline. On reconnect, the queue flushes through the HTTP endpoints. This is an implementation detail on the client; the server remains stateless per request outside the DO.

Recommendations:

- Use exponential backoff for retries and cap attempts
- Group changes into batches when available
- Avoid large payloads; chunk by entity type as needed

## Conflict Resolution

- Primary: last-write-wins on the server
- Client guidance: if a write fails with a mismatch/conflict, refresh via `/pull` and reapply local changes

## Sync Optimization

- Batch sync: clients should group changes where possible and use `/api/sync/batch`
- Deduplication: server-side checksum protects against replayed writes
- Transport: prefer HTTP for durability; WebSocket for device-to-device propagation

## Data Consistency

- Idempotent writes: safe to retry
- Soft deletes: `deleted_at` used for entity removal in `sync_data`
- Eventual consistency across devices via real-time + periodic pulls

---

Note: This document describes contracts and behaviors. Implementation details in client storage are intentionally abstracted; refer to frontend docs for concrete patterns.

