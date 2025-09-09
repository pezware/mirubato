# Logbook Feature Specification

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
  - Auto-pause detection (5 minutes inactivity)
  - Session persistence (survives browser restart)
  - Background timer (continues when tab not active)
  - Piece switching during session
  - Auto-save every 30 seconds

#### Auto-Logging

- **Sources**:
  - Metronome usage (> 5 minutes)
  - Scorebook practice sessions
  - Practice counter completions
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

### 4. Bulk Operations

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

#### Formats

- **CSV**: Spreadsheet-compatible
- **JSON**: Full data with metadata
- **PDF**: Formatted report

#### Export Options

- Date range selection
- Field selection
- Include/exclude deleted entries
- Timezone conversion

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
  | { type: 'ENTRY_DELETED'; id: string }
  | { type: 'BULK_UPDATE'; entries: LogbookEntry[] }
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
│   ├── LogbookEntryList.tsx       // Main list display
│   ├── ManualEntryForm.tsx        // Entry form
│   ├── TimerMode.tsx              // Timer interface
│   ├── EntryCard.tsx              // Individual entry
│   ├── DateSeparator.tsx          // Date grouping
│   └── BulkActions.tsx            // Multi-select toolbar

// State management (Zustand)
stores/logbookStore.ts
- entries: Map<string, LogbookEntry>
- addEntry(entry: LogbookEntry): void
- updateEntry(id: string, updates: Partial<LogbookEntry>): void
- deleteEntry(id: string): void
- bulkDelete(ids: string[]): void
- syncEntries(): Promise<void>
```

### Data Storage

#### IndexedDB Schema

```typescript
interface LogbookEntry {
  id: string
  userId: string
  timestamp: number
  duration: number
  type: EntryType
  instrument?: string
  pieces?: Piece[]
  techniques?: string[]
  mood?: Mood
  notes?: string
  goalIds?: string[]
  scorePages?: ScorePage[]
  tags?: string[]
  source: 'manual' | 'timer' | 'auto'
  syncVersion: number
  createdAt: number
  updatedAt: number
  deletedAt?: number
}
```

#### Sync Strategy

1. **Local First**: All changes saved to IndexedDB immediately
2. **Optimistic UI**: Updates reflected instantly
3. **Background Sync**: Queue changes for server sync
4. **Conflict Resolution**: Server version wins on conflict
5. **Offline Support**: Full functionality without connection

### API Endpoints

```typescript
// CRUD Operations
GET    /api/logbook/entries?page=1&limit=50
POST   /api/logbook/entries
PUT    /api/logbook/entries/:id
DELETE /api/logbook/entries/:id

// Bulk Operations
POST   /api/logbook/entries/bulk-delete
POST   /api/logbook/entries/bulk-update

// Export
GET    /api/logbook/export?format=csv&from=date&to=date

// Sync
POST   /api/logbook/sync
GET    /api/logbook/changes?since=timestamp
```

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

- IndexedDB for offline access
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

## Related Documentation

- [API Specification](../03-api/rest-api.md) - API endpoints
- [Database Schema](../02-database/schema.md) - Data structure
- [WebSocket Protocol](../03-api/websocket.md) - Real-time sync
- [Analytics](./analytics.md) - Reporting features

---

_Last updated: 2025-09-09 | Version 1.7.6_
