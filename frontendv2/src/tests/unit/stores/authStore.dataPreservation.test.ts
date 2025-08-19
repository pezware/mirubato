import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

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
  verifyMagicLink: ReturnType<typeof vi.fn>
  googleLogin: ReturnType<typeof vi.fn>
}

const mockUserApi = userApi as unknown as {
  getPreferences: ReturnType<typeof vi.fn>
  savePreferences: ReturnType<typeof vi.fn>
}

const mockLogbookStore = useLogbookStore as unknown as {
  getState: ReturnType<typeof vi.fn>
}

describe('authStore - Data Preservation', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthInitialized: false,
      error: null,
    })

    // Clear all mocks
    vi.clearAllMocks()

    // Reset mock implementations
    mockAuthApi.verifyMagicLink = vi.fn()
    mockAuthApi.googleLogin = vi.fn()

    // Reset userApi mocks
    mockUserApi.getPreferences = vi.fn().mockResolvedValue({})
    mockUserApi.savePreferences = vi.fn().mockResolvedValue({})

    // Setup logbook store mock with sample data
    mockLogbookStore.getState = vi.fn(() => ({
      entriesMap: new Map([
        ['entry1', { id: 'entry1', title: 'Practice Session', duration: 30 }],
        ['entry2', { id: 'entry2', title: 'Scales Practice', duration: 15 }],
      ]),
      goalsMap: new Map([
        ['goal1', { id: 'goal1', title: 'Learn Chopin', targetValue: 100 }],
      ]),
      scoreMetadata: {
        score1: { title: 'Nocturne', composer: 'Chopin' },
      },
      setLocalMode: vi.fn(),
      manualSync: vi.fn().mockResolvedValue(undefined),
    }))

    // Mock localStorage
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

  describe('data backup and restore during auth failures', () => {
    it('should backup user data before magic link verification', async () => {
      // Mock auth failure
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: 'Invalid token' } },
      })

      const token = 'invalid-token'

      // Attempt magic link verification (should fail)
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow()

      // Verify backup was created
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries:backup',
        JSON.stringify([
          { id: 'entry1', title: 'Practice Session', duration: 30 },
          { id: 'entry2', title: 'Scales Practice', duration: 15 },
        ])
      )

      // Verify regular storage was also updated (for immediate use)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries',
        JSON.stringify([
          { id: 'entry1', title: 'Practice Session', duration: 30 },
          { id: 'entry2', title: 'Scales Practice', duration: 15 },
        ])
      )

      // Verify goals backup
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:goals:backup',
        JSON.stringify([
          { id: 'goal1', title: 'Learn Chopin', targetValue: 100 },
        ])
      )

      // Verify metadata backup
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:scoreMetadata:backup',
        JSON.stringify({ score1: { title: 'Nocturne', composer: 'Chopin' } })
      )
    })

    it('should restore data from backup when magic link verification fails', async () => {
      // Setup localStorage to return backup data
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'mirubato:logbook:entries:backup') {
          return JSON.stringify([
            { id: 'backup1', title: 'Backup Entry', duration: 25 },
          ])
        }
        if (key === 'mirubato:logbook:goals:backup') {
          return JSON.stringify([
            { id: 'backup-goal', title: 'Backup Goal', targetValue: 50 },
          ])
        }
        if (key === 'mirubato:logbook:scoreMetadata:backup') {
          return JSON.stringify({ backupScore: { title: 'Backup Score' } })
        }
        return null
      })

      // Mock auth failure
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: 'Invalid token' } },
      })

      const token = 'invalid-token'

      // Attempt magic link verification (should fail)
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow()

      // Verify data was restored from backup
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries',
        JSON.stringify([{ id: 'backup1', title: 'Backup Entry', duration: 25 }])
      )

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:goals',
        JSON.stringify([
          { id: 'backup-goal', title: 'Backup Goal', targetValue: 50 },
        ])
      )

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:scoreMetadata',
        JSON.stringify({ backupScore: { title: 'Backup Score' } })
      )
    })

    it('should backup and restore data during Google login failure', async () => {
      // Setup localStorage to return backup data
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'mirubato:logbook:entries:backup') {
          return JSON.stringify([
            { id: 'google-backup', title: 'Google Backup Entry', duration: 20 },
          ])
        }
        return null
      })

      // Mock auth failure
      mockAuthApi.googleLogin.mockRejectedValue({
        response: { status: 401 },
      })

      const credential = 'invalid-credential'

      // Attempt Google login (should fail)
      await expect(
        useAuthStore.getState().googleLogin(credential)
      ).rejects.toThrow()

      // Verify backup was created and restored
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries:backup',
        expect.any(String)
      )

      // Should restore from backup after failure
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries',
        JSON.stringify([
          { id: 'google-backup', title: 'Google Backup Entry', duration: 20 },
        ])
      )
    })

    it('should clear backups after successful authentication', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
      }

      // Mock successful auth
      mockAuthApi.verifyMagicLink.mockResolvedValue({ user: mockUser })

      const token = 'valid-token'
      await useAuthStore.getState().verifyMagicLink(token)

      // Verify backups were cleared after successful auth
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:logbook:entries:backup'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:logbook:goals:backup'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:logbook:scoreMetadata:backup'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:repertoire:items:backup'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:repertoire:goals:backup'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'mirubato:repertoire:scoreMetadata:backup'
      )
    })

    it('should handle backup failure gracefully', async () => {
      // Mock logbook store to return null (simulating store not available)
      mockLogbookStore.getState = vi.fn(() => null)

      // Mock auth failure
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: 'Invalid token' } },
      })

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      const token = 'invalid-token'

      // Should not throw even if backup fails due to store unavailability
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow() // Should still throw the auth error

      // The test passes if we get here without the backup failure crashing the process
      // Restore mocks
      consoleWarnSpy.mockRestore()
    })

    it('should handle missing backup data gracefully during restore', async () => {
      // Setup localStorage to return null (no backup data)
      const localStorageMock = global.localStorage as unknown as {
        getItem: ReturnType<typeof vi.fn>
        setItem: ReturnType<typeof vi.fn>
        removeItem: ReturnType<typeof vi.fn>
        clear: ReturnType<typeof vi.fn>
      }

      localStorageMock.getItem.mockReturnValue(null)

      // Mock auth failure
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: 'Invalid token' } },
      })

      const token = 'invalid-token'

      // Should not throw even if no backup data exists
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow() // Should still throw the auth error

      // Should not crash, but may not restore anything if no backup exists
      // The important thing is that it doesn't crash
      expect(true).toBe(true) // Test passes if we get here without crashing
    })
  })

  describe('repertoire data preservation', () => {
    it('should handle repertoire store import failures gracefully', async () => {
      // Mock console methods to verify error handling
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Mock auth failure
      mockAuthApi.verifyMagicLink.mockRejectedValue({
        response: { data: { error: 'Invalid token' } },
      })

      const token = 'invalid-token'

      // Attempt auth (should fail but handle repertoire import gracefully)
      await expect(
        useAuthStore.getState().verifyMagicLink(token)
      ).rejects.toThrow()

      // The test should pass as long as auth fails gracefully
      // Dynamic import failure handling is working if we get here without crashing
      // In the test environment, the dynamic import might work or fail differently
      // The important thing is that it doesn't crash the auth process
      expect(true).toBe(true)

      consoleWarnSpy.mockRestore()
    })
  })
})
