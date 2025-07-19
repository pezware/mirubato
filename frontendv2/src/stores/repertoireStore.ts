import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  repertoireApi,
  type RepertoireItem,
  type RepertoireStatus,
  type RepertoireStats,
} from '@/api/repertoire'
import { goalsApi, type Goal, type CreateGoalInput } from '@/api/goals'
import { useAuthStore } from './authStore'
import { showToast } from '@/utils/toastManager'
import { nanoid } from 'nanoid'

// Local storage keys
const REPERTOIRE_KEY = 'mirubato:repertoire:items'
const GOALS_KEY = 'mirubato:repertoire:goals'

interface RepertoireStore {
  // Repertoire state
  repertoire: Map<string, RepertoireItem>
  repertoireLoading: boolean
  repertoireError: string | null

  // Goals state
  goals: Map<string, Goal>
  goalsLoading: boolean
  goalsError: string | null

  // Local Storage Management (for anonymous users)
  isLocalMode: boolean

  // Filters
  statusFilter: keyof RepertoireStatus | 'all'
  goalFilter: 'all' | 'active' | 'completed' | 'no-goals'
  searchQuery: string

  // Actions - Repertoire
  loadRepertoire: () => Promise<void>
  addToRepertoire: (
    scoreId: string,
    status?: keyof RepertoireStatus
  ) => Promise<void>
  updateRepertoireStatus: (
    scoreId: string,
    status: keyof RepertoireStatus
  ) => Promise<void>
  updateRepertoireNotes: (
    scoreId: string,
    notes: string,
    links?: string[]
  ) => Promise<void>
  removeFromRepertoire: (scoreId: string) => Promise<void>
  getRepertoireStats: (scoreId: string) => Promise<RepertoireStats | null>

  // Actions - Goals
  loadGoals: () => Promise<void>
  createGoal: (goal: CreateGoalInput) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  trackGoalProgress: (
    id: string,
    value: number,
    notes?: string
  ) => Promise<void>

  // Actions - Filters
  setStatusFilter: (status: keyof RepertoireStatus | 'all') => void
  setGoalFilter: (filter: 'all' | 'active' | 'completed' | 'no-goals') => void
  setSearchQuery: (query: string) => void

  // Computed
  getFilteredRepertoire: () => RepertoireItem[]
  getGoalsByScore: (scoreId: string) => Goal[]
  getActiveGoalsByScore: (scoreId: string) => Goal[]
}

export const useRepertoireStore = create<RepertoireStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      repertoire: new Map(),
      repertoireLoading: false,
      repertoireError: null,
      goals: new Map(),
      goalsLoading: false,
      goalsError: null,
      isLocalMode: true, // Always start in local mode
      statusFilter: 'all',
      goalFilter: 'all',
      searchQuery: '',

      // Load repertoire
      loadRepertoire: async () => {
        set({ repertoireLoading: true, repertoireError: null })

        try {
          // Always load from localStorage first
          const stored = localStorage.getItem(REPERTOIRE_KEY)
          const items: RepertoireItem[] = stored ? JSON.parse(stored) : []

          // Convert array to Map
          const repertoireMap = new Map<string, RepertoireItem>()
          items.forEach(item => {
            repertoireMap.set(item.scoreId, item)
          })
          set({
            repertoire: repertoireMap,
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
                localStorage.setItem(
                  REPERTOIRE_KEY,
                  JSON.stringify(serverItems)
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
      addToRepertoire: async (
        scoreId: string,
        status?: keyof RepertoireStatus
      ) => {
        try {
          const { isLocalMode, repertoire } = get()

          if (isLocalMode) {
            // Create locally
            const newItem: RepertoireItem = {
              id: nanoid(),
              scoreId,
              status: status || 'planned',
              difficultyRating: null,
              personalNotes: null,
              referenceLinks: [],
              practiceCount: 0,
              totalPracticeTime: 0,
              lastPracticed: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }

            const newRepertoire = new Map(repertoire)
            newRepertoire.set(scoreId, newItem)
            set({ repertoire: newRepertoire })

            // Update localStorage
            const items = Array.from(newRepertoire.values())
            localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

            showToast('Added to repertoire', 'success')
          } else {
            // Use API
            const newItem = await repertoireApi.add({ scoreId, status })
            set(state => {
              const newRepertoire = new Map(state.repertoire)
              newRepertoire.set(scoreId, newItem)
              return { repertoire: newRepertoire }
            })

            // Update localStorage for offline access
            const items = Array.from(get().repertoire.values())
            localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))

            showToast('Added to repertoire', 'success')
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

      // Update status
      updateRepertoireStatus: async (
        scoreId: string,
        status: keyof RepertoireStatus
      ) => {
        try {
          const { isLocalMode, repertoire } = get()
          const item = repertoire.get(scoreId)
          if (!item) throw new Error('Item not found')

          if (isLocalMode) {
            // Update locally
            const updatedItem = { ...item, status, updatedAt: Date.now() }
            const newRepertoire = new Map(repertoire)
            newRepertoire.set(scoreId, updatedItem)
            set({ repertoire: newRepertoire })

            // Update localStorage
            const items = Array.from(newRepertoire.values())
            localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
          } else {
            // Use API
            await repertoireApi.update(scoreId, { status })
            set(state => {
              const newRepertoire = new Map(state.repertoire)
              const item = newRepertoire.get(scoreId)
              if (item) {
                newRepertoire.set(scoreId, { ...item, status })
              }
              return { repertoire: newRepertoire }
            })

            // Update localStorage
            const items = Array.from(get().repertoire.values())
            localStorage.setItem(REPERTOIRE_KEY, JSON.stringify(items))
          }
          showToast('Status updated', 'success')
        } catch (error) {
          console.error('Error updating status:', error)
          showToast(
            (error as Error).message || 'Failed to update status',
            'error'
          )
          throw error
        }
      },

      // Update notes
      updateRepertoireNotes: async (
        scoreId: string,
        notes: string,
        links?: string[]
      ) => {
        try {
          await repertoireApi.update(scoreId, {
            personalNotes: notes,
            referenceLinks: links,
          })
          set(state => {
            const newRepertoire = new Map(state.repertoire)
            const item = newRepertoire.get(scoreId)
            if (item) {
              newRepertoire.set(scoreId, {
                ...item,
                personalNotes: notes,
                referenceLinks: links,
              })
            }
            return { repertoire: newRepertoire }
          })
          showToast('Notes updated', 'success')
        } catch (error) {
          console.error('Error updating notes:', error)
          showToast(
            (error as Error).message || 'Failed to update notes',
            'error'
          )
          throw error
        }
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
                firstPracticed: null,
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
          const { isLocalMode, goals } = get()

          if (isLocalMode) {
            // Create locally
            const newGoal: Goal = {
              ...goalInput,
              id: nanoid(),
              currentValue: 0,
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
          showToast(
            (error as Error).message || 'Failed to create goal',
            'error'
          )
          throw error
        }
      },

      // Update goal
      updateGoal: async (id: string, updates: Partial<Goal>) => {
        try {
          await goalsApi.update(id, updates)
          set(state => {
            const newGoals = new Map(state.goals)
            const goal = newGoals.get(id)
            if (goal) {
              newGoals.set(id, { ...goal, ...updates })
            }
            return { goals: newGoals }
          })
          showToast('Goal updated', 'success')
        } catch (error) {
          console.error('Error updating goal:', error)
          showToast(
            (error as Error).message || 'Failed to update goal',
            'error'
          )
          throw error
        }
      },

      // Delete goal
      deleteGoal: async (id: string) => {
        try {
          await goalsApi.delete(id)
          set(state => {
            const newGoals = new Map(state.goals)
            newGoals.delete(id)
            return { goals: newGoals }
          })
          showToast('Goal deleted', 'success')
        } catch (error) {
          console.error('Error deleting goal:', error)
          showToast(
            (error as Error).message || 'Failed to delete goal',
            'error'
          )
          throw error
        }
      },

      // Track progress
      trackGoalProgress: async (id: string, value: number, notes?: string) => {
        try {
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

          if (result.completed) {
            showToast('🎉 Goal completed!', 'success')
          } else {
            showToast('Progress tracked', 'success')
          }
        } catch (error) {
          console.error('Error tracking progress:', error)
          showToast(
            (error as Error).message || 'Failed to track progress',
            'error'
          )
          throw error
        }
      },

      // Filters
      setStatusFilter: status => set({ statusFilter: status }),
      setGoalFilter: filter => set({ goalFilter: filter }),
      setSearchQuery: query => set({ searchQuery: query }),

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
          Array.from(goals.values()).forEach(goal => {
            if (goal.scoreId) {
              const existing = scoreGoals.get(goal.scoreId) || []
              scoreGoals.set(goal.scoreId, [...existing, goal])
            }
          })

          items = items.filter(item => {
            const itemGoals = scoreGoals.get(item.scoreId) || []
            if (goalFilter === 'no-goals') {
              return itemGoals.length === 0
            } else if (goalFilter === 'active') {
              return itemGoals.some(g => g.status === 'active')
            } else if (goalFilter === 'completed') {
              return itemGoals.some(g => g.status === 'completed')
            }
            return true
          })
        }

        // Search filter - will need score metadata from scores service
        // For now, just return filtered by status and goals
        return items
      },

      // Get goals by score
      getGoalsByScore: (scoreId: string) => {
        const { goals } = get()
        return Array.from(goals.values()).filter(
          goal => goal.scoreId === scoreId
        )
      },

      // Get active goals by score
      getActiveGoalsByScore: (scoreId: string) => {
        const { goals } = get()
        return Array.from(goals.values()).filter(
          goal => goal.scoreId === scoreId && goal.status === 'active'
        )
      },
    }),
    {
      name: 'repertoire-store',
    }
  )
)
