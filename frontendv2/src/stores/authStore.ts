import { create } from 'zustand'
import { authApi, type User } from '../api/auth'
import { useLogbookStore } from './logbookStore'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string) => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.requestMagicLink(email)
      set({ isLoading: false })
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to send magic link',
        isLoading: false,
      })
      throw error
    }
  },

  verifyMagicLink: async (token: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.verifyMagicLink(token)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Set to online mode and trigger sync after successful authentication
      try {
        const { syncWithServer, setLocalMode } = useLogbookStore.getState()
        const { syncLocalData } = await import('./repertoireStore').then(m =>
          m.useRepertoireStore.getState()
        )
        setLocalMode(false) // Switch to online mode when authenticated

        // Sync both logbook and repertoire data
        Promise.all([
          syncWithServer().catch((error: unknown) => {
            console.warn('Initial logbook sync failed:', error)
          }),
          syncLocalData().catch((error: unknown) => {
            console.warn('Initial repertoire sync failed:', error)
          }),
        ])
      } catch (syncError) {
        console.warn(
          'Store sync error after magic link verification:',
          syncError
        )
        // Continue - login was successful even if sync failed
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Invalid or expired token',
        isLoading: false,
      })
      throw error
    }
  },

  googleLogin: async (credential: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.googleLogin(credential)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Set to online mode and sync logbook after successful Google login
      try {
        const { syncWithServer, setLocalMode } = useLogbookStore.getState()
        const { syncLocalData } = await import('./repertoireStore').then(m =>
          m.useRepertoireStore.getState()
        )
        setLocalMode(false) // Switch to online mode when authenticated

        // Sync both logbook and repertoire data
        await Promise.all([syncWithServer(), syncLocalData()])
      } catch (syncError) {
        console.warn('Store sync error after Google login:', syncError)
        // Continue - login was successful even if sync failed
      }
    } catch (error: unknown) {
      let errorMessage = 'Google login failed'
      const err = error as Error & {
        response?: { status?: number; data?: { error?: string } }
        message?: string
      }

      // Handle specific error cases
      if (err.response?.status === 401) {
        errorMessage = 'Invalid Google credentials. Please try again.'
      } else if (err.response?.status === 403) {
        errorMessage =
          'Access denied. Please check your Google account permissions.'
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      set({
        error: errorMessage,
        isLoading: false,
      })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      // Save current logbook data to localStorage before logout
      try {
        const logbookStore = useLogbookStore.getState()
        const entries = Array.from(logbookStore.entriesMap.values())
        const goals = Array.from(logbookStore.goalsMap.values())

        // Save to localStorage to preserve data
        if (entries.length > 0) {
          localStorage.setItem(
            'mirubato:logbook:entries',
            JSON.stringify(entries)
          )
        }
        if (goals.length > 0) {
          localStorage.setItem('mirubato:logbook:goals', JSON.stringify(goals))
        }

        // Also save score metadata if present
        if (Object.keys(logbookStore.scoreMetadata).length > 0) {
          localStorage.setItem(
            'mirubato:logbook:scoreMetadata',
            JSON.stringify(logbookStore.scoreMetadata)
          )
        }
      } catch (error) {
        console.warn('Could not save logbook data before logout:', error)
      }

      // Save repertoire data before logout
      try {
        const {
          repertoire,
          goals: repertoireGoals,
          scoreMetadataCache,
        } = await import('./repertoireStore').then(m =>
          m.useRepertoireStore.getState()
        )
        const repertoireItems = Array.from(repertoire.values())
        const repertoireGoalsArray = Array.from(repertoireGoals.values())
        const scoreMetadataArray = Array.from(scoreMetadataCache.values())

        if (repertoireItems.length > 0) {
          localStorage.setItem(
            'mirubato:repertoire:items',
            JSON.stringify(repertoireItems)
          )
        }
        if (repertoireGoalsArray.length > 0) {
          localStorage.setItem(
            'mirubato:repertoire:goals',
            JSON.stringify(repertoireGoalsArray)
          )
        }
        if (scoreMetadataArray.length > 0) {
          localStorage.setItem(
            'mirubato:repertoire:scoreMetadata',
            JSON.stringify(scoreMetadataArray)
          )
        }
      } catch (error) {
        console.warn('Could not save repertoire data before logout:', error)
      }

      await authApi.logout()
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })

      // Set back to local mode after logout
      try {
        const { setLocalMode } = useLogbookStore.getState()
        setLocalMode(true)
      } catch (error) {
        console.warn('Could not set local mode after logout:', error)
      }
    }
  },

  refreshAuth: async () => {
    const token = localStorage.getItem('auth-token')
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return
    }

    set({ isLoading: true })
    try {
      const user = await authApi.getCurrentUser()
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Set to online mode when authenticated
      try {
        const { setLocalMode, syncWithServer } = useLogbookStore.getState()
        const { syncLocalData } = await import('./repertoireStore').then(m =>
          m.useRepertoireStore.getState()
        )
        setLocalMode(false)

        // Sync both logbook and repertoire data in background
        Promise.all([
          syncWithServer().catch((error: unknown) => {
            console.warn('Background logbook sync failed:', error)
          }),
          syncLocalData().catch((error: unknown) => {
            console.warn('Background repertoire sync failed:', error)
          }),
        ])
      } catch (syncError) {
        console.warn('Store sync error after refresh auth:', syncError)
        // Continue - auth refresh was successful even if sync failed
      }
    } catch {
      // Token is invalid, clear auth state
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })

      // Set back to local mode when auth fails
      try {
        const { setLocalMode } = useLogbookStore.getState()
        setLocalMode(true)
      } catch (error) {
        console.warn('Could not set local mode:', error)
      }
    }
  },

  clearError: () => set({ error: null }),
}))
