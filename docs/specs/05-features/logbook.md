# Logbook Feature Specification

Status: ✅ Active

## Overview

The Logbook is the core feature of Mirubato, allowing musicians to track their practice sessions with detailed metadata, analytics, and synchronization across devices. It supports manual entry, timer-based tracking, and automatic logging from other features.

## User Stories

### As a Musician, I want to:

- Log my practice sessions with details about what I practiced
- Track my mood and progress over time
- See my practice history and patterns
- Export my data for external analysis
- Access my logbook from any device

### As a Teacher, I want to:

- Review my students' practice logs
- Track progress on assigned pieces
- Identify practice patterns and issues

## Feature Components

### 1. Entry Methods

#### Manual Entry

- **Purpose**: Quick logging after practice session
- **Fields**:
  - Date & Time (required)
  - Duration (required, minutes)
  - Type (practice, performance, lesson, rehearsal, technique)
  - Instrument (optional, autocomplete)
  - Pieces (optional, multi-select with autocomplete)
  - Techniques (optional, predefined list)
  - Mood (frustrated, neutral, satisfied, excited)
  - Notes (optional, markdown support)
  - Goals (optional, link to goals)
  - Tags (optional, custom tags)

#### Timer Mode

- **Purpose**: Real-time practice tracking
- **Features**:
  - Start/Pause/Stop controls
  - On stop: opens Manual Entry prefilled with duration/start time (no auto-save)
  - Reminder notifications (configurable interval)
  - Session persistence (survives browser refresh)
  - Background-safe checkpointing; resume on return
  - Planned: piece switching during session
  - Periodic local checkpoints to preserve state

#### Auto-Logging

- Status: 🔄 Planned where noted
- **Sources**:
  - Practice counter completions (✅ Active)
  - Scorebook practice sessions (🔄 Planned)
  - Metronome usage (🔄 Planned; currently disabled)
- **Threshold**: Default 60s (configurable per tool)
- **Data Captured**:
  - Duration
  - Associated piece (if applicable)
  - Tool used
  - Tempo/settings

### 2. Display & Organization

#### List View

```typescript
interface LogbookEntryDisplay {
  // Grouped by date
  date: string // "Today", "Yesterday", "December 1, 2024"
  totalDuration: number // Daily total
  entries: Entry[]
}

interface Entry {
  id: string
  time: string // "2:30 PM"
  duration: string // "45 min"
  type: EntryType
  instrument?: string
  pieces?: string // "Composer - Title" format
  mood?: Mood
  notes?: string // Collapsible
  tags?: string[]
}
```

#### Calendar View

- **Heatmap Calendar**: GitHub-style visualization
- **Color Intensity**: Based on practice duration
- **Date Selection**: Click to view day's entries
- **Statistics**: Monthly/yearly totals

#### Timeline View

- **Chronological Display**: Vertical timeline
- **Visual Indicators**: Type, mood, duration
- **Filtering**: By date range, instrument, piece

### 3. Search & Filtering

Status: 🔄 Planned

#### Filter Options

- **Date Range**: Custom or presets (This Week, Last Month, etc.)
- **Type**: Practice, Performance, Lesson, etc.
- **Instrument**: Multi-select
- **Pieces**: Search by title or composer
- **Mood**: Single or multi-select
- **Duration**: Min/max range
- **Tags**: Include/exclude specific tags
- **Notes**: Full-text search

#### Search Syntax

```
piece:"Moonlight Sonata" AND mood:satisfied AND duration:>30
```

### 4. Bulk Operations (Planned)

#### Multi-Select Actions

- **Delete**: Remove multiple entries
- **Export**: Export selected entries
- **Tag**: Add tags to multiple entries
- **Move**: Change date for multiple entries

#### Keyboard Shortcuts

- `Shift+Click`: Range select
- `Cmd/Ctrl+Click`: Individual select
- `Cmd/Ctrl+A`: Select all visible
- `Delete`: Delete selected

### 5. Data Export

- Client-side export in analytics views: CSV and JSON. No PDF export today.

### 6. Real-Time Synchronization

#### WebSocket Sync

- **Protocol**: WebSocket via Durable Objects
- **Latency**: < 50ms
- **Conflict Resolution**: Last-write-wins with timestamps
- **Offline Queue**: Automatic retry on reconnection

#### Sync Events

```typescript
type SyncEvent =
  | { type: 'ENTRY_CREATED'; entry: LogbookEntry }
  | { type: 'ENTRY_UPDATED'; entry: LogbookEntry }
  | { type: 'ENTRY_DELETED'; entryId: string }
  | { type: 'BULK_SYNC'; entries: LogbookEntry[] }
  | { type: 'SYNC_REQUEST' }
```

### 7. Analytics Integration

#### Automatic Metrics

- **Practice Streak**: Consecutive days
- **Consistency Score**: Practice frequency
- **Average Duration**: Per session and daily
- **Most Practiced**: Pieces and techniques
- **Mood Trends**: Over time

#### Custom Reports

- Link to Reports feature
- Pre-filtered views
- Saved report configurations

## Technical Implementation

### Frontend Components

```typescript
// Main components
components/
├── logbook/
│   ├── PracticeLogsList.tsx       // Main list display
│   ├── ManualEntryForm.tsx        // Entry form
│   ├── DateSeparator.tsx          // Date grouping
│   └── LogbookSplitView.tsx       // Timeline + list

// State management (Zustand)
stores/logbookStore.ts (selected actions)
- createEntry(data): Promise<void>
- updateEntry(id, updates): Promise<void>
- deleteEntry(id): Promise<void>
- enableRealtimeSync(): Promise<boolean>
```

### Data & Sync

- Offline storage: localStorage keys `mirubato:logbook:{entries,goals,scoreMetadata}` with optimistic UI updates.
- Sync API: `POST /api/sync/pull` (pull entries/goals) and `POST /api/sync/push` (idempotent writes). See 03‑API.
- Real‑time: WebSocket events for ENTRY\_\* with offline queueing and backoff reconnect.

Note: There are no dedicated REST CRUD endpoints for logbook; all writes are via Sync. Export is client‑side (CSV/JSON) in Practice Reports.

## User Interface

### Desktop Layout

```
┌─────────────────────────────────────────────────┐
│ [Manual Entry] [Timer] [Filter] [Export] [...]  │
├─────────────────────────────────────────────────┤
│ Today - 2h 15min total                          │
├─────────────────────────────────────────────────┤
│ □ 2:30 PM · 45 min · Piano · Practice          │
│   Beethoven - Moonlight Sonata                  │
│   😊 Satisfied                                  │
│   [▼ Notes]                                     │
├─────────────────────────────────────────────────┤
│ □ 10:00 AM · 1h 30min · Piano · Practice      │
│   Scales and Arpeggios                          │
│   😐 Neutral                                    │
├─────────────────────────────────────────────────┤
│ Yesterday - 1h 45min total                      │
├─────────────────────────────────────────────────┤
│ ...                                              │
└─────────────────────────────────────────────────┘
```

### Mobile Layout

- **Responsive Design**: Stack elements vertically
- **Touch Optimized**: Larger tap targets
- **Swipe Actions**: Delete, edit
- **Bottom Sheet**: Entry form as modal

## Accessibility

### Keyboard Navigation

- Tab through all interactive elements
- Arrow keys for list navigation
- Enter to expand/collapse
- Space to select/deselect

### Screen Reader Support

- Semantic HTML structure
- ARIA labels for icons
- Announce state changes
- Describe mood with text

### Visual Accessibility

- High contrast mode support
- Focus indicators
- Color-blind friendly moods
- Scalable text

## Performance Optimization

### Virtualization

- Only render visible entries
- Lazy load older entries
- Infinite scroll pagination

### Caching Strategy

- LocalStorage for offline access
- Memory cache for recent entries
- API response caching

### Bundle Optimization

- Code split by route
- Lazy load heavy components
- Tree shake unused code

## Testing Strategy

### Unit Tests

- Component rendering
- State management
- Data transformations
- Sync logic

### Integration Tests

- API communication
- IndexedDB operations
- WebSocket sync
- Export functionality

### E2E Tests

- Complete user flows
- Multi-device sync
- Offline/online transitions
- Data persistence

## Security Considerations

### Data Privacy

- User data isolation
- Encrypted transmission
- No cross-user access
- Soft delete for recovery

### Input Validation

- Sanitize markdown in notes
- Validate duration ranges
- Prevent XSS in tags
- Rate limit API calls

## Future Enhancements

### Planned Features

- Audio recording attachment
- Photo attachments
- Practice reminders
- Social sharing
- AI insights
- Practice recommendations

### Integration Possibilities

- Calendar sync (Google, Apple)
- Fitness tracker integration
- Music streaming service links
- Teacher assignment system

## Operational Limits

- Local storage: entries/goals cached in `localStorage` (~5–10MB typical browser limits).
- Real-time: WebSocket reconnects with backoff; offline events are queued until reconnect.
- Export: CSV/JSON generated client-side; very large datasets may be slow.

## Failure Modes

- Sync push/pull fails: local writes persist; retries occur on next attempt.
- WebSocket disconnects: falls back to offline queue; reconnects automatically.
- Timer persistence unavailable: background checkpointing disabled if `localStorage` is blocked.

## Related Documentation

- [API Specification](../03-api/rest-api.md) - API endpoints
- [Database Schema](../02-database/schema.md) - Data structure
- [WebSocket Protocol](../03-api/websocket.md) - Real-time sync
- [Analytics](./analytics.md) - Reporting features

## Code References

- Store/API: `frontendv2/src/stores/logbookStore.ts`, `frontendv2/src/api/logbook.ts`
- UI: `frontendv2/src/components/logbook/PracticeLogsList.tsx`, `frontendv2/src/components/ManualEntryForm.tsx`, `frontendv2/src/components/logbook/LogbookSplitView.tsx`
- UI primitives: `frontendv2/src/components/ui/{CompactEntryRow,DateSeparator}.tsx`
- Timer: `frontendv2/src/contexts/TimerContext.tsx`, `frontendv2/src/components/timer/{TimerWidget,TimerSettings}.tsx`
- Sync: `frontendv2/src/services/webSocketSync.ts`

---

_Last updated: 2025-09-09 | Version 1.7.6_
