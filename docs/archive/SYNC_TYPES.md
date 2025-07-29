# Type Differences Between Legacy Frontend and Current Frontend

This document explains the exact type differences that affect data synchronization between the original frontend (GraphQL) and current frontend (REST API).

## Critical Field Differences

### 1. User Field

- **Original**: `user: User` (full user object with id, email, etc.)
- **localStorage**: `userId: string` (just the ID)
- **Current**: No user field at all

**Impact**: When syncing to D1 through GraphQL, the backend expects a user relationship. The REST API needs to handle this differently.

### 2. Goal References

- **Original localStorage**: `goals: string[]`
- **Original GraphQL**: `goalIds: string[]`
- **Current**: `goalIds: string[]`

**Impact**: Field name mismatch in localStorage data.

### 3. Timestamp Format

- **Original localStorage**: `timestamp: number` (Unix timestamp in milliseconds)
- **Original GraphQL**: `timestamp: DateTime` (ISO string)
- **Current**: `timestamp: string` (ISO string)

**Impact**: Need to convert number timestamps to ISO strings.

### 4. Type Enums

- **Original localStorage**: Lowercase (`'practice'`, `'performance'`)
- **Original GraphQL**: Uppercase (`'PRACTICE'`, `'PERFORMANCE'`)
- **Current**: Uppercase (`'PRACTICE'`, `'PERFORMANCE'`)

**Impact**: Need to uppercase the type values.

### 5. Audit Fields

- **Original localStorage**: No `createdAt`/`updatedAt`
- **Original GraphQL**: Has `createdAt`/`updatedAt` (required)
- **Current**: Has `createdAt`/`updatedAt` (required)

**Impact**: Need to generate these fields for legacy data.

### 6. Deletion Handling

- **Original**: No soft delete field
- **Current**: Has `deletedAt?: string`

**Impact**: New field for soft deletes in current frontend.

## Data Flow Comparison

### Original Frontend Flow:

```
User Input → GraphQL Mutation → D1 Database
                              ↓
                          localStorage (backup)
```

### Current Frontend Flow:

```
User Input → localStorage (immediate)
                ↓
           REST API Sync → D1 Database (when online)
```

## Transformation Required

When migrating from original to current frontend:

1. **Timestamp**: Convert number to ISO string
2. **Type**: Convert to uppercase
3. **Instrument**: Convert to uppercase
4. **Mood**: Convert to uppercase (if present)
5. **Goals**: Rename field from `goals` to `goalIds`
6. **Audit fields**: Generate `createdAt` and `updatedAt` from timestamp
7. **User**: Remove `userId` field (not used in current frontend)

## D1 Sync Considerations

### For GraphQL (Legacy Backend):

- Expects `user` relationship
- Requires `createdAt`/`updatedAt`
- Uses uppercase enums

### For REST API (Current API):

- Stores in generic `sync_data` table
- No direct user relationship in entry
- Uses JSON blob storage

## Example Transformation

### Original localStorage Entry:

```javascript
{
  id: "abc123",
  userId: "user456",
  timestamp: 1703001600000,
  duration: 30,
  type: "practice",
  instrument: "piano",
  pieces: [{id: "p1", title: "Sonata"}],
  techniques: ["scales"],
  goals: ["goal789"],
  mood: "satisfied",
  tags: ["morning"],
  notes: "Good session"
}
```

### Transformed for Current Frontend:

```javascript
{
  id: "abc123",
  timestamp: "2023-12-19T16:00:00.000Z",
  duration: 30,
  type: "PRACTICE",
  instrument: "PIANO",
  pieces: [{id: "p1", title: "Sonata"}],
  techniques: ["scales"],
  goalIds: ["goal789"],
  mood: "SATISFIED",
  tags: ["morning"],
  notes: "Good session",
  createdAt: "2023-12-19T16:00:00.000Z",
  updatedAt: "2023-12-19T16:00:00.000Z"
}
```

## Recommendations

1. **Always transform data** before storing in current format
2. **Keep transformation logic** in a single place (`transformLegacyEntry.ts`)
3. **Log transformation failures** to identify edge cases
4. **Test with real user data** to catch unknown formats
5. **Consider backward compatibility** when syncing to GraphQL backend

## Duplicate Prevention Architecture

This section provides a comprehensive implementation guide for preventing duplicate entries during synchronization.

### Root Cause Analysis

The duplicate entry issue stems from:

1. **Race Conditions**: Multiple sync triggers firing simultaneously (e.g., 3 focus events at once)
2. **Insufficient Debouncing**: Boolean flags allow multiple operations to pass checks before being set
3. **Content Signature Limitations**: 5-minute time windows are too coarse for exact duplicates
4. **Lack of Idempotency**: No request-level deduplication mechanism

### Implementation Strategy Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client-Side       │     │   Server-Side    │     │    Database     │
│  ┌──────────────┐  │     │  ┌────────────┐  │     │ ┌─────────────┐ │
│  │ Async Mutex  │  │────▶│  │Idempotency │  │────▶│ │  Composite  │ │
│  └──────────────┘  │     │  │   Layer    │  │     │ │  Unique     │ │
│  ┌──────────────┐  │     │  └────────────┘  │     │ │ Constraints │ │
│  │   Event      │  │     │  ┌────────────┐  │     │ └─────────────┘ │
│  │ Coalescence  │  │     │  │  Content   │  │     │                 │
│  └──────────────┘  │     │  │   Hash     │  │     │                 │
│  ┌──────────────┐  │     │  │Validation  │  │     │                 │
│  │  Enhanced    │  │     │  └────────────┘  │     │                 │
│  │ Signatures   │  │     │                  │     │                 │
│  └──────────────┘  │     │                  │     │                 │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
```

## Client-Side Implementation

### 1. Async Mutex Implementation

Replace the current boolean flag with a proper async mutex to prevent concurrent sync operations.

#### Install Dependencies

```bash
pnpm add async-mutex
```

#### Implementation in `useSyncTriggers.ts`

```typescript
import { Mutex } from 'async-mutex'

export function useSyncTriggers(options: SyncTriggerOptions = {}) {
  // Replace isSyncingRef with mutex
  const syncMutex = useRef(new Mutex())
  const operationMutexes = useRef({
    logbook: new Mutex(),
    repertoire: new Mutex(),
  })

  const performSync = useCallback(
    async (trigger: string) => {
      if (!isAuthenticated || isLocalMode) {
        return
      }

      // Try to acquire the mutex with timeout
      const release = await syncMutex.current.acquire()

      try {
        console.log(`[Sync] 🔄 Starting sync from ${trigger}`)

        // Check debounce after acquiring mutex
        const now = new Date()
        const timeSinceLastSync = now.getTime() - lastSyncRef.current.getTime()
        const minInterval = trigger === 'manual' ? 1000 : 30000

        if (timeSinceLastSync < minInterval) {
          console.log(
            `[Sync] Skipping ${trigger} sync - too soon (${Math.round(timeSinceLastSync / 1000)}s ago)`
          )
          return
        }

        // Perform sync with operation-specific locks
        await Promise.all([
          operationMutexes.current.logbook.runExclusive(async () => {
            await syncWithServer()
          }),
          operationMutexes.current.repertoire.runExclusive(async () => {
            await syncRepertoireData().catch(err => {
              console.error(`[Sync] Repertoire sync failed:`, err)
            })
          }),
        ])

        lastSyncRef.current = now
        const duration = Date.now() - now.getTime()
        console.log(`[Sync] ✅ ${trigger} sync completed in ${duration}ms`)
      } catch (error) {
        console.error(`[Sync] ❌ ${trigger} sync failed:`, error)
      } finally {
        release()
      }
    },
    [isAuthenticated, isLocalMode, syncWithServer, syncRepertoireData]
  )
}
```

### 2. Event Coalescence Implementation

Buffer and merge multiple sync triggers within a short window.

```typescript
interface SyncEvent {
  trigger: string
  timestamp: number
  priority: number
}

export function useSyncTriggers(options: SyncTriggerOptions = {}) {
  const eventQueueRef = useRef<SyncEvent[]>([])
  const coalescenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const TRIGGER_PRIORITIES = {
    manual: 10,
    'route-change': 7,
    focus: 5,
    visibility: 5,
    periodic: 3,
    online: 8,
  }

  const queueSyncEvent = useCallback((trigger: string) => {
    const event: SyncEvent = {
      trigger,
      timestamp: Date.now(),
      priority: TRIGGER_PRIORITIES[trigger] || 1,
    }

    eventQueueRef.current.push(event)

    // Clear existing timer
    if (coalescenceTimerRef.current) {
      clearTimeout(coalescenceTimerRef.current)
    }

    // Set new timer for coalescence window
    coalescenceTimerRef.current = setTimeout(
      () => {
        processSyncQueue()
      },
      trigger === 'manual' ? 100 : 500
    ) // Shorter window for manual sync
  }, [])

  const processSyncQueue = useCallback(async () => {
    const queue = eventQueueRef.current
    eventQueueRef.current = []

    if (queue.length === 0) return

    // Sort by priority and take the highest
    const highestPriorityEvent = queue.sort(
      (a, b) => b.priority - a.priority
    )[0]

    console.log(
      `[Sync] Processing ${queue.length} coalesced events, using trigger: ${highestPriorityEvent.trigger}`
    )

    await performSync(highestPriorityEvent.trigger)
  }, [performSync])

  // Update all event handlers to use queueSyncEvent
  useEffect(() => {
    if (!enableVisibility) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration =
          Date.now() - lastVisibilityChangeRef.current.getTime()
        if (hiddenDuration > 60000) {
          queueSyncEvent('visibility')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enableVisibility, queueSyncEvent])
}
```

### 3. Enhanced Content Signatures

Improve the deduplication logic to use exact content matching.

```typescript
// In logbookStore.ts

import { createHash } from 'crypto'

const createContentSignature = (entry: LogbookEntry): string => {
  // Create a deterministic hash of the entry content
  const contentToHash = {
    timestamp: entry.timestamp, // Use exact timestamp
    duration: entry.duration,
    type: entry.type,
    instrument: entry.instrument,
    pieces: entry.pieces
      .map(p => ({
        title: p.title,
        composer: p.composer || '',
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    techniques: [...entry.techniques].sort(),
    mood: entry.mood || '',
    notes: entry.notes || '',
    scoreId: entry.scoreId || '',
  }

  // Create SHA-256 hash
  const hash = createHash('sha256')
  hash.update(JSON.stringify(contentToHash))
  return hash.digest('hex')
}

// Enhanced deduplication check
const isDuplicateEntry = (
  entry: LogbookEntry,
  existingEntries: Map<string, LogbookEntry>
): boolean => {
  const signature = createContentSignature(entry)

  // Check for exact content match
  for (const [id, existingEntry] of existingEntries) {
    if (id === entry.id) continue // Skip self

    const existingSignature = createContentSignature(existingEntry)
    if (signature === existingSignature) {
      // Additional check for very close timestamps (within 1 second)
      const timeDiff = Math.abs(
        new Date(entry.timestamp).getTime() -
          new Date(existingEntry.timestamp).getTime()
      )

      if (timeDiff < 1000) {
        console.warn(
          `[Sync] Duplicate entry detected: ${entry.id} matches ${id}`
        )
        return true
      }
    }
  }

  return false
}
```

### 4. Request-Level Idempotency

Add idempotency keys to sync requests.

```typescript
// In sync.ts API client

import { v4 as uuidv4 } from 'uuid'

interface SyncRequest {
  changes: {
    entries?: LogbookEntry[]
    goals?: Goal[]
  }
  idempotencyKey?: string
  deviceId?: string
}

export const syncApi = {
  async push(request: SyncRequest): Promise<SyncResponse> {
    // Generate idempotency key if not provided
    const idempotencyKey = request.idempotencyKey || uuidv4()

    // Get or generate device ID
    const deviceId = getDeviceId()

    const response = await apiClient.post(
      '/sync/push',
      {
        ...request,
        idempotencyKey,
        deviceId,
      },
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
          'X-Device-ID': deviceId,
        },
      }
    )

    return response.data
  },
}

// Device ID management
const DEVICE_ID_KEY = 'mirubato_device_id'

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `web_${uuidv4()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}
```

## Server-Side Implementation

### 1. Database Schema Updates

Add composite unique constraints and idempotency tracking.

```sql
-- Add composite unique constraint to prevent duplicates
ALTER TABLE sync_data
ADD CONSTRAINT unique_entry_content
UNIQUE (user_id, entity_type, checksum);

-- Create idempotency tracking table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX idx_idempotency_lookup
ON idempotency_keys(key, user_id);

-- Add device tracking for better debugging
ALTER TABLE sync_data
ADD COLUMN device_id TEXT;

ALTER TABLE sync_data
ADD COLUMN sync_version INTEGER DEFAULT 1;
```

### 2. Idempotency Layer Implementation

```typescript
// In sync handler (api/src/api/handlers/sync.ts)

interface IdempotencyRecord {
  id: string
  key: string
  user_id: string
  request_hash: string
  response: string
  created_at: string
  expires_at: string
}

async function checkIdempotency(
  db: D1Database,
  key: string,
  userId: string,
  requestBody: any
): Promise<Response | null> {
  const requestHash = createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex')

  const existing = await db
    .prepare(
      `SELECT * FROM idempotency_keys 
       WHERE key = ? AND user_id = ? AND expires_at > datetime('now')`
    )
    .bind(key, userId)
    .first<IdempotencyRecord>()

  if (existing) {
    // Check if same request
    if (existing.request_hash === requestHash) {
      console.log(`[Idempotency] Returning cached response for key: ${key}`)
      return new Response(existing.response, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotent-Replay': 'true',
        },
      })
    } else {
      // Different request with same key
      throw new Error('Idempotency key already used with different request')
    }
  }

  return null
}

async function saveIdempotentResponse(
  db: D1Database,
  key: string,
  userId: string,
  requestBody: any,
  response: any
): Promise<void> {
  const requestHash = createHash('sha256')
    .update(JSON.stringify(requestBody))
    .digest('hex')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db
    .prepare(
      `INSERT INTO idempotency_keys 
       (id, key, user_id, request_hash, response, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      nanoid(),
      key,
      userId,
      requestHash,
      JSON.stringify(response),
      expiresAt.toISOString()
    )
    .run()
}

// Updated sync push handler
syncHandler.post('/push', validateBody(schemas.syncChanges), async c => {
  const userId = c.get('userId') as string
  const idempotencyKey = c.req.header('X-Idempotency-Key')
  const deviceId = c.req.header('X-Device-ID')

  // Check idempotency if key provided
  if (idempotencyKey) {
    const cachedResponse = await checkIdempotency(
      c.env.DB,
      idempotencyKey,
      userId,
      c.get('validatedBody')
    )

    if (cachedResponse) {
      return cachedResponse
    }
  }

  // Process sync...
  const response = await processSyncChanges(c, userId, deviceId)

  // Save idempotent response
  if (idempotencyKey) {
    await saveIdempotentResponse(
      c.env.DB,
      idempotencyKey,
      userId,
      c.get('validatedBody'),
      response
    )
  }

  return c.json(response)
})
```

### 3. Enhanced Duplicate Detection

```typescript
// In database.ts

async upsertSyncData(data: {
  userId: string;
  entityType: string;
  entityId: string;
  data: unknown;
  checksum: string;
  deviceId?: string;
  version?: number;
}) {
  const sanitizedData = sanitizeForD1(data.data);
  const jsonData = JSON.stringify(sanitizedData);

  try {
    // First check for duplicate by checksum
    const duplicate = await this.db
      .prepare(
        `SELECT id, entity_id FROM sync_data
         WHERE user_id = ? AND entity_type = ? AND checksum = ?
         AND deleted_at IS NULL`
      )
      .bind(data.userId, data.entityType, data.checksum)
      .first<{ id: string; entity_id: string }>();

    if (duplicate && duplicate.entity_id !== data.entityId) {
      console.warn(
        `[Duplicate] Found duplicate content with different ID. ` +
        `Existing: ${duplicate.entity_id}, New: ${data.entityId}`
      );

      // Return existing entry instead of creating duplicate
      return {
        id: duplicate.id,
        entity_id: duplicate.entity_id,
        action: 'duplicate_prevented',
      };
    }

    // Proceed with upsert...
  } catch (error) {
    // Handle unique constraint violation
    if (error.message.includes('UNIQUE constraint failed')) {
      console.error('[Duplicate] Constraint violation:', {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        checksum: data.checksum,
      });

      // Return existing entry
      const existing = await this.db
        .prepare(
          `SELECT id, entity_id FROM sync_data
           WHERE user_id = ? AND entity_type = ? AND checksum = ?`
        )
        .bind(data.userId, data.entityType, data.checksum)
        .first();

      return {
        id: existing.id,
        entity_id: existing.entity_id,
        action: 'duplicate_prevented',
      };
    }

    throw error;
  }
}
```

## Monitoring and Debugging

### 1. Sync Event Logging

```typescript
// In useSyncTriggers.ts

interface SyncEvent {
  id: string
  trigger: string
  timestamp: number
  duration?: number
  status: 'started' | 'completed' | 'failed'
  error?: string
  stats?: {
    entriesProcessed: number
    duplicatesPrevented: number
  }
}

const syncEventLog = useRef<SyncEvent[]>([])
const MAX_LOG_ENTRIES = 50

const logSyncEvent = (event: Partial<SyncEvent>) => {
  const fullEvent: SyncEvent = {
    id: nanoid(),
    timestamp: Date.now(),
    status: 'started',
    ...event,
  }

  syncEventLog.current.unshift(fullEvent)

  // Keep only recent events
  if (syncEventLog.current.length > MAX_LOG_ENTRIES) {
    syncEventLog.current = syncEventLog.current.slice(0, MAX_LOG_ENTRIES)
  }

  // Store in localStorage for debugging
  localStorage.setItem(
    'mirubato_sync_log',
    JSON.stringify(syncEventLog.current)
  )

  return fullEvent.id
}

// Export debugging utilities
export const syncDebug = {
  getLog: () => syncEventLog.current,
  clearLog: () => {
    syncEventLog.current = []
    localStorage.removeItem('mirubato_sync_log')
  },
  exportLog: () => {
    const blob = new Blob([JSON.stringify(syncEventLog.current, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-log-${Date.now()}.json`
    a.click()
  },
}
```

### 2. Performance Metrics

```typescript
// In logbookStore.ts

interface SyncMetrics {
  syncStartTime: number
  syncEndTime?: number
  entriesProcessed: number
  duplicatesFound: number
  duplicatesPrevented: number
  errors: string[]
}

const collectSyncMetrics = (metrics: SyncMetrics) => {
  // Send to analytics or monitoring service
  if (window.analytics) {
    window.analytics.track('sync_completed', {
      duration: metrics.syncEndTime - metrics.syncStartTime,
      entriesProcessed: metrics.entriesProcessed,
      duplicatesFound: metrics.duplicatesFound,
      duplicatesPrevented: metrics.duplicatesPrevented,
      errorCount: metrics.errors.length,
    })
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.table({
      'Duration (ms)': metrics.syncEndTime - metrics.syncStartTime,
      'Entries Processed': metrics.entriesProcessed,
      'Duplicates Found': metrics.duplicatesFound,
      'Duplicates Prevented': metrics.duplicatesPrevented,
      Errors: metrics.errors.length,
    })
  }
}
```

### 3. Debug UI Component

```typescript
// In components/debug/SyncDebugPanel.tsx

export function SyncDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [syncLog, setSyncLog] = useState<SyncEvent[]>([]);

  useEffect(() => {
    // Only show in development or with debug flag
    const debugEnabled =
      process.env.NODE_ENV === 'development' ||
      localStorage.getItem('mirubato_debug') === 'true';

    if (!debugEnabled) return;

    // Load sync log
    const interval = setInterval(() => {
      const log = localStorage.getItem('mirubato_sync_log');
      if (log) {
        setSyncLog(JSON.parse(log));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full"
      >
        🔄
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto bg-white shadow-lg rounded-lg p-4">
      <h3 className="font-bold mb-2">Sync Debug Log</h3>
      <div className="space-y-2">
        {syncLog.map(event => (
          <div
            key={event.id}
            className={`p-2 rounded ${
              event.status === 'failed' ? 'bg-red-100' :
              event.status === 'completed' ? 'bg-green-100' :
              'bg-gray-100'
            }`}
          >
            <div className="text-sm">
              <strong>{event.trigger}</strong> - {event.status}
              {event.duration && ` (${event.duration}ms)`}
            </div>
            {event.stats && (
              <div className="text-xs text-gray-600">
                Processed: {event.stats.entriesProcessed},
                Duplicates: {event.stats.duplicatesPrevented}
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setIsOpen(false)}
        className="mt-2 text-sm text-gray-600"
      >
        Close
      </button>
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Client-Side (Immediate)

1. Implement async mutex (prevents new duplicates)
2. Add event coalescence (reduces sync frequency)
3. Deploy and monitor for 24-48 hours

### Phase 2: Enhanced Detection (Week 1)

1. Implement enhanced content signatures
2. Add sync event logging
3. Deploy debug UI for power users

### Phase 3: Server-Side (Week 2)

1. Add database constraints
2. Implement idempotency layer
3. Deploy with feature flag

### Phase 4: Cleanup (Week 3)

1. Script to remove existing duplicates
2. Add monitoring dashboards
3. Document troubleshooting guide

## Troubleshooting Guide

### Common Issues

1. **Still seeing duplicates**
   - Check browser console for multiple sync triggers
   - Verify mutex is properly initialized
   - Look for errors in sync event log

2. **Sync seems slow**
   - Check coalescence window settings
   - Verify server response times
   - Look for lock contention in logs

3. **Data not syncing**
   - Check idempotency key collisions
   - Verify device ID is consistent
   - Look for unique constraint violations

### Debug Commands

```javascript
// In browser console

// View sync log
syncDebug.getLog()

// Export full log
syncDebug.exportLog()

// Clear sync cache
localStorage.removeItem('mirubato_sync_log')

// Force sync with debug
window.mirubato.forceSync({ debug: true })

// Check for duplicates
window.mirubato.checkDuplicates()
```

## Performance Considerations

1. **Mutex overhead**: ~1-2ms per sync operation
2. **Coalescence delay**: 100-500ms user-perceived delay
3. **Content hashing**: ~0.5ms per entry
4. **Idempotency check**: ~5-10ms server overhead
5. **Database constraints**: Negligible impact with proper indexes

## Security Considerations

1. **Content signatures** use SHA-256 (collision resistant)
2. **Device IDs** are random UUIDs (no PII)
3. **Idempotency keys** expire after 24 hours
4. **No sensitive data** in sync logs

## Future Enhancements

1. **Conflict Resolution UI**: Show users when duplicates are prevented
2. **Sync Analytics Dashboard**: Real-time monitoring of sync health
3. **Differential Sync**: Only sync changed fields
4. **WebSocket Support**: Real-time sync without polling
5. **Offline Queue Persistence**: Survive browser restarts
