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
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to send magic link',
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

      // Trigger sync after successful authentication
      const { syncWithServer } = useLogbookStore.getState()
      syncWithServer().catch(error => {
        console.warn('Initial sync failed:', error)
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Invalid or expired token',
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

      // Sync logbook after successful Google login
      const { syncWithServer } = useLogbookStore.getState()
      await syncWithServer()
    } catch (error: any) {
      let errorMessage = 'Google login failed'

      // Handle specific error cases
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Google credentials. Please try again.'
      } else if (error.response?.status === 403) {
        errorMessage =
          'Access denied. Please check your Google account permissions.'
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
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
      await authApi.logout()
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
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
    } catch {
      // Token is invalid, clear auth state
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
