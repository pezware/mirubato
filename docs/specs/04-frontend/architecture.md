# Frontend Architecture Specification

Status: ✅ Active

## What

React + TypeScript single-page application (SPA) served via a Cloudflare Worker, with offline-resilient UX, responsive layouts, and real‑time sync.

## Why

- Lightweight client with fast page transitions
- Offline-first behavior for practice logging
- Simple deployment and global performance

## How

- Core stack (frontendv2/package.json):
  - React 18.2, TypeScript 5.8.x, Vite 6.3.x
  - Tailwind CSS 3.x (Morandi palette in tailwind.config.js)
  - Zustand 4.x (app state), SWR 2.x (data fetching)
  - React Router 7.x (BrowserRouter + Routes)
  - Tone.js (metronome), pdfjs/react-pdf (score viewing)
- Serving:
  - SPA assets served by a Worker (`src/index.js`); see 01‑Architecture for infra
  - For API design and auth, see 03‑API specs (no duplication here)

## Project Structure (high level)

```
frontendv2/
├── src/
│   ├── index.js        # Cloudflare Worker entry (serves SPA)
│   ├── main.tsx        # React entry
│   ├── App.tsx         # Routes + app shell
│   ├── routes/         # Route groups (e.g., scorebook.tsx)
│   ├── components/     # UI + layout (Sidebar, BottomTabs, Tabs, Toast)
│   ├── stores/         # Zustand stores (auth, logbook, repertoire, ...)
│   ├── services/       # webSocketSync, metronome, etc.
│   ├── api/            # HTTP client + feature APIs
│   └── utils/          # helpers (idempotency, pdf cache, etc.)
└── tailwind.config.js  # Morandi tokens
```

## Routing

- BrowserRouter + nested `Routes` in `App.tsx`; no separate router file
- ProtectedRoute wrapper for auth‑gated pages (e.g., /logbook)
- Beta feature gates (e.g., Scorebook) via a simple feature flag hook

## Data Access

- Axios client with cookies + optional Bearer token, adds `X-Device-ID` and `X-Idempotency-Key` for selected writes
- SWR for fetch/caching in hooks (e.g., `useAutocomplete`)
- For endpoints and auth flows, see 03‑API; this spec avoids duplicating API details

## Real‑time Sync

- WebSocket connection managed by `services/webSocketSync.ts`
- Connects to Sync Worker at `/sync/ws?userId=&token=` (see 03‑API WebSocket)
- Event types used: ENTRY*CREATED/UPDATED/DELETED, PIECE*\* , BULK_SYNC, SYNC_REQUEST

## Persistence & Offline

- localStorage for app data (entries, goals, repertoire) and auth‑transition backups
- Cache API for PDFs (`utils/pdfCache.ts`)
- 401 handler switches UI to local mode; user may continue offline

## PWA

- Manifest present (`public/site.webmanifest`)
- No service worker registered today (planned; see 01‑Architecture for deployment strategy)

## Operational Limits

- Cookie auth required for most API calls; 401 → local mode + optional redirect
- WebSocket reconnect with backoff; skip SYNC_REQUEST if a recent sync occurred
- Idempotent sync writes recommended (`X-Idempotency-Key` provided by client)

## Failure Modes

- Network/API errors → local fallback; toasts for user feedback
- Token expiry → axios interceptor clears auth + local mode
- WebSocket drops → queue events offline, flush on reconnect

## Code References

- App shell/routing: `frontendv2/src/App.tsx`, `frontendv2/src/routes/scorebook.tsx`
- Stores: `frontendv2/src/stores/{authStore,logbookStore,repertoireStore}.ts`
- WebSocket: `frontendv2/src/services/webSocketSync.ts`
- API client: `frontendv2/src/api/client.ts`
- Tailwind tokens: `frontendv2/tailwind.config.js`

## Related Documentation

- 01‑Architecture (serving/deployment): `docs/specs/01-architecture/*`
- 03‑API (REST/WebSocket/auth): `docs/specs/03-api/*`
- Frontend: [State Management](./state-management.md), [UI Design System](./ui-design-system.md), [Layout](./layout-patterns.md), [Responsive](./responsive-design.md)

---

Last updated: September 2025 | Version 1.7.6
