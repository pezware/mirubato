import { create } from 'zustand'
import {
  repertoireApi,
  RepertoireStats,
  RepertoireItem,
} from '@/api/repertoire'
import { goalsApi, Goal, CreateGoalInput } from '@/api/goals'
import { logbookApi, LogbookEntry } from '@/api/logbook'
import { showToast } from '@/utils/toastManager'
import { nanoid } from 'nanoid'
import i18n from 'i18next'
import { normalizeRepertoireIds } from '@/utils/migrations/normalizeRepertoireIds'
import { isRepertoireNormalizationComplete } from '@/utils/migrations/scoreIdNormalization'
import { normalizeExistingScoreId } from '@/utils/scoreIdNormalizer'
import { useAuthStore } from './authStore'
import { getWebSocketSync, type SyncEvent } from '@/services/webSocketSync'
import { localEventBus } from '@/services/localEventBus'
import { getErrorMessage, parseJsonSafely } from '@/utils/typeGuards'

interface RepertoireStatus {
  planned: 'planned'
  learning: 'learning'
  polished: 'polished'
  dropped: 'dropped'
}

interface ScoreMetadata {
  id: string
  title: string
  composer: string
}

type RepertoireSortOption =
  | 'status-learning-first'
  | 'last-practiced'
  | 'most-practiced'
  | 'title-asc'
  | 'composer-asc'

interface RepertoireStore {
  // Repertoire state
  repertoire: Map<string, RepertoireItem>
  repertoireLoading: boolean
  repertoireError: string | null

  // Goals state
  goals: Map<string, Goal>
  goalsLoading: boolean
  goalsError: string | null

  // Score metadata cache
  scoreMetadataCache: Map<string, ScoreMetadata>

  // Local mode flag
  isLocalMode: boolean

  // WebSocket real-time sync state
  isRealtimeSyncEnabled: boolean
  realtimeSyncStatus:
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'reconnecting'
  realtimeSyncError: string | null

  // Filters
  statusFilter: 'all' | keyof RepertoireStatus
  goalFilter: 'all' | 'active' | 'completed' | 'no_goals'
  searchQuery: string

  // Sort
  sortBy: RepertoireSortOption

  // Actions
  loadRepertoire: () => Promise<void>
  loadGoals: () => Promise<void>
  addToRepertoire: (
    scoreId: string,
    status?: keyof RepertoireStatus
  ) => Promise<void>
  updateRepertoire: (
    scoreId: string,
    updates: Partial<RepertoireItem>
  ) => Promise<void>
  updateRepertoireStatus: (
    scoreId: string,
    status: RepertoireItem['status']
  ) => Promise<void>
  updateRepertoireNotes: (scoreId: string, notes: string) => Promise<void>
  removeFromRepertoire: (scoreId: string) => Promise<void>
  dissociatePieceFromRepertoire: (scoreId: string) => Promise<{
    preservedLogs: number
    pieceTitle: string
    pieceComposer: string
  }>
  getRepertoireStats: (scoreId: string) => Promise<RepertoireStats | null>

  // Goal actions
  createGoal: (goal: CreateGoalInput) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  trackGoalProgress: (
    id: string,
    value: number,
    notes?: string
  ) => Promise<void>

  // Filter actions
  setStatusFilter: (status: 'all' | keyof RepertoireStatus) => void
  setGoalFilter: (filter: 'all' | 'active' | 'completed' | 'no_goals') => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: RepertoireSortOption) => void

  // Helper functions
  getFilteredRepertoire: () => RepertoireItem[]
  getGoalsForScore: (scoreId: string) => Goal[]
  initializeGoalWithHistory: (
    scoreId: string,
    goalType: string
  ) => Promise<number>

  // Score metadata functions
  cacheScoreMetadata: (scoreId: string, metadata: ScoreMetadata) => void
  getScoreMetadata: (scoreId: string) => ScoreMetadata | undefined

  // Cleanup duplicates
  cleanupDuplicates: () => Promise<void>

  // Sync function
  syncLocalData: () => Promise<void>

  // WebSocket real-time sync methods
  enableRealtimeSync: () => Promise<boolean>
  disableRealtimeSync: () => void

  // WebSocket sync event handlers (internal)
  addPieceFromSync: (item: RepertoireItem) => void
  updatePieceFromSync: (item: RepertoireItem) => void
  removePieceFromSync: (scoreId: string) => void
  dissociatePieceFromSync: (scoreId: string) => void
  mergePiecesFromSync: (items: RepertoireItem[]) => void

  // Link practice session to goals
  linkPracticeToGoals: (entry: LogbookEntry) => Promise<void>
}

const REPERTOIRE_KEY = 'mirubato:repertoire:items'
const GOALS_KEY = 'mirubato:repertoire:goals'
const SCORE_METADATA_KEY = 'mirubato:repertoire:scoreMetadata'
const SORT_PREFERENCE_KEY = 'mirubato:repertoire:sortPreference'

// Sync debounce timer
let syncDebounceTimer: NodeJS.Timeout | null = null

// Helper for debouncing functions
function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): T & { cancel?: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
  return debounced
}

// Debounced localStorage write (for non-critical updates)
const debouncedLocalStorageWrite = debounce((key: string, value: string) => {
  localStorage.setItem(key, value)
}, 500)

// Immediate localStorage write (for critical operations)
const immediateLocalStorageWrite = (key: string, value: string) => {
  localStorage.setItem(key, value)
}

// Safe localStorage helpers for sync operations
const readRepertoireFromDisk = (): Map<string, RepertoireItem> => {
  try {
    const raw = localStorage.getItem(REPERTOIRE_KEY)
    if (!raw) return new Map()
    const items: RepertoireItem[] = JSON.parse(raw)
    // Normalize score IDs when reading from disk
    const repertoireMap = new Map<string, RepertoireItem>()
    items.forEach(item => {
      const normalizedId = normalizeExistingScoreId(item.scoreId)
      repertoireMap.set(normalizedId, { ...item, scoreId: normalizedId })
    })
    return repertoireMap
  } catch (error) {
    console.error('Failed to read repertoire from disk:', error)
    return new Map()
  }
}

const writeRepertoireMapToDisk = (
  map: Map<string, RepertoireItem>,
  immediate = false
): void => {
  const items = Array.from(map.values())
  const payload = JSON.stringify(items)
  if (immediate) {
    immediateLocalStorageWrite(REPERTOIRE_KEY, payload)
  } else {
    debouncedLocalStorageWrite(REPERTOIRE_KEY, payload)
  }
}

export const useRepertoireStore = create<RepertoireStore>((set, get) => ({
  // Initial state
  repertoire: new Map(),
  repertoireLoading: false,
  repertoireError: null,
  goals: new Map(),
  goalsLoading: false,
  goalsError: null,
  scoreMetadataCache: new Map(),
  isLocalMode: true, // Always start in local mode

  // WebSocket real-time sync state
  isRealtimeSyncEnabled: false,
  realtimeSyncStatus: 'disconnected',
  realtimeSyncError: null,

  statusFilter: 'all',
  goalFilter: 'all',
  searchQuery: '',
  sortBy:
    (localStorage.getItem(SORT_PREFERENCE_KEY) as RepertoireSortOption) ||
    'status-learning-first', // Default to showing learning pieces first

  // Load repertoire
  loadRepertoire: async () => {
    set({ repertoireLoading: true, repertoireError: null })

    try {
      // Run migration to normalize existing repertoire IDs (only if not already done)
      if (!isRepertoireNormalizationComplete()) {
        normalizeRepertoireIds()
        // The flag is set by the scoreIdNormalization migration
        // So we don't need to set it here
      }

      // Always load from localStorage first
      const stored = localStorage.getItem(REPERTOIRE_KEY)
      const items: RepertoireItem[] = stored ? JSON.parse(stored) : []

      // Load score metadata cache
      const storedMetadata = localStorage.getItem(SCORE_METADATA_KEY)
      const metadataArray: ScoreMetadata[] = storedMetadata
        ? JSON.parse(storedMetadata)
        : []
      const metadataMap = new Map<string, ScoreMetadata>()
      metadataArray.forEach(metadata => {
        metadataMap.set(metadata.id, metadata)
      })

      // Convert array to Map with normalized score IDs as keys
      const repertoireMap = new Map<string, RepertoireItem>()
      items.forEach(item => {
        const normalizedId = normalizeExistingScoreId(item.scoreId)
        // Keep the most recent item if duplicates exist with different capitalizations
        const existing = repertoireMap.get(normalizedId)
        if (!existing || item.updatedAt > existing.updatedAt) {
          // Update the item's scoreId to the normalized version
          repertoireMap.set(normalizedId, { ...item, scoreId: normalizedId })
        }
      })
      set({
        repertoire: repertoireMap,
        scoreMetadataCache: metadataMap,
        repertoireLoading: false,
        isLocalMode: true,
      })

      // If user is authenticated and online, sync in background
      const { isAuthenticated } = useAuthStore.getState()
      const token = localStorage.getItem('auth-token')
      if (token && isAuthenticated) {
        // Try to sync with server in background
        repertoireApi
          .list()
          .then(({ items: serverItems }) => {
            const newRepertoireMap = new Map<string, RepertoireItem>()

            // Build map using normalized scoreId as key, keeping only the most recent if duplicates exist
            serverItems.forEach(item => {
              const normalizedId = normalizeExistingScoreId(item.scoreId)
              const existing = newRepertoireMap.get(normalizedId)
              if (!existing || item.updatedAt > existing.updatedAt) {
                // Update the item's scoreId to the normalized version
                newRepertoireMap.set(normalizedId, {
                  ...item,
                  scoreId: normalizedId,
                })
              }
            })

            set({
              repertoire: newRepertoireMap,
              isLocalMode: false,
            })

            // Update localStorage with deduplicated items
            const deduplicatedItems = Array.from(newRepertoireMap.values())
            localStorage.setItem(
              REPERTOIRE_KEY,
              JSON.stringify(deduplicatedItems)
            )
          })
          .catch(err => {
            console.warn('Background repertoire sync failed:', err)
            // Keep using local data
          })
      }
    } catch (error) {
      console.error('Error loading repertoire:', error)
      set({
        repertoire: new Map(),
        repertoireError: 'Failed to load repertoire',
        repertoireLoading: false,
      })
    }
  },

  // Add to repertoire
  addToRepertoire: async (scoreId: string, status?: keyof RepertoireStatus) => {
    try {
      const { isLocalMode, repertoire } = get()
      const normalizedId = normalizeExistingScoreId(scoreId)

      if (isLocalMode) {
        // Create locally
        const newItem: RepertoireItem = {
          id: nanoid(),
          scoreId: normalizedId,
          status: status || 'planned',
          difficultyRating: undefined,
          personalNotes: undefined,
          referenceLinks: [],
          practiceCount: 0,
          totalPracticeTime: 0,
          lastPracticed: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const newRepertoire = new Map(repertoire)
        newRepertoire.set(normalizedId, newItem)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

        showToast('Added to pieces', 'success')
      } else {
        // Use API
        const newItem = await repertoireApi.add({
          scoreId: normalizedId,
          status: status || 'planned',
        })
        set(state => {
          const newRepertoire = new Map(state.repertoire)
          // Ensure we use normalized ID as the key and in the item
          newRepertoire.set(normalizedId, { ...newItem, scoreId: normalizedId })
          return { repertoire: newRepertoire }
        })

        // Update localStorage
        const items = Array.from(get().repertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

        showToast('Added to pieces', 'success')
      }
    } catch (error) {
      console.error('Error adding to repertoire:', error)
      showToast(
        getErrorMessage(error) || 'Failed to add to repertoire',
        'error'
      )
      throw error
    }
  },

  // Update repertoire
  updateRepertoire: async (
    scoreId: string,
    updates: Partial<RepertoireItem>
  ) => {
    try {
      const { isLocalMode, repertoire, scoreMetadataCache } = get()
      const normalizedId = normalizeExistingScoreId(scoreId)
      const existing = repertoire.get(normalizedId)
      if (!existing) throw new Error('Repertoire item not found')

      if (isLocalMode) {
        // Handle status change by creating a logbook entry
        if (
          updates.status !== undefined &&
          updates.status !== existing.status
        ) {
          // Get score metadata for the piece
          const metadata = scoreMetadataCache.get(normalizedId)

          // Import logbookStore dynamically to avoid circular dependency
          const { useLogbookStore } = await import('./logbookStore')
          const logbookStore = useLogbookStore.getState()

          // Create a logbook entry for the status change
          await logbookStore.createEntry({
            timestamp: new Date().toISOString(),
            duration: 1, // 1 minute
            type: 'status_change',
            scoreId: normalizedId,
            notes: `Status changed: ${existing.status} → ${updates.status}`,
            pieces: metadata
              ? [
                  {
                    title: metadata.title || normalizedId.split('-')[0],
                    composer: metadata.composer || normalizedId.split('-')[1],
                  },
                ]
              : [
                  {
                    title: normalizedId.split('-')[0],
                    composer: normalizedId.split('-')[1] || '',
                  },
                ],
            techniques: [],
            tags: [],
            mood: 'neutral',
            goalIds: [],
          })

          // No longer append status changes to personal notes
          // Status changes are now tracked as logbook entries
        }

        // Update locally
        const updatedItem = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }
        const newRepertoire = new Map(repertoire)
        newRepertoire.set(normalizedId, updatedItem)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      } else {
        // Handle status change by creating a logbook entry (API mode)
        if (
          updates.status !== undefined &&
          updates.status !== existing.status
        ) {
          // Get score metadata for the piece
          const metadata = scoreMetadataCache.get(scoreId)

          // Import logbookStore dynamically to avoid circular dependency
          const { useLogbookStore } = await import('./logbookStore')
          const logbookStore = useLogbookStore.getState()

          // Create a logbook entry for the status change
          await logbookStore.createEntry({
            timestamp: new Date().toISOString(),
            duration: 1, // 1 minute
            type: 'status_change',
            scoreId: scoreId,
            notes: `Status changed: ${existing.status} → ${updates.status}`,
            pieces: metadata
              ? [
                  {
                    title: metadata.title || scoreId.split('-')[0],
                    composer: metadata.composer || scoreId.split('-')[1],
                  },
                ]
              : [
                  {
                    title: scoreId.split('-')[0],
                    composer: scoreId.split('-')[1] || '',
                  },
                ],
            techniques: [],
            tags: [],
            mood: 'neutral',
            goalIds: [],
          })
        }

        // Use API - sanitize data to match API validation
        const sanitizedUpdates: Partial<RepertoireItem> = {
          ...updates,
          // Ensure personalNotes is undefined if empty
          personalNotes: updates.personalNotes || undefined,
          // Ensure referenceLinks is either undefined or an array of valid URLs
          referenceLinks:
            updates.referenceLinks?.filter(link => {
              try {
                // Validate that the link is a proper URL
                new URL(link)
                return true
              } catch {
                // Filter out invalid URLs
                console.warn(`Filtering out invalid URL during update: ${link}`)
                return false
              }
            }) || undefined,
        }
        await repertoireApi.update(scoreId, sanitizedUpdates)

        // Update local state with merged data
        const updatedItem = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }

        set(state => {
          const newRepertoire = new Map(state.repertoire)
          newRepertoire.set(scoreId, updatedItem)
          return { repertoire: newRepertoire }
        })

        // Update localStorage
        const items = Array.from(get().repertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      }
      showToast('Repertoire updated', 'success')
    } catch (error) {
      console.error('Error updating repertoire:', error)
      showToast(
        getErrorMessage(error) || 'Failed to update repertoire',
        'error'
      )
      throw error
    }
  },

  updateRepertoireStatus: async (
    scoreId: string,
    status: RepertoireItem['status']
  ) => {
    return get().updateRepertoire(scoreId, { status })
  },

  updateRepertoireNotes: async (scoreId: string, notes: string) => {
    return get().updateRepertoire(scoreId, { personalNotes: notes })
  },

  // Remove from repertoire
  removeFromRepertoire: async (scoreId: string) => {
    try {
      const { isLocalMode, repertoire } = get()
      const normalizedId = normalizeExistingScoreId(scoreId)

      if (isLocalMode) {
        // Remove locally
        const newRepertoire = new Map(repertoire)
        newRepertoire.delete(normalizedId)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      } else {
        // Use API with timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), 15000) // 15 second timeout
        })

        await Promise.race([repertoireApi.remove(normalizedId), timeoutPromise])

        // Remove from local state immediately for responsive UI
        set(state => {
          const newRepertoire = new Map(state.repertoire)
          newRepertoire.delete(normalizedId)
          return { repertoire: newRepertoire }
        })

        // Update localStorage
        const items = Array.from(get().repertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      }
      showToast('Removed from repertoire', 'success')
    } catch (error) {
      console.error('Error removing from repertoire:', error)
      showToast(
        getErrorMessage(error) || 'Failed to remove from repertoire',
        'error'
      )
      throw error
    }
  },

  // Dissociate piece from repertoire while preserving practice logs
  dissociatePieceFromRepertoire: async (scoreId: string) => {
    try {
      const { isLocalMode, repertoire, scoreMetadataCache } = get()
      const normalizedId = normalizeExistingScoreId(scoreId)
      const item = repertoire.get(normalizedId)

      if (!item) {
        throw new Error('Piece not found in repertoire')
      }

      // Get piece metadata for the response
      const metadata = scoreMetadataCache.get(normalizedId)
      let pieceTitle = 'Unknown Piece'
      let pieceComposer = ''

      if (metadata) {
        pieceTitle = metadata.title
        pieceComposer = metadata.composer || ''
      } else if (scoreId.includes('-')) {
        // Parse from normalized scoreId format
        const parts = scoreId.split('-')
        if (parts.length >= 2) {
          pieceTitle = parts[0]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          pieceComposer = parts
            .slice(1)
            .join('-')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
      }

      if (isLocalMode) {
        // For localStorage mode, we need to update logbook entries
        // We now use events to avoid circular dependency

        // Get current entries from localStorage directly to avoid importing logbookStore
        const storedEntries = localStorage.getItem('mirubato:logbook:entries')
        const entries = storedEntries
          ? parseJsonSafely<LogbookEntry[]>(storedEntries) || []
          : []

        // Count how many logs will be affected
        const entriesWithScore = entries.filter(
          entry => entry.scoreId === scoreId
        )

        // Update logbook entries to remove scoreId and embed piece data
        const entriesMap = new Map(entries.map(e => [e.id, e]))
        const updatedEntries = new Map(entriesMap)

        entriesWithScore.forEach(entry => {
          const updatedEntry = {
            ...entry,
            scoreId: undefined, // Remove scoreId reference
            scoreTitle: pieceTitle,
            scoreComposer: pieceComposer,
            pieces: entry.pieces?.length
              ? entry.pieces
              : [
                  {
                    title: pieceTitle,
                    composer: pieceComposer,
                  },
                ],
          }
          // Remove undefined scoreId property
          delete (updatedEntry as { [key: string]: unknown }).scoreId
          updatedEntries.set(entry.id, updatedEntry)
        })

        // Emit event for logbook store to handle its own state update
        // This maintains separation of concerns and avoids circular dependency
        localEventBus.emit('PIECE_DISSOCIATED', {
          scoreId,
          updatedEntries,
          pieceTitle,
          pieceComposer,
        })

        // Remove from repertoire locally
        const newRepertoire = new Map(repertoire)
        newRepertoire.delete(scoreId)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

        if (entriesWithScore.length > 0) {
          showToast(
            i18n.t('repertoire:dissociateSuccessWithLogs', {
              count: entriesWithScore.length,
            }),
            'success'
          )
        } else {
          showToast(i18n.t('repertoire:dissociateSuccess'), 'success')
        }

        return {
          preservedLogs: entriesWithScore.length,
          pieceTitle,
          pieceComposer,
        }
      } else {
        // Use API for authenticated users with timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), 15000) // 15 second timeout
        })

        const result = await Promise.race([
          repertoireApi.dissociate(scoreId),
          timeoutPromise,
        ])

        // Remove from local state immediately for responsive UI
        set(state => {
          const newRepertoire = new Map(state.repertoire)
          newRepertoire.delete(scoreId)
          return { repertoire: newRepertoire }
        })

        // Update localStorage
        const items = Array.from(get().repertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

        if (result.preservedLogs > 0) {
          showToast(
            i18n.t('repertoire:dissociateSuccessWithLogs', {
              count: result.preservedLogs,
            }),
            'success'
          )
        } else {
          showToast(i18n.t('repertoire:dissociateSuccess'), 'success')
        }
        return result
      }
    } catch (error) {
      console.error('Error dissociating piece from repertoire:', error)
      showToast(
        getErrorMessage(error) || 'Failed to dissociate piece from repertoire',
        'error'
      )
      throw error
    }
  },

  // Get stats
  getRepertoireStats: async (scoreId: string) => {
    try {
      const { isLocalMode } = get()
      const normalizedId = normalizeExistingScoreId(scoreId)

      if (isLocalMode) {
        // Return local stats
        const item = get().repertoire.get(normalizedId)
        if (!item) return null

        return {
          repertoire: item,
          stats: {
            practiceCount: item.practiceCount || 0,
            totalPracticeTime: item.totalPracticeTime || 0,
            avgSessionDuration:
              item.totalPracticeTime && item.practiceCount
                ? Math.round(item.totalPracticeTime / item.practiceCount)
                : 0,
            lastPracticed: item.lastPracticed,
            firstPracticed: undefined,
            recentSessions: [],
          },
        }
      } else {
        // Use API
        return await repertoireApi.getStats(scoreId)
      }
    } catch (error) {
      console.error('Error getting repertoire stats:', error)
      return null
    }
  },

  // Load goals
  loadGoals: async () => {
    set({ goalsLoading: true, goalsError: null })
    try {
      // Always load from localStorage first
      const stored = localStorage.getItem(GOALS_KEY)
      const goals: Goal[] = stored ? JSON.parse(stored) : []

      // Convert array to Map
      const goalsMap = new Map<string, Goal>()
      goals.forEach(goal => {
        goalsMap.set(goal.id, goal)
      })
      set({ goals: goalsMap, goalsLoading: false })

      // If user is authenticated, sync in background
      const { isAuthenticated } = useAuthStore.getState()
      const token = localStorage.getItem('auth-token')
      if (token && isAuthenticated) {
        goalsApi
          .list()
          .then(({ goals: serverGoals }) => {
            const newGoalsMap = new Map<string, Goal>()
            serverGoals.forEach(goal => {
              newGoalsMap.set(goal.id, goal)
            })
            set({ goals: newGoalsMap })

            // Update localStorage
            localStorage.setItem(GOALS_KEY, JSON.stringify(serverGoals))
          })
          .catch(err => {
            console.warn('Background goals sync failed:', err)
            // Keep using local data
          })
      }
    } catch (error) {
      console.error('Error loading goals:', error)
      set({
        goals: new Map(),
        goalsError: 'Failed to load goals',
        goalsLoading: false,
      })
    }
  },

  // Create goal
  createGoal: async (goalInput: CreateGoalInput) => {
    try {
      const { isLocalMode, goals, initializeGoalWithHistory } = get()

      // Calculate initial value from historical practice
      let initialValue = 0
      if (goalInput.scoreId && goalInput.type === 'practice_time') {
        initialValue = await initializeGoalWithHistory(
          goalInput.scoreId,
          goalInput.type
        )
      }

      if (isLocalMode) {
        // Create locally
        const newGoal: Goal = {
          ...goalInput,
          id: nanoid(),
          currentValue: initialValue,
          status: 'active',
          relatedSessions: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        const newGoals = new Map(goals)
        newGoals.set(newGoal.id, newGoal)
        set({ goals: newGoals })

        // Update localStorage
        const goalsArray = Array.from(newGoals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))

        showToast('Goal created', 'success')
      } else {
        // Use API
        const newGoal = await goalsApi.create(goalInput)
        set(state => {
          const newGoals = new Map(state.goals)
          newGoals.set(newGoal.id, newGoal)
          return { goals: newGoals }
        })

        // Update localStorage
        const goalsArray = Array.from(get().goals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))

        showToast('Goal created', 'success')
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      showToast(getErrorMessage(error) || 'Failed to create goal', 'error')
      throw error
    }
  },

  // Update goal
  updateGoal: async (id: string, updates: Partial<Goal>) => {
    try {
      const { isLocalMode, goals } = get()
      const existing = goals.get(id)
      if (!existing) throw new Error('Goal not found')

      if (isLocalMode) {
        // Update locally
        const updatedGoal = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }
        const newGoals = new Map(goals)
        newGoals.set(id, updatedGoal)
        set({ goals: newGoals })

        // Update localStorage
        const goalsArray = Array.from(newGoals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))
      } else {
        // Use API
        await goalsApi.update(id, updates)

        // Update local state with merged data
        const updatedGoal = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }

        set(state => {
          const newGoals = new Map(state.goals)
          newGoals.set(id, updatedGoal)
          return { goals: newGoals }
        })

        // Update localStorage
        const goalsArray = Array.from(get().goals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))
      }
      showToast('Goal updated', 'success')
    } catch (error) {
      console.error('Error updating goal:', error)
      showToast(getErrorMessage(error) || 'Failed to update goal', 'error')
      throw error
    }
  },

  // Delete goal
  deleteGoal: async (id: string) => {
    try {
      const { isLocalMode, goals } = get()

      if (isLocalMode) {
        // Delete locally
        const newGoals = new Map(goals)
        newGoals.delete(id)
        set({ goals: newGoals })

        // Update localStorage
        const goalsArray = Array.from(newGoals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))
      } else {
        // Use API
        await goalsApi.delete(id)
        set(state => {
          const newGoals = new Map(state.goals)
          newGoals.delete(id)
          return { goals: newGoals }
        })

        // Update localStorage
        const goalsArray = Array.from(get().goals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))
      }
      showToast('Goal deleted', 'success')
    } catch (error) {
      console.error('Error deleting goal:', error)
      showToast(getErrorMessage(error) || 'Failed to delete goal', 'error')
      throw error
    }
  },

  // Track progress
  trackGoalProgress: async (id: string, value: number, notes?: string) => {
    try {
      const { isLocalMode, goals } = get()
      const goal = goals.get(id)
      if (!goal) throw new Error('Goal not found')

      if (isLocalMode) {
        // Update locally
        const newValue = (goal.currentValue || 0) + value
        const completed = goal.targetValue && newValue >= goal.targetValue
        const updatedGoal = {
          ...goal,
          currentValue: newValue,
          relatedSessions: (goal.relatedSessions || 0) + 1,
          status: completed ? ('completed' as const) : goal.status,
          updatedAt: Date.now(),
        }
        const newGoals = new Map(goals)
        newGoals.set(id, updatedGoal)
        set({ goals: newGoals })

        // Update localStorage
        const goalsArray = Array.from(newGoals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))

        if (completed) {
          showToast('🎉 Goal completed!', 'success')
        } else {
          showToast('Progress tracked', 'success')
        }
      } else {
        // Use API
        const result = await goalsApi.trackProgress(id, { value, notes })
        set(state => {
          const newGoals = new Map(state.goals)
          const goal = newGoals.get(id)
          if (goal) {
            newGoals.set(id, {
              ...goal,
              currentValue: result.currentValue,
              status: result.status,
            })
          }
          return { goals: newGoals }
        })

        // Update localStorage
        const goalsArray = Array.from(get().goals.values())
        localStorage.setItem(GOALS_KEY, JSON.stringify(goalsArray))

        if (result.completed) {
          showToast('🎉 Goal completed!', 'success')
        } else {
          showToast('Progress tracked', 'success')
        }
      }
    } catch (error) {
      console.error('Error tracking progress:', error)
      showToast(getErrorMessage(error) || 'Failed to track progress', 'error')
      throw error
    }
  },

  // Sync local data to server
  syncLocalData: async () => {
    const { repertoire, goals, isLocalMode } = get()
    const { isAuthenticated } = useAuthStore.getState()
    const token = localStorage.getItem('auth-token')

    if (!token || !isAuthenticated || !isLocalMode) {
      return
    }

    // Debounce sync calls to prevent rapid successive syncs
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }

    return new Promise<void>((resolve, reject) => {
      syncDebounceTimer = setTimeout(async () => {
        try {
          await performSync()
          resolve()
        } catch (error) {
          reject(error)
        }
      }, 1000) // 1 second debounce
    })

    async function performSync() {
      try {
        // Sync repertoire items
        const localRepertoireItems = Array.from(repertoire.values())
        if (localRepertoireItems.length > 0) {
          console.log(
            'Syncing',
            localRepertoireItems.length,
            'repertoire items to server'
          )

          // Fetch server items only once to avoid N+1 query problem
          const serverItems = await repertoireApi.list()
          const serverScoreIds = new Set(
            serverItems.items.map(item => item.scoreId)
          )

          // Track sync results
          const syncResults = {
            added: 0,
            updated: 0,
            errors: 0,
          }

          for (const item of localRepertoireItems) {
            try {
              const exists = serverScoreIds.has(item.scoreId)

              if (!exists) {
                // Add to server - sanitize data to match API validation
                await repertoireApi.add({
                  scoreId: item.scoreId,
                  status: item.status,
                  difficultyRating: item.difficultyRating ?? undefined,
                  personalNotes: item.personalNotes || undefined,
                  // Ensure referenceLinks is either undefined or an array of valid URLs
                  referenceLinks:
                    item.referenceLinks?.filter(link => {
                      try {
                        // Validate that the link is a proper URL
                        new URL(link)
                        return true
                      } catch {
                        // Filter out invalid URLs
                        console.warn(`Filtering out invalid URL: ${link}`)
                        return false
                      }
                    }) || undefined,
                })
                syncResults.added++
              } else {
                // Update on server - sanitize data to match API validation
                await repertoireApi.update(item.scoreId, {
                  status: item.status,
                  difficultyRating: item.difficultyRating ?? undefined,
                  personalNotes: item.personalNotes || undefined,
                  // Ensure referenceLinks is either undefined or an array of valid URLs
                  referenceLinks:
                    item.referenceLinks?.filter(link => {
                      try {
                        // Validate that the link is a proper URL
                        new URL(link)
                        return true
                      } catch {
                        // Filter out invalid URLs
                        console.warn(`Filtering out invalid URL: ${link}`)
                        return false
                      }
                    }) || undefined,
                })
                syncResults.updated++
              }
            } catch (err) {
              console.warn('Failed to sync repertoire item:', item.scoreId, err)
              syncResults.errors++
            }
          }

          console.log('Repertoire sync completed:', syncResults)
        }

        // Sync goals
        const localGoals = Array.from(goals.values())
        if (localGoals.length > 0) {
          console.log('Syncing', localGoals.length, 'goals to server')

          // Fetch server goals to avoid duplicates
          const serverGoals = await goalsApi.list()
          const existingGoalTitles = new Set(
            serverGoals.goals.map(
              goal => `${goal.title}-${goal.scoreId || 'no-score'}`
            )
          )

          const goalSyncResults = {
            added: 0,
            skipped: 0,
            errors: 0,
          }

          for (const goal of localGoals) {
            try {
              // Create a unique key based on title and scoreId to check for duplicates
              const goalKey = `${goal.title}-${goal.scoreId || 'no-score'}`

              if (!existingGoalTitles.has(goalKey)) {
                await goalsApi.create({
                  title: goal.title,
                  description: goal.description,
                  type: goal.type,
                  targetValue: goal.targetValue,
                  targetDate: goal.targetDate,
                  scoreId: goal.scoreId,
                  milestones: goal.milestones,
                })
                goalSyncResults.added++
              } else {
                goalSyncResults.skipped++
              }
            } catch (err) {
              console.warn('Failed to sync goal:', goal.title, err)
              goalSyncResults.errors++
            }
          }

          console.log('Goals sync completed:', goalSyncResults)
        }

        // After successful sync, reload from server
        await get().loadRepertoire()
        await get().loadGoals()

        set({ isLocalMode: false })
        // Don't show success toast - sync should be silent when successful
      } catch (error) {
        console.error('Error syncing repertoire data:', error)
        // Keep local mode if sync fails
        throw error
      }
    }
  },

  // Filters
  setStatusFilter: status => set({ statusFilter: status }),
  setGoalFilter: filter => set({ goalFilter: filter }),
  setSearchQuery: query => set({ searchQuery: query }),
  setSortBy: sort => {
    localStorage.setItem(SORT_PREFERENCE_KEY, sort)
    set({ sortBy: sort })
  },

  // Get filtered repertoire
  getFilteredRepertoire: () => {
    const { repertoire, statusFilter, goalFilter, goals } = get()
    let items = Array.from(repertoire.values())

    // Filter by status
    if (statusFilter !== 'all') {
      items = items.filter(item => item.status === statusFilter)
    }

    // Filter by goals
    if (goalFilter !== 'all') {
      const scoreGoals = new Map<string, Goal[]>()
      goals.forEach(goal => {
        if (goal.scoreId) {
          const existing = scoreGoals.get(goal.scoreId) || []
          scoreGoals.set(goal.scoreId, [...existing, goal])
        }
      })

      if (goalFilter === 'no_goals') {
        items = items.filter(item => !scoreGoals.has(item.scoreId))
      } else {
        items = items.filter(item => {
          const itemGoals = scoreGoals.get(item.scoreId) || []
          if (goalFilter === 'active') {
            return itemGoals.some(g => g.status === 'active')
          } else if (goalFilter === 'completed') {
            return itemGoals.some(g => g.status === 'completed')
          }
          return false
        })
      }
    }

    // Don't sort here - sorting will be done in RepertoireView
    // where we have access to enriched data (scoreTitle, scoreComposer)
    return items
  },

  // Get goals for a specific score
  getGoalsForScore: (scoreId: string) => {
    const { goals } = get()
    return Array.from(goals.values()).filter(goal => goal.scoreId === scoreId)
  },

  // Initialize goal with historical practice data
  initializeGoalWithHistory: async (scoreId: string, goalType: string) => {
    if (goalType !== 'practice_time') return 0

    try {
      // Try to get practice history from logbook
      const allEntries = await logbookApi.getEntries()
      const entries = allEntries.filter(entry => entry.scoreId === scoreId)

      // Calculate total practice time
      const totalMinutes = entries.reduce(
        (sum: number, entry: LogbookEntry) => {
          return sum + (entry.duration || 0)
        },
        0
      )

      return totalMinutes
    } catch (error) {
      console.warn('Failed to load practice history for goal:', error)
      return 0
    }
  },

  // Cache score metadata
  cacheScoreMetadata: (scoreId: string, metadata: ScoreMetadata) => {
    const { scoreMetadataCache } = get()
    const newCache = new Map(scoreMetadataCache)
    newCache.set(scoreId, metadata)
    set({ scoreMetadataCache: newCache })

    // Save to localStorage
    const cacheArray = Array.from(newCache.values())
    localStorage.setItem(SCORE_METADATA_KEY, JSON.stringify(cacheArray))
  },

  // Get score metadata
  getScoreMetadata: (scoreId: string) => {
    const { scoreMetadataCache } = get()
    return scoreMetadataCache.get(scoreId)
  },

  // Cleanup duplicate repertoire entries
  cleanupDuplicates: async () => {
    const { repertoire, isLocalMode } = get()

    // Deduplication by normalized scoreId
    const seen = new Set<string>()
    const cleaned = new Map<string, RepertoireItem>()
    const duplicates: RepertoireItem[] = []

    // Keep the most recently updated version of each normalized scoreId
    const sortedItems = Array.from(repertoire.values()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    )

    for (const item of sortedItems) {
      const normalizedId = normalizeExistingScoreId(item.scoreId)

      if (!seen.has(normalizedId)) {
        seen.add(normalizedId)
        // Store with normalized ID as key and update the item's scoreId
        cleaned.set(normalizedId, { ...item, scoreId: normalizedId })
      } else {
        duplicates.push(item)
      }
    }

    if (duplicates.length === 0) {
      console.log('No duplicate repertoire pieces found')
      return
    }

    console.log(
      `Found ${duplicates.length} duplicate repertoire pieces, cleaning up...`
    )

    // Update the repertoire
    set({ repertoire: cleaned })

    // Save to localStorage
    const items = Array.from(cleaned.values())
    localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

    // If not in local mode, let the server handle deduplication through ON CONFLICT
    if (!isLocalMode) {
      console.log('Server will handle deduplication through ON CONFLICT clause')
    }

    console.log(`Cleaned up ${duplicates.length} duplicate pieces`)
  },

  // Link practice session to goals
  linkPracticeToGoals: async (entry: LogbookEntry) => {
    const { goals } = get()

    // Check if entry has a scoreId
    if (!entry.scoreId) return

    // Get goals for this score
    const scoreGoals = Array.from(goals.values()).filter(
      goal => goal.scoreId === entry.scoreId && goal.status === 'active'
    )

    // Update practice time goals
    for (const goal of scoreGoals) {
      if (goal.type === 'practice_time' && entry.duration) {
        try {
          await get().trackGoalProgress(
            goal.id,
            entry.duration,
            entry.notes || undefined
          )
        } catch (error) {
          console.warn('Failed to update goal progress:', error)
        }
      }
    }
  },

  // WebSocket real-time sync methods
  enableRealtimeSync: async () => {
    try {
      set({ realtimeSyncError: null, realtimeSyncStatus: 'connecting' })

      const webSocketSync = getWebSocketSync()

      // Set up event handlers for repertoire events
      webSocketSync.on('PIECE_ADDED', (event: SyncEvent) => {
        if (event.piece) {
          get().addPieceFromSync(event.piece as RepertoireItem)
        }
      })

      webSocketSync.on('PIECE_UPDATED', (event: SyncEvent) => {
        if (event.piece) {
          get().updatePieceFromSync(event.piece as RepertoireItem)
        }
      })

      webSocketSync.on('PIECE_REMOVED', (event: SyncEvent) => {
        if (event.scoreId) {
          get().removePieceFromSync(event.scoreId)
        }
      })

      webSocketSync.on('PIECE_DISSOCIATED', (event: SyncEvent) => {
        if (event.scoreId) {
          get().dissociatePieceFromSync(event.scoreId)
        }
      })

      webSocketSync.on('REPERTOIRE_BULK_SYNC', (event: SyncEvent) => {
        if (event.pieces) {
          get().mergePiecesFromSync(event.pieces as RepertoireItem[])
        }
      })

      // Connect with auth
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
      console.error('Failed to enable repertoire real-time sync:', error)
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

  // WebSocket sync event handlers (internal)
  addPieceFromSync: (item: RepertoireItem) => {
    const normalizedId = normalizeExistingScoreId(item.scoreId)

    // Start with in-memory map, but hydrate from disk if empty
    let newRepertoire = new Map(get().repertoire)
    if (newRepertoire.size === 0) {
      // Memory is empty, hydrate from disk to avoid losing data
      newRepertoire = readRepertoireFromDisk()
    }

    // Check if we already have this piece and if incoming is newer (LWW)
    const existingPiece = newRepertoire.get(normalizedId)
    if (existingPiece) {
      // Only update if incoming is newer
      if (
        new Date(item.updatedAt || 0).getTime() <=
        new Date(existingPiece.updatedAt || 0).getTime()
      ) {
        return // Local piece is newer, ignore
      }
    }

    // Add or update with normalized ID
    newRepertoire.set(normalizedId, { ...item, scoreId: normalizedId })
    set({ repertoire: newRepertoire })

    // Persist to localStorage by merging with existing disk data
    const diskMap = readRepertoireFromDisk()
    diskMap.set(normalizedId, { ...item, scoreId: normalizedId })
    writeRepertoireMapToDisk(diskMap, true) // Use immediate write for sync operations

    // Show toast notification if it's a new piece
    if (!existingPiece) {
      console.log(
        '✨ New repertoire piece synced from another device:',
        item.scoreId
      )
    }
  },

  updatePieceFromSync: (item: RepertoireItem) => {
    const normalizedId = normalizeExistingScoreId(item.scoreId)

    // Start with in-memory map, but hydrate from disk if empty
    let newRepertoire = new Map(get().repertoire)
    if (newRepertoire.size === 0) {
      // Memory is empty, hydrate from disk to avoid losing data
      newRepertoire = readRepertoireFromDisk()
    }

    // Only update if the incoming piece is newer (LWW)
    const existingPiece = newRepertoire.get(normalizedId)
    if (
      existingPiece &&
      new Date(item.updatedAt || 0).getTime() <=
        new Date(existingPiece.updatedAt || 0).getTime()
    ) {
      return // Local piece is newer, ignore
    }

    // Update with normalized ID, preserving local fields if needed
    const updatedPiece = existingPiece
      ? { ...existingPiece, ...item, scoreId: normalizedId }
      : { ...item, scoreId: normalizedId }

    newRepertoire.set(normalizedId, updatedPiece)
    set({ repertoire: newRepertoire })

    // Persist to localStorage by merging with existing disk data
    const diskMap = readRepertoireFromDisk()
    diskMap.set(normalizedId, updatedPiece)
    writeRepertoireMapToDisk(diskMap, true) // Use immediate write for sync operations

    console.log(
      '📝 Repertoire piece updated from another device:',
      item.scoreId
    )
  },

  removePieceFromSync: (scoreId: string) => {
    const normalizedId = normalizeExistingScoreId(scoreId)

    // Start with in-memory map, but hydrate from disk if empty
    let newRepertoire = new Map(get().repertoire)
    if (newRepertoire.size === 0) {
      // Memory is empty, hydrate from disk to avoid losing data
      newRepertoire = readRepertoireFromDisk()
    }

    const removedPiece = newRepertoire.get(normalizedId)

    if (removedPiece) {
      // Update UI state
      newRepertoire.delete(normalizedId)
      set({ repertoire: newRepertoire })

      // Persist to localStorage by merging with existing disk data
      const diskMap = readRepertoireFromDisk()
      diskMap.delete(normalizedId)
      writeRepertoireMapToDisk(diskMap, true) // Use immediate write for delete

      console.log(
        '🗑️ Repertoire piece removed from another device:',
        removedPiece.scoreId
      )
    }
  },

  dissociatePieceFromSync: (scoreId: string) => {
    // Same as remove for sync purposes - piece is no longer in repertoire
    const normalizedId = normalizeExistingScoreId(scoreId)
    get().removePieceFromSync(normalizedId)
  },

  mergePiecesFromSync: (items: RepertoireItem[]) => {
    // Start with existing repertoire, hydrate from disk if empty
    let newRepertoire = new Map(get().repertoire)
    if (newRepertoire.size === 0) {
      // Memory is empty, hydrate from disk to avoid losing data
      newRepertoire = readRepertoireFromDisk()
    }

    let changesCount = 0

    // Merge incoming items with LWW conflict resolution
    for (const item of items) {
      const normalizedId = normalizeExistingScoreId(item.scoreId)
      const existingPiece = newRepertoire.get(normalizedId)

      // Add new pieces or update if incoming is newer
      if (
        !existingPiece ||
        new Date(item.updatedAt || 0).getTime() >
          new Date(existingPiece.updatedAt || 0).getTime()
      ) {
        newRepertoire.set(normalizedId, { ...item, scoreId: normalizedId })
        changesCount++
      }
    }

    // Update UI state if there were changes
    if (changesCount > 0) {
      set({ repertoire: newRepertoire })

      // Persist to localStorage by merging with existing disk data
      const diskMap = readRepertoireFromDisk()
      for (const item of items) {
        const normalizedId = normalizeExistingScoreId(item.scoreId)
        const existingPiece = diskMap.get(normalizedId)
        // Apply Last-Write-Wins to disk data too
        if (
          !existingPiece ||
          new Date(item.updatedAt || 0).getTime() >
            new Date(existingPiece.updatedAt || 0).getTime()
        ) {
          diskMap.set(normalizedId, { ...item, scoreId: normalizedId })
        }
      }
      writeRepertoireMapToDisk(diskMap, true) // Use immediate write for bulk sync

      console.log(`📊 Merged ${changesCount} repertoire pieces from sync`)
    }
  },
}))

// Register event handler for practice creation
// This handles goal linking when a new practice entry is created
// Skip registration only in test environment
const isTestEnvironment =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
if (!isTestEnvironment) {
  localEventBus.on('PRACTICE_CREATED', async ({ entry }) => {
    // Call the existing linkPracticeToGoals method
    await useRepertoireStore.getState().linkPracticeToGoals(entry)
  })
}
