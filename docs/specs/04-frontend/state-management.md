# State Management Specification

## Overview

Mirubato uses Zustand for client-side state management, providing a lightweight, TypeScript-first solution for managing application state. The architecture emphasizes offline-first capabilities with IndexedDB persistence and real-time synchronization.

## State Architecture

### Store Organization

```
stores/
├── authStore.ts         # Authentication & user session
├── logbookStore.ts      # Practice entries & timer
├── repertoireStore.ts   # Repertoire items & status
├── goalsStore.ts        # Goals & progress tracking
├── settingsStore.ts     # User preferences & config
└── syncStore.ts         # Sync queue & WebSocket state
```

## Store Implementations

### Auth Store

```typescript
interface AuthState {
  // State
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: true,

        login: async credentials => {
          set({ isLoading: true })
          try {
            const response = await api.login(credentials)
            set({
              user: response.user,
              token: response.token,
              refreshToken: response.refreshToken,
              isAuthenticated: true,
            })
            await get().syncUserData()
          } finally {
            set({ isLoading: false })
          }
        },

        logout: async () => {
          await api.logout()
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          // Clear all stores
          useLogbookStore.getState().clear()
          useRepertoireStore.getState().clear()
          useGoalsStore.getState().clear()
        },
      }),
      {
        name: 'auth-storage',
        partialize: state => ({
          token: state.token,
          refreshToken: state.refreshToken,
        }),
      }
    )
  )
)
```

### Logbook Store

```typescript
interface LogbookState {
  // State
  entries: Map<string, LogbookEntry>
  selectedEntryId: string | null
  filters: LogbookFilters
  isTimerRunning: boolean
  timerStartTime: number | null
  timerDuration: number
  timerEntry: Partial<LogbookEntry> | null

  // Computed
  filteredEntries: LogbookEntry[]
  totalPracticeTime: number
  currentStreak: number

  // Actions
  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<LogbookEntry, 'id'>) => Promise<void>
  updateEntry: (id: string, updates: Partial<LogbookEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>

  // Timer actions
  startTimer: (initialData?: Partial<LogbookEntry>) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => Promise<LogbookEntry>
  updateTimerEntry: (updates: Partial<LogbookEntry>) => void

  // Filter actions
  setFilters: (filters: Partial<LogbookFilters>) => void
  clearFilters: () => void
}

export const useLogbookStore = create<LogbookState>()(
  subscribeWithSelector(
    devtools((set, get) => ({
      entries: new Map(),
      selectedEntryId: null,
      filters: {},
      isTimerRunning: false,
      timerStartTime: null,
      timerDuration: 0,
      timerEntry: null,

      // Computed values using selectors
      get filteredEntries() {
        const entries = Array.from(get().entries.values())
        return applyFilters(entries, get().filters)
      },

      get totalPracticeTime() {
        return Array.from(get().entries.values()).reduce(
          (sum, entry) => sum + entry.duration,
          0
        )
      },

      get currentStreak() {
        return calculateStreak(Array.from(get().entries.values()))
      },

      addEntry: async entry => {
        const id = crypto.randomUUID()
        const newEntry = {
          ...entry,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 0,
        }

        // Optimistic update
        set(state => ({
          entries: new Map(state.entries).set(id, newEntry),
        }))

        // Persist to IndexedDB
        await db.logbook.add(newEntry)

        // Queue for sync
        useSyncStore.getState().queueChange({
          entityType: 'logbook',
          entityId: id,
          operation: 'create',
          data: newEntry,
        })

        // Server sync
        try {
          const serverEntry = await api.createLogbookEntry(newEntry)
          set(state => ({
            entries: new Map(state.entries).set(id, serverEntry),
          }))
        } catch (error) {
          // Revert on failure
          set(state => {
            const entries = new Map(state.entries)
            entries.delete(id)
            return { entries }
          })
          throw error
        }
      },

      startTimer: initialData => {
        const now = Date.now()
        set({
          isTimerRunning: true,
          timerStartTime: now,
          timerDuration: 0,
          timerEntry: {
            ...initialData,
            timestamp: now,
            type: 'practice',
            source: 'timer',
          },
        })

        // Start interval to update duration
        timerInterval = setInterval(() => {
          set(state => ({
            timerDuration: Date.now() - (state.timerStartTime || 0),
          }))
        }, 1000)
      },
    }))
  )
)
```

### Repertoire Store

```typescript
interface RepertoireState {
  // State
  items: Map<string, RepertoireItem>
  selectedItemId: string | null
  viewMode: 'list' | 'grid' | 'timeline'
  sortBy: 'title' | 'composer' | 'lastPracticed' | 'status'
  filterStatus: RepertoireStatus | 'all'

  // Computed
  sortedItems: RepertoireItem[]
  itemsByStatus: Record<RepertoireStatus, RepertoireItem[]>
  suggestedPieces: RepertoireItem[]

  // Actions
  loadRepertoire: () => Promise<void>
  addToRepertoire: (piece: Omit<RepertoireItem, 'id'>) => Promise<void>
  updateStatus: (id: string, status: RepertoireStatus) => Promise<void>
  updateItem: (id: string, updates: Partial<RepertoireItem>) => Promise<void>
  removeFromRepertoire: (id: string) => Promise<void>
  linkGoal: (itemId: string, goalId: string) => Promise<void>
  addPracticeSession: (itemId: string, session: PracticeSession) => void
}

export const useRepertoireStore = create<RepertoireState>()(
  devtools((set, get) => ({
    items: new Map(),
    selectedItemId: null,
    viewMode: 'list',
    sortBy: 'lastPracticed',
    filterStatus: 'all',

    get sortedItems() {
      const items = Array.from(get().items.values())
      const filtered =
        get().filterStatus === 'all'
          ? items
          : items.filter(item => item.status === get().filterStatus)

      return sortItems(filtered, get().sortBy)
    },

    get itemsByStatus() {
      const items = Array.from(get().items.values())
      return groupBy(items, 'status')
    },

    get suggestedPieces() {
      // AI-powered suggestions based on practice patterns
      const items = Array.from(get().items.values())
      return items
        .filter(item => item.status === 'learning')
        .sort((a, b) => {
          const daysSinceA = daysSince(a.lastPracticedAt)
          const daysSinceB = daysSince(b.lastPracticedAt)
          return daysSinceB - daysSinceA
        })
        .slice(0, 3)
    },

    updateStatus: async (id, newStatus) => {
      const item = get().items.get(id)
      if (!item) return

      const statusHistory = [
        ...item.statusHistory,
        { status: newStatus, timestamp: Date.now() },
      ]

      const updates = {
        status: newStatus,
        statusHistory,
        updatedAt: Date.now(),
      }

      // Optimistic update
      set(state => ({
        items: new Map(state.items).set(id, { ...item, ...updates }),
      }))

      // Persist and sync
      await db.repertoire.update(id, updates)
      await api.updateRepertoireItem(id, updates)

      // Auto-add note about status change
      const note = `Status changed from ${item.status} to ${newStatus}`
      await get().updateItem(id, {
        notes: item.notes ? `${item.notes}\n\n${note}` : note,
      })
    },
  }))
)
```

### Goals Store

```typescript
interface GoalsState {
  // State
  goals: Map<string, Goal>
  activeGoalIds: Set<string>
  completedGoalIds: Set<string>

  // Computed
  activeGoals: Goal[]
  completedGoals: Goal[]
  todayProgress: GoalProgress[]

  // Actions
  loadGoals: () => Promise<void>
  createGoal: (goal: Omit<Goal, 'id'>) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  updateProgress: (id: string, progress: number) => Promise<void>
  completeGoal: (id: string) => Promise<void>
  abandonGoal: (id: string) => Promise<void>
}

export const useGoalsStore = create<GoalsState>()(
  devtools((set, get) => ({
    goals: new Map(),
    activeGoalIds: new Set(),
    completedGoalIds: new Set(),

    get activeGoals() {
      return Array.from(get().activeGoalIds)
        .map(id => get().goals.get(id))
        .filter(Boolean)
        .sort((a, b) => a.deadline - b.deadline)
    },

    get completedGoals() {
      return Array.from(get().completedGoalIds)
        .map(id => get().goals.get(id))
        .filter(Boolean)
    },

    get todayProgress() {
      const today = startOfDay(new Date())
      return get().activeGoals.map(goal => ({
        goalId: goal.id,
        progress: calculateDailyProgress(goal, today),
        target: goal.dailyTarget,
        percentage:
          (calculateDailyProgress(goal, today) / goal.dailyTarget) * 100,
      }))
    },

    updateProgress: async (id, progress) => {
      const goal = get().goals.get(id)
      if (!goal) return

      const updatedGoal = {
        ...goal,
        currentValue: goal.currentValue + progress,
        lastProgressAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Check if goal is completed
      if (updatedGoal.currentValue >= goal.targetValue) {
        await get().completeGoal(id)
        return
      }

      // Update state
      set(state => ({
        goals: new Map(state.goals).set(id, updatedGoal),
      }))

      // Persist
      await db.goals.update(id, updatedGoal)
      await api.updateGoal(id, updatedGoal)
    },
  }))
)
```

### Settings Store

```typescript
interface SettingsState {
  // User preferences
  theme: 'light' | 'dark' | 'auto'
  language: string
  primaryInstrument: string
  instruments: string[]

  // App settings
  autoSync: boolean
  syncInterval: number
  offlineMode: boolean
  notifications: NotificationSettings

  // Practice settings
  defaultPracticeDuration: number
  metronomeSettings: MetronomeSettings
  timerSettings: TimerSettings

  // Actions
  updatePreference: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  resetToDefaults: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'en',
      primaryInstrument: 'piano',
      instruments: ['piano'],
      autoSync: true,
      syncInterval: 30000,
      offlineMode: false,
      notifications: {
        practiceReminders: true,
        goalDeadlines: true,
        streakAlerts: true,
      },
      defaultPracticeDuration: 30,
      metronomeSettings: {
        bpm: 120,
        beatsPerMeasure: 4,
        sound: 'click',
      },
      timerSettings: {
        autoStart: false,
        countIn: true,
        vibrate: true,
      },

      updatePreference: (key, value) => {
        set({ [key]: value })
        get().saveSettings()
      },

      saveSettings: async () => {
        const settings = get()
        await api.updateUserSettings(settings)
      },

      resetToDefaults: () => {
        set(defaultSettings)
      },
    }),
    {
      name: 'settings-storage',
    }
  )
)
```

### Sync Store

```typescript
interface SyncState {
  // WebSocket state
  wsConnection: WebSocket | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
  lastSyncAt: number | null

  // Sync queue
  pendingChanges: SyncChange[]
  syncInProgress: boolean
  conflicts: SyncConflict[]

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  queueChange: (change: SyncChange) => void
  syncNow: () => Promise<void>
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'remote'
  ) => Promise<void>

  // WebSocket handlers
  handleMessage: (message: WSMessage) => void
  handleReconnect: () => void
}

export const useSyncStore = create<SyncState>()(
  devtools((set, get) => ({
    wsConnection: null,
    connectionStatus: 'disconnected',
    lastSyncAt: null,
    pendingChanges: [],
    syncInProgress: false,
    conflicts: [],

    connect: async () => {
      set({ connectionStatus: 'connecting' })

      try {
        const token = useAuthStore.getState().token
        const ws = new WebSocket(`${WS_URL}/sync?token=${token}`)

        ws.onopen = () => {
          set({
            wsConnection: ws,
            connectionStatus: 'connected',
          })
          get().processPendingChanges()
        }

        ws.onmessage = event => {
          const message = JSON.parse(event.data)
          get().handleMessage(message)
        }

        ws.onclose = () => {
          set({
            wsConnection: null,
            connectionStatus: 'disconnected',
          })
          setTimeout(() => get().handleReconnect(), 5000)
        }

        ws.onerror = () => {
          set({ connectionStatus: 'error' })
        }
      } catch (error) {
        set({ connectionStatus: 'error' })
      }
    },

    queueChange: change => {
      set(state => ({
        pendingChanges: [
          ...state.pendingChanges,
          {
            ...change,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          },
        ],
      }))

      // Try to sync immediately if connected
      if (get().connectionStatus === 'connected') {
        get().processPendingChanges()
      }
    },

    handleMessage: message => {
      switch (message.type) {
        case 'sync_response':
          // Update local state with server response
          get().applyServerUpdate(message.data)
          break

        case 'sync_conflict':
          // Add to conflicts for user resolution
          set(state => ({
            conflicts: [...state.conflicts, message.data],
          }))
          break

        case 'broadcast':
          // Apply updates from other devices
          get().applyBroadcast(message.data)
          break
      }
    },
  }))
)
```

## State Persistence

### IndexedDB Integration

```typescript
// db.ts - Dexie configuration
import Dexie, { Table } from 'dexie'

class MirubatoDB extends Dexie {
  logbook!: Table<LogbookEntry>
  repertoire!: Table<RepertoireItem>
  goals!: Table<Goal>
  syncQueue!: Table<SyncChange>

  constructor() {
    super('mirubato')

    this.version(1).stores({
      logbook: '++id, userId, timestamp, [userId+timestamp]',
      repertoire: '++id, userId, scoreId, status',
      goals: '++id, userId, status, deadline',
      syncQueue: '++id, entityType, entityId, timestamp',
    })
  }
}

export const db = new MirubatoDB()

// Sync IndexedDB with Zustand
export async function syncStoreWithDB() {
  // Load from IndexedDB on app start
  const entries = await db.logbook.toArray()
  useLogbookStore.setState({
    entries: new Map(entries.map(e => [e.id, e])),
  })

  // Subscribe to store changes
  useLogbookStore.subscribe(
    state => state.entries,
    async entries => {
      // Persist changes to IndexedDB
      await db.logbook.bulkPut(Array.from(entries.values()))
    }
  )
}
```

### Offline Queue Management

```typescript
class OfflineQueue {
  async addToQueue(change: SyncChange) {
    await db.syncQueue.add({
      ...change,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    })
  }

  async processQueue() {
    const changes = await db.syncQueue.toArray()

    for (const change of changes) {
      try {
        await this.syncChange(change)
        await db.syncQueue.delete(change.id)
      } catch (error) {
        // Increment retry count
        await db.syncQueue.update(change.id, {
          retryCount: change.retryCount + 1,
          lastError: error.message,
        })

        // Remove after max retries
        if (change.retryCount >= 5) {
          await db.syncQueue.delete(change.id)
        }
      }
    }
  }

  private async syncChange(change: SyncChange) {
    const response = await api.sync(change)
    if (!response.ok) throw new Error('Sync failed')
    return response.data
  }
}
```

## Performance Optimization

### Selectors & Memoization

```typescript
// Use selectors for computed values
const useFilteredEntries = () => {
  return useLogbookStore(
    useShallow(state => ({
      entries: state.entries,
      filters: state.filters,
    }))
  )
}

// Memoized selectors with useMemo
const usePracticeStats = () => {
  const entries = useLogbookStore(state => state.entries)

  return useMemo(() => {
    const entriesArray = Array.from(entries.values())
    return {
      total: entriesArray.length,
      totalTime: entriesArray.reduce((sum, e) => sum + e.duration, 0),
      averageTime:
        entriesArray.length > 0
          ? entriesArray.reduce((sum, e) => sum + e.duration, 0) /
            entriesArray.length
          : 0,
    }
  }, [entries])
}
```

### Subscription Optimization

```typescript
// Subscribe to specific slices
useLogbookStore.subscribe(
  state => state.timerDuration,
  duration => {
    // Only runs when timerDuration changes
    updateTimerDisplay(duration)
  }
)

// Use shallow equality for object/array subscriptions
const { entries, filters } = useLogbookStore(
  useShallow(state => ({
    entries: state.entries,
    filters: state.filters,
  }))
)
```

## Testing

### Store Testing

```typescript
describe('LogbookStore', () => {
  beforeEach(() => {
    useLogbookStore.setState({ entries: new Map() })
  })

  it('should add entry optimistically', async () => {
    const entry = mockEntry()
    await useLogbookStore.getState().addEntry(entry)

    const entries = useLogbookStore.getState().entries
    expect(entries.size).toBe(1)
    expect(Array.from(entries.values())[0]).toMatchObject(entry)
  })

  it('should handle sync conflicts', async () => {
    const localEntry = mockEntry({ notes: 'Local' })
    const serverEntry = mockEntry({ notes: 'Server' })

    useSyncStore.getState().handleMessage({
      type: 'sync_conflict',
      data: { localEntry, serverEntry },
    })

    expect(useSyncStore.getState().conflicts).toHaveLength(1)
  })
})
```

## Related Documentation

- [Frontend Architecture](./architecture.md) - Overall frontend structure
- [Components](./components.md) - Component implementation
- [WebSocket Protocol](../03-api/websocket.md) - Real-time sync
- [Database Schema](../02-database/schema.md) - Data structures

---

_Last updated: December 2024 | Version 1.7.6_
