import { create } from 'zustand'
import { logbookApi, type LogbookEntry, type Goal } from '../api/logbook'
import { nanoid } from 'nanoid'
import { syncMutex } from '../utils/syncMutex'
import {
  removeDuplicates,
  getDuplicateReport,
  type DuplicateEntry,
} from '../utils/duplicateCleanup'

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
  syncWithServer: () => Promise<void>

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

      // If user is authenticated, sync in background
      const token = localStorage.getItem('auth-token')
      const { useAuthStore } = await import('./authStore')
      const isAuthenticated = useAuthStore.getState().isAuthenticated

      if (token && isAuthenticated) {
        // Perform full sync with server
        get()
          .syncWithServer()
          .catch(err => {
            console.warn('Background sync failed:', err)
            // Keep using local data
          })
      }
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
    // Use mutex to prevent concurrent entry creation
    return syncMutex.runExclusive(async () => {
      console.log('[LogbookStore] createEntry: Starting entry creation', {
        entryData,
      })
      set({ error: null })

      try {
        console.log('[LogbookStore] createEntry: Creating local entry object')
        // Always create locally first
        const entry: LogbookEntry = {
          ...entryData,
          id: nanoid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        console.log('[LogbookStore] createEntry: Local entry object created', {
          entryId: entry.id,
        })

        // Cache score metadata if present
        console.log('[LogbookStore] createEntry: Processing score metadata')
        let updatedScoreMetadata = get().scoreMetadata
        if (entry.scoreId && entry.scoreTitle) {
          console.log('[LogbookStore] createEntry: Caching score metadata', {
            scoreId: entry.scoreId,
          })
          updatedScoreMetadata = {
            ...updatedScoreMetadata,
            [entry.scoreId]: {
              title: entry.scoreTitle,
              composer: entry.scoreComposer,
            },
          }
          try {
            immediateLocalStorageWrite(
              SCORE_METADATA_KEY,
              JSON.stringify(updatedScoreMetadata)
            )
            console.log(
              '[LogbookStore] createEntry: Score metadata cached successfully'
            )
          } catch (metadataError) {
            console.error(
              '[LogbookStore] createEntry: Failed to cache score metadata',
              metadataError
            )
            // Continue - don't fail the entire operation for metadata caching
          }
        }

        console.log('[LogbookStore] createEntry: Adding entry to local store')
        // O(1) insertion
        const newEntriesMap = new Map(get().entriesMap)
        newEntriesMap.set(entry.id, entry)
        console.log(
          '[LogbookStore] createEntry: Entry added to map, updating store state'
        )
        console.log(
          '[LogbookStore] createEntry: newEntriesMap size before set:',
          newEntriesMap.size
        )
        console.log(
          '[LogbookStore] createEntry: newEntriesMap contents:',
          Array.from(newEntriesMap.keys())
        )

        set({
          entriesMap: newEntriesMap,
          entries: sortEntriesByTimestamp(Array.from(newEntriesMap.values())),
          scoreMetadata: updatedScoreMetadata,
        })

        // Verify the store was actually updated
        const verifyState = get()
        console.log(
          '[LogbookStore] createEntry: Store state after set - entriesMap size:',
          verifyState.entriesMap.size
        )
        console.log(
          '[LogbookStore] createEntry: Store state after set - entries length:',
          verifyState.entries.length
        )
        console.log(
          '[LogbookStore] createEntry: Store state after set - entry keys:',
          Array.from(verifyState.entriesMap.keys())
        )
        console.log(
          '[LogbookStore] createEntry: Store state updated successfully'
        )

        // Immediate write to localStorage for new entries
        console.log('[LogbookStore] createEntry: Writing to localStorage')
        try {
          immediateLocalStorageWrite(
            ENTRIES_KEY,
            JSON.stringify(Array.from(newEntriesMap.values()))
          )
          console.log(
            '[LogbookStore] createEntry: localStorage write successful'
          )
        } catch (storageError) {
          console.error(
            '[LogbookStore] createEntry: localStorage write failed',
            storageError
          )
          // Re-throw storage errors as they're critical for local-first operation
          throw storageError
        }

        // Link to goals after creating entry (with defensive error handling)
        console.log('[LogbookStore] createEntry: Linking practice to goals')
        try {
          const { useRepertoireStore } = await import('./repertoireStore')
          await useRepertoireStore.getState().linkPracticeToGoals(entry)
          console.log(
            '[LogbookStore] createEntry: Goal linking completed successfully'
          )
        } catch (error) {
          console.warn(
            '[LogbookStore] createEntry: Failed to link practice to goals:',
            error
          )
          // Don't fail the entire entry creation if goal linking fails
        }

        console.log(
          '[LogbookStore] createEntry: Local entry creation completed successfully'
        )

        // Background server sync (don't let sync failures break local entry creation)
        const token = localStorage.getItem('auth-token')
        console.log(
          '[LogbookStore] createEntry: Checking for background server sync',
          { hasToken: !!token }
        )

        if (token) {
          // Perform server sync in background with timeout protection
          console.log(
            '[LogbookStore] createEntry: Starting background server sync'
          )
          Promise.resolve().then(async () => {
            // Add timeout protection for background sync
            const syncTimeout = new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error('Background sync timeout')),
                15000
              ) // 15 second timeout
            })

            try {
              const { useAuthStore } = await import('./authStore')
              const isAuthenticated = useAuthStore.getState().isAuthenticated
              console.log(
                '[LogbookStore] createEntry: Auth check for background sync',
                { isAuthenticated }
              )

              if (isAuthenticated) {
                console.log(
                  '[LogbookStore] createEntry: Syncing new entry to server in background...'
                )
                // Race the sync operation against timeout
                const serverEntry = (await Promise.race([
                  logbookApi.createEntry(entryData),
                  syncTimeout,
                ])) as LogbookEntry
                console.log(
                  '[LogbookStore] createEntry: Entry synced to server successfully'
                )

                // Update the entry with server ID if different
                if (serverEntry.id !== entry.id) {
                  const currentState = get()
                  const updatedEntriesMap = new Map(currentState.entriesMap)

                  // Only update if the local entry still exists (not deleted by user)
                  if (updatedEntriesMap.has(entry.id)) {
                    updatedEntriesMap.delete(entry.id)
                    updatedEntriesMap.set(serverEntry.id, serverEntry)
                    set({
                      entriesMap: updatedEntriesMap,
                      entries: sortEntriesByTimestamp(
                        Array.from(updatedEntriesMap.values())
                      ),
                    })

                    debouncedLocalStorageWrite(
                      ENTRIES_KEY,
                      JSON.stringify(Array.from(updatedEntriesMap.values()))
                    )
                  }
                }
              }
            } catch (syncError) {
              console.warn(
                '[LogbookStore] createEntry: Background server sync failed for new entry:',
                syncError
              )
              // Set a non-blocking error state that doesn't break the UI
              const currentState = get()
              if (!currentState.error) {
                set({
                  error:
                    'Entry saved locally. Will sync when connection is restored.',
                })
                // Clear the error after 5 seconds
                setTimeout(() => {
                  const state = get()
                  if (
                    state.error ===
                    'Entry saved locally. Will sync when connection is restored.'
                  ) {
                    set({ error: null })
                  }
                }, 5000)
              }
            }
          })
        } else {
          console.log(
            '[LogbookStore] createEntry: No background sync (no token or not authenticated)'
          )
        }

        console.log(
          '[LogbookStore] createEntry: Entry creation process completed successfully'
        )
        // Explicitly return nothing - the local operation is complete
        return
      } catch (error: unknown) {
        console.error(
          '[LogbookStore] createEntry: Entry creation failed with error:',
          error
        )
        set({ error: 'Failed to create entry' })
        throw error
      }
    }, 'createEntry')
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

  syncWithServer: async () => {
    // Use mutex to prevent concurrent sync operations
    return syncMutex.runExclusive(async () => {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        set({ error: 'Please sign in to sync with server' })
        return
      }

      set({ isLoading: true, error: null })

      try {
        // Get local entries
        const localEntries = Array.from(get().entriesMap.values())

        // Pull from server
        const serverEntries = await logbookApi.getEntries()

        // Create maps for deduplication
        const serverEntriesMap = new Map(
          serverEntries.map(entry => [entry.id, entry])
        )

        // Create a map to track entries by content signature for deduplication
        const contentSignatureMap = new Map<string, LogbookEntry>()

        // Helper to create a content signature for deduplication
        const createContentSignature = (entry: LogbookEntry): string => {
          // Create a signature based on key content fields (excluding timestamp to allow deduplication)
          const pieces = entry.pieces
            .map(p => `${p.title}-${p.composer}`)
            .sort()
            .join('|')
          // Use a time window approach - entries within 5 minutes are considered potentially duplicate
          const timeWindow = Math.floor(
            new Date(entry.timestamp).getTime() / (5 * 60 * 1000)
          )
          return `${timeWindow}-${entry.duration}-${entry.type}-${entry.instrument}-${pieces}`
        }

        // Add server entries to content map
        serverEntries.forEach(entry => {
          const signature = createContentSignature(entry)
          contentSignatureMap.set(signature, entry)
        })

        // Find truly unique local entries (not duplicates by content)
        const uniqueLocalEntries: LogbookEntry[] = []
        const duplicateLocalEntries: LogbookEntry[] = []

        localEntries.forEach(localEntry => {
          // Skip if already on server by ID
          if (serverEntriesMap.has(localEntry.id)) {
            return
          }

          // Check if this is a duplicate by content
          const signature = createContentSignature(localEntry)
          if (contentSignatureMap.has(signature)) {
            duplicateLocalEntries.push(localEntry)
          } else {
            uniqueLocalEntries.push(localEntry)
            // Add to content map to catch duplicates within local entries
            contentSignatureMap.set(signature, localEntry)
          }
        })

        console.log(
          `Found ${uniqueLocalEntries.length} unique local entries, ${duplicateLocalEntries.length} duplicates`
        )

        // Start with server entries
        const mergedEntriesMap = new Map(serverEntriesMap)

        if (uniqueLocalEntries.length > 0) {
          console.log(
            `Pushing ${uniqueLocalEntries.length} unique local entries to server`
          )

          try {
            // Push only unique local entries to server
            const { syncApi } = await import('../api/sync')
            await syncApi.push({
              changes: {
                entries: uniqueLocalEntries,
                goals: [], // TODO: Sync goals too
              },
            })

            // After successful push, add unique entries to merged map
            uniqueLocalEntries.forEach(entry => {
              mergedEntriesMap.set(entry.id, entry)
            })
          } catch (pushError) {
            console.error('Failed to push local entries:', pushError)
            // Still merge unique local entries even if push fails
            uniqueLocalEntries.forEach(entry => {
              mergedEntriesMap.set(entry.id, entry)
            })
          }
        }

        // Update state with merged entries
        set({
          entriesMap: mergedEntriesMap,
          entries: sortEntriesByTimestamp(
            Array.from(mergedEntriesMap.values())
          ),
          isLoading: false,
          isLocalMode: false,
        })

        // Update local storage with merged data
        debouncedLocalStorageWrite(
          ENTRIES_KEY,
          JSON.stringify(Array.from(mergedEntriesMap.values()))
        )
      } catch (error: unknown) {
        set({
          error: 'Failed to sync with server. Continuing with local data.',
          isLoading: false,
        })
        console.error('Sync failed:', error)
      }
    }, 'syncWithServer')
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
    return syncMutex.runExclusive(async () => {
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

      console.log(
        `[LogbookStore] Removed ${duplicatesRemoved} duplicate entries`
      )
      console.log(`[LogbookStore] Kept ${cleanedEntries.length} unique entries`)

      return { duplicatesRemoved, report }
    }, 'cleanupDuplicates')
  },

  getDuplicateReport: () => {
    const currentEntries = Array.from(get().entriesMap.values())
    return getDuplicateReport(currentEntries)
  },
}))
