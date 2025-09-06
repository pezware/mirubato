# Sync System TODO

This document outlines the remaining gaps in the sync system and proposed solutions to address them.

## Key Gaps

1. **Repertoire bulk sync**: Server doesn't emit `REPERTOIRE_BULK_SYNC`; client already supports it
2. **Offline queue persistence**: WebSocket outbox is in-memory; reload loses unsent events
3. **Sync window limitations**: 7-day window may miss history without automatic backfill
4. **LWW nuances**: Client relies on `updatedAt` only; server tracks `version` but doesn't use it fully

## Proposed Changes

### 1. Repertoire BULK_SYNC Implementation (Priority: High)

#### Server-side changes (`sync-worker`)

- **File**: `sync-worker/src/syncCoordinator.ts`
  - Add repertoire fetch to `SYNC_REQUEST` handler
  - Query D1 `sync_data` with `entity_type='repertoire_piece'` and `updated_at > lastSyncTime`
  - Emit `REPERTOIRE_BULK_SYNC` as a separate event (keep logbook and repertoire bulks independent)
- **File**: `sync-worker/src/schemas.ts`
  - Extend Zod schemas to validate/sanitize repertoire items
  - Ensure proper type definitions for repertoire pieces

#### Client-side changes

- **File**: `frontendv2/src/services/webSocketSync.ts`
  - Verify `REPERTOIRE_BULK_SYNC` dispatches to repertoire handlers correctly
- **File**: `frontendv2/src/stores/repertoireStore.ts`
  - Add bulk merge path that:
    - Normalizes `scoreId` via `normalizeExistingScoreId`
    - Dedups by normalized ID, keeping max(`updatedAt`, `version`)
    - Writes through to localStorage with proper conflict resolution

### 2. Persisted WebSocket Outbox (Priority: High)

#### Implementation details

- **File**: `frontendv2/src/services/webSocketSync.ts`
  - Persist unsent events to localStorage key `ws_outbox_v1`
  - Include client `messageId`/`dedupeKey` per event
  - Drain queue on connect with exponential backoff
  - Drop events after server acknowledgment
- **Server considerations**:
  - Treat `messageId` as idempotency hint (optional, since REST path has `X-Idempotency-Key`)
  - Consider adding explicit ACK messages for critical operations

#### Example structure:

```typescript
interface PersistedOutboxItem {
  messageId: string
  event: SyncEvent
  attempts: number
  lastAttempt?: number
  maxRetries?: number
}
```

### 3. Backfill & Extended Sync Window (Priority: Medium)

#### Proposed changes

- **Default window**: Raise from 7 days to 30 days
- **Smart window**: Compute from local "latest known" timestamps per store
- **Auto-backfill logic**:
  ```typescript
  if (!lastSyncTime || Date.now() - lastSyncTime > 30_DAYS) {
    // Run REST /api/sync/pull once for full history
    await fullHistoricalSync()
    // Set lastSyncTime to now
    localStorage.setItem('mirubato:lastSyncTime', new Date().toISOString())
  }
  ```
- **Files affected**:
  - `frontendv2/src/services/webSocketSync.ts`
  - `frontendv2/src/stores/logbookStore.ts`
  - `frontendv2/src/stores/repertoireStore.ts`

### 4. LWW Improvements with Version Support (Priority: Low)

#### Changes needed

- **Server**: Include `version` field in all broadcast events
- **Client**: Update conflict resolution to prefer server `version` over `updatedAt` when available
- **Fallback**: Keep existing `updatedAt` tiebreaker when `version` is absent (for older data/backfill)

#### Implementation:

```typescript
function shouldAcceptUpdate(existing: Item, incoming: Item): boolean {
  // Prefer version if both have it
  if (existing.version && incoming.version) {
    return incoming.version > existing.version
  }
  // Fall back to updatedAt
  return new Date(incoming.updatedAt) > new Date(existing.updatedAt)
}
```

### 5. Safety & Scale Improvements (Priority: Medium)

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

- Verify all migrations are idempotent and don't re-run after success
- Add migration version tracking if not present

## Implementation Order

1. **Phase 1** (Immediate):
   - Repertoire BULK_SYNC server implementation
   - Persisted WebSocket outbox

2. **Phase 2** (Next sprint):
   - Extended sync window with auto-backfill
   - Bulk payload chunking

3. **Phase 3** (Future):
   - Version-based LWW improvements
   - Additional safety measures

## Open Questions

1. **Event naming**: Confirm `REPERTOIRE_BULK_SYNC` vs `PIECE_BULK_SYNC` (client expects which?)
2. **Version field**: Does server broadcast include `version` today for pieces? If not, add to support improved LWW
3. **Bulk size limits**: Preferred upper bound per WebSocket frame (current suggestion: 500 items)
4. **Offline duration**: How long should offline events be retained before dropping? (suggestion: 7 days)
5. **Backfill trigger**: Should full backfill be automatic or require user confirmation for large datasets?

## File Touchpoints Summary

### Server (`sync-worker`)

- `src/syncCoordinator.ts` - Add repertoire bulk sync logic
- `src/schemas.ts` - Extend validation schemas

### Client (`frontendv2`)

- `src/services/webSocketSync.ts` - Persist outbox, extend sync window
- `src/stores/repertoireStore.ts` - Bulk merge implementation
- `src/stores/logbookStore.ts` - Sync window adjustments
- `src/utils/migrations/*` - Guard existing migrations

### API (`api`)

- No changes needed for these improvements (REST sync already complete)

## Success Metrics

- [ ] Zero data loss on connection drops (persisted outbox)
- [ ] Full repertoire sync on WebSocket connection
- [ ] No missing historical data (30-day window + backfill)
- [ ] Reduced duplicate sync requests
- [ ] Improved conflict resolution with version tracking

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
