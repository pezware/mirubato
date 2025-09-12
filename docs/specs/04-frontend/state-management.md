# State Management Specification

Status: ✅ Active

## What

Zustand powers client-side state (auth, logbook, repertoire, etc.), SWR powers data fetching. Persistence uses localStorage and Cache API, with WebSocket-backed real‑time sync.

## Why

- Lightweight stores with explicit actions/selectors
- Simple, resilient offline behavior and fast UI updates

## How

- Stores present (representative):
  - `authStore.ts`: auth state, cookie/Bearer usage, backup/restore of local data during auth transitions
  - `logbookStore.ts`: entries, timer, real‑time event emits/handling
  - `repertoireStore.ts`: items, goals integration, stats, sync helpers
  - Other feature stores: `practiceStore.ts`, `reportingStore.ts`, `scoreStore.ts`
- Not present: a dedicated `settingsStore.ts` or `syncStore.ts` (sync is handled within feature stores + WebSocket service)

## Data Fetching

- SWR for suggestions and small queries (e.g., `hooks/useAutocomplete.ts`)
- Axios client adds `X-Device-ID` and `X-Idempotency-Key` for selected writes
- For endpoint contracts and auth details, see 03‑API (no duplication here)

## Real‑time Sync

- `services/webSocketSync.ts` manages connection to `/sync/ws?userId=&token=`
- Event types handled: ENTRY_CREATED/UPDATED/DELETED, PIECE_ADDED/UPDATED/REMOVED/DISSOCIATED, BULK_SYNC, SYNC_REQUEST
- Offline queue: events are queued when disconnected and flushed on reconnect
- Feature stores call into WebSocketSync to emit/respond to events

## Persistence (Offline)

- localStorage keys:
  - Logbook: `mirubato:logbook:*` (e.g., entries, goals, scoreMetadata)
  - Repertoire: `mirubato:repertoire:*` (items, goals, scoreMetadata)
  - Backups during auth transitions (see `authStore.ts` backup/restore helpers)
- PDFs: HTTP Cache API; `utils/pdfCache.ts` manages entries and clean‑up

## Failure Modes

- 401 from API → axios interceptor clears auth and switches to local mode (keep user data)
- WebSocket disconnect → queue events offline; send SYNC_REQUEST and flush on reconnect
- Sync push failure → keep local change; surface toast for user feedback

## Operational Limits

- Idempotent writes recommended (client adds `X-Idempotency-Key` for sync operations)
- WebSocket skip SYNC_REQUEST when recently synced; reconnect with backoff

## Code References

- Stores: `frontendv2/src/stores/{authStore,logbookStore,repertoireStore}.ts`
- WebSocket: `frontendv2/src/services/webSocketSync.ts`
- API client: `frontendv2/src/api/client.ts`, feature APIs under `src/api/*`
- SWR sample: `frontendv2/src/hooks/useAutocomplete.ts`
- PDF cache: `frontendv2/src/utils/pdfCache.ts`

## Related Documentation

- 03‑API (REST/WebSocket/auth): `docs/specs/03-api/*`
- Frontend: [Architecture](./architecture.md), [UI Design System](./ui-design-system.md), [Layout](./layout-patterns.md), [Responsive](./responsive-design.md)

---

Last updated: 2025-09-09 | Version 1.7.6
