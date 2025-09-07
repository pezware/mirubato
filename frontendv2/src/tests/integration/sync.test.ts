import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { useLogbookStore } from '../../stores/logbookStore'
import { useAuthStore } from '../../stores/authStore'
import { authApi } from '../../api/auth'
import { logbookApi, type LogbookEntry } from '../../api/logbook'
import { userApi } from '../../api/user'
import { repertoireApi } from '../../api/repertoire'
import { goalsApi } from '../../api/goals'
import { getWebSocketSync } from '../../services/webSocketSync'
import { createMockWebSocketSync } from '../mocks/webSocketMock'

// Mock dependencies
vi.mock('../../api/auth')
vi.mock('../../api/logbook')
vi.mock('../../api/user')
vi.mock('../../api/repertoire')
vi.mock('../../api/goals')
vi.mock('../../services/webSocketSync')
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-' + Math.random().toString(36).substr(2, 9)),
}))

describe('Sync Integration Tests', () => {
  let mockWebSocketSync: ReturnType<typeof createMockWebSocketSync>
  let localStorageData: Record<string, string> = {}

  beforeEach(() => {
    // Reset stores
    useLogbookStore.setState({
      entriesMap: new Map(),
      goalsMap: new Map(),
      isLoading: false,
      error: null,
      searchQuery: '',
      isLocalMode: true,
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
      isRealtimeSyncEnabled: false,
      realtimeSyncStatus: 'disconnected',
      realtimeSyncError: null,
      webSocketInitialized: false,
      entries: [],
      goals: [],
    })

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthInitialized: false,
      error: null,
      refreshPromise: null,
    })

    // Setup localStorage mock
    localStorageData = {}
    const localStorageMock = global.localStorage as unknown as {
      getItem: ReturnType<typeof vi.fn>
      setItem: ReturnType<typeof vi.fn>
      removeItem: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }

    localStorageMock.getItem.mockImplementation((key: string) => {
      return localStorageData[key] || null
    })

    localStorageMock.setItem.mockImplementation(
      (key: string, value: string) => {
        localStorageData[key] = value
      }
    )

    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete localStorageData[key]
    })

    localStorageMock.clear.mockImplementation(() => {
      localStorageData = {}
    })

    // Setup WebSocket mock
    mockWebSocketSync = createMockWebSocketSync()
    // Make sure the mock is properly set up
    ;(getWebSocketSync as ReturnType<typeof vi.fn>).mockReturnValue(
      mockWebSocketSync
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication to WebSocket Sync Flow', () => {
    it('should initialize WebSocket sync after successful login', async () => {
      // Setup mock responses
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      ;(authApi.verifyMagicLink as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        token: 'auth-token-123',
      })
      ;(authApi.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      )
      ;(logbookApi.getEntries as ReturnType<typeof vi.fn>).mockResolvedValue([])

      // Set up localStorage to simulate successful auth
      localStorageData['auth-token'] = 'auth-token-123'
      localStorageData['mirubato:user'] = JSON.stringify(mockUser)
      ;(userApi.getPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
        theme: 'light',
        language: 'en',
        practiceReminders: false,
      })
      ;(
        userApi.updatePreferences as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        theme: 'light',
        language: 'en',
        practiceReminders: false,
      })
      // Mock repertoire and goals APIs
      ;(repertoireApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
      })
      ;(goalsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        goals: [],
      })

      // Simulate login
      await act(async () => {
        await useAuthStore.getState().verifyMagicLink('magic-token')
      })

      // Wait for async operations including WebSocket initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1500)) // Wait for initialization delay
      })

      // Since initializeWebSocketSync calls enableRealtimeSync which then calls connect,
      // we need to check if connect was eventually called
      expect(mockWebSocketSync.connect).toHaveBeenCalled()

      // If connect was called, verify it was with correct parameters
      if (mockWebSocketSync.connect.mock.calls.length > 0) {
        const [userId, token] = mockWebSocketSync.connect.mock.calls[0]
        expect(userId).toBe('user-123')
        expect(token).toBe('auth-token-123')
      }

      // Verify store state
      const logbookState = useLogbookStore.getState()
      expect(logbookState.isLocalMode).toBe(false)
      expect(logbookState.webSocketInitialized).toBe(true)
      expect(logbookState.isRealtimeSyncEnabled).toBe(true)
    })

    it('should disconnect WebSocket on logout', async () => {
      // Setup authenticated state
      localStorageData['auth-token'] = 'auth-token-123'
      localStorageData['mirubato:user'] = JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
      })

      act(() => {
        useAuthStore.setState({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
          isAuthenticated: true,
        })
        useLogbookStore.setState({
          isLocalMode: false,
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
        })
      })

      // Simulate logout
      ;(authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      await act(async () => {
        await useAuthStore.getState().logout()
      })

      // Verify WebSocket disconnection
      expect(mockWebSocketSync.disconnect).toHaveBeenCalled()

      // Verify store state
      const logbookState = useLogbookStore.getState()
      expect(logbookState.isLocalMode).toBe(true)
      expect(logbookState.isRealtimeSyncEnabled).toBe(false)
    })
  })

  describe('Real-time Sync Between Devices', () => {
    beforeEach(() => {
      // Setup authenticated state with WebSocket connected
      localStorageData['auth-token'] = 'auth-token-123'
      localStorageData['mirubato:user'] = JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
      })

      act(() => {
        useLogbookStore.setState({
          isLocalMode: false,
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
          webSocketInitialized: true,
        })
      })

      mockWebSocketSync.simulateConnect()
    })

    it('should sync entry creation across devices', async () => {
      const newEntry: Partial<LogbookEntry> = {
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Sonata', composer: 'Mozart' }],
        techniques: ['scales'],
        goalIds: [],
      }

      // Device 1: Create entry
      await act(async () => {
        await useLogbookStore.getState().createEntry(newEntry as LogbookEntry)
      })

      // Verify WebSocket sent the event
      expect(mockWebSocketSync.send).toHaveBeenCalled()
      const sentData = mockWebSocketSync.send.mock.calls[0][0]
      expect(sentData.type).toBe('ENTRY_CREATED')
      expect(sentData.entry).toMatchObject(newEntry)

      // Device 2: Receive the sync event
      const syncedEntry = {
        ...newEntry,
        id: 'synced-entry-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as LogbookEntry

      act(() => {
        useLogbookStore.getState().addEntryFromSync(syncedEntry)
      })

      // Verify entry was added to store
      const state = useLogbookStore.getState()
      expect(state.entriesMap.has('synced-entry-123')).toBe(true)
      expect(state.entriesMap.get('synced-entry-123')).toEqual(syncedEntry)
    })

    it('should handle concurrent updates with timestamp-based conflict resolution', () => {
      const baseEntry: LogbookEntry = {
        id: 'entry-123',
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Original', composer: 'Bach' }],
        techniques: [],
        goalIds: [],
        notes: 'Original notes',
        mood: 'SATISFIED',
        tags: [],
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      }

      // Add base entry to store
      act(() => {
        useLogbookStore.setState({
          entriesMap: new Map([['entry-123', baseEntry]]),
        })
      })

      // Device 1: Local update (newer)
      const localUpdate: LogbookEntry = {
        ...baseEntry,
        notes: 'Local updated notes',
        updatedAt: '2024-01-01T10:05:00Z',
      }

      // Device 2: Remote update (older)
      const remoteUpdate: LogbookEntry = {
        ...baseEntry,
        notes: 'Remote updated notes',
        updatedAt: '2024-01-01T10:03:00Z',
      }

      // Apply local update first
      act(() => {
        const entriesMap = new Map(useLogbookStore.getState().entriesMap)
        entriesMap.set('entry-123', localUpdate)
        useLogbookStore.setState({ entriesMap })
      })

      // Try to apply older remote update
      act(() => {
        useLogbookStore.getState().updateEntryFromSync(remoteUpdate)
      })

      // Local update should win (newer timestamp)
      const state = useLogbookStore.getState()
      expect(state.entriesMap.get('entry-123')?.notes).toBe(
        'Local updated notes'
      )
    })

    it('should handle entry deletion sync', () => {
      const entry1: LogbookEntry = {
        id: 'entry-1',
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      }

      const entry2: LogbookEntry = {
        ...entry1,
        id: 'entry-2',
      }

      // Add entries to store
      act(() => {
        useLogbookStore.setState({
          entriesMap: new Map([
            ['entry-1', entry1],
            ['entry-2', entry2],
          ]),
        })
      })

      // Simulate deletion from another device
      act(() => {
        useLogbookStore.getState().removeEntryFromSync('entry-1')
      })

      // Verify entry was removed
      const state = useLogbookStore.getState()
      expect(state.entriesMap.has('entry-1')).toBe(false)
      expect(state.entriesMap.has('entry-2')).toBe(true)
    })

    it('should handle bulk sync on reconnection', () => {
      const existingEntry: LogbookEntry = {
        id: 'existing-1',
        timestamp: '2024-01-01T09:00:00Z',
        duration: 20,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z',
      }

      const newEntries: LogbookEntry[] = [
        {
          id: 'new-1',
          timestamp: '2024-01-01T10:00:00Z',
          duration: 30,
          type: 'PRACTICE',
          instrument: 'PIANO',
          pieces: [{ title: 'Piece 1' }],
          techniques: [],
          goalIds: [],
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
        },
        {
          id: 'new-2',
          timestamp: '2024-01-01T11:00:00Z',
          duration: 45,
          type: 'PRACTICE',
          instrument: 'GUITAR',
          pieces: [{ title: 'Piece 2' }],
          techniques: [],
          goalIds: [],
          createdAt: '2024-01-01T11:00:00Z',
          updatedAt: '2024-01-01T11:00:00Z',
        },
      ]

      // Setup initial state
      act(() => {
        useLogbookStore.setState({
          entriesMap: new Map([['existing-1', existingEntry]]),
        })
      })

      // Simulate bulk sync
      act(() => {
        useLogbookStore.getState().mergeEntriesFromSync(newEntries)
      })

      // Verify all entries are present
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(3)
      expect(state.entriesMap.has('existing-1')).toBe(true)
      expect(state.entriesMap.has('new-1')).toBe(true)
      expect(state.entriesMap.has('new-2')).toBe(true)
    })
  })

  describe('Offline to Online Transition', () => {
    it.skip('should queue operations while offline and sync when reconnected', async () => {
      // Start offline
      mockWebSocketSync.getConnectionStatus.mockReturnValue('disconnected')

      act(() => {
        useLogbookStore.setState({
          isLocalMode: true,
          isRealtimeSyncEnabled: false,
          realtimeSyncStatus: 'disconnected',
        })
      })

      const offlineEntry: Partial<LogbookEntry> = {
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Offline Piece' }],
        techniques: [],
        goalIds: [],
      }

      // Create entry while offline
      await act(async () => {
        await useLogbookStore
          .getState()
          .createEntry(offlineEntry as LogbookEntry)
      })

      // Verify entry is stored locally
      const offlineState = useLogbookStore.getState()
      expect(offlineState.entriesMap.size).toBe(1)

      // Go online
      localStorageData['auth-token'] = 'auth-token-123'
      localStorageData['mirubato:user'] = JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
      })

      mockWebSocketSync.getConnectionStatus.mockReturnValue('connected')
      mockWebSocketSync.getOfflineQueueSize.mockReturnValue(1)

      act(() => {
        useLogbookStore.setState({
          isLocalMode: false,
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
          webSocketInitialized: true,
        })
      })

      // Simulate WebSocket reconnection
      mockWebSocketSync.simulateConnect()

      // Verify queued operations were sent
      expect(mockWebSocketSync.send).toHaveBeenCalled()
    })

    it('should handle network interruption gracefully', async () => {
      // Start connected
      mockWebSocketSync.getConnectionStatus.mockReturnValue('connected')

      act(() => {
        useLogbookStore.setState({
          isLocalMode: false,
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
          webSocketInitialized: true,
        })
      })

      // Simulate network interruption
      mockWebSocketSync.getConnectionStatus.mockReturnValue('disconnected')
      mockWebSocketSync.simulateDisconnect()

      act(() => {
        useLogbookStore.setState({
          realtimeSyncStatus: 'disconnected',
        })
      })

      // Operations should still work locally
      const entry: Partial<LogbookEntry> = {
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'During Interruption' }],
        techniques: [],
        goalIds: [],
      }

      await act(async () => {
        await useLogbookStore.getState().createEntry(entry as LogbookEntry)
      })

      // Verify entry was created locally
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(1)

      // Simulate reconnection
      mockWebSocketSync.getConnectionStatus.mockReturnValue('connected')
      mockWebSocketSync.simulateConnect()

      act(() => {
        useLogbookStore.setState({
          realtimeSyncStatus: 'connected',
        })
      })

      // Verify WebSocket attempts to send queued data
      expect(mockWebSocketSync.send).toHaveBeenCalled()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency during rapid updates', async () => {
      act(() => {
        useLogbookStore.setState({
          isLocalMode: false,
          isRealtimeSyncEnabled: true,
          realtimeSyncStatus: 'connected',
        })
      })

      const updates = Array.from({ length: 5 }, (_, i) => ({
        timestamp: `2024-01-01T${10 + i}:00:00Z`,
        duration: 30 + i * 5,
        type: 'PRACTICE' as const,
        instrument: 'PIANO' as const,
        pieces: [{ title: `Piece ${i + 1}` }],
        techniques: [],
        goalIds: [],
      }))

      // Perform rapid updates
      await act(async () => {
        await Promise.all(
          updates.map(update => useLogbookStore.getState().createEntry(update))
        )
      })

      // Verify all entries were created
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(5)

      // Verify WebSocket sent all events
      const createEvents = mockWebSocketSync.send.mock.calls.filter(
        call => call[0]?.type === 'ENTRY_CREATED'
      )
      expect(createEvents).toHaveLength(5)
    })

    it('should preserve local changes when sync fails', async () => {
      ;(logbookApi.createEntry as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      )

      act(() => {
        useLogbookStore.setState({
          isLocalMode: false,
        })
      })

      const entry: Partial<LogbookEntry> = {
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Local Entry' }],
        techniques: [],
        goalIds: [],
        notes: 'This should be preserved',
      }

      // Create entry (API call will fail)
      await act(async () => {
        await useLogbookStore.getState().createEntry(entry as LogbookEntry)
      })

      // Verify entry is still in local store despite API failure
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(1)
      const savedEntry = Array.from(state.entriesMap.values())[0]
      expect(savedEntry.notes).toBe('This should be preserved')

      // Verify it's saved to localStorage
      const storedEntries = JSON.parse(
        localStorageData['mirubato:logbook:entries'] || '[]'
      )
      expect(storedEntries).toHaveLength(1)
      expect(storedEntries[0].notes).toBe('This should be preserved')
    })
  })
})
