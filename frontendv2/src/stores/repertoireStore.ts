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
import { normalizeRepertoireIds } from '@/utils/migrations/normalizeRepertoireIds'
import { useAuthStore } from './authStore'

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

  // Link practice session to goals
  linkPracticeToGoals: (entry: LogbookEntry) => Promise<void>
}

const REPERTOIRE_KEY = 'mirubato:repertoire:items'
const GOALS_KEY = 'mirubato:repertoire:goals'
const SCORE_METADATA_KEY = 'mirubato:repertoire:scoreMetadata'
const SORT_PREFERENCE_KEY = 'mirubato:repertoire:sortPreference'

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
      // Run migration to normalize existing repertoire IDs
      normalizeRepertoireIds()

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

      // Convert array to Map
      const repertoireMap = new Map<string, RepertoireItem>()
      items.forEach(item => {
        repertoireMap.set(item.scoreId, item)
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
            serverItems.forEach(item => {
              newRepertoireMap.set(item.scoreId, item)
            })
            set({
              repertoire: newRepertoireMap,
              isLocalMode: false,
            })

            // Update localStorage
            localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(serverItems))
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

      if (isLocalMode) {
        // Create locally
        const newItem: RepertoireItem = {
          id: nanoid(),
          scoreId,
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
        newRepertoire.set(scoreId, newItem)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

        showToast('Added to pieces', 'success')
      } else {
        // Use API
        const newItem = await repertoireApi.add({
          scoreId,
          status: status || 'planned',
        })
        set(state => {
          const newRepertoire = new Map(state.repertoire)
          newRepertoire.set(scoreId, newItem)
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
        (error as Error).message || 'Failed to add to repertoire',
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
      const { isLocalMode, repertoire } = get()
      const existing = repertoire.get(scoreId)
      if (!existing) throw new Error('Repertoire item not found')

      if (isLocalMode) {
        // Update locally
        const updatedItem = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        }
        const newRepertoire = new Map(repertoire)
        newRepertoire.set(scoreId, updatedItem)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      } else {
        // Use API
        await repertoireApi.update(scoreId, updates)

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
        (error as Error).message || 'Failed to update repertoire',
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

      if (isLocalMode) {
        // Remove locally
        const newRepertoire = new Map(repertoire)
        newRepertoire.delete(scoreId)
        set({ repertoire: newRepertoire })

        // Update localStorage
        const items = Array.from(newRepertoire.values())
        localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
      } else {
        // Use API
        await repertoireApi.remove(scoreId)
        set(state => {
          const newRepertoire = new Map(state.repertoire)
          newRepertoire.delete(scoreId)
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
        (error as Error).message || 'Failed to remove from repertoire',
        'error'
      )
      throw error
    }
  },

  // Get stats
  getRepertoireStats: async (scoreId: string) => {
    try {
      const { isLocalMode } = get()

      if (isLocalMode) {
        // Return local stats
        const item = get().repertoire.get(scoreId)
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
      showToast((error as Error).message || 'Failed to create goal', 'error')
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
      showToast((error as Error).message || 'Failed to update goal', 'error')
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
      showToast((error as Error).message || 'Failed to delete goal', 'error')
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
      showToast((error as Error).message || 'Failed to track progress', 'error')
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

    try {
      // Sync repertoire items
      const localRepertoireItems = Array.from(repertoire.values())
      if (localRepertoireItems.length > 0) {
        console.log(
          'Syncing',
          localRepertoireItems.length,
          'repertoire items to server'
        )

        for (const item of localRepertoireItems) {
          try {
            // Check if item exists on server first
            const serverItems = await repertoireApi.list()
            const exists = serverItems.items.some(
              serverItem => serverItem.scoreId === item.scoreId
            )

            if (!exists) {
              // Add to server
              await repertoireApi.add({
                scoreId: item.scoreId,
                status: item.status,
                difficultyRating: item.difficultyRating ?? undefined,
                personalNotes: item.personalNotes,
                referenceLinks: item.referenceLinks,
              })
            } else {
              // Update on server
              await repertoireApi.update(item.scoreId, {
                status: item.status,
                difficultyRating: item.difficultyRating ?? undefined,
                personalNotes: item.personalNotes,
                referenceLinks: item.referenceLinks,
              })
            }
          } catch (err) {
            console.warn('Failed to sync repertoire item:', item.scoreId, err)
          }
        }
      }

      // Sync goals
      const localGoals = Array.from(goals.values())
      if (localGoals.length > 0) {
        console.log('Syncing', localGoals.length, 'goals to server')

        for (const goal of localGoals) {
          try {
            // Create on server (goals don't have update endpoint in current implementation)
            await goalsApi.create({
              title: goal.title,
              description: goal.description,
              type: goal.type,
              targetValue: goal.targetValue,
              targetDate: goal.targetDate,
              scoreId: goal.scoreId,
              milestones: goal.milestones,
            })
          } catch (err) {
            console.warn('Failed to sync goal:', goal.title, err)
          }
        }
      }

      // After successful sync, reload from server
      await get().loadRepertoire()
      await get().loadGoals()

      set({ isLocalMode: false })
      // Don't show success toast - sync should be silent when successful
    } catch (error) {
      console.error('Error syncing repertoire data:', error)
      // Keep local mode if sync fails
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

    // Import the cleanup utility
    const { cleanupDuplicateRepertoire } = await import(
      '@/utils/cleanupDuplicateRepertoire'
    )

    const { cleaned, duplicates } = cleanupDuplicateRepertoire(repertoire)

    if (duplicates.length === 0) {
      showToast('No duplicate pieces found', 'info')
      return
    }

    // Update the repertoire
    set({ repertoire: cleaned })

    // Save to localStorage
    const items = Array.from(cleaned.values())
    localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

    // If not in local mode, update on server
    if (!isLocalMode) {
      try {
        // Delete duplicates from server
        for (const dup of duplicates) {
          for (const removed of dup.removed) {
            await repertoireApi.remove(removed.id)
          }
          // Update the kept item with the normalized scoreId
          // Note: totalPracticeTime, practiceCount, and lastPracticed are
          // calculated server-side from practice sessions, so we don't update them
        }
      } catch (error) {
        console.error('Error cleaning up duplicates on server:', error)
      }
    }

    const totalRemoved = duplicates.reduce(
      (sum, d) => sum + d.removed.length,
      0
    )
    showToast(`Cleaned up ${totalRemoved} duplicate pieces`, 'success')
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
}))
