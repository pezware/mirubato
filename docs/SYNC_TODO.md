# Sync System TODO

This document tracks remaining gaps in the sync system and the plan to make multi‑device sync reliable and scalable.

## Key Gaps

1. ~~**Repertoire bulk sync**~~: ✅ COMPLETED — Server emits `REPERTOIRE_BULK_SYNC` with sanitization; client merges safely
2. ~~**Offline queue persistence**~~: ✅ COMPLETED — WebSocket outbox is persisted (localStorage `mirubato:ws:offlineQueue`); migrate to IndexedDB for durability and size
3. **Cursor robustness**: Replace timestamp‑based cursors with a server‑sequenced token (lastSeq) to eliminate clock skew and ordering ambiguity
4. **Conflict handling**: Prefer per‑entity `version` over `updatedAt` for LWW; add tombstones and idempotency for retries

## Proposed Changes

### ~~1. Repertoire BULK_SYNC Implementation~~ ✅ COMPLETED

- Server sends repertoire items in `SYNC_REQUEST`; sanitized via `sanitizeRepertoireItem`
- Client handles `REPERTOIRE_BULK_SYNC` with normalization/deduplication
- `scoreId`/`score_id` compatibility maintained

### 2. Outbox Durability & Idempotency (Priority: High)

Current: outbox is persisted to localStorage and deduped on entity/type.

Plan:

- Migrate outbox storage to IndexedDB (bigger, transactional, resilient).
- Add `deviceId` + `clientChangeId` (UUID) per mutation event for idempotency.
- Drain with backoff; remove on ACK (implicit by seq/token advancement or explicit server ACKs if added).

Decision:

- IndexedDB over localStorage
  - Pros: larger capacity, transactional writes, better performance
  - Cons: slightly higher implementation complexity
  - Choice: IndexedDB

### 3. Server‑Sequenced Token Sync (Priority: High)

Problem (timestamps): susceptible to clock skew, reordering, and ambiguous boundaries.

Solution (sequence tokens):

- Add a monotonically increasing `seq` to the change log (or to `sync_data`).
- Server issues `syncToken = lastSeq`; clients send `since: lastSeq` on pull/connect.
- Server returns `changes WHERE seq > lastSeq ORDER BY seq` and a new `lastSeq`.

Details:

- Schema: add `seq INTEGER PRIMARY KEY AUTOINCREMENT` (or separate table), index `(user_id, seq)`.
- Worker: `SYNC_REQUEST` accepts `lastSeq` (keep `lastSyncTime` fallback temporarily), queries by `seq`.
- Client: store `lastSeq` instead of `lastSyncTime` once migrated; fall back to `/api/sync/pull` for first run.
- Tombstones: keep deletes as change rows; deliver like updates; retain N days.
- Idempotency: record `(userId, deviceId, clientChangeId)` for exactly‑once semantics.

Decision:

- Sequence token over timestamps
  - Pros: deterministic ordering, immune to skew, simpler catch‑up
  - Cons: DB migration + code changes
  - Choice: Sequence token

Transitional fallback (optional, Priority: Medium):

- Increase default timestamp window from 7 → 30 days, and auto‑backfill once via `/api/sync/pull` if cursor is missing or stale. Remove after seq migration reaches >95% clients.

### 4. Conflict Resolution with Versions (Priority: Medium)

Plan:

- Server: include authoritative `version` in broadcasts and REST reads.
- Client: prefer `version` over `updatedAt`; fall back to `updatedAt` when missing.
- Consider field‑wise merge for notes/tags in the future (defer).

### 5. Safety & Scale (Priority: Medium)

#### Chunking strategy

- **Bulk payload limits**: Chunk at 500-1000 items per frame
- **Implementation**:
  ```typescript
  const CHUNK_SIZE = 500
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    await send({ type: 'BULK_SYNC', entries: chunk, page: i / CHUNK_SIZE })
  }
  ```

#### Guard migrations

- Verify idempotency, add migration version tracking where missing

#### Cross‑tab leadership

- Elect a leader tab (BroadcastChannel) to own WebSocket + outbox; followers read state only.
- Reduces duplicate sends and races across tabs.

## Implementation Order

1. Phase 1 (Immediate):
   - Server‑stamped timestamps (DONE)
   - Client lastSync clamp + SYNC_REQUEST gating (DONE)
   - Logout hygiene: clear cursors + reset outbox (DONE)
   - Persisted outbox (DONE) → plan IndexedDB migration

2. Phase 2 (Next sprint):
   - Introduce server sequence (`seq`) + token; worker queries by `seq`
   - Client stores `lastSeq`; keep timestamp fallback behind a feature flag
   - Idempotency keys (`deviceId`, `clientChangeId`) in worker
   - Bulk payload chunking

3. Phase 3 (Following):
   - Version‑based conflict resolution on client
   - IndexedDB outbox migration + cross‑tab leadership
   - Tombstones retention policy

## Open Questions

1. Event naming: ✅ RESOLVED (`REPERTOIRE_BULK_SYNC`)
2. Version field: Ensure broadcasts include `version` for entries and pieces
3. Bulk size limits: upper bound per frame (proposed: 500)
4. Outbox retention: keep failed events for 7 days? 14?
5. Token rollout: timeline and telemetry to remove timestamp fallback

## Recent Fixes

October 2025

- Server stamps event timestamps to avoid client clock skew
- Client clamps future/invalid event timestamps when setting lastSync
- Client sends SYNC_REQUEST when cursor invalid/future/old or offline queue > 0
- Client clears `mirubato:lastSyncTime` on logout; resets WebSocket outbox
- Worker ignores invalid/future `lastSyncTime` and defaults to safe window

December 2024

- `scoreId` mapping and sanitizer updates for repertoire items
- ID field fallback in repertoire persistence (scoreId/score_id/id)
- Immediate writes for repertoire sync to avoid data loss
- lastSyncTime tracking aligned with repertoire events

## File Touchpoints Summary

### Server (`sync-worker`)

- `src/syncCoordinator.ts` — Sequence token support; query by `seq`; tombstones; idempotency check
- `src/schemas.ts` — Ensure `version` is included in entry/piece payloads

### Client (`frontendv2`)

- `src/services/webSocketSync.ts` — SYNC_REQUEST logic, cursor clamp, outbox (migrate to IndexedDB)
- `src/stores/*Store.ts` — Version‑aware merge; token storage (`lastSeq`)

### API/DB (`api` + D1)

- Migrations to add `seq` and required indices
- Expose `syncToken`=`lastSeq` in `/api/sync/pull`/`push` responses

## Success Metrics

- [ ] Zero data loss on connection drops (IndexedDB outbox)
- [ ] Deterministic catch‑up via `seq` tokens
- [ ] No missing historical data (token‑based + tombstones)
- [ ] Reduced duplicate requests (idempotency keys)
- [ ] Conflict resolution improved with `version`

## Testing Requirements

1. **Unit tests**:
   - Persisted outbox save/load/drain
   - Repertoire bulk merge logic
   - Version-based conflict resolution

2. **Integration tests**:
   - Full sync flow with repertoire
   - Offline → online transition
   - Large dataset chunking

3. **E2E tests**:
   - Multi-device sync scenarios
   - Network interruption recovery
   - Historical data backfill
