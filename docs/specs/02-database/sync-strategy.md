# Data Synchronization Strategy

**What**: Hybrid sync architecture combining authoritative HTTP endpoints with real-time WebSocket propagation.

**Why**:

- Offline-first enables practice anywhere
- Real-time sync provides seamless multi-device experience
- HTTP fallback ensures durability
- Idempotency prevents duplicate operations

**How**:

- HTTP sync endpoints for authoritative operations
- WebSocket for real-time device-to-device updates
- Durable Objects for per-user connection management
- Last-write-wins conflict resolution

## Architecture

```
Client (IndexedDB) ↔ API (/api/sync/*) ↔ D1 (sync_data)
                    ↕                      ↕
              WebSocket (Sync Worker) → Durable Object
```

**Code References**:

- HTTP sync: `api/src/api/handlers/sync.ts`
- WebSocket server: `sync-worker/src/index.ts`
- Durable Object: `sync-worker/src/syncCoordinator.ts`
- Client sync: `frontendv2/src/services/syncService.ts`
- WebSocket client: `frontendv2/src/services/webSocketSync.ts`

## HTTP Sync (Authoritative)

### Endpoints

**Pull Operation**:

- Endpoint: `POST /api/sync/pull`
- Purpose: Fetch all user data and sync token
- Returns: Entries, repertoire, goals, sync metadata
- Code: `api/src/api/handlers/sync.ts:pullHandler`

**Push Operation**:

- Endpoint: `POST /api/sync/push`
- Purpose: Upsert entries and goals
- Headers: `X-Idempotency-Key`, `X-Device-ID` (optional)
- Idempotent: Returns cached response on replay
- Code: `api/src/api/handlers/sync.ts:pushHandler`

**Batch Operation**:

- Endpoint: `POST /api/sync/batch`
- Purpose: Bulk upsert with last-write-wins
- Max size: 1000 items per request
- Code: `api/src/api/handlers/sync.ts:batchHandler`

**Status Check**:

- Endpoint: `GET /api/sync/status`
- Purpose: Sync metadata and entity counts
- Code: `api/src/api/handlers/sync.ts:statusHandler`

### Idempotency Implementation

**Request Deduplication**:

```typescript
// Headers used
X-Idempotency-Key: <client-generated-uuid>
X-Device-ID: <optional-device-identifier>

// Response header on replay
X-Idempotent-Replay: true
```

**Storage**:

- Table: `idempotency_keys`
- TTL: 24 hours default
- Code: `api/src/services/idempotencyService.ts`

### Duplicate Prevention

**Checksum Strategy**:

- Each entity has content checksum
- Server rejects duplicate checksums
- Prevents accidental replays
- Code: `api/src/utils/sync.ts:calculateChecksum`

## WebSocket Sync (Real-time)

### Connection

**Endpoint**:

```
ws://localhost:8787/sync/ws?userId=<id>&token=<jwt>
wss://sync.mirubato.com/sync/ws?userId=<id>&token=<jwt>
```

**Authentication**:

- JWT validation before WebSocket upgrade
- userId must match token subject
- Code: `sync-worker/src/index.ts:handleWebSocketRequest`

### Message Protocol

**Event Types**:

```typescript
// Logbook events
;'ENTRY_CREATED' | 'ENTRY_UPDATED' | 'ENTRY_DELETED'

// Repertoire events
;'PIECE_ADDED' | 'PIECE_UPDATED' | 'PIECE_REMOVED' | 'PIECE_DISSOCIATED'

// Bulk operations
;'BULK_SYNC' | 'REPERTOIRE_BULK_SYNC' | 'SYNC_REQUEST'

// Connection management
;'PING' | 'PONG' | 'WELCOME' | 'ERROR' | 'SYNC_RESPONSE'
```

**Code References**:

- Message handling: `sync-worker/src/syncCoordinator.ts:handleMessage`
- Broadcasting: `sync-worker/src/syncCoordinator.ts:broadcast`
- Persistence: `sync-worker/src/syncCoordinator.ts:saveEntryToDatabase`

### Durable Object Coordination

**Per-User Isolation**:

- One DO instance per userId
- Manages all user's device connections
- Broadcasts to same-user devices only
- Code: `sync-worker/src/syncCoordinator.ts`

**Connection Management**:

- Max connections: 10 per user
- Idle timeout: ~5 minutes (via alarm)
- Ping interval: 30 seconds
- Code: `sync-worker/src/syncCoordinator.ts:handleWebSocket`

**Persistence**:

- Writes to D1 on every change
- Soft deletes with `deleted_at`
- Recovery on reconnect via bulk sync
- Code: `sync-worker/src/syncCoordinator.ts:saveToDatabase`

## Client Implementation

### Offline Queue

**Queue Management**:

- Storage: IndexedDB pending_sync table
- Retry: Exponential backoff (1s, 2s, 4s...)
- Max retries: 5 attempts
- Code: `frontendv2/src/services/syncQueue.ts`

**Sync Flow**:

1. Write to local IndexedDB
2. Queue sync operation
3. Attempt immediate sync if online
4. Retry on reconnection
5. Clear queue on success

### Conflict Resolution

**Strategy**: Last-write-wins based on timestamp

**Client Behavior**:

1. On conflict (409 response), pull latest
2. Reapply local changes if newer
3. Discard local if server is newer
4. Update local version/checksum

**Code**: `frontendv2/src/services/syncService.ts:handleConflict`

## Data Model

### Sync Data Storage

**Table**: `sync_data`

- Universal storage for all entity types
- Soft deletes via `deleted_at`
- Version tracking for optimistic locking
- Code: `api/migrations/0001_initial_schema.sql`

**Entity Types**:

- `logbook_entry` — Practice sessions
- `goal` — Practice goals
- `user_preferences` — Settings

### Sync Metadata

**Table**: `sync_metadata`

- Per-user sync state
- Last sync token and timestamp
- Device count tracking
- Code: `api/migrations/0001_initial_schema.sql`

## Optimization Strategies

### Batching

- Group changes by entity type
- Max 1000 items per batch
- Use `/api/sync/batch` for bulk operations
- Code: `frontendv2/src/services/syncService.ts:batchSync`

### Compression

- Gzip for large payloads
- JSON minification
- Omit null/undefined fields
- Code: `api/src/api/middleware.ts` (compression middleware)

### Caching

- ETag support for pull operations
- Client-side caching of sync tokens
- KV cache for frequently accessed data
- Code: `api/src/utils/cache.ts`

## Failure Modes

### Network Failures

| Failure              | Client Behavior     | Server Behavior         |
| -------------------- | ------------------- | ----------------------- |
| Offline              | Queue locally       | N/A                     |
| Timeout              | Exponential backoff | Request continues       |
| Partial upload       | Retry full batch    | Idempotency protects    |
| WebSocket disconnect | Auto-reconnect      | DO cleans up connection |

### Data Conflicts

| Conflict          | Resolution             | Code Reference                       |
| ----------------- | ---------------------- | ------------------------------------ |
| Version mismatch  | Last-write-wins        | `api/src/utils/sync.ts`              |
| Duplicate entry   | Checksum dedup         | `api/src/services/syncService.ts`    |
| Deleted on server | Honor deletion         | `sync-worker/src/syncCoordinator.ts` |
| Schema mismatch   | Client update required | Version check in response            |

## Monitoring

### Health Endpoints

- API: `/api/sync/status` — Sync health and stats
- Sync Worker: `/health` — WebSocket service health
- Code: `api/src/api/handlers/health.ts`, `sync-worker/src/index.ts`

### Metrics Tracked

- Sync latency per operation
- Conflict rate
- Queue depth
- WebSocket connection count
- Code: `api/src/services/metricsService.ts`

## Related Documentation

- [Database Schema](./schema.md) — Sync data tables
- [WebSocket Protocol](../03-api/websocket.md) — Message specifications
- [API Reference](../03-api/rest-api.md) — HTTP endpoint details

---

_Last updated: 2025-09-09 | Version 1.7.6_
