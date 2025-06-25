import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { User, AuthResponse } from '../../../api/auth'

// Mock the API client module
vi.mock('../../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Import after mocking
import { authApi } from '../../../api/auth'
import { apiClient } from '../../../api/client'

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mocks
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.clear as ReturnType<typeof vi.fn>).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('requestMagicLink', () => {
    it('should send magic link request with email', async () => {
      const email = 'test@example.com'
      const mockResponse = { success: true, message: 'Magic link sent' }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.requestMagicLink(email)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/auth/request-magic-link',
        {
          email,
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle request errors', async () => {
      const email = 'test@example.com'
      const error = new Error('Network error')

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(authApi.requestMagicLink(email)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('verifyMagicLink', () => {
    it('should verify token and store auth tokens', async () => {
      const token = 'test-magic-token'
      const mockResponse: AuthResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          authProvider: 'magic_link',
          createdAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.verifyMagicLink(token)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/auth/verify-magic-link',
        {
          token,
        }
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth-token',
        'access-token-123'
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'refresh-token',
        'refresh-token-123'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should not store tokens if accessToken is missing', async () => {
      const token = 'test-magic-token'
      const mockResponse = {
        success: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresIn: 0,
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.verifyMagicLink(token)

      expect(localStorage.setItem).not.toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('should handle verification errors', async () => {
      const token = 'invalid-token'
      const error = new Error('Invalid token')

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(authApi.verifyMagicLink(token)).rejects.toThrow(
        'Invalid token'
      )
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('googleLogin', () => {
    it('should authenticate with Google and store tokens', async () => {
      const credential = 'google-jwt-credential'
      const mockResponse: AuthResponse = {
        success: true,
        user: {
          id: 'user-456',
          email: 'google@example.com',
          displayName: 'Google User',
          authProvider: 'google',
          createdAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'google-access-token',
        refreshToken: 'google-refresh-token',
        expiresIn: 3600,
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.googleLogin(credential)

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/google', {
        credential,
      })
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth-token',
        'google-access-token'
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'refresh-token',
        'google-refresh-token'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle Google login errors', async () => {
      const credential = 'invalid-credential'
      const error = new Error('Invalid Google credential')

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(authApi.googleLogin(credential)).rejects.toThrow(
        'Invalid Google credential'
      )
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('should refresh access token and update storage', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        expiresIn: 3600,
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.refreshToken()

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth-token',
        'new-access-token'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should not update storage if no access token returned', async () => {
      const mockResponse = {
        error: 'Refresh token expired',
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
      })

      const result = await authApi.refreshToken()

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
      expect(localStorage.setItem).not.toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('should handle refresh errors', async () => {
      const error = new Error('Network error')

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(authApi.refreshToken()).rejects.toThrow('Network error')
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('logout', () => {
    it('should call logout endpoint and clear tokens', async () => {
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: true },
      })

      await authApi.logout()

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout')
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth-token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh-token')
    })

    it('should clear tokens even if API call fails', async () => {
      const error = new Error('Server error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      // The logout function should swallow errors
      // but let's first check if localStorage is still called
      try {
        await authApi.logout()
      } catch {
        // Ignore for now
      }

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout')
      // The finally block should still execute
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth-token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh-token')
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user data', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'current@example.com',
        displayName: 'Current User',
        authProvider: 'magic_link',
        createdAt: '2024-01-01T00:00:00Z',
      }

      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockUser,
      })

      const result = await authApi.getCurrentUser()

      expect(apiClient.get).toHaveBeenCalledWith('/api/user/me')
      expect(result).toEqual(mockUser)
    })

    it('should handle user fetch errors', async () => {
      const error = new Error('Unauthorized')

      ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(authApi.getCurrentUser()).rejects.toThrow('Unauthorized')
    })
  })
})
