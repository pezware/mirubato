import { create } from 'zustand'
import { logbookApi, type LogbookEntry, type Goal } from '../api/logbook'
import { nanoid } from 'nanoid'
import {
  removeDuplicates,
  getDuplicateReport,
  type DuplicateEntry,
} from '../utils/duplicateCleanup'
import { getWebSocketSync, type SyncEvent } from '../services/webSocketSync'

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

  // Simple sync state
  isSyncing: boolean
  lastSyncTime: Date | null
  syncError: string | null

  // WebSocket real-time sync state
  isRealtimeSyncEnabled: boolean
  realtimeSyncStatus:
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'reconnecting'
  realtimeSyncError: string | null

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

  // Actions - Sync
  manualSync: () => Promise<{ success: boolean; error?: string }>
  clearSyncError: () => void

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

// Helper specifically for sorting logbook entries by practice time
const sortEntriesByTimestamp = (entries: LogbookEntry[]): LogbookEntry[] => {
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export const useLogbookStore = create<LogbookState>((set, get) => ({
  entriesMap: new Map(),
  goalsMap: new Map(),
  scoreMetadata: {},
  isLoading: false,
  error: null,
  searchQuery: '',
  isLocalMode: true, // Always start in local mode

  // Simple sync state
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,

  // Real-time sync state
  isRealtimeSyncEnabled: false,
  realtimeSyncStatus: 'disconnected',
  realtimeSyncError: null,

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

      // Link to goals after creating entry
      const { useRepertoireStore } = await import('./repertoireStore')
      await useRepertoireStore.getState().linkPracticeToGoals(entry)

      // Send real-time sync event if enabled
      if (get().isRealtimeSyncEnabled) {
        const webSocketSync = getWebSocketSync()
        webSocketSync.send({
          type: 'ENTRY_CREATED',
          entry,
          timestamp: new Date().toISOString(),
        })
      }

      // Entry saved locally - user can sync manually later
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
            entry: updatedEntry,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        // Update via API
        const updated = await logbookApi.updateEntry(id, updates)

        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.set(id, updated)
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
            entry: updated,
            timestamp: new Date().toISOString(),
          })
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
        // Delete via API
        await logbookApi.deleteEntry(id)

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

        // Send real-time sync event if enabled
        if (get().isRealtimeSyncEnabled) {
          const webSocketSync = getWebSocketSync()
          webSocketSync.send({
            type: 'ENTRY_DELETED',
            entryId: id,
            timestamp: new Date().toISOString(),
          })
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

  manualSync: async () => {
    const token = localStorage.getItem('auth-token')
    if (!token) {
      set({ syncError: 'Please sign in to sync with server' })
      return { success: false, error: 'Please sign in to sync with server' }
    }

    set({ isSyncing: true, syncError: null })

    try {
      // Simple sync: pull from server and merge with local data
      const serverEntries = await logbookApi.getEntries()
      const localEntries = Array.from(get().entriesMap.values())

      // Simple merge strategy: prefer server data, keep local entries not on server
      const serverEntriesMap = new Map(
        serverEntries.map(entry => [entry.id, entry])
      )

      // Find local entries not on server (need to push)
      const localOnlyEntries = localEntries.filter(
        entry => !serverEntriesMap.has(entry.id)
      )

      // Push local entries to server if any
      if (localOnlyEntries.length > 0) {
        const { syncApi } = await import('../api/sync')
        await syncApi.push({
          changes: {
            entries: localOnlyEntries,
            goals: [], // TODO: Add goals sync
          },
        })
      }

      // Merge: server entries + local-only entries
      const mergedEntries = [...serverEntries, ...localOnlyEntries]
      const mergedEntriesMap = new Map(
        mergedEntries.map(entry => [entry.id, entry])
      )

      // Update state
      set({
        entriesMap: mergedEntriesMap,
        entries: sortEntriesByTimestamp(mergedEntries),
        isSyncing: false,
        lastSyncTime: new Date(),
        isLocalMode: false,
      })

      // Update local storage
      debouncedLocalStorageWrite(ENTRIES_KEY, JSON.stringify(mergedEntries))

      return { success: true }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sync failed'
      set({
        isSyncing: false,
        syncError: errorMessage,
      })
      console.error('Manual sync failed:', error)
      return { success: false, error: errorMessage }
    }
  },

  clearSyncError: () => set({ syncError: null }),

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
}))
