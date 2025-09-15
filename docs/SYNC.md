# Sync, Normalization, and Deduplication Documentation

Here's a concise map of how sync, normalization, and dedup work today, with pointers to the key code.

## Recent Fixes (September 2025)

### Critical Data Loss Fixes

Three commits addressed critical WebSocket sync issues that were causing data loss:

1. **a29a35fe**: Fixed race condition where WebSocket sync events arrived before `loadEntries()` completed
   - Added `readEntriesFromDisk()` and `writeEntriesMapToDisk()` helpers for safe localStorage operations
   - All sync handlers now hydrate from disk if in-memory map is empty
   - Properly merge with existing disk data before persisting to prevent overwrites

2. **23074ed0**: Fixed `lastSyncTime` updates to only occur for data-carrying events
   - Control messages (WELCOME, PONG) no longer update `lastSyncTime`
   - Prevents missed catch-up syncs on reconnect within 30 seconds
   - Only updates for: ENTRY_CREATED, ENTRY_UPDATED, ENTRY_DELETED, BULK_SYNC, etc.

3. **b6d711bd**: Changed debounced localStorage writes to immediate writes for sync operations
   - Prevents data loss when browser closed immediately after WebSocket sync
   - Ensures sync data is persisted before browser can be closed

### Incomplete Sync Fix

Fixed issue where WebSocket wouldn't request full sync despite missing data:

- **Problem**: `lastSyncTime` persisted even when entries were missing/incomplete in localStorage
- **Solution**: Clear `lastSyncTime` on every successful authentication (authStore.ts)
- **Result**: Forces SYNC_REQUEST on WebSocket connection after login, ensuring complete data sync

### Bidirectional Sync Fix (Latest)

Fixed issue where local entries created before authentication weren't synced to server:

- **Problem**: SYNC_REQUEST only pulled data from server, never pushed local entries
- **Solution**: Added `pushLocalEntriesToServer()` method called after authentication
- **Implementation**:
  - logbookStore.ts: New method pushes all local entries to server via REST API
  - authStore.ts: Calls push method after successful auth (before WebSocket init)
  - Handles 409 duplicates gracefully (server deduplication works correctly)
- **Result**: True bidirectional sync - local-first data preserved after sign-in

## High-Level Flow

- **Local-first**: Entries and repertoire load from localStorage first; stores update immediately on user actions.
- **Server persistence**: API writes via `/api/sync/push`; realtime broadcast via WebSocket to other devices.
- **Initial sync**: On WebSocket connect, client sends SYNC_REQUEST if:
  - Last sync > 30s ago, OR
  - There are offline queued events, OR
  - User just authenticated (lastSyncTime cleared)
- **Conflict handling**: Last-write-wins by `updatedAt` timestamp on client; D1 upserts on server.

## Realtime Sync (WebSocket + Durable Object)

### Entry point: `frontendv2/src/services/webSocketSync.ts`

- Connects to `wss://sync.mirubato.com/sync/ws?userId=...&token=...`
- Sends SYNC_REQUEST if last sync > 30s or there are offline queued events (in-memory only)
- **New**: `lastSyncTime` cleared on auth to force full sync
- Handles inbound events: `ENTRY_*`, `BULK_SYNC`, `PIECE_*`, invokes registered handlers
- Tracks `lastSyncTime` in localStorage (only for data events, not control messages)
- Exposes connection state

### Store wiring:

**Logbook**: `frontendv2/src/stores/logbookStore.ts`

- On create/update/delete: update local state, push via REST, and send `ENTRY_*` if realtime enabled
- Listeners merge inbound events with timestamp-based LWW (ignore older updates)
- `BULK_SYNC` merges a list of entries with per-entry LWW and writes to localStorage
- **Fixed**: Sync handlers now properly hydrate from disk and merge to prevent data loss

**Repertoire**: `frontendv2/src/stores/repertoireStore.ts`

- Similar event handlers for `PIECE_*` operations; normalizes `scoreId` keys

### Sync Worker (server): `sync-worker/src`

**index.ts**: Verifies JWT from querystring; routes to Durable Object

**syncCoordinator.ts**:

- One DO instance per user; tracks connected clients
- `SYNC_REQUEST` → queries D1 `sync_data` for `entity_type='logbook_entry'` updated since `lastSyncTime` (default 7 days) → sends `BULK_SYNC`
- `ENTRY_*` and `PIECE_*`:
  - Validates/sanitizes via Zod (`schemas.ts`) → lowercases enums, unifies `goalIds`→`goal_ids`, parses timestamps
  - Persists to D1 `sync_data` with `INSERT ... ON CONFLICT ... DO UPDATE` (entity-unique), increments version, sets `deleted_at` for deletes
  - Broadcasts to other clients of same user

**Protocol types**: `sync-worker/src/schemas.ts` (Zod schemas) and client-side `SyncEvent` in `webSocketSync.ts`

## REST Sync (API Worker)

### Handlers: `api/src/api/handlers/sync.ts`

- **POST /api/sync/pull**: Returns all non-deleted sync_data (logbook entries + goals) with light normalization on the way out
- **POST /api/sync/push**: Main write path used by the frontend stores
  - Transforms input: lowercases enums, unifies `goalIds`→`goal_ids`, adds `user_id`, normalizes `scoreId` and piece `id` with `generateNormalizedScoreId`
  - Computes checksum (`SHA-256`) and upserts via `DatabaseHelpers.upsertSyncData` (prevents duplicates)
  - Uses optional `X-Idempotency-Key` to make writes idempotent (`api/src/utils/idempotency.ts`)
- **POST /api/sync/batch**, **GET /api/sync/status**: Additional batch/status utilities

### DB helpers: `api/src/utils/database.ts`

- `upsertSyncData`: Content-duplicate detection by (user_id, entity_type, checksum) plus entity-uniqueness by (user_id, entity_type, entity_id)
- Uses non-unique index on checksum for detection and a unique index on the entity triple (see migration)
- Soft delete sets `deleted_at`

**Schema backing**: See migration `api/migrations/0008_duplicate_prevention.sql`

## Normalization

### Score IDs (frontend + backend, shared logic):

- **Frontend**: `frontendv2/src/utils/scoreIdNormalizer.ts`
- **Backend**: `api/src/utils/scoreIdNormalizer.ts` (exact copy; must stay in sync)
- **Behavior**:
  - `generateNormalizedScoreId(title, composer)`: lowercase, trim, normalize punctuation, smart delimiter (`-` vs `||` when dashes present)
  - `parseScoreId(id)`, `normalizeExistingScoreId(id)`, fuzzy helpers for similarity

### Enumerations:

- **Frontend migration**: `runLowercaseMigration()` in `frontendv2/src/utils/migrations/lowercaseMigration.ts` (applied on app start in App.tsx)
- Sync Worker Zod `sanitizeEntry` also lowercases instrument, type, mood
- API `sync.push` lowercases these again before writing to D1

### Score ID normalization migration:

- `runScoreIdNormalization()` in `frontendv2/src/utils/migrations/scoreIdNormalization.ts` normalizes all scoreIds in entries and repertoire in localStorage; runs on app start

### Composer canonicalization (UX/search help):

- `frontendv2/src/utils/composerCanonicalizer.ts`, mappings under `frontendv2/src/shared/resources/composerMappings.ts` (mirrored in API)

## Deduplication

### Server-side (authoritative):

- **Entity uniqueness**: Unique index on (user_id, entity_type, entity_id) ensures a single row per entity
- **Content duplicate avoidance**: `upsertSyncData` checks existing rows by checksum for the same user/type; if the content already exists under a different entity_id, returns `action: 'duplicate_prevented'` rather than inserting
- **Idempotency**: `X-Idempotency-Key` stores request/response in `idempotency_keys` to safely replay without duplicating

### Client-side (logbook):

- **Tools**: `frontendv2/src/utils/duplicateCleanup.ts` (signature-based + near-time-window detection)
- **Store action**: `useLogbookStore().cleanupDuplicates()` removes duplicates locally and rewrites localStorage. Not auto-invoked on login; it's available as a user action
- **Realtime merge**: `addEntryFromSync`/`updateEntryFromSync` ignore older events using `updatedAt`
- **Fixed**: Now properly reads from disk when in-memory state is empty to prevent data loss

### Client-side (repertoire):

- **Dedup-by-key**: Normalizes scoreId (`normalizeExistingScoreId`) and stores items in a Map keyed by normalized ID, keeping the most recent `updatedAt`
- **Auto-clean**: `useRepertoireStore().cleanupDuplicates()` is invoked during Google login in authStore before syncing
- **WebSocket handlers** also normalize scoreId on arrival

## Where To Look

- **WebSocket client**: `frontendv2/src/services/webSocketSync.ts`
- **Logbook store**: `frontendv2/src/stores/logbookStore.ts`
- **Repertoire store**: `frontendv2/src/stores/repertoireStore.ts`
- **Auth store**: `frontendv2/src/stores/authStore.ts` (clears lastSyncTime on auth)
- **Duplicate utilities**: `frontendv2/src/utils/duplicateCleanup.ts`
- **Score ID normalization**: `frontendv2/src/utils/scoreIdNormalizer.ts` and `api/src/utils/scoreIdNormalizer.ts`
- **Migrations**: `frontendv2/src/utils/migrations/*`
- **Sync Worker (server)**: `sync-worker/src/index.ts`, `sync-worker/src/syncCoordinator.ts`, `sync-worker/src/schemas.ts`
- **REST sync**: `api/src/api/handlers/sync.ts`
- **DB helpers**: `api/src/utils/database.ts`
- **DB migration (dedup)**: `api/migrations/0008_duplicate_prevention.sql`

## Notable Gaps/Behavior

- **WebSocket bulk sync now includes repertoire**: sync-worker fetches both `entity_type='logbook_entry'` and `entity_type='repertoire_item'` for BULK_SYNC. Both logbook entries and repertoire pieces are properly sanitized before sending to clients
- **WebSocket offline queue isn't persisted**: webSocketSync queues in-memory only (docs example shows localStorage persistence)
- **Window of WebSocket bulk sync**: defaults to last 7 days. Full historical fetch still uses REST `/api/sync/pull` where needed (e.g., repertoire goal initialization), but logbook store doesn't auto-pull all entries on connect
- **Fixed**: WebSocket now properly requests sync after authentication by clearing `lastSyncTime`
