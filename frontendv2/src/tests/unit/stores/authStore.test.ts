import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Import the actual stores first to get initial state
const initialAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isAuthInitialized: false,
  error: null,
}

// Mock the API modules
vi.mock('../../../api/auth')
vi.mock('../../../api/user')
vi.mock('../../../stores/logbookStore')

// Import after mocks
import { useAuthStore } from '../../../stores/authStore'
import { authApi } from '../../../api/auth'
import { userApi } from '../../../api/user'
import { useLogbookStore } from '../../../stores/logbookStore'

// Mock implementations
const mockAuthApi = authApi as unknown as {
  requestMagicLink: ReturnType<typeof vi.fn>
  verifyMagicLink: ReturnType<typeof vi.fn>
  googleLogin: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
  getCurrentUser: ReturnType<typeof vi.fn>
}

const mockUserApi = userApi as unknown as {
  getPreferences: ReturnType<typeof vi.fn>
  savePreferences: ReturnType<typeof vi.fn>
}

const mockSyncWithServer = vi.fn()
const mockSetLocalMode = vi.fn()
const mockManualSync = vi.fn()
const mockLogbookStore = useLogbookStore as unknown as {
  getState: ReturnType<typeof vi.fn>
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState(initialAuthState)

    // Clear all mocks
    vi.clearAllMocks()

    // Reset mock implementations
    mockAuthApi.requestMagicLink = vi.fn()
    mockAuthApi.verifyMagicLink = vi.fn()
    mockAuthApi.googleLogin = vi.fn()
    mockAuthApi.logout = vi.fn()
    mockAuthApi.getCurrentUser = vi.fn()

    // Reset userApi mocks
    mockUserApi.getPreferences = vi.fn().mockResolvedValue({})
    mockUserApi.savePreferences = vi.fn().mockResolvedValue({})

    mockSyncWithServer.mockReset()
    mockSyncWithServer.mockResolvedValue(undefined)
    mockSetLocalMode.mockReset()
    mockManualSync.mockReset()
    mockManualSync.mockResolvedValue(undefined)
    mockLogbookStore.getState = vi.fn(() => ({
      syncWithServer: mockSyncWithServer,
      setLocalMode: mockSetLocalMode,
      manualSync: mockManualSync,
      entriesMap: new Map(),
      goalsMap: new Map(),
      scoreMetadata: {},
    })) as unknown as ReturnType<typeof vi.fn>

    // Reset localStorage mock
    const localStorageMock = global.localStorage as unknown as {
      getItem: ReturnType<typeof vi.fn>
      setItem: ReturnType<typeof vi.fn>
      removeItem: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
    localStorageMock.clear.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('login', () => {
    it('should request magic link successfully', async () => {
      mockAuthApi.requestMagicLink.mockResolvedValue(undefined)

      const email = 'test@example.com'
      await useAuthStore.getState().login(email)

      expect(mockAuthApi.requestMagicLink).toHaveBeenCalledWith(email)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('should handle magic link request failure', async () => {
      const errorMessage = 'Failed to send magic link'
      mockAuthApi.requestMagicLink.mockRejectedValue({
        response: { data: { error: errorMessage } },
      })

      const email = 'test@example.com'
      await expect(useAuthStore.getState().login(email)).rejects.toThrow()

      expect(mockAuthApi.requestMagicLink).toHaveBeenCalledWith(email)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBe(errorMessage)
    })

    it('should handle generic error when no response data', async () => {
      mockAuthApi.requestMagicLink.mockRejectedValue(new Error('Network error'))

      const email = 'test@example.com'
      await expect(useAuthStore.getState().login(email)).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe('Failed to send magic link')
    })
  })

  describe('verifyMagicLink', () => {
    it('should verify magic link and update user state', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      const mockResponse = { user: mockUser }
      mockAuthApi.verifyMagicLink.mockResolvedValue(mockResponse)

      const token = 'test-token'
      await useAuthStore.getState().verifyMagicLink(token)

      expect(mockAuthApi.verifyMagicLink).toHaveBeenCalledWith(token)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()

      // Verify manualSync was triggered
      expect(mockManualSync).toHaveBeenCalled()
    })

    it('should set local mode to false when authenticated via magic link', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      mockAuthApi.verifyMagicLink.mockResolvedValue({
        success: true,
        user: mockUser,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      })

      await useAuthStore.getState().verifyMagicLink('test-token')

      expect(mockSetLocalMode).toHaveBeenCalledWith(false)
    })

    it('should handle invalid token error', async () => {
      const errorMessage = 'Invalid or expired token'
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: errorMessage } },
      })

      const token = 'invalid-token'
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(errorMessage)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('should handle sync failure gracefully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      const mockResponse = { user: mockUser }
      mockAuthApi.verifyMagicLink.mockResolvedValue(mockResponse)

      // Mock manualSync failure
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})
      mockManualSync.mockRejectedValue(new Error('Sync failed'))

      const token = 'test-token'
      await useAuthStore.getState().verifyMagicLink(token)

      // User should still be authenticated even if sync fails
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      // With improved error handling using Promise.allSettled, individual sync
      // operation failures are handled gracefully without affecting the auth process
      // The main thing is that the user is still authenticated despite sync failure
      expect(consoleWarnSpy).toHaveBeenCalled()

      // The specific error message may vary depending on which sync operation fails first
      // but the important thing is that errors are logged and handled gracefully

      consoleWarnSpy.mockRestore()
    })
  })

  describe('googleLogin', () => {
    it('should handle Google login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      const mockResponse = { user: mockUser }
      mockAuthApi.googleLogin.mockResolvedValue(mockResponse)

      const credential = 'google-credential'
      await useAuthStore.getState().googleLogin(credential)

      expect(mockAuthApi.googleLogin).toHaveBeenCalledWith(credential)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()

      // Verify manualSync was triggered
      expect(mockManualSync).toHaveBeenCalled()
    })

    it('should set local mode to false when authenticated via Google', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      mockAuthApi.googleLogin.mockResolvedValue({
        success: true,
        user: mockUser,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      })

      await useAuthStore.getState().googleLogin('test-credential')

      expect(mockSetLocalMode).toHaveBeenCalledWith(false)
    })

    it('should handle 401 error with appropriate message', async () => {
      mockAuthApi.googleLogin.mockRejectedValue({
        response: { status: 401 },
      })

      const credential = 'invalid-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(
        'Invalid Google credentials. Please try again.'
      )
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should handle 403 error with appropriate message', async () => {
      mockAuthApi.googleLogin.mockRejectedValue({
        response: { status: 403 },
      })

      const credential = 'forbidden-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(
        'Access denied. Please check your Google account permissions.'
      )
    })

    it('should handle 500 error with appropriate message', async () => {
      mockAuthApi.googleLogin.mockRejectedValue({
        response: { status: 500 },
      })

      const credential = 'server-error-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(
        'Server error. Please try again later.'
      )
    })

    it('should handle custom error message from response', async () => {
      const customError = 'Custom error message'
      mockAuthApi.googleLogin.mockRejectedValue({
        response: { data: { error: customError } },
      })

      const credential = 'error-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(customError)
    })

    it('should handle error with message property', async () => {
      const errorMessage = 'Network error'
      mockAuthApi.googleLogin.mockRejectedValue(new Error(errorMessage))

      const credential = 'network-error-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe(errorMessage)
    })

    it('should handle generic error', async () => {
      mockAuthApi.googleLogin.mockRejectedValue({})

      const credential = 'generic-error-credential'
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      expect(useAuthStore.getState().error).toBe('Google login failed')
    })
  })

  describe('logout', () => {
    it('should logout successfully and clear state', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          authProvider: 'magic_link' as const,
          createdAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
      })

      mockAuthApi.logout.mockResolvedValue(undefined)

      await useAuthStore.getState().logout()

      expect(mockAuthApi.logout).toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('should save logbook data to localStorage and set local mode on logout', async () => {
      mockAuthApi.logout.mockResolvedValue({ success: true })

      // Set up some mock data in the logbook store
      const mockEntries = [{ id: '1', title: 'Test Entry' }]
      const mockGoals = [{ id: '2', title: 'Test Goal' }]
      mockLogbookStore.getState = vi.fn(() => ({
        syncWithServer: mockSyncWithServer,
        setLocalMode: mockSetLocalMode,
        entriesMap: new Map(mockEntries.map(e => [e.id, e])),
        goalsMap: new Map(mockGoals.map(g => [g.id, g])),
        scoreMetadata: { test: 'metadata' },
      })) as unknown as ReturnType<typeof vi.fn>

      await useAuthStore.getState().logout()

      // Verify data was saved to localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries',
        JSON.stringify(mockEntries)
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:goals',
        JSON.stringify(mockGoals)
      )
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:scoreMetadata',
        JSON.stringify({ test: 'metadata' })
      )

      // Verify local mode was set back to true
      expect(mockSetLocalMode).toHaveBeenCalledWith(true)
    })

    it('should clear state even if logout API call fails', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          authProvider: 'magic_link' as const,
          createdAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        error: 'Some error',
      })

      mockAuthApi.logout.mockRejectedValue(new Error('Logout failed'))

      // The logout will throw because it doesn't catch the error, but state should still be cleared due to finally block
      await expect(useAuthStore.getState().logout()).rejects.toThrow(
        'Logout failed'
      )

      expect(mockAuthApi.logout).toHaveBeenCalled()
      // State should still be cleared because of the finally block
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('refreshAuth', () => {
    it('should refresh auth when token exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }
      localStorageMock.getItem.mockReturnValue('valid-token')
      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser)

      await useAuthStore.getState().refreshAuth()

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled()
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should clear auth state when no token exists', async () => {
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }
      localStorageMock.getItem.mockReturnValue(null)

      await useAuthStore.getState().refreshAuth()

      expect(mockAuthApi.getCurrentUser).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should clear auth state when token is invalid', async () => {
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'auth-token') return 'invalid-token'
        if (key === 'refresh-token') return 'invalid-refresh-token'
        return null
      })
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'))

      await useAuthStore.getState().refreshAuth()

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh-token')
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' })

      useAuthStore.getState().clearError()

      expect(useAuthStore.getState().error).toBeNull()
    })
  })
})
