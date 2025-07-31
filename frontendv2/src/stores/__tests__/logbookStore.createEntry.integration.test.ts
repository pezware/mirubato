import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLogbookStore } from '../logbookStore'
import { useAuthStore } from '../authStore'
import { logbookApi } from '../../api/logbook'
import type { LogbookEntry } from '../../api/logbook'

// Mock the API
vi.mock('../../api/logbook', () => ({
  logbookApi: {
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    getEntries: vi.fn(),
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    updatePieceName: vi.fn(),
  },
}))

// Mock the auth store
vi.mock('../authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}))

// Mock repertoire store to avoid circular dependencies
vi.mock('../repertoireStore', () => ({
  useRepertoireStore: {
    getState: () => ({
      linkPracticeToGoals: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-entry-id',
}))

// Mock sync mutex
vi.mock('../../utils/syncMutex', () => ({
  syncMutex: {
    runExclusive: vi.fn().mockImplementation(async fn => {
      return await fn()
    }),
  },
}))

describe('LogbookStore.createEntry - Integration Tests', () => {
  const mockCreateEntryApi = vi.mocked(logbookApi.createEntry)
  const mockAuthStoreGetState = vi.mocked(useAuthStore.getState)

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the store state completely
    useLogbookStore.setState({
      entriesMap: new Map(),
      goalsMap: new Map(),
      scoreMetadata: {},
      isLoading: false,
      error: null,
      searchQuery: '',
      isLocalMode: true,
      entries: [],
      goals: [],
    })

    // Mock localStorage with fresh mocks for each test
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Setup default auth state
    mockAuthStoreGetState.mockReturnValue({
      isAuthenticated: true,
    } as any)

    // Setup default localStorage token
    vi.mocked(localStorage.getItem).mockReturnValue('mock-auth-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createTestEntry = (): Omit<
    LogbookEntry,
    'id' | 'createdAt' | 'updatedAt'
  > => ({
    timestamp: '2025-01-01T12:00:00Z',
    duration: 30,
    type: 'practice',
    instrument: 'piano',
    pieces: [{ title: 'Test Piece', composer: 'Test Composer' }],
    notes: 'Test notes',
    mood: null,
    techniques: [],
    tags: [],
    goalIds: [],
    metadata: { source: 'manual' },
  })

  describe('Successful Operations', () => {
    it('should create entry locally and sync to server when authenticated', async () => {
      const serverEntry = {
        ...createTestEntry(),
        id: 'server-entry-id',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      }

      mockCreateEntryApi.mockResolvedValue(serverEntry)

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      await store.createEntry(entryData)

      // Should create local entry first
      const initialState = useLogbookStore.getState()
      expect(initialState.entriesMap.has('test-entry-id')).toBe(true)

      // Wait for background sync to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should call the API in background
      expect(mockCreateEntryApi).toHaveBeenCalledWith(entryData)

      // Give more time for the server entry to be updated
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should update local state with server entry (replacing local entry)
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('server-entry-id')).toBe(true)
      expect(finalState.entriesMap.has('test-entry-id')).toBe(false) // Local entry replaced
    })

    it('should create entry locally only when not authenticated', async () => {
      mockAuthStoreGetState.mockReturnValue({
        isAuthenticated: false,
      } as any)

      vi.mocked(localStorage.getItem).mockReturnValue(null) // No token

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      console.log(
        'Before createEntry - entriesMap size:',
        store.entriesMap.size
      )
      console.log(
        'Before createEntry - store instance:',
        store === useLogbookStore.getState()
      )

      await store.createEntry(entryData)

      // Should create local entry
      const finalState = useLogbookStore.getState()
      console.log(
        'After createEntry - entriesMap size:',
        finalState.entriesMap.size
      )
      console.log(
        'After createEntry - entries in map:',
        Array.from(finalState.entriesMap.keys())
      )
      console.log(
        'After createEntry - store instances same:',
        store === finalState
      )

      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      const localEntry = finalState.entriesMap.get('test-entry-id')
      expect(localEntry?.id).toBe('test-entry-id')
      expect(localEntry?.timestamp).toBe(entryData.timestamp)

      // Should NOT call the API (no token)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockCreateEntryApi).not.toHaveBeenCalled()
    })

    it('should create entry locally only when no auth token present', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null) // No token

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      console.log(
        'Before createEntry - entriesMap size:',
        store.entriesMap.size
      )
      console.log(
        'Before createEntry - store instance:',
        store === useLogbookStore.getState()
      )

      try {
        console.log('About to call createEntry')
        await store.createEntry(entryData)
        console.log('createEntry completed successfully')
      } catch (error) {
        console.error('createEntry threw an error:', error)
        throw error
      }

      // Should create local entry
      const finalState = useLogbookStore.getState()
      console.log(
        'After createEntry - entriesMap size:',
        finalState.entriesMap.size
      )
      console.log(
        'After createEntry - entries in map:',
        Array.from(finalState.entriesMap.keys())
      )
      console.log(
        'After createEntry - store instances same:',
        store === finalState
      )

      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      // Should NOT call the API (no token)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockCreateEntryApi).not.toHaveBeenCalled()
    })
  })

  describe('Error Scenarios - API Failures', () => {
    it('should handle API network timeout', async () => {
      mockCreateEntryApi.mockRejectedValue(new Error('Network timeout'))

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should NOT throw error - local entry creation should succeed
      await store.createEntry(entryData)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      // Background sync failure should be handled gracefully
      // Wait a bit for background sync to attempt and fail
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should handle API 500 server error', async () => {
      mockCreateEntryApi.mockRejectedValue(
        new Error('500 Internal Server Error')
      )

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should NOT throw error - local entry creation should succeed
      await store.createEntry(entryData)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      // Background sync should attempt API call
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should handle API 401 unauthorized error', async () => {
      mockCreateEntryApi.mockRejectedValue(new Error('401 Unauthorized'))

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should NOT throw error - local entry creation should succeed
      await store.createEntry(entryData)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })

    it('should handle API returning null/undefined', async () => {
      mockCreateEntryApi.mockResolvedValue(null as any)

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should succeed locally even if API returns null
      await store.createEntry(entryData)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })

    it('should handle API throwing non-Error objects', async () => {
      mockCreateEntryApi.mockRejectedValue('String error')

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should NOT throw error - local entry creation should succeed
      await store.createEntry(entryData)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })
  })

  describe('Error Scenarios - Store Internal Issues', () => {
    it('should handle localStorage failure', async () => {
      // Mock localStorage.setItem to throw
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('LocalStorage quota exceeded')
      })

      mockCreateEntryApi.mockResolvedValue({
        ...createTestEntry(),
        id: 'server-id',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      })

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // localStorage errors in the main try-catch should still throw
      await expect(store.createEntry(entryData)).rejects.toThrow()
    })

    it('should handle goal linking failure gracefully', async () => {
      // Mock repertoire store to throw during goal linking
      vi.doMock('../repertoireStore', () => ({
        useRepertoireStore: {
          getState: () => ({
            linkPracticeToGoals: vi
              .fn()
              .mockRejectedValue(new Error('Goal linking failed')),
          }),
        },
      }))

      mockCreateEntryApi.mockResolvedValue({
        ...createTestEntry(),
        id: 'server-id',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      })

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should not throw - goal linking errors should be handled gracefully
      await store.createEntry(entryData)

      // Entry should still be created locally
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })
  })

  describe('Authentication Edge Cases', () => {
    it('should handle auth store returning null', async () => {
      mockAuthStoreGetState.mockReturnValue(null as any)

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      await store.createEntry(entryData)

      // Should create local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      // Should not call API due to auth issues
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockCreateEntryApi).not.toHaveBeenCalled()
    })

    it('should handle auth store throwing error', async () => {
      mockAuthStoreGetState.mockImplementation(() => {
        throw new Error('Auth store error')
      })

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should create local entry successfully
      await store.createEntry(entryData)

      // Should create local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })

    it('should handle token present but isAuthenticated false', async () => {
      mockAuthStoreGetState.mockReturnValue({
        isAuthenticated: false,
      } as any)

      // Token is present but user is not authenticated (expired token case)
      vi.mocked(localStorage.getItem).mockReturnValue('expired-token')

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      await store.createEntry(entryData)

      // Should not sync to server due to isAuthenticated: false
      expect(mockCreateEntryApi).not.toHaveBeenCalled()

      // Should create local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })
  })

  describe('Concurrency and Race Conditions', () => {
    it('should handle multiple concurrent createEntry calls', async () => {
      mockCreateEntryApi.mockImplementation(
        async data =>
          ({
            ...data,
            id: `server-${Math.random()}`,
            createdAt: '2025-01-01T12:00:00Z',
            updatedAt: '2025-01-01T12:00:00Z',
          }) as LogbookEntry
      )

      const store = useLogbookStore.getState()

      // Create multiple entries concurrently
      const promises = [
        store.createEntry({ ...createTestEntry(), notes: 'Entry 1' }),
        store.createEntry({ ...createTestEntry(), notes: 'Entry 2' }),
        store.createEntry({ ...createTestEntry(), notes: 'Entry 3' }),
      ]

      await Promise.all(promises)

      // All entries should be created locally first
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.size).toBe(3)

      // Wait for background sync to attempt
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    it('should handle createEntry called while previous call is pending', async () => {
      let resolveFirstCall: (value: LogbookEntry) => void

      mockCreateEntryApi
        .mockImplementationOnce(
          () =>
            new Promise<LogbookEntry>(resolve => {
              resolveFirstCall = resolve
            })
        )
        .mockResolvedValueOnce({
          ...createTestEntry(),
          id: 'second-entry',
          createdAt: '2025-01-01T12:00:00Z',
          updatedAt: '2025-01-01T12:00:00Z',
        })

      const store = useLogbookStore.getState()

      // Start first call (will be pending)
      const firstPromise = store.createEntry({
        ...createTestEntry(),
        notes: 'First',
      })

      // Start second call while first is pending
      const secondPromise = store.createEntry({
        ...createTestEntry(),
        notes: 'Second',
      })

      // Resolve first call
      resolveFirstCall!({
        ...createTestEntry(),
        id: 'first-entry',
        notes: 'First',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      })

      await Promise.all([firstPromise, secondPromise])

      // Both entries should exist
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('first-entry')).toBe(true)
      expect(finalState.entriesMap.has('second-entry')).toBe(true)
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty entry data', async () => {
      const emptyEntry: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        timestamp: '2025-01-01T12:00:00Z',
        duration: 1, // Minimum duration
        type: 'practice',
        instrument: 'piano',
        pieces: [], // No pieces
        notes: null,
        mood: null,
        techniques: [],
        tags: [],
        goalIds: [],
        metadata: { source: 'manual' },
      }

      mockCreateEntryApi.mockResolvedValue({
        ...emptyEntry,
        id: 'empty-entry',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      })

      const store = useLogbookStore.getState()

      await store.createEntry(emptyEntry)

      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })

    it('should handle very large entry data', async () => {
      const largeEntry = {
        ...createTestEntry(),
        notes: 'A'.repeat(10000), // Very long notes
        pieces: Array.from({ length: 100 }, (_, i) => ({
          title: `Piece ${i}`,
          composer: `Composer ${i}`,
        })),
        techniques: Array.from({ length: 50 }, (_, i) => `Technique ${i}`),
        tags: Array.from({ length: 50 }, (_, i) => `Tag ${i}`),
      }

      mockCreateEntryApi.mockResolvedValue({
        ...largeEntry,
        id: 'large-entry',
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-01T12:00:00Z',
      })

      const store = useLogbookStore.getState()

      await store.createEntry(largeEntry)

      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })

    it('should handle invalid timestamp', async () => {
      const invalidEntry = {
        ...createTestEntry(),
        timestamp: 'invalid-date',
      }

      // API might reject invalid data
      mockCreateEntryApi.mockRejectedValue(
        new Error('Invalid timestamp format')
      )

      const store = useLogbookStore.getState()

      // Should succeed locally even with invalid timestamp
      await store.createEntry(invalidEntry)

      // Should have created local entry
      const finalState = useLogbookStore.getState()
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)
    })
  })

  describe('Store State Consistency', () => {
    it('should maintain consistent state after failed sync', async () => {
      mockCreateEntryApi.mockRejectedValue(new Error('Sync failed'))

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should succeed locally
      await store.createEntry(entryData)

      const finalState = useLogbookStore.getState()

      // Local entry should exist
      expect(finalState.entriesMap.has('test-entry-id')).toBe(true)

      // Entries array should be consistent with map
      expect(finalState.entries.length).toBe(1)
      expect(finalState.entries[0].id).toBe('test-entry-id')
    })

    it('should handle state corruption gracefully', async () => {
      // Manually corrupt the state
      useLogbookStore.setState({
        entriesMap: null as any,
        entries: [],
      })

      const store = useLogbookStore.getState()
      const entryData = createTestEntry()

      // Should throw for actual store corruption (legitimate error)
      await expect(store.createEntry(entryData)).rejects.toThrow()
    })
  })
})
