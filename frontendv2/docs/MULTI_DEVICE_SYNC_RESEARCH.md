# Multi-Device Sync Patterns Research (2024)

## Executive Summary

This document analyzes how leading systems handle multi-device synchronization with a single database, focusing on conflict resolution strategies, offline-first architectures, and real-time collaboration patterns. The research aims to inform future improvements to Mirubato's sync architecture.

## Research Methodology

- Analyzed 10+ modern applications and databases
- Focused on single database architectures (not distributed/sharded systems)
- Prioritized offline-first and real-time sync patterns
- Examined conflict resolution strategies from simple to advanced

---

## Multi-Device Sync Architecture Patterns

### 1. **Offline-First with Manual Sync** ⭐ (Current Mirubato Approach)

**Examples**: Our current implementation, many productivity apps
**Database**: Single centralized database (D1/PostgreSQL)

**How it Works**:

```typescript
// Mirubato's current approach
manualSync: async () => {
  const serverEntries = await api.getEntries()
  const localEntries = getLocalEntries()

  // Find local-only entries to push
  const localOnlyEntries = localEntries.filter(
    entry => !serverEntries.find(s => s.id === entry.id)
  )

  // Push local entries, then merge
  if (localOnlyEntries.length > 0) {
    await api.push({ entries: localOnlyEntries })
  }

  // Simple merge: server + local-only
  const mergedEntries = [...serverEntries, ...localOnlyEntries]
  updateLocalState(mergedEntries)
}
```

**Pros**:

- ✅ Simple to implement and debug
- ✅ User controls when sync happens
- ✅ Works well with single database
- ✅ Predictable behavior
- ✅ No complex conflict resolution needed

**Cons**:

- ❌ Manual sync required
- ❌ No real-time updates
- ❌ Potential data loss if users don't sync

**Best For**: Apps where users create discrete entries (like practice logs) that rarely conflict.

---

### 2. **Firebase Firestore Pattern**

**Examples**: Firebase apps, many mobile apps
**Database**: Firestore (NoSQL with offline caching)

**How it Works**:

- Automatic bidirectional sync
- Local cache with real-time listeners
- Last-write-wins conflict resolution
- Offline persistence built-in

```typescript
// Firebase approach
const unsubscribe = onSnapshot(collection(db, 'entries'), snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') addEntryToUI(change.doc.data())
    if (change.type === 'modified') updateEntryInUI(change.doc.data())
    if (change.type === 'removed') removeEntryFromUI(change.doc.id)
  })
})
```

**Pros**:

- ✅ Real-time sync across devices
- ✅ Automatic offline support
- ✅ Built-in caching and persistence
- ✅ Handles network issues gracefully

**Cons**:

- ❌ Last-write-wins only (limited conflict resolution)
- ❌ Requires NoSQL database migration
- ✅ Vendor lock-in to Firebase
- ❌ Complex pricing model

**Best For**: Apps needing real-time collaboration with simple conflict resolution.

---

### 3. **PouchDB/CouchDB Pattern**

**Examples**: CouchDB-based apps, some offline-first applications
**Database**: CouchDB (document-based with built-in replication)

**How it Works**:

- Multi-master replication
- Revision-based conflict detection
- Preserves all conflicting versions
- Manual conflict resolution required

```typescript
// PouchDB approach
const localDB = new PouchDB('myapp')
const remoteDB = new PouchDB('https://myapp.cloudant.com/mydb')

// Two-way sync
const sync = localDB
  .sync(remoteDB, {
    live: true,
    retry: true,
  })
  .on('change', info => {
    // Handle conflicts manually
    if (info.docs.some(doc => doc._conflicts)) {
      resolveConflicts(info.docs)
    }
  })

async function resolveConflicts(docs) {
  for (const doc of docs) {
    if (doc._conflicts) {
      // Get all conflicting versions
      const conflicts = await localDB.get(doc._id, {
        conflicts: true,
        open_revs: 'all',
      })
      // Custom resolution logic
      const resolved = await customMerge(conflicts)
      await localDB.put(resolved)
    }
  }
}
```

**Pros**:

- ✅ Sophisticated conflict detection
- ✅ Preserves all versions for manual resolution
- ✅ True multi-master architecture
- ✅ Battle-tested replication

**Cons**:

- ❌ Complex conflict resolution required
- ❌ Document-based (may not fit relational data)
- ❌ Performance issues with large datasets
- ❌ Steep learning curve

**Best For**: Applications where preserving all changes is critical and conflicts are expected.

---

### 4. **CRDT-Based Pattern** 🚀 (Most Advanced)

**Examples**: Figma, Apple Notes, Google Docs, modern collaborative editors
**Database**: Single database with CRDT data structures

**How it Works**:

- Conflict-Free Replicated Data Types
- Automatic conflict resolution without data loss
- Can merge any concurrent changes mathematically
- Supports complex collaborative editing

```typescript
// CRDT approach (simplified)
import { Automerge } from '@automerge/automerge'

// Each entry is a CRDT document
let doc = Automerge.init()

// Device 1 makes changes
const doc1 = Automerge.change(doc, doc => {
  doc.entries = []
  doc.entries.push({
    id: 'entry-1',
    title: 'Piano practice',
    duration: 30,
  })
})

// Device 2 makes concurrent changes
const doc2 = Automerge.change(doc, doc => {
  doc.entries = []
  doc.entries.push({
    id: 'entry-2',
    title: 'Guitar practice',
    duration: 45,
  })
})

// Automatic conflict-free merge
const merged = Automerge.merge(doc1, doc2)
// Result: Both entries preserved automatically
```

**Pros**:

- ✅ Automatic conflict resolution without data loss
- ✅ Supports real-time collaboration
- ✅ Mathematical guarantees of consistency
- ✅ Works offline and online seamlessly
- ✅ Can handle complex concurrent edits

**Cons**:

- ❌ Complex to implement and debug
- ❌ Higher memory/storage overhead
- ❌ Not suitable for all data types
- ❌ Requires significant architectural changes

**Best For**: Collaborative applications where concurrent editing is common and all changes must be preserved.

---

## Conflict Resolution Strategies Comparison

| Strategy                       | Simplicity | Data Preservation | Real-time  | Multi-device |
| ------------------------------ | ---------- | ----------------- | ---------- | ------------ |
| **Manual Sync (Mirubato)**     | ⭐⭐⭐⭐⭐ | ⭐⭐              | ❌         | ⭐⭐⭐       |
| **Last Write Wins (Firebase)** | ⭐⭐⭐⭐   | ⭐                | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐   |
| **Revision Trees (CouchDB)**   | ⭐⭐       | ⭐⭐⭐⭐⭐        | ⭐⭐⭐     | ⭐⭐⭐⭐     |
| **CRDTs**                      | ⭐         | ⭐⭐⭐⭐⭐        | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐   |

---

## Real-World Application Analysis

### Todoist (Task Management)

- **Sync**: Real-time across devices with offline support
- **Conflicts**: Rarely occur (tasks are typically modified by one user)
- **Strategy**: Likely timestamp-based with server authority
- **Database**: Centralized with local caching

### Apple Notes

- **Sync**: Uses CRDTs for collaborative editing
- **Conflicts**: Automatic resolution without data loss
- **Strategy**: Operational Transform + CRDTs
- **Database**: CloudKit with local CoreData

### Notion

- **Sync**: Block-based with operational transforms
- **Conflicts**: Manual resolution prompts when detected
- **Strategy**: Hybrid of server authority and user resolution
- **Database**: Centralized with complex conflict detection

---

## Recommendations for Mirubato

### Current State Assessment ✅

Our current **manual sync with offline-first** approach is well-suited for Mirubato because:

1. **Practice entries rarely conflict** - Users typically practice alone
2. **Discrete data model** - Each entry is independent
3. **Simple user mental model** - Clear when sync happens
4. **Reliable behavior** - No surprise data loss or overwrites
5. **Single database architecture** - Fits our Cloudflare D1 setup

### Short-term Improvements (Next 3 months)

#### 1. **Enhanced Sync Status**

```typescript
// Add more granular sync feedback
interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error' | 'conflict'
  lastSyncTime: Date | null
  entriesChanged: number
  conflictsDetected: ConflictInfo[]
}
```

#### 2. **Optimistic Sync Indicators**

```typescript
// Show which entries are local-only
interface LogbookEntry {
  // ... existing fields
  syncStatus: 'synced' | 'local-only' | 'syncing' | 'conflict'
  lastModified: Date
}
```

#### 3. **Basic Conflict Detection**

```typescript
// Detect server-side changes to local entries
manualSync: async () => {
  const serverEntries = await api.getEntries()
  const localEntries = getLocalEntries()

  // Check for conflicts (same ID, different content, both modified)
  const conflicts = detectConflicts(serverEntries, localEntries)

  if (conflicts.length > 0) {
    // Prompt user to resolve
    return { success: false, conflicts }
  }

  // Continue with normal merge...
}
```

### Medium-term Considerations (6-12 months)

#### 1. **Automatic Sync Triggers**

Consider adding **optional** automatic sync for users who want it:

```typescript
// Optional background sync (user can disable)
const autoSyncSettings = {
  enabled: false, // Default off
  triggers: ['app-focus', 'network-reconnect'],
  frequency: 'never' | '5min' | '30min' | 'hourly',
}
```

#### 2. **Delta Sync Optimization**

For better performance with large datasets:

```typescript
// Only sync changed entries since last sync
const lastSyncTime = getLastSyncTime()
const deltaEntries = await api.getEntriesSince(lastSyncTime)
```

### Long-term Vision (12+ months)

#### **Real-time Collaboration** (if needed)

If we add collaborative features (shared practice logs, teacher-student):

1. **Consider Firebase/Supabase** - Real-time subscriptions
2. **Or implement WebSocket updates** - With our current D1 database
3. **CRDT integration** - For complex collaborative editing

#### **Advanced Conflict Resolution**

For power users or collaborative features:

```typescript
// Semantic conflict resolution
interface ConflictResolver {
  strategy: 'user-choice' | 'merge-fields' | 'keep-both' | 'custom'

  // Field-level merging for practice entries
  mergeEntry(local: Entry, server: Entry): Entry {
    return {
      ...server, // Prefer server metadata
      duration: Math.max(local.duration, server.duration), // Longer practice
      notes: `${local.notes}\n---\n${server.notes}`, // Combine notes
      techniques: [...new Set([...local.techniques, ...server.techniques])] // Merge arrays
    }
  }
}
```

---

## Conclusion

**Our current manual sync approach is appropriate** for Mirubato's use case and user behavior. The research shows that different applications require different sync strategies based on their:

- **Data model** (discrete entries vs collaborative documents)
- **User patterns** (single user vs multi-user editing)
- **Conflict frequency** (rare vs common)
- **Technical constraints** (database choice, team expertise)

**Mirubato should focus on**:

1. ✅ **Enhancing the current approach** with better UX and status indicators
2. ✅ **Adding optional automatic sync** for users who want it
3. ✅ **Preparing for future collaboration features** if needed

The manual sync pattern gives us a solid foundation that can evolve toward more sophisticated approaches as our user needs grow.

---

## References

- Firebase Firestore Documentation (2024)
- PouchDB/CouchDB Replication Guide
- Conflict-Free Replicated Data Types (CRDT.tech)
- Local-First Software Principles
- Modern Offline-First Architecture Patterns
- Multi-Device Synchronization Research Papers

_Last Updated: January 2025_
