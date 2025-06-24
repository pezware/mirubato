import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from './authStore'

// Mock the API module
vi.mock('../api/auth', () => ({
  authApi: {
    requestMagicLink: vi.fn(),
    verifyMagicLink: vi.fn(),
    googleLogin: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

// Mock the logbook store
vi.mock('./logbookStore', () => ({
  useLogbookStore: {
    getState: vi.fn(() => ({
      syncWithServer: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset the store state
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.clearError()
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useAuthStore())

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('login', () => {
    it('should request magic link successfully', async () => {
      const { authApi } = await import('../api/auth')
      ;(authApi.requestMagicLink as any).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.login('test@example.com')
      })

      expect(authApi.requestMagicLink).toHaveBeenCalledWith('test@example.com')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle login errors', async () => {
      const { authApi } = await import('../api/auth')
      const error = new Error('Network error')
      ;(error as any).response = { data: { error: 'Failed to send email' } }
      ;(authApi.requestMagicLink as any).mockRejectedValueOnce(error)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await expect(result.current.login('test@example.com')).rejects.toThrow()
      })

      expect(result.current.error).toBe('Failed to send email')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('verifyMagicLink', () => {
    it('should verify magic link and authenticate user', async () => {
      const { authApi } = await import('../api/auth')
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      ;(authApi.verifyMagicLink as any).mockResolvedValueOnce({
        user: mockUser,
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.verifyMagicLink('valid-token')
      })

      expect(authApi.verifyMagicLink).toHaveBeenCalledWith('valid-token')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should trigger sync after successful verification', async () => {
      const { authApi } = await import('../api/auth')
      const { useLogbookStore } = await import('./logbookStore')
      const mockSyncWithServer = vi.fn().mockResolvedValueOnce(undefined)

      ;(useLogbookStore.getState as any).mockReturnValueOnce({
        syncWithServer: mockSyncWithServer,
      })
      ;(authApi.verifyMagicLink as any).mockResolvedValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.verifyMagicLink('valid-token')
      })

      expect(mockSyncWithServer).toHaveBeenCalled()
    })

    it('should handle invalid token errors', async () => {
      const { authApi } = await import('../api/auth')
      const error = new Error('Invalid token')
      ;(error as any).response = { data: { error: 'Token expired' } }
      ;(authApi.verifyMagicLink as any).mockRejectedValueOnce(error)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await expect(
          result.current.verifyMagicLink('invalid-token')
        ).rejects.toThrow()
      })

      expect(result.current.error).toBe('Token expired')
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('googleLogin', () => {
    it('should handle Google login successfully', async () => {
      const { authApi } = await import('../api/auth')
      const mockUser = { id: 'user-123', email: 'google@example.com' }
      ;(authApi.googleLogin as any).mockResolvedValueOnce({ user: mockUser })

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.googleLogin('google-credential')
      })

      expect(authApi.googleLogin).toHaveBeenCalledWith('google-credential')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle specific Google login errors', async () => {
      const { authApi } = await import('../api/auth')
      const error = new Error('Google auth failed')
      ;(error as any).response = { status: 401 }
      ;(authApi.googleLogin as any).mockRejectedValueOnce(error)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await expect(
          result.current.googleLogin('invalid-credential')
        ).rejects.toThrow()
      })

      expect(result.current.error).toBe(
        'Invalid Google credentials. Please try again.'
      )
    })
  })

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      const { authApi } = await import('../api/auth')
      ;(authApi.logout as any).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.user = { id: 'user-123', email: 'test@example.com' }
        result.current.isAuthenticated = true
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(authApi.logout).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should clear state even if logout API fails', async () => {
      const { authApi } = await import('../api/auth')
      ;(authApi.logout as any).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuthStore())

      // Set initial authenticated state
      act(() => {
        result.current.user = { id: 'user-123', email: 'test@example.com' }
        result.current.isAuthenticated = true
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('refreshAuth', () => {
    it('should refresh authentication with valid token', async () => {
      const { authApi } = await import('../api/auth')
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      localStorage.setItem('auth-token', 'valid-token')
      ;(authApi.getCurrentUser as any).mockResolvedValueOnce(mockUser)

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.refreshAuth()
      })

      expect(authApi.getCurrentUser).toHaveBeenCalled()
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should clear auth state when no token exists', async () => {
      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.refreshAuth()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should clear invalid tokens', async () => {
      const { authApi } = await import('../api/auth')

      localStorage.setItem('auth-token', 'invalid-token')
      localStorage.setItem('refresh-token', 'invalid-refresh')
      ;(authApi.getCurrentUser as any).mockRejectedValueOnce(
        new Error('Unauthorized')
      )

      const { result } = renderHook(() => useAuthStore())

      await act(async () => {
        await result.current.refreshAuth()
      })

      expect(localStorage.getItem('auth-token')).toBeNull()
      expect(localStorage.getItem('refresh-token')).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuthStore())

      // Set an error
      act(() => {
        result.current.error = 'Some error'
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
