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

interface RepertoireStore {
  // Repertoire state
  repertoire: Map<string, RepertoireItem>
  repertoireLoading: boolean
  repertoireError: string | null

  // Goals state
  goals: Map<string, Goal>
  goalsLoading: boolean
  goalsError: string | null

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
      statusFilter: 'all',
      goalFilter: 'all',
      searchQuery: '',

      // Load repertoire
      loadRepertoire: async () => {
        const { isAuthenticated } = useAuthStore.getState()
        if (!isAuthenticated) return

        set({ repertoireLoading: true, repertoireError: null })
        try {
          const { items } = await repertoireApi.list()
          const repertoireMap = new Map<string, RepertoireItem>()
          items.forEach(item => {
            repertoireMap.set(item.scoreId, item)
          })
          set({ repertoire: repertoireMap, repertoireLoading: false })
        } catch (error) {
          console.error('Error loading repertoire:', error)
          set({
            repertoireError: (error as Error).message,
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
          const newItem = await repertoireApi.add({ scoreId, status })
          set(state => {
            const newRepertoire = new Map(state.repertoire)
            newRepertoire.set(scoreId, newItem)
            return { repertoire: newRepertoire }
          })
          showToast('Added to repertoire', 'success')
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
          await repertoireApi.update(scoreId, { status })
          set(state => {
            const newRepertoire = new Map(state.repertoire)
            const item = newRepertoire.get(scoreId)
            if (item) {
              newRepertoire.set(scoreId, { ...item, status })
            }
            return { repertoire: newRepertoire }
          })
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
          await repertoireApi.remove(scoreId)
          set(state => {
            const newRepertoire = new Map(state.repertoire)
            newRepertoire.delete(scoreId)
            return { repertoire: newRepertoire }
          })
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
          return await repertoireApi.getStats(scoreId)
        } catch (error) {
          console.error('Error getting repertoire stats:', error)
          return null
        }
      },

      // Load goals
      loadGoals: async () => {
        const { isAuthenticated } = useAuthStore.getState()
        if (!isAuthenticated) return

        set({ goalsLoading: true, goalsError: null })
        try {
          const { goals } = await goalsApi.list()
          const goalsMap = new Map<string, Goal>()
          goals.forEach(goal => {
            goalsMap.set(goal.id, goal)
          })
          set({ goals: goalsMap, goalsLoading: false })
        } catch (error) {
          console.error('Error loading goals:', error)
          set({ goalsError: (error as Error).message, goalsLoading: false })
        }
      },

      // Create goal
      createGoal: async (goal: CreateGoalInput) => {
        try {
          const newGoal = await goalsApi.create(goal)
          set(state => {
            const newGoals = new Map(state.goals)
            newGoals.set(newGoal.id, newGoal)
            return { goals: newGoals }
          })
          showToast('Goal created', 'success')
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
