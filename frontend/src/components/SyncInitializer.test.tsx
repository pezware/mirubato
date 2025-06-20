import { render, waitFor } from '@testing-library/react'
import { SyncInitializer } from './SyncInitializer'
import { useAuth } from '../contexts/ImprovedAuthContext'
import { useSyncAnonymousData } from '../hooks/useSyncAnonymousData'
import { eventBus } from '../modules/core/EventBus'

// Mock dependencies
jest.mock('../contexts/ImprovedAuthContext')
jest.mock('../hooks/useSyncAnonymousData')
jest.mock('../modules/core/EventBus', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}))

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {})

describe('SyncInitializer', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    hasCloudStorage: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockSyncAnonymousData = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()

    // Default mock implementations
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      isAnonymous: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      error: null,
    })
    ;(useSyncAnonymousData as jest.Mock).mockReturnValue({
      syncAnonymousData: mockSyncAnonymousData,
      loading: false,
      error: null,
    })
  })

  describe('Anonymous User', () => {
    it('should render nothing for anonymous users', () => {
      const { container } = render(<SyncInitializer />)
      expect(container.firstChild).toBeNull()
    })

    it('should not attempt sync for anonymous users', async () => {
      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).not.toHaveBeenCalled()
      })
    })
  })

  describe('Authenticated User - First Login', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })
    })

    it('should sync anonymous data on first login', async () => {
      // Set up anonymous data in localStorage
      const anonymousData = {
        sessions: [{ id: 'session-1', data: 'test' }],
        logs: [{ id: 'log-1', data: 'test' }],
        entries: [{ id: 'entry-1', data: 'test' }],
        goals: [{ id: 'goal-1', data: 'test' }],
      }

      localStorage.setItem(
        'practiceSession:session-1',
        JSON.stringify(anonymousData.sessions[0])
      )
      localStorage.setItem(
        'practiceLog:log-1',
        JSON.stringify(anonymousData.logs[0])
      )
      localStorage.setItem(
        'logbook:entry:entry-1',
        JSON.stringify(anonymousData.entries[0])
      )
      localStorage.setItem(
        'goal:goal-1',
        JSON.stringify(anonymousData.goals[0])
      )

      mockSyncAnonymousData.mockResolvedValue({
        success: true,
        syncedSessions: 1,
        syncedLogs: 1,
        syncedEntries: 1,
        syncedGoals: 1,
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).toHaveBeenCalledWith({
          sessions: [anonymousData.sessions[0]],
          logs: [anonymousData.logs[0]],
          entries: [anonymousData.entries[0]],
          goals: [anonymousData.goals[0]],
        })
      })

      // Should mark sync as complete
      expect(localStorage.getItem(`sync:completed:${mockUser.id}`)).toBe('true')

      // Should emit sync completed event
      expect(eventBus.emit).toHaveBeenCalledWith('sync:anonymous:completed', {
        userId: mockUser.id,
        syncedCount: 4,
      })
    })

    it('should handle empty anonymous data', async () => {
      mockSyncAnonymousData.mockResolvedValue({
        success: true,
        syncedSessions: 0,
        syncedLogs: 0,
        syncedEntries: 0,
        syncedGoals: 0,
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).toHaveBeenCalledWith({
          sessions: [],
          logs: [],
          entries: [],
          goals: [],
        })
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[SyncInitializer] No anonymous data to sync'
      )
    })

    it('should handle sync errors gracefully', async () => {
      const syncError = new Error('Sync failed')
      mockSyncAnonymousData.mockRejectedValue(syncError)

      // Add some data to sync
      localStorage.setItem(
        'practiceSession:session-1',
        JSON.stringify({ id: 'session-1' })
      )

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          '[SyncInitializer] Failed to sync anonymous data:',
          syncError
        )
      })

      // Should not mark sync as complete on error
      expect(localStorage.getItem(`sync:completed:${mockUser.id}`)).toBeNull()
    })

    it('should handle partial sync success', async () => {
      localStorage.setItem(
        'practiceSession:session-1',
        JSON.stringify({ id: 'session-1' })
      )
      localStorage.setItem(
        'logbook:entry:entry-1',
        JSON.stringify({ id: 'entry-1' })
      )

      mockSyncAnonymousData.mockResolvedValue({
        success: false,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 0,
        syncedGoals: 0,
        errors: ['Failed to sync entry-1'],
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          '[SyncInitializer] Partial sync completed with errors:',
          ['Failed to sync entry-1']
        )
      })

      // Should still mark as complete to avoid repeated attempts
      expect(localStorage.getItem(`sync:completed:${mockUser.id}`)).toBe('true')
    })
  })

  describe('Authenticated User - Already Synced', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      // Mark as already synced
      localStorage.setItem(`sync:completed:${mockUser.id}`, 'true')
    })

    it('should not sync if already completed for user', async () => {
      // Add some data that would normally be synced
      localStorage.setItem(
        'practiceSession:session-1',
        JSON.stringify({ id: 'session-1' })
      )

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).not.toHaveBeenCalled()
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `[SyncInitializer] Anonymous data already synced for user ${mockUser.id}`
      )
    })
  })

  describe('Loading State', () => {
    it('should not sync while auth is loading', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAnonymous: false,
        loading: true,
        error: null,
        login: jest.fn(),
        logout: jest.fn(),
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).not.toHaveBeenCalled()
      })
    })

    it('should handle sync loading state', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })
      ;(useSyncAnonymousData as jest.Mock).mockReturnValue({
        syncAnonymousData: mockSyncAnonymousData,
        loading: true,
        error: null,
      })

      render(<SyncInitializer />)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[SyncInitializer] Syncing anonymous data...'
      )
    })
  })

  describe('Data Collection', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })
    })

    it('should correctly filter localStorage keys', async () => {
      // Add various localStorage items
      localStorage.setItem(
        'practiceSession:valid-1',
        JSON.stringify({ id: 'valid-1' })
      )
      localStorage.setItem(
        'practiceLog:valid-2',
        JSON.stringify({ id: 'valid-2' })
      )
      localStorage.setItem(
        'logbook:entry:valid-3',
        JSON.stringify({ id: 'valid-3' })
      )
      localStorage.setItem('goal:valid-4', JSON.stringify({ id: 'valid-4' }))

      // Add items that should be ignored
      localStorage.setItem('auth:token', 'token123')
      localStorage.setItem('user:preferences', JSON.stringify({}))
      localStorage.setItem('sync:completed:123', 'true')

      mockSyncAnonymousData.mockResolvedValue({
        success: true,
        syncedSessions: 1,
        syncedLogs: 1,
        syncedEntries: 1,
        syncedGoals: 1,
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).toHaveBeenCalledWith({
          sessions: [{ id: 'valid-1' }],
          logs: [{ id: 'valid-2' }],
          entries: [{ id: 'valid-3' }],
          goals: [{ id: 'valid-4' }],
        })
      })
    })

    it('should handle malformed JSON data', async () => {
      // Add valid and invalid data
      localStorage.setItem(
        'practiceSession:valid',
        JSON.stringify({ id: 'valid' })
      )
      localStorage.setItem('practiceSession:invalid', 'not-json')

      mockSyncAnonymousData.mockResolvedValue({
        success: true,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 0,
        syncedGoals: 0,
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockSyncAnonymousData).toHaveBeenCalledWith({
          sessions: [{ id: 'valid' }], // Only valid data included
          logs: [],
          entries: [],
          goals: [],
        })
      })

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse'),
        expect.any(Error)
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle localStorage access errors', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage access denied')
      })

      render(<SyncInitializer />)

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining('Error collecting anonymous data'),
          expect.any(Error)
        )
      })

      // Restore original
      localStorage.getItem = originalGetItem
    })

    it('should handle rapid user changes', async () => {
      const { rerender } = render(<SyncInitializer />)

      // Start as anonymous
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAnonymous: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      rerender(<SyncInitializer />)

      // Change to authenticated
      ;(useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isAnonymous: false,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      rerender(<SyncInitializer />)

      // Change back to anonymous before sync completes
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAnonymous: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      rerender(<SyncInitializer />)

      // Sync should still have been attempted once
      await waitFor(() => {
        expect(mockSyncAnonymousData).toHaveBeenCalledTimes(1)
      })
    })
  })
})
