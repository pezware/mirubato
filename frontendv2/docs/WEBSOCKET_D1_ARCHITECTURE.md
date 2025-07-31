# WebSocket + D1 Real-Time Sync Architecture for Mirubato

## Executive Summary

This document explores how Cloudflare WebSockets + Durable Objects + D1 database could provide real-time multi-device sync for Mirubato, analyzing the architecture, benefits, tradeoffs, and implementation considerations.

---

## How WebSocket + D1 Integration Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network               │
└─────────────────────┬───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────────────┐
    │                 │             │                    │
┌───▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐  ┌──▼──────────┐
│  Frontend     │  │   API       │  │   Sync      │  │    D1       │
│  (React SPA)  │  │   Worker    │  │ Durable Obj │  │  Database   │
│               │  │             │  │ + WebSocket │  │             │
└───┬──────────┘  └──┬──────────┘  └──┬──────────┘  └─────────────┘
    │                 │                 │
    │  HTTP Requests  │  Database Ops   │
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
    ┌─────────────────▼─────────────────┐
    │        WebSocket Connection        │
    │     (Real-time sync events)        │
    └─────────────────▲─────────────────┘
                      │
              ┌───────▼────────┐
              │  Other Devices  │
              │  (Auto-synced)  │
              └────────────────┘
```

### Core Components

#### 1. **Durable Object as Sync Coordinator**

```typescript
// sync-coordinator.ts (Durable Object)
export class SyncCoordinator implements DurableObject {
  private clients = new Set<WebSocket>()
  private storage: DurableObjectStorage
  private env: Env

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }
    return new Response('Not found', { status: 404 })
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair())

    // Accept WebSocket connection
    server.accept()

    // Add to client list
    this.clients.add(server)

    // Listen for sync events
    server.addEventListener('message', async event => {
      const syncEvent = JSON.parse(event.data as string)
      await this.handleSyncEvent(syncEvent, server)
    })

    server.addEventListener('close', () => {
      this.clients.delete(server)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  async handleSyncEvent(event: SyncEvent, sender: WebSocket) {
    // Process the sync event (save to D1)
    await this.saveToDatabase(event)

    // Broadcast to all other connected clients
    this.broadcast(event, sender)
  }

  private broadcast(event: SyncEvent, except?: WebSocket) {
    const message = JSON.stringify(event)
    for (const client of this.clients) {
      if (
        client !== except &&
        client.readyState === WebSocket.READY_STATE_OPEN
      ) {
        client.send(message)
      }
    }
  }

  private async saveToDatabase(event: SyncEvent) {
    // Save to D1 database via API Worker
    await fetch(`${this.env.API_URL}/internal/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.env.INTERNAL_TOKEN}`,
      },
      body: JSON.stringify(event),
    })
  }
}
```

#### 2. **Frontend WebSocket Client**

```typescript
// syncWebSocket.ts (Frontend)
class MirubataWebSocketSync {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  async connect(userId: string, authToken: string) {
    const wsUrl = `wss://sync.mirubato.com/ws?userId=${userId}&token=${authToken}`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('🔗 WebSocket connected')
      this.reconnectAttempts = 0

      // Send initial sync request
      this.send({
        type: 'SYNC_REQUEST',
        lastSyncTime: this.getLastSyncTime(),
      })
    }

    this.ws.onmessage = event => {
      const syncEvent = JSON.parse(event.data)
      this.handleIncomingSync(syncEvent)
    }

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = error => {
      console.error('❌ WebSocket error:', error)
    }
  }

  private handleIncomingSync(event: SyncEvent) {
    switch (event.type) {
      case 'ENTRY_CREATED':
        useLogbookStore.getState().addEntryFromSync(event.entry)
        break
      case 'ENTRY_UPDATED':
        useLogbookStore.getState().updateEntryFromSync(event.entry)
        break
      case 'ENTRY_DELETED':
        useLogbookStore.getState().removeEntryFromSync(event.entryId)
        break
      case 'BULK_SYNC':
        useLogbookStore.getState().mergeEntriesFromSync(event.entries)
        break
    }
  }

  // Send local changes to server
  sendLocalChange(event: SyncEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    } else {
      // Queue for later if offline
      this.queueOfflineEvent(event)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000 // Exponential backoff
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect(this.userId, this.authToken)
      }, delay)
    }
  }
}
```

#### 3. **Integration with LogbookStore**

```typescript
// Enhanced logbookStore.ts
export const useLogbookStore = create<LogbookState>((set, get) => ({
  // ... existing code ...

  // WebSocket instance
  webSocketSync: null as MirubataWebSocketSync | null,

  // Initialize real-time sync
  initRealtimeSync: async () => {
    const authToken = localStorage.getItem('auth-token')
    const user = get().user

    if (authToken && user) {
      const wsSync = new MirubataWebSocketSync()
      await wsSync.connect(user.id, authToken)
      set({ webSocketSync: wsSync })
    }
  },

  // Enhanced createEntry with real-time sync
  createEntry: async entryData => {
    // Create entry locally first (same as before)
    const entry = {
      ...entryData,
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Update local state immediately
    const newEntriesMap = new Map(get().entriesMap)
    newEntriesMap.set(entry.id, entry)
    set({
      entriesMap: newEntriesMap,
      entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
    })

    // Save to localStorage
    immediateLocalStorageWrite(
      ENTRIES_KEY,
      JSON.stringify(Array.from(newEntriesMap.values()))
    )

    // Send to other devices via WebSocket
    get().webSocketSync?.sendLocalChange({
      type: 'ENTRY_CREATED',
      entry,
      userId: get().user?.id,
      timestamp: new Date().toISOString(),
    })
  },

  // Handle incoming sync events
  addEntryFromSync: (entry: LogbookEntry) => {
    const newEntriesMap = new Map(get().entriesMap)

    // Avoid duplicates
    if (!newEntriesMap.has(entry.id)) {
      newEntriesMap.set(entry.id, entry)
      set({
        entriesMap: newEntriesMap,
        entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
      })

      // Update localStorage
      debouncedLocalStorageWrite(
        ENTRIES_KEY,
        JSON.stringify(Array.from(newEntriesMap.values()))
      )

      // Show notification
      toast.success(`New practice entry synced from another device`)
    }
  },

  // ... similar methods for updateEntryFromSync, removeEntryFromSync ...
}))
```

---

## What Problems Does WebSocket + D1 Solve?

### 1. **Real-Time Multi-Device Updates** ⭐⭐⭐⭐⭐

```typescript
// Scenario: User practices on phone, then opens laptop
// Without WebSocket: Must manually sync to see phone entries
// With WebSocket: Laptop shows new entries automatically

// User adds entry on Phone
phone.createEntry({ title: 'Piano scales', duration: 30 })

// Laptop receives real-time update via WebSocket
laptop.onWebSocketMessage(event => {
  if (event.type === 'ENTRY_CREATED') {
    showToast('✨ New practice session synced from your phone')
    addEntryToUI(event.entry)
  }
})
```

### 2. **Collaborative Features** ⭐⭐⭐⭐⭐

```typescript
// Teacher-Student collaboration
// Student practices, teacher sees progress in real-time
// Family sharing practice logs

// Student creates entry
student.createEntry({ title: 'Chopin Etude Op.10 No.1', duration: 45 })

// Teacher's dashboard updates automatically
teacher.onSyncEvent(event => {
  if (event.userId === student.id && event.type === 'ENTRY_CREATED') {
    updateStudentProgress(event.entry)
    showNotification(`${student.name} just practiced ${event.entry.title}`)
  }
})
```

### 3. **Automatic Background Sync** ⭐⭐⭐⭐

```typescript
// No more "forgot to sync" scenarios
// Changes propagate automatically when devices are online
// Seamless experience across devices

// User forgets to manually sync
// WebSocket handles it automatically in background
webSocket.onReconnect(() => {
  // Automatically sync queued offline changes
  sendQueuedOfflineEvents()
})
```

### 4. **Instant Conflict Detection** ⭐⭐⭐

```typescript
// Real-time conflict detection and resolution
webSocket.onMessage(event => {
  if (event.type === 'CONFLICT_DETECTED') {
    showConflictResolutionUI({
      localEntry: getLocalEntry(event.entryId),
      serverEntry: event.serverEntry,
      onResolve: resolved =>
        webSocket.send({
          type: 'CONFLICT_RESOLVED',
          resolution: resolved,
        }),
    })
  }
})
```

### 5. **Better Offline-to-Online Experience** ⭐⭐⭐⭐

```typescript
// Smooth transition from offline to online
// Queued changes sync automatically when connection restored
webSocket.onOpen(() => {
  // Send all offline changes automatically
  const offlineChanges = getQueuedOfflineChanges()
  for (const change of offlineChanges) {
    webSocket.send(change)
  }
  clearOfflineQueue()
})
```

---

## Comparison: WebSocket vs Other Approaches

| Feature                       | Manual Sync | Firebase            | WebSocket + D1    |
| ----------------------------- | ----------- | ------------------- | ----------------- |
| **Real-time updates**         | ❌          | ✅                  | ✅                |
| **Offline-first**             | ✅          | ✅                  | ✅                |
| **User control**              | ✅          | ❌                  | ⚖️ (Configurable) |
| **Database choice**           | ✅ (Our D1) | ❌ (Firestore only) | ✅ (Our D1)       |
| **Implementation complexity** | ⭐          | ⭐⭐⭐              | ⭐⭐⭐⭐          |
| **Cost predictability**       | ✅          | ❌                  | ⚖️                |
| **Cloudflare native**         | ✅          | ❌                  | ✅                |
| **Collaborative features**    | ❌          | ✅                  | ✅                |
| **Conflict resolution**       | ⭐          | ⭐⭐                | ⭐⭐⭐⭐          |

---

## Addressing Mirubato's Specific Concerns

### 1. **"Practice entries rarely conflict"** ✅

**WebSocket Advantage**: Even with rare conflicts, WebSocket enables:

- Instant awareness when someone else modifies shared entries
- Real-time family practice tracking
- Teacher-student collaboration features
- Multiple device usage detection

```typescript
// Example: User starts practice session on phone, continues on tablet
phone.startPracticeTimer()
// WebSocket immediately notifies tablet
tablet.onWebSocketMessage(event => {
  if (event.type === 'PRACTICE_STARTED') {
    showNotification('Practice session started on another device')
    offerToContinueHere()
  }
})
```

### 2. **"Users practice alone"** ⚖️

**WebSocket enables new possibilities**:

- Family practice sharing
- Teacher-student monitoring
- Practice buddy accountability
- Multi-device practice sessions

```typescript
// Family sharing example
family.onMemberPractice(event => {
  showFamilyFeed(
    `${event.user} practiced ${event.piece} for ${event.duration} minutes`
  )
  updateFamilyProgress()
})
```

### 3. **"Simple user mental model"** ⚖️

**WebSocket can maintain simplicity**:

- **Option 1**: Completely automatic (like our current approach but real-time)
- **Option 2**: User-controlled with real-time updates when enabled
- **Option 3**: Hybrid - real-time for viewing, manual for critical changes

```typescript
// Configurable sync behavior
const syncSettings = {
  realtimeUpdates: 'enabled' | 'disabled',
  autoSync: 'never' | 'wifi-only' | 'always',
  notifications: 'all' | 'important' | 'none',
}
```

### 4. **"Cloudflare D1 architecture"** ✅

**Perfect fit**: WebSocket + Durable Objects + D1 is **100% Cloudflare native**:

- No vendor lock-in
- Consistent pricing model
- Same edge network performance
- Unified infrastructure management

### 5. **"Implementation complexity"** ⚠️

**Realistic assessment**:

- **Moderate complexity increase** (not overwhelming)
- **Gradual migration possible** (can add alongside existing manual sync)
- **Well-documented Cloudflare patterns** (not experimental)
- **Testable incrementally** (start with read-only real-time updates)

---

## Implementation Strategy for Mirubato

### Phase 1: **Real-time Viewing** (Low Risk)

```typescript
// Add read-only real-time updates
// Keep existing manual sync for writes
// Users see changes from other devices automatically
// No conflict resolution needed yet

webSocket.onMessage(event => {
  if (event.type === 'ENTRY_CREATED' && event.userId === currentUser.id) {
    // Only show entries from same user's other devices
    addEntryToUI(event.entry, { fromOtherDevice: true })
  }
})
```

### Phase 2: **Bidirectional Sync** (Medium Risk)

```typescript
// Enable real-time writes
// Add basic conflict detection
// Maintain offline-first approach

createEntry: async entryData => {
  // Create locally first (unchanged)
  const entry = createLocalEntry(entryData)

  // Send via WebSocket for real-time updates
  webSocket.send({ type: 'ENTRY_CREATED', entry })

  // Fallback: Still save to manual sync queue
  addToSyncQueue(entry)
}
```

### Phase 3: **Advanced Features** (Higher Value)

```typescript
// Add collaborative features
// Family sharing
// Teacher-student monitoring
// Practice analytics sharing

// Family member joins practice session
webSocket.send({
  type: 'PRACTICE_SESSION_JOIN',
  sessionId: currentSession.id,
  member: currentUser,
})
```

---

## Cost Analysis

### WebSocket Hibernation Advantage

- **Problem**: Traditional WebSockets are expensive for idle connections
- **Solution**: Cloudflare's WebSocket Hibernation reduces costs by 95%+
- **Benefit**: Real-time connections without continuous compute charges

```typescript
// Cost-optimized WebSocket usage
durableObject.hibernate() // Dramatically reduces costs during idle periods
durableObject.wakeUp(incomingMessage) // Only pay when processing events
```

### Pricing Estimate for Mirubato

Assuming 1,000 active users with real-time sync:

| Component              | Monthly Cost | Notes                                  |
| ---------------------- | ------------ | -------------------------------------- |
| **Durable Objects**    | ~$5-15       | With hibernation, mostly idle          |
| **WebSocket Messages** | ~$1-5        | Low message frequency                  |
| **D1 Database**        | ~$0-5        | Current usage unchanged                |
| **Workers Requests**   | ~$2-10       | API requests unchanged                 |
| **Total Additional**   | **~$8-35**   | Very reasonable for real-time features |

---

## Migration Path

### Option 1: **Gradual Migration** (Recommended)

1. **Week 1-2**: Add WebSocket infrastructure alongside existing sync
2. **Week 3-4**: Enable read-only real-time updates
3. **Week 5-6**: Add bidirectional sync with manual fallback
4. **Week 7-8**: Add collaborative features
5. **Week 9-10**: User testing and optimization

### Option 2: **Feature Flag Approach**

```typescript
// Enable for power users first
const features = {
  realtimeSync: isFeatureEnabled('realtime-sync', user),
  collaboration: isFeatureEnabled('collaboration', user),
}

if (features.realtimeSync) {
  initWebSocketSync()
} else {
  useManualSync() // Current approach
}
```

---

## Conclusion

**WebSocket + D1 addresses Mirubato's future needs** while maintaining current strengths:

### ✅ **What It Solves Well**

1. **Real-time multi-device sync** - No more manual sync requirements
2. **Collaborative features** - Teacher-student, family sharing
3. **Better user experience** - Seamless device switching
4. **Future-proofing** - Foundation for advanced features
5. **Cloudflare native** - No vendor lock-in, consistent infrastructure

### ⚠️ **What It Doesn't Solve**

1. **Rare conflicts** - Still need resolution logic (but detect them instantly)
2. **Complexity** - Moderate increase in system complexity
3. **Single-user focus** - Enables collaboration but may not be immediately needed

### 🎯 **Recommendation**

**Consider WebSocket + D1 if**:

- Planning collaborative features (teacher-student, family sharing)
- Users frequently switch between devices
- Want to eliminate "forgot to sync" problems
- Ready for moderate complexity increase

**Stick with current manual sync if**:

- Users are satisfied with current experience
- Team prefers to focus on other features
- Want to maintain maximum simplicity

The WebSocket + D1 approach is a **natural evolution** of our current architecture rather than a complete rewrite, making it a viable path for future enhancement when the time is right.

---

_Last Updated: January 2025_
