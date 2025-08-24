import { create } from 'zustand'
import { logbookApi, type LogbookEntry, type Goal } from '../api/logbook'
import { nanoid } from 'nanoid'
import {
  removeDuplicates,
  getDuplicateReport,
  type DuplicateEntry,
} from '../utils/duplicateCleanup'
import { getWebSocketSync, type SyncEvent } from '../services/webSocketSync'
import { localEventBus } from '../services/localEventBus'

interface LogbookState {
  // Data - Using Maps for O(1) access
  entriesMap: Map<string, LogbookEntry>
  goalsMap: Map<string, Goal>
  scoreMetadata: Record<string, { title: string; composer?: string }> // Cache score info

  // UI State
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Local Storage Management (for anonymous users)
  isLocalMode: boolean

  // Sync state (used by WebSocket sync)
  isSyncing: boolean
  lastSyncTime: Date | null

  // WebSocket real-time sync state
  isRealtimeSyncEnabled: boolean
  realtimeSyncStatus:
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'reconnecting'
  realtimeSyncError: string | null

  // WebSocket sync initialization status
  webSocketInitialized: boolean

  // Computed getters
  entries: LogbookEntry[]
  goals: Goal[]

  // Actions - Entries
  loadEntries: () => Promise<void>
  createEntry: (
    entry: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  updateEntry: (id: string, updates: Partial<LogbookEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>

  // Actions - Goals
  loadGoals: () => Promise<void>
  createGoal: (
    goal: Omit<
      Goal,
      'id' | 'createdAt' | 'updatedAt' | 'progress' | 'linkedEntries'
    >
  ) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Actions - UI
  setSearchQuery: (query: string) => void
  setLocalMode: (isLocal: boolean) => void
  clearError: () => void

  // Actions - WebSocket Sync
  initializeWebSocketSync: () => Promise<void>

  // Actions - Real-time Sync
  enableRealtimeSync: () => Promise<boolean>
  disableRealtimeSync: () => void
  addEntryFromSync: (entry: LogbookEntry) => void
  updateEntryFromSync: (entry: LogbookEntry) => void
  removeEntryFromSync: (entryId: string) => void
  mergeEntriesFromSync: (entries: LogbookEntry[]) => void

  // Actions - Piece Management
  updatePieceName: (
    oldPiece: { title: string; composer?: string },
    newPiece: { title: string; composer?: string }
  ) => Promise<number>

  // Actions - Duplicate Management
  cleanupDuplicates: () => Promise<{
    duplicatesRemoved: number
    report: {
      duplicates: DuplicateEntry[]
      summary: {
        totalEntries: number
        duplicatesFound: number
        highConfidence: number
        mediumConfidence: number
        lowConfidence: number
      }
    }
  }>
  getDuplicateReport: () => {
    duplicates: DuplicateEntry[]
    summary: {
      totalEntries: number
      duplicatesFound: number
      highConfidence: number
      mediumConfidence: number
      lowConfidence: number
    }
  }
}

// Local storage keys
const ENTRIES_KEY = 'mirubato:logbook:entries'
const GOALS_KEY = 'mirubato:logbook:goals'
const SCORE_METADATA_KEY = 'mirubato:logbook:scoreMetadata'
const DELETED_ENTRIES_KEY = 'mirubato:logbook:deletedEntries'

// Debounce helper
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: number | null = null
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = window.setTimeout(() => func(...args), wait)
  }) as T
}

// Debounced localStorage write (for non-critical updates)
const debouncedLocalStorageWrite = debounce((key: string, value: string) => {
  localStorage.setItem(key, value)
}, 500)

// Immediate localStorage write (for critical operations)
const immediateLocalStorageWrite = (key: string, value: string) => {
  localStorage.setItem(key, value)
}

// Helper to convert Map to sorted array
const mapToSortedArray = <T extends { createdAt: string }>(
  map: Map<string, T>
): T[] => {
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Helper to check if entries are effectively the same
const entriesAreEqual = (a: LogbookEntry, b: LogbookEntry): boolean => {
  // Compare relevant fields (exclude timestamps that might differ slightly)
  return (
    a.id === b.id &&
    a.duration === b.duration &&
    a.type === b.type &&
    a.instrument === b.instrument &&
    JSON.stringify(a.pieces) === JSON.stringify(b.pieces) &&
    JSON.stringify(a.techniques) === JSON.stringify(b.techniques) &&
    a.notes === b.notes &&
    a.mood === b.mood &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags)
  )
}

// Helper specifically for sorting logbook entries by practice time
const sortEntriesByTimestamp = (entries: LogbookEntry[]): LogbookEntry[] => {
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// Sanitize entry for WebSocket sync to match API requirements
const sanitizeEntryForSync = (entry: LogbookEntry): LogbookEntry => {
  // Filter out undefined values first
  const cleanEntry = Object.fromEntries(
    Object.entries(entry).filter(([_, value]) => value !== undefined)
  ) as LogbookEntry

  return {
    ...cleanEntry,
    // Ensure proper null/undefined handling for optional fields
    notes: cleanEntry.notes || null,
    mood: cleanEntry.mood || null,
    scoreId: cleanEntry.scoreId || undefined,
    scoreTitle: cleanEntry.scoreTitle || undefined,
    scoreComposer: cleanEntry.scoreComposer || undefined,
    autoTracked: cleanEntry.autoTracked || undefined,
    // Sanitize nested objects
    pieces:
      cleanEntry.pieces?.map(p => ({
        ...p,
        composer: p.composer || null,
        measures: p.measures || null,
        tempo: p.tempo || null,
      })) || [],
    techniques: cleanEntry.techniques || [],
    goalIds: cleanEntry.goalIds || [],
    tags: cleanEntry.tags || [],
    metadata: cleanEntry.metadata || { source: 'manual' },
  }
}

// Deletion tracking helpers
const getDeletedEntries = (): Set<string> => {
  try {
    const deleted = localStorage.getItem(DELETED_ENTRIES_KEY)
    return deleted ? new Set(JSON.parse(deleted)) : new Set()
  } catch {
    return new Set()
  }
}

const addToDeletedEntries = (entryId: string): void => {
  const deletedEntries = getDeletedEntries()
  deletedEntries.add(entryId)
  localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify([...deletedEntries]))
}

export const useLogbookStore = create<LogbookState>((set, get) => ({
  entriesMap: new Map(),
  goalsMap: new Map(),
  scoreMetadata: {},
  isLoading: false,
  error: null,
  searchQuery: '',
  isLocalMode: true, // Always start in local mode

  // Sync state (used by WebSocket sync)
  isSyncing: false,
  lastSyncTime: null,

  // Real-time sync state
  isRealtimeSyncEnabled: false,
  realtimeSyncStatus: 'disconnected',
  realtimeSyncError: null,
  webSocketInitialized: false,

  // Computed properties - these need to be regular properties that get updated
  entries: [],
  goals: [],

  loadEntries: async () => {
    set({ isLoading: true, error: null })

    try {
      // Always load from localStorage first
      const stored = localStorage.getItem(ENTRIES_KEY)
      const entries: LogbookEntry[] = stored ? JSON.parse(stored) : []

      // Load score metadata
      const storedMetadata = localStorage.getItem(SCORE_METADATA_KEY)
      const scoreMetadata = storedMetadata ? JSON.parse(storedMetadata) : {}

      // Convert array to Map for O(1) access
      const entriesMap = new Map(entries.map(entry => [entry.id, entry]))
      set({
        entriesMap,
        entries: sortEntriesByTimestamp(Array.from(entriesMap.values())),
        scoreMetadata,
        isLoading: false,
      })

      // No automatic sync - user controls when to sync
    } catch (error: unknown) {
      console.error('Failed to load entries:', error as Error)
      set({
        entriesMap: new Map(),
        error: 'Failed to load entries',
        isLoading: false,
      })
    }
  },

  createEntry: async entryData => {
    set({ error: null })

    try {
      // Always create locally first
      const entry: LogbookEntry = {
        ...entryData,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Cache score metadata if present
      let updatedScoreMetadata = get().scoreMetadata
      if (entry.scoreId && entry.scoreTitle) {
        updatedScoreMetadata = {
          ...updatedScoreMetadata,
          [entry.scoreId]: {
            title: entry.scoreTitle,
            composer: entry.scoreComposer,
          },
        }
        immediateLocalStorageWrite(
          SCORE_METADATA_KEY,
          JSON.stringify(updatedScoreMetadata)
        )
      }

      // O(1) insertion
      const newEntriesMap = new Map(get().entriesMap)
      newEntriesMap.set(entry.id, entry)
      set({
        entriesMap: newEntriesMap,
        entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        scoreMetadata: updatedScoreMetadata,
      })

      // Immediate write to localStorage for new entries
      immediateLocalStorageWrite(
        ENTRIES_KEY,
        JSON.stringify(Array.from(newEntriesMap.values()))
      )

      // Emit event for repertoire to handle goal linking
      // This avoids circular dependency between stores
      localEventBus.emit('PRACTICE_CREATED', { entry })

      // If not in local mode and authenticated, also sync to server
      if (!get().isLocalMode && localStorage.getItem('auth-token')) {
        try {
          const syncedEntry = await logbookApi.createEntry(entry)

          // Only update if the server returns a meaningfully different version
          if (!entriesAreEqual(syncedEntry, entry)) {
            const syncedEntriesMap = new Map(get().entriesMap)
            // Use the synced entry's ID as the key (in case server changed it)
            syncedEntriesMap.set(syncedEntry.id, syncedEntry)
            // Remove the old entry if the ID changed (shouldn't happen with our fix, but safe)
            if (syncedEntry.id !== entry.id) {
              syncedEntriesMap.delete(entry.id)
              console.warn(
                `Entry ID changed from ${entry.id} to ${syncedEntry.id} during sync`
              )
            }
            set({
              entriesMap: syncedEntriesMap,
              entries: sortEntriesByTimestamp(
                Array.from(syncedEntriesMap.values())
              ),
            })

            // Update localStorage with synced data
            immediateLocalStorageWrite(
              ENTRIES_KEY,
              JSON.stringify(Array.from(syncedEntriesMap.values()))
            )
          }

          console.log('✅ Entry synced to server:', entry.id)
        } catch (syncError) {
          console.warn(
            '⚠️ Failed to sync new entry to server, keeping local copy:',
            syncError
          )
          // Entry is already saved locally, so don't throw
        }
      }

      // Send real-time sync event if enabled
      if (get().isRealtimeSyncEnabled) {
        const webSocketSync = getWebSocketSync()
        webSocketSync.send({
          type: 'ENTRY_CREATED',
          entry: sanitizeEntryForSync(entry),
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error: unknown) {
      set({ error: 'Failed to create entry' })
      throw error
    }
  },

  updateEntry: async (id, updates) => {
    set({ error: null })

    try {
      const currentEntry = get().entriesMap.get(id)
      if (!currentEntry) {
        throw new Error('Entry not found')
      }

      if (get().isLocalMode) {
        // O(1) update locally
        const updatedEntry = {
          ...currentEntry,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.set(id, updatedEntry)
        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        })

        debouncedLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(newEntriesMap.values()))
        )

        // Send real-time sync event if enabled
        if (get().isRealtimeSyncEnabled) {
          const webSocketSync = getWebSocketSync()
          webSocketSync.send({
            type: 'ENTRY_UPDATED',
            entry: sanitizeEntryForSync(updatedEntry),
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        // Prepare the updated entry first
        const updatedEntry = {
          ...currentEntry,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        // Update local state immediately to preserve changes
        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.set(id, updatedEntry)
        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        })

        // Save to localStorage immediately to prevent data loss
        immediateLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(newEntriesMap.values()))
        )

        try {
          // Try to sync with API
          const syncedEntry = await logbookApi.updateEntry(id, updates)

          // Only update if the server returns a meaningfully different version
          if (!entriesAreEqual(syncedEntry, updatedEntry)) {
            const syncedEntriesMap = new Map(get().entriesMap)
            // Use synced entry's ID as key (should be same as 'id' but be safe)
            syncedEntriesMap.set(syncedEntry.id, syncedEntry)
            // Remove old entry if ID changed (shouldn't happen, but be safe)
            if (syncedEntry.id !== id) {
              syncedEntriesMap.delete(id)
              console.warn(
                `Entry ID changed from ${id} to ${syncedEntry.id} during update`
              )
            }
            set({
              entriesMap: syncedEntriesMap,
              entries: sortEntriesByTimestamp(
                Array.from(syncedEntriesMap.values())
              ),
            })

            // Update localStorage with synced data
            immediateLocalStorageWrite(
              ENTRIES_KEY,
              JSON.stringify(Array.from(syncedEntriesMap.values()))
            )
          }

          // Send real-time sync event with synced data
          if (get().isRealtimeSyncEnabled) {
            const webSocketSync = getWebSocketSync()
            webSocketSync.send({
              type: 'ENTRY_UPDATED',
              entry: sanitizeEntryForSync(syncedEntry),
              timestamp: new Date().toISOString(),
            })
          }
        } catch (syncError) {
          // Sync failed, but local changes are preserved
          console.warn(
            'Failed to sync entry update to server, keeping local changes:',
            syncError
          )

          // Send real-time sync event with local data
          if (get().isRealtimeSyncEnabled) {
            const webSocketSync = getWebSocketSync()
            webSocketSync.send({
              type: 'ENTRY_UPDATED',
              entry: sanitizeEntryForSync(updatedEntry),
              timestamp: new Date().toISOString(),
            })
          }

          // Don't throw - entry is saved locally
        }
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to update entry' })
      throw error
    }
  },

  deleteEntry: async id => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // O(1) delete locally
        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.delete(id)
        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        })

        immediateLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(newEntriesMap.values()))
        )

        // Track deletion for sync conflict resolution
        addToDeletedEntries(id)

        // Send real-time sync event if enabled
        if (get().isRealtimeSyncEnabled) {
          const webSocketSync = getWebSocketSync()
          webSocketSync.send({
            type: 'ENTRY_DELETED',
            entryId: id,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        // Delete locally first to preserve user action
        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.delete(id)
        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        })

        // Save to localStorage immediately
        immediateLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(newEntriesMap.values()))
        )

        // Track deletion for sync conflict resolution
        addToDeletedEntries(id)

        try {
          // Try to sync deletion with API
          await logbookApi.deleteEntry(id)

          // Send real-time sync event if API delete succeeds
          if (get().isRealtimeSyncEnabled) {
            const webSocketSync = getWebSocketSync()
            webSocketSync.send({
              type: 'ENTRY_DELETED',
              entryId: id,
              timestamp: new Date().toISOString(),
            })
          }
        } catch (syncError) {
          // Deletion sync failed, but entry is removed locally
          console.warn(
            'Failed to sync entry deletion to server, keeping local deletion:',
            syncError
          )

          // Still send WebSocket event even if API fails
          if (get().isRealtimeSyncEnabled) {
            const webSocketSync = getWebSocketSync()
            webSocketSync.send({
              type: 'ENTRY_DELETED',
              entryId: id,
              timestamp: new Date().toISOString(),
            })
          }

          // Don't throw - deletion is saved locally
        }
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to delete entry' })
      throw error
    }
  },

  loadGoals: async () => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Load from localStorage
        const stored = localStorage.getItem(GOALS_KEY)
        const goals: Goal[] = stored ? JSON.parse(stored) : []
        const goalsMap = new Map(goals.map(goal => [goal.id, goal]))
        set({
          goalsMap,
          goals: mapToSortedArray(goalsMap),
        })
      } else {
        // Load from API
        const goals = await logbookApi.getGoals()
        const goalsMap = new Map(goals.map(goal => [goal.id, goal]))
        set({
          goalsMap,
          goals: mapToSortedArray(goalsMap),
        })

        immediateLocalStorageWrite(GOALS_KEY, JSON.stringify(goals))
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to load goals' })
    }
  },

  createGoal: async goalData => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Create locally
        const goal: Goal = {
          ...goalData,
          id: nanoid(),
          progress: 0,
          linkedEntries: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.set(goal.id, goal)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      } else {
        // Create via API
        const goal = await logbookApi.createGoal(goalData)

        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.set(goal.id, goal)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to create goal' })
      throw error
    }
  },

  updateGoal: async (id, updates) => {
    set({ error: null })

    try {
      const currentGoal = get().goalsMap.get(id)
      if (!currentGoal) {
        throw new Error('Goal not found')
      }

      if (get().isLocalMode) {
        // Update locally
        const updatedGoal = {
          ...currentGoal,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.set(id, updatedGoal)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      } else {
        // Update via API
        const updated = await logbookApi.updateGoal(id, updates)

        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.set(id, updated)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to update goal' })
      throw error
    }
  },

  deleteGoal: async id => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Delete locally
        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.delete(id)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      } else {
        // Delete via API
        await logbookApi.deleteGoal(id)

        const newGoalsMap = new Map(get().goalsMap)
        newGoalsMap.delete(id)
        set({
          goalsMap: newGoalsMap,
          goals: mapToSortedArray(newGoalsMap),
        })

        immediateLocalStorageWrite(
          GOALS_KEY,
          JSON.stringify(Array.from(newGoalsMap.values()))
        )
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to delete goal' })
      throw error
    }
  },

  setSearchQuery: query => set({ searchQuery: query }),
  setLocalMode: isLocal => set({ isLocalMode: isLocal }),
  clearError: () => set({ error: null }),

  // Real-time sync methods
  enableRealtimeSync: async () => {
    try {
      set({ realtimeSyncError: null, realtimeSyncStatus: 'connecting' })

      const webSocketSync = getWebSocketSync()

      // Set up event handlers
      webSocketSync.on('ENTRY_CREATED', (event: SyncEvent) => {
        if (event.entry) {
          get().addEntryFromSync(event.entry)
        }
      })

      webSocketSync.on('ENTRY_UPDATED', (event: SyncEvent) => {
        if (event.entry) {
          get().updateEntryFromSync(event.entry)
        }
      })

      webSocketSync.on('ENTRY_DELETED', (event: SyncEvent) => {
        if (event.entryId) {
          get().removeEntryFromSync(event.entryId)
        }
      })

      webSocketSync.on('BULK_SYNC', (event: SyncEvent) => {
        if (event.entries) {
          get().mergeEntriesFromSync(event.entries)
          // Update last sync time after successful bulk sync
          set({ lastSyncTime: new Date() })
        }
      })

      // Get auth token and user info
      const authToken = localStorage.getItem('auth-token')
      const userStr = localStorage.getItem('mirubato:user')

      if (!authToken || !userStr) {
        throw new Error('Authentication required for real-time sync')
      }

      const user = JSON.parse(userStr)
      const success = await webSocketSync.connect(user.id, authToken)

      if (success) {
        set({
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
          realtimeSyncError: null,
        })
        return true
      } else {
        throw new Error('Failed to connect to real-time sync')
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Real-time sync failed'
      set({
        isRealtimeSyncEnabled: false,
        realtimeSyncStatus: 'disconnected',
        realtimeSyncError: errorMessage,
      })
      console.error('Failed to enable real-time sync:', error)
      return false
    }
  },

  disableRealtimeSync: () => {
    const webSocketSync = getWebSocketSync()
    webSocketSync.disconnect()
    set({
      isRealtimeSyncEnabled: false,
      realtimeSyncStatus: 'disconnected',
      realtimeSyncError: null,
    })
  },

  addEntryFromSync: (entry: LogbookEntry) => {
    const newEntriesMap = new Map(get().entriesMap)

    // Avoid duplicates and don't overwrite newer local entries
    const existingEntry = newEntriesMap.get(entry.id)
    if (existingEntry) {
      // Check if incoming entry is newer
      if (
        new Date(entry.updatedAt).getTime() <=
        new Date(existingEntry.updatedAt).getTime()
      ) {
        return // Local entry is newer, ignore
      }
    }

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

    // Show toast notification if it's a new entry
    if (!existingEntry) {
      console.log(
        '✨ New practice entry synced from another device:',
        entry.pieces?.[0]?.title || 'Untitled'
      )
    }
  },

  updateEntryFromSync: (entry: LogbookEntry) => {
    const newEntriesMap = new Map(get().entriesMap)

    // Only update if the incoming entry is newer
    const existingEntry = newEntriesMap.get(entry.id)
    if (
      existingEntry &&
      new Date(entry.updatedAt).getTime() <=
        new Date(existingEntry.updatedAt).getTime()
    ) {
      return // Local entry is newer, ignore
    }

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

    console.log(
      '📝 Practice entry updated from another device:',
      entry.pieces?.[0]?.title || 'Untitled'
    )
  },

  removeEntryFromSync: (entryId: string) => {
    const newEntriesMap = new Map(get().entriesMap)
    const removedEntry = newEntriesMap.get(entryId)

    if (removedEntry) {
      newEntriesMap.delete(entryId)
      set({
        entriesMap: newEntriesMap,
        entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
      })

      // Update localStorage
      immediateLocalStorageWrite(
        ENTRIES_KEY,
        JSON.stringify(Array.from(newEntriesMap.values()))
      )

      console.log(
        '🗑️ Practice entry deleted from another device:',
        removedEntry.pieces?.[0]?.title || 'Untitled'
      )
    }
  },

  mergeEntriesFromSync: (entries: LogbookEntry[]) => {
    // Skip if another sync is in progress to avoid duplicates
    if (get().isSyncing) {
      console.log('⏸️ Skipping WebSocket bulk sync - another sync in progress')
      return
    }

    // Set isSyncing to prevent concurrent operations
    set({ isSyncing: true })

    try {
      const newEntriesMap = new Map(get().entriesMap)
      let changesCount = 0

      for (const entry of entries) {
        const existingEntry = newEntriesMap.get(entry.id)

        // Add new entries or update if incoming is newer
        if (
          !existingEntry ||
          new Date(entry.updatedAt).getTime() >
            new Date(existingEntry.updatedAt).getTime()
        ) {
          newEntriesMap.set(entry.id, entry)
          changesCount++
        }
      }

      if (changesCount > 0) {
        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
        })

        // Update localStorage
        debouncedLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(newEntriesMap.values()))
        )

        console.log(`📊 Merged ${changesCount} entries from sync`)
      }
    } finally {
      // Always clear isSyncing
      set({ isSyncing: false })
    }
  },

  updatePieceName: async (oldPiece, newPiece) => {
    set({ error: null })

    try {
      console.log('[updatePieceName] Starting update:', { oldPiece, newPiece })

      // Update all entries locally first
      const updatedEntriesMap = new Map(get().entriesMap)
      const affectedEntryIds: string[] = []

      updatedEntriesMap.forEach((entry, id) => {
        let wasUpdated = false
        const updatedPieces = entry.pieces.map(piece => {
          if (
            piece.title === oldPiece.title &&
            (piece.composer || '') === (oldPiece.composer || '')
          ) {
            wasUpdated = true
            console.log(`[updatePieceName] Found matching piece in entry ${id}`)
            return {
              ...piece,
              title: newPiece.title,
              composer: newPiece.composer || null,
            }
          }
          return piece
        })

        if (wasUpdated) {
          affectedEntryIds.push(id)
          updatedEntriesMap.set(id, {
            ...entry,
            pieces: updatedPieces,
            updatedAt: new Date().toISOString(),
          })
        }
      })

      console.log(
        `[updatePieceName] Updated ${affectedEntryIds.length} entries locally`
      )

      // Update state
      set({
        entriesMap: updatedEntriesMap,
        entries: sortEntriesByTimestamp(Array.from(updatedEntriesMap.values())),
      })

      // Save to localStorage immediately
      immediateLocalStorageWrite(
        ENTRIES_KEY,
        JSON.stringify(Array.from(updatedEntriesMap.values()))
      )

      // If online, update on server
      if (!get().isLocalMode && localStorage.getItem('auth-token')) {
        try {
          console.log('[updatePieceName] Calling API to update server')
          // Call API to update pieces
          const serverUpdateCount = await logbookApi.updatePieceName(
            oldPiece,
            newPiece
          )
          console.log(
            `[updatePieceName] Server updated ${serverUpdateCount} entries`
          )
        } catch (apiError) {
          // If API fails, we still keep local changes
          console.error('Failed to update piece name on server:', apiError)
          set({
            error: 'Piece name updated locally. Will sync when online.',
          })
        }
      }

      // Return the number of affected entries
      return affectedEntryIds.length
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      set({ error: err.response?.data?.error || 'Failed to update piece name' })
      throw error
    }
  },

  // Duplicate Management
  cleanupDuplicates: async () => {
    console.log('[LogbookStore] Starting duplicate cleanup...')

    const currentEntries = Array.from(get().entriesMap.values())
    const report = getDuplicateReport(currentEntries)

    if (report.summary.duplicatesFound === 0) {
      console.log('[LogbookStore] No duplicates found')
      return { duplicatesRemoved: 0, report }
    }

    // Remove duplicates and update store
    const cleanedEntries = removeDuplicates(currentEntries)
    const duplicatesRemoved = currentEntries.length - cleanedEntries.length

    // Update the entries map
    const newEntriesMap = new Map(
      cleanedEntries.map(entry => [entry.id, entry])
    )
    set({
      entriesMap: newEntriesMap,
      entries: sortEntriesByTimestamp(cleanedEntries),
    })

    // Update local storage
    immediateLocalStorageWrite(ENTRIES_KEY, JSON.stringify(cleanedEntries))

    console.log(`[LogbookStore] Removed ${duplicatesRemoved} duplicate entries`)
    console.log(`[LogbookStore] Kept ${cleanedEntries.length} unique entries`)

    return { duplicatesRemoved, report }
  },

  getDuplicateReport: () => {
    const currentEntries = Array.from(get().entriesMap.values())
    return getDuplicateReport(currentEntries)
  },

  // Initialize WebSocket sync for authenticated users
  initializeWebSocketSync: async () => {
    const state = get()

    // Don't initialize if already initialized, in local mode, or not authenticated
    if (
      state.webSocketInitialized ||
      state.isRealtimeSyncEnabled ||
      state.isLocalMode ||
      !localStorage.getItem('auth-token')
    ) {
      return
    }

    try {
      console.log('🔌 Initializing WebSocket sync...')
      const success = await get().enableRealtimeSync()

      if (success) {
        set({ webSocketInitialized: true })
        console.log('✅ WebSocket sync initialized successfully')
      } else {
        console.warn(
          '⚠️ WebSocket sync initialization failed, falling back to manual sync'
        )
        // WebSocket failed, user can still use manual sync
        set({ webSocketInitialized: false })
      }
    } catch (error) {
      console.error('❌ Error initializing WebSocket sync:', error)
      set({ webSocketInitialized: false })
    }
  },
}))

// Register event handler for piece dissociation from repertoire
// This handles updates when a piece is removed from repertoire but logs should be preserved
// Skip registration only in test environment
const isTestEnvironment =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
if (!isTestEnvironment) {
  localEventBus.on('PIECE_DISSOCIATED', ({ updatedEntries }) => {
    // Update store state with the modified entries
    useLogbookStore.setState({
      entriesMap: updatedEntries,
      entries: Array.from(updatedEntries.values()).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    })

    // Preserve localStorage sync - write immediately
    const entries = Array.from(updatedEntries.values())
    localStorage.setItem('mirubato:logbook:entries', JSON.stringify(entries))
  })

  // Set up WebSocket sync event handlers
  // Check WebSocket connection on window focus
  window.addEventListener('focus', () => {
    const store = useLogbookStore.getState()
    if (!store.isLocalMode && localStorage.getItem('auth-token')) {
      // Check if WebSocket is connected, reconnect if needed
      if (
        store.isRealtimeSyncEnabled &&
        store.realtimeSyncStatus === 'disconnected'
      ) {
        console.log('🔄 Window focused - reconnecting WebSocket...')
        store.enableRealtimeSync().catch(error => {
          console.warn('WebSocket reconnection failed:', error)
        })
      } else if (!store.isRealtimeSyncEnabled && !store.webSocketInitialized) {
        // Initialize WebSocket if not already done
        store.initializeWebSocketSync()
      }
    }
  })

  // Gracefully close WebSocket connection before unload
  window.addEventListener('beforeunload', () => {
    const store = useLogbookStore.getState()
    if (store.isRealtimeSyncEnabled) {
      // Gracefully disconnect WebSocket
      store.disableRealtimeSync()
      console.log('🔌 WebSocket disconnected before unload')
    }
  })

  // Initialize WebSocket sync when the store is initialized and user is authenticated
  if (localStorage.getItem('auth-token')) {
    setTimeout(() => {
      const store = useLogbookStore.getState()
      if (!store.isLocalMode) {
        store.initializeWebSocketSync()
      }
    }, 1000) // Delay to ensure store is fully initialized
  }
}
