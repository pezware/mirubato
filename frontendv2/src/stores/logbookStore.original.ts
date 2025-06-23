import { create } from 'zustand'
import { logbookApi, type LogbookEntry, type Goal } from '../api/logbook'
import { nanoid } from 'nanoid'

interface LogbookState {
  // Data
  entries: LogbookEntry[]
  goals: Goal[]

  // UI State
  isLoading: boolean
  error: string | null
  searchQuery: string

  // Local Storage Management (for anonymous users)
  isLocalMode: boolean

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
}

// Local storage keys
const ENTRIES_KEY = 'mirubato:logbook:entries'
const GOALS_KEY = 'mirubato:logbook:goals'

export const useLogbookStore = create<LogbookState>((set, get) => ({
  entries: [],
  goals: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  isLocalMode: true, // Always start in local mode

  loadEntries: async () => {
    set({ isLoading: true, error: null })

    try {
      // Always load from localStorage first
      const stored = localStorage.getItem(ENTRIES_KEY)
      const entries = stored ? JSON.parse(stored) : []
      set({ entries, isLoading: false })

      // If user is authenticated and online, sync in background
      const token = localStorage.getItem('auth-token')
      if (token && !get().isLocalMode) {
        // Try to sync with server in background
        logbookApi
          .getEntries()
          .then(serverEntries => {
            // TODO: Merge server entries with local entries
            // For now, just use server entries
            set({ entries: serverEntries })
            localStorage.setItem(ENTRIES_KEY, JSON.stringify(serverEntries))
          })
          .catch(error => {
            console.warn('Background sync failed:', error)
            // Keep using local data
          })
      }
    } catch (error: any) {
      console.error('Failed to load entries:', error)
      set({
        entries: [],
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

      const entries = [...get().entries, entry]
      set({ entries })
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))

      // If authenticated and online, sync to server in background
      const token = localStorage.getItem('auth-token')
      if (token && !get().isLocalMode) {
        logbookApi
          .createEntry(entryData)
          .then(serverEntry => {
            // Update the entry with server ID if different
            if (serverEntry.id !== entry.id) {
              const updatedEntries = entries.map(e =>
                e.id === entry.id ? { ...e, id: serverEntry.id } : e
              )
              set({ entries: updatedEntries })
              localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries))
            }
          })
          .catch(error => {
            console.warn('Background sync failed for new entry:', error)
            // Entry remains in local storage
          })
      }
    } catch (error: any) {
      set({ error: 'Failed to create entry' })
      throw error
    }
  },

  updateEntry: async (id, updates) => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Update locally
        const entries = get().entries.map(entry =>
          entry.id === id
            ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
            : entry
        )
        set({ entries })
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
      } else {
        // Update via API
        const updated = await logbookApi.updateEntry(id, updates)
        const entries = get().entries.map(entry =>
          entry.id === id ? updated : entry
        )
        set({ entries })
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update entry' })
      throw error
    }
  },

  deleteEntry: async id => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Delete locally
        const entries = get().entries.filter(entry => entry.id !== id)
        set({ entries })
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
      } else {
        // Delete via API
        await logbookApi.deleteEntry(id)
        const entries = get().entries.filter(entry => entry.id !== id)
        set({ entries })
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete entry' })
      throw error
    }
  },

  loadGoals: async () => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Load from localStorage
        const stored = localStorage.getItem(GOALS_KEY)
        const goals = stored ? JSON.parse(stored) : []
        set({ goals })
      } else {
        // Load from API
        const goals = await logbookApi.getGoals()
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to load goals' })
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

        const goals = [...get().goals, goal]
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      } else {
        // Create via API
        const goal = await logbookApi.createGoal(goalData)
        set({ goals: [...get().goals, goal] })

        // Update localStorage
        const goals = get().goals
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to create goal' })
      throw error
    }
  },

  updateGoal: async (id, updates) => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Update locally
        const goals = get().goals.map(goal =>
          goal.id === id
            ? { ...goal, ...updates, updatedAt: new Date().toISOString() }
            : goal
        )
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      } else {
        // Update via API
        const updated = await logbookApi.updateGoal(id, updates)
        const goals = get().goals.map(goal => (goal.id === id ? updated : goal))
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update goal' })
      throw error
    }
  },

  deleteGoal: async id => {
    set({ error: null })

    try {
      if (get().isLocalMode) {
        // Delete locally
        const goals = get().goals.filter(goal => goal.id !== id)
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      } else {
        // Delete via API
        await logbookApi.deleteGoal(id)
        const goals = get().goals.filter(goal => goal.id !== id)
        set({ goals })
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete goal' })
      throw error
    }
  },

  setSearchQuery: query => set({ searchQuery: query }),
  setLocalMode: isLocal => set({ isLocalMode: isLocal }),
  clearError: () => set({ error: null }),

  syncWithServer: async () => {
    const token = localStorage.getItem('auth-token')
    if (!token) {
      set({ error: 'Please sign in to sync with server' })
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Get local entries
      const localEntries = get().entries

      // Pull from server
      const serverEntries = await logbookApi.getEntries()

      // TODO: Implement proper bidirectional sync
      // For now, server wins
      set({
        entries: serverEntries,
        isLoading: false,
        isLocalMode: false,
      })

      // Update local storage
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(serverEntries))

      // If we had local entries not on server, push them
      // This is a simple implementation - a real sync would handle conflicts
      const localOnlyEntries = localEntries.filter(
        local => !serverEntries.find(server => server.id === local.id)
      )

      if (localOnlyEntries.length > 0) {
        console.log(
          `Pushing ${localOnlyEntries.length} local entries to server`
        )
        // TODO: Implement batch push
      }
    } catch (error: any) {
      set({
        error: 'Failed to sync with server. Continuing with local data.',
        isLoading: false,
      })
      console.error('Sync failed:', error)
    }
  },
}))
