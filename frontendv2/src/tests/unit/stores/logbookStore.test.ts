import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act } from 'react'

// Mock the API and nanoid modules
vi.mock('../../../api/logbook')
vi.mock('../../../api/sync')
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}))
vi.mock('../../../services/webSocketSync', () => ({
  getWebSocketSync: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
    getOfflineQueueSize: vi.fn().mockReturnValue(0),
  })),
  SyncEvent: {},
}))

// Import after mocks
import { useLogbookStore } from '../../../stores/logbookStore'
import { logbookApi, type LogbookEntry, type Goal } from '../../../api/logbook'
import { syncApi } from '../../../api/sync'
import { nanoid } from 'nanoid'
import { getWebSocketSync } from '../../../services/webSocketSync'

// Mock implementations
const mockLogbookApi = logbookApi as {
  getEntries: ReturnType<typeof vi.fn>
  createEntry: ReturnType<typeof vi.fn>
  updateEntry: ReturnType<typeof vi.fn>
  deleteEntry: ReturnType<typeof vi.fn>
  getGoals: ReturnType<typeof vi.fn>
  createGoal: ReturnType<typeof vi.fn>
  updateGoal: ReturnType<typeof vi.fn>
  deleteGoal: ReturnType<typeof vi.fn>
  linkEntryToGoal: ReturnType<typeof vi.fn>
}

const mockSyncApi = syncApi as {
  push: ReturnType<typeof vi.fn>
  pull: ReturnType<typeof vi.fn>
}

describe('logbookStore', () => {
  const mockEntry: LogbookEntry = {
    id: 'entry-1',
    timestamp: '2024-01-01T00:00:00Z',
    duration: 30,
    type: 'PRACTICE',
    instrument: 'PIANO',
    pieces: [{ title: 'Piece 1', composer: 'Composer 1' }],
    techniques: ['scales'],
    goalIds: [],
    notes: 'Test notes',
    mood: null,
    tags: ['test'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  const mockGoal: Goal = {
    id: 'goal-1',
    title: 'Test Goal',
    description: 'Test description',
    targetDate: '2024-12-31T00:00:00Z',
    progress: 50,
    milestones: [
      {
        id: 'milestone-1',
        title: 'Milestone 1',
        completed: false,
      },
    ],
    status: 'ACTIVE',
    linkedEntries: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  let localStorageData: Record<string, string> = {}

  beforeEach(() => {
    // Reset the store state to initial
    useLogbookStore.setState({
      entriesMap: new Map(),
      goalsMap: new Map(),
      isLoading: false,
      error: null,
      searchQuery: '',
      isLocalMode: true,
      entries: [],
      goals: [],
    })

    // Clear localStorage data
    localStorageData = {}

    // Setup localStorage mock
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

    localStorageMock.getItem.mockImplementation(
      (key: string) => localStorageData[key] || null
    )
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

    // Clear all mocks
    vi.clearAllMocks()

    // Reset API mocks
    mockLogbookApi.getEntries = vi.fn()
    mockLogbookApi.createEntry = vi.fn()
    mockLogbookApi.updateEntry = vi.fn()
    mockLogbookApi.deleteEntry = vi.fn()
    mockLogbookApi.getGoals = vi.fn()
    mockLogbookApi.createGoal = vi.fn()
    mockLogbookApi.updateGoal = vi.fn()
    mockLogbookApi.deleteGoal = vi.fn()
    mockLogbookApi.linkEntryToGoal = vi.fn()

    // Reset sync API mocks
    mockSyncApi.push = vi.fn()
    mockSyncApi.pull = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(0)
      expect(state.goalsMap.size).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.searchQuery).toBe('')
      expect(state.isLocalMode).toBe(true)
      expect(state.entries).toEqual([])
      expect(state.goals).toEqual([])
    })
  })

  describe('loadEntries', () => {
    it('should load entries from localStorage', async () => {
      const entries = [mockEntry]
      localStorageData['mirubato:logbook:entries'] = JSON.stringify(entries)

      await act(async () => {
        await useLogbookStore.getState().loadEntries()
      })

      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(1)
      expect(state.entriesMap.get('entry-1')).toEqual(mockEntry)
      expect(state.entries).toEqual(entries)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle empty localStorage', async () => {
      await act(async () => {
        await useLogbookStore.getState().loadEntries()
      })

      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(0)
      expect(state.entries).toEqual([])
      expect(state.isLoading).toBe(false)
    })

    it('should handle localStorage parse error', async () => {
      localStorageData['mirubato:logbook:entries'] = 'invalid json'
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      await act(async () => {
        await useLogbookStore.getState().loadEntries()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load entries:',
        expect.any(Error)
      )
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(0)
      expect(state.error).toBe('Failed to load entries')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('createEntry', () => {
    it('should create entry locally', async () => {
      const entryData = {
        timestamp: '2024-01-01T00:00:00Z',
        duration: 30,
        type: 'PRACTICE' as const,
        instrument: 'PIANO' as const,
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
      }

      await act(async () => {
        await useLogbookStore.getState().createEntry(entryData)
      })

      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(1)
      const createdEntry = state.entriesMap.get('test-id-123')
      expect(createdEntry).toBeDefined()
      expect(createdEntry?.id).toBe('test-id-123')
      expect(createdEntry?.timestamp).toBe(entryData.timestamp)

      // Check localStorage was updated
      const stored = JSON.parse(
        localStorageData['mirubato:logbook:entries'] || '[]'
      )
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('test-id-123')
    })

    it('should handle error during entry creation', async () => {
      // Mock nanoid to throw error
      ;(nanoid as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('ID generation failed')
      })

      const entryData = {
        timestamp: '2024-01-01T00:00:00Z',
        duration: 30,
        type: 'PRACTICE' as const,
        instrument: 'PIANO' as const,
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
      }

      await expect(
        act(async () => {
          await useLogbookStore.getState().createEntry(entryData)
        })
      ).rejects.toThrow()

      const state = useLogbookStore.getState()
      expect(state.error).toBe('Failed to create entry')
    })
  })

  describe('updateEntry', () => {
    beforeEach(() => {
      // Pre-populate with an entry
      const entriesMap = new Map([[mockEntry.id, mockEntry]])
      useLogbookStore.setState({ entriesMap, entries: [mockEntry] })
    })

    it('should update entry locally', async () => {
      const updates = { notes: 'Updated notes', duration: 45 }

      await act(async () => {
        await useLogbookStore.getState().updateEntry('entry-1', updates)
      })

      const state = useLogbookStore.getState()
      const updatedEntry = state.entriesMap.get('entry-1')
      expect(updatedEntry?.notes).toBe('Updated notes')
      expect(updatedEntry?.duration).toBe(45)
      expect(updatedEntry?.updatedAt).toBeDefined()
    })

    it('should throw error if entry not found', async () => {
      await expect(
        act(async () => {
          await useLogbookStore.getState().updateEntry('non-existent', {})
        })
      ).rejects.toThrow('Entry not found')
    })
  })

  describe('deleteEntry', () => {
    beforeEach(() => {
      // Pre-populate with an entry
      const entriesMap = new Map([[mockEntry.id, mockEntry]])
      useLogbookStore.setState({ entriesMap, entries: [mockEntry] })
      localStorageData['mirubato:logbook:entries'] = JSON.stringify([mockEntry])
    })

    it('should delete entry locally', async () => {
      await act(async () => {
        await useLogbookStore.getState().deleteEntry('entry-1')
      })

      const state = useLogbookStore.getState()
      expect(state.entriesMap.has('entry-1')).toBe(false)
      expect(state.entries).toHaveLength(0)

      // Check localStorage was updated
      const stored = JSON.parse(
        localStorageData['mirubato:logbook:entries'] || '[]'
      )
      expect(stored).toHaveLength(0)
    })
  })

  describe('Goals operations', () => {
    describe('loadGoals', () => {
      it('should load goals from localStorage in local mode', async () => {
        const goals = [mockGoal]
        localStorageData['mirubato:logbook:goals'] = JSON.stringify(goals)

        await act(async () => {
          await useLogbookStore.getState().loadGoals()
        })

        const state = useLogbookStore.getState()
        expect(state.goalsMap.size).toBe(1)
        expect(state.goalsMap.get('goal-1')).toEqual(mockGoal)
        expect(state.goals).toEqual(goals)
      })
    })

    describe('createGoal', () => {
      it('should create goal locally', async () => {
        const goalData = {
          title: 'New Goal',
          description: 'New goal description',
          milestones: [],
          status: 'ACTIVE' as const,
        }

        await act(async () => {
          await useLogbookStore.getState().createGoal(goalData)
        })

        const state = useLogbookStore.getState()
        expect(state.goalsMap.size).toBe(1)
        const createdGoal = state.goalsMap.get('test-id-123')
        expect(createdGoal).toBeDefined()
        expect(createdGoal?.title).toBe('New Goal')
        expect(createdGoal?.progress).toBe(0)
        expect(createdGoal?.linkedEntries).toEqual([])
      })
    })

    describe('updateGoal', () => {
      beforeEach(() => {
        const goalsMap = new Map([[mockGoal.id, mockGoal]])
        useLogbookStore.setState({ goalsMap, goals: [mockGoal] })
      })

      it('should update goal locally', async () => {
        const updates = { title: 'Updated Goal', progress: 75 }

        await act(async () => {
          await useLogbookStore.getState().updateGoal('goal-1', updates)
        })

        const state = useLogbookStore.getState()
        const updatedGoal = state.goalsMap.get('goal-1')
        expect(updatedGoal?.title).toBe('Updated Goal')
        expect(updatedGoal?.progress).toBe(75)
      })

      it('should throw error if goal not found', async () => {
        await expect(
          act(async () => {
            await useLogbookStore.getState().updateGoal('non-existent', {})
          })
        ).rejects.toThrow('Goal not found')
      })
    })

    describe('deleteGoal', () => {
      beforeEach(() => {
        const goalsMap = new Map([[mockGoal.id, mockGoal]])
        useLogbookStore.setState({ goalsMap, goals: [mockGoal] })
      })

      it('should delete goal locally', async () => {
        await act(async () => {
          await useLogbookStore.getState().deleteGoal('goal-1')
        })

        const state = useLogbookStore.getState()
        expect(state.goalsMap.has('goal-1')).toBe(false)
        expect(state.goals).toHaveLength(0)
      })
    })
  })

  describe('UI actions', () => {
    it('should set search query', () => {
      act(() => {
        useLogbookStore.getState().setSearchQuery('test search')
      })
      expect(useLogbookStore.getState().searchQuery).toBe('test search')
    })

    it('should set local mode', () => {
      act(() => {
        useLogbookStore.getState().setLocalMode(false)
      })
      expect(useLogbookStore.getState().isLocalMode).toBe(false)
    })

    it('should clear error', () => {
      act(() => {
        useLogbookStore.setState({ error: 'Some error' })
        useLogbookStore.getState().clearError()
      })
      expect(useLogbookStore.getState().error).toBeNull()
    })
  })

  // Manual sync tests removed - functionality replaced by WebSocket sync
  describe.skip('manualSync (removed)', () => {
    it('should sync entries with server', async () => {
      localStorageData['auth-token'] = 'valid-token'

      // Add local entries
      const localEntry = { ...mockEntry, id: 'local-1' }
      const entriesMap = new Map([[localEntry.id, localEntry]])
      act(() => {
        useLogbookStore.setState({ entriesMap, entries: [localEntry] })
      })

      const serverEntries = [mockEntry]
      mockLogbookApi.getEntries.mockResolvedValue(serverEntries)
      mockSyncApi.push.mockResolvedValue({ success: true })

      await act(async () => {
        await useLogbookStore.getState().manualSync()
      })

      expect(mockLogbookApi.getEntries).toHaveBeenCalled()
      expect(mockSyncApi.push).toHaveBeenCalledWith({
        changes: {
          entries: [localEntry],
          goals: [],
        },
      })
      const state = useLogbookStore.getState()
      expect(state.entriesMap.size).toBe(2) // Both server and local entries should be present
      expect(state.entriesMap.has('entry-1')).toBe(true) // Server entry
      expect(state.entriesMap.has('local-1')).toBe(true) // Local entry should remain
      expect(state.isLocalMode).toBe(false)
      expect(state.syncError).toBeNull()
      expect(state.lastSyncTime).toBeTruthy()
    })

    it('should handle sync without auth token', async () => {
      // No auth token set

      await act(async () => {
        await useLogbookStore.getState().manualSync()
      })

      expect(mockLogbookApi.getEntries).not.toHaveBeenCalled()
      expect(useLogbookStore.getState().syncError).toBe(
        'Please sign in to sync with server'
      )
    })

    it('should handle sync failure', async () => {
      localStorageData['auth-token'] = 'valid-token'
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockLogbookApi.getEntries.mockRejectedValue(new Error('Network error'))

      await act(async () => {
        await useLogbookStore.getState().manualSync()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Manual sync failed:',
        expect.any(Error)
      )
      expect(useLogbookStore.getState().syncError).toBeTruthy()
      expect(useLogbookStore.getState().isSyncing).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    it('should merge local-only entries with server entries', async () => {
      localStorageData['auth-token'] = 'valid-token'

      // Add local entries
      const localEntry1 = { ...mockEntry, id: 'local-1' }
      const localEntry2 = { ...mockEntry, id: 'local-2' }
      const entriesMap = new Map([
        [localEntry1.id, localEntry1],
        [localEntry2.id, localEntry2],
      ])
      act(() => {
        useLogbookStore.setState({ entriesMap })
      })

      const serverEntries = [mockEntry]
      mockLogbookApi.getEntries.mockResolvedValue(serverEntries)
      mockSyncApi.push.mockResolvedValue({ success: true })

      await act(async () => {
        await useLogbookStore.getState().manualSync()
      })

      const state = useLogbookStore.getState()
      // Should have server entry + local entries
      expect(state.entriesMap.size).toBe(3)
      expect(state.entriesMap.has('entry-1')).toBe(true) // Server entry
      expect(state.entriesMap.has('local-1')).toBe(true) // Local entry
      expect(state.entriesMap.has('local-2')).toBe(true) // Local entry
      expect(mockSyncApi.push).toHaveBeenCalledWith({
        changes: {
          entries: [localEntry1, localEntry2],
          goals: [],
        },
      })
      expect(state.syncError).toBeNull()
    })
  })

  describe('WebSocket Sync', () => {
    let mockWebSocketSync: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockWebSocketSync = {
        connect: vi.fn().mockResolvedValue(true),
        disconnect: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
        getOfflineQueueSize: vi.fn().mockReturnValue(0),
      }
      ;(getWebSocketSync as ReturnType<typeof vi.fn>).mockReturnValue(
        mockWebSocketSync
      )
    })

    describe('initializeWebSocketSync', () => {
      it('should initialize WebSocket sync for authenticated users', async () => {
        localStorageData['auth-token'] = 'valid-token'
        localStorageData['mirubato:user'] = JSON.stringify({
          id: 'user-123',
          email: 'test@example.com',
        })

        act(() => {
          useLogbookStore.setState({ isLocalMode: false })
        })

        await act(async () => {
          await useLogbookStore.getState().initializeWebSocketSync()
        })

        const state = useLogbookStore.getState()
        expect(state.webSocketInitialized).toBe(true)
        expect(state.isRealtimeSyncEnabled).toBe(true)
        expect(mockWebSocketSync.connect).toHaveBeenCalledWith(
          'user-123',
          'valid-token'
        )
      })

      it('should not initialize if already initialized', async () => {
        localStorageData['auth-token'] = 'valid-token'
        act(() => {
          useLogbookStore.setState({
            isLocalMode: false,
            webSocketInitialized: true,
          })
        })

        await act(async () => {
          await useLogbookStore.getState().initializeWebSocketSync()
        })

        expect(mockWebSocketSync.connect).not.toHaveBeenCalled()
      })

      it('should not initialize in local mode', async () => {
        localStorageData['auth-token'] = 'valid-token'
        act(() => {
          useLogbookStore.setState({
            isLocalMode: true,
            webSocketInitialized: false, // Ensure it starts as false
          })
        })

        await act(async () => {
          await useLogbookStore.getState().initializeWebSocketSync()
        })

        expect(mockWebSocketSync.connect).not.toHaveBeenCalled()
        expect(useLogbookStore.getState().webSocketInitialized).toBe(false)
      })

      it('should handle WebSocket connection failure', async () => {
        localStorageData['auth-token'] = 'valid-token'
        localStorageData['mirubato:user'] = JSON.stringify({
          id: 'user-123',
          email: 'test@example.com',
        })
        mockWebSocketSync.connect.mockResolvedValue(false)

        act(() => {
          useLogbookStore.setState({
            isLocalMode: false,
            webSocketInitialized: false,
            isRealtimeSyncEnabled: false,
          })
        })

        const consoleWarnSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {})
        const consoleLogSpy = vi
          .spyOn(console, 'log')
          .mockImplementation(() => {})

        await act(async () => {
          await useLogbookStore.getState().initializeWebSocketSync()
        })

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('WebSocket sync initialization failed')
        )
        expect(useLogbookStore.getState().webSocketInitialized).toBe(false)

        consoleWarnSpy.mockRestore()
        consoleLogSpy.mockRestore()
      })
    })

    describe('Real-time sync events', () => {
      beforeEach(() => {
        act(() => {
          useLogbookStore.setState({
            isRealtimeSyncEnabled: true,
            realtimeSyncStatus: 'connected',
          })
        })
      })

      it('should send ENTRY_CREATED event when creating entry', async () => {
        const newEntry = {
          timestamp: '2024-01-01T00:00:00Z',
          duration: 30,
          type: 'PRACTICE' as const,
          instrument: 'PIANO' as const,
          pieces: [{ title: 'New Piece', composer: 'Composer' }],
          techniques: [],
          goalIds: [],
        }

        await act(async () => {
          await useLogbookStore.getState().createEntry(newEntry)
        })

        expect(mockWebSocketSync.send).toHaveBeenCalledWith({
          type: 'ENTRY_CREATED',
          entry: expect.objectContaining({
            id: 'test-id-123',
            duration: 30,
            type: 'PRACTICE',
            instrument: 'PIANO',
            timestamp: '2024-01-01T00:00:00Z',
          }),
          timestamp: expect.any(String),
        })
      })

      it('should send ENTRY_UPDATED event when updating entry', async () => {
        const existingEntry = { ...mockEntry, id: 'existing-1' }
        act(() => {
          useLogbookStore.setState({
            entriesMap: new Map([[existingEntry.id, existingEntry]]),
            isLocalMode: false, // Should be false to test WebSocket events
          })
        })

        const updates = { notes: 'Updated notes' }

        await act(async () => {
          await useLogbookStore
            .getState()
            .updateEntry(existingEntry.id, updates)
        })

        expect(mockWebSocketSync.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ENTRY_UPDATED',
            entry: expect.objectContaining({
              id: existingEntry.id,
              notes: 'Updated notes',
            }),
          })
        )
      })

      it('should send ENTRY_DELETED event when deleting entry', async () => {
        const existingEntry = { ...mockEntry, id: 'existing-1' }
        act(() => {
          useLogbookStore.setState({
            entriesMap: new Map([[existingEntry.id, existingEntry]]),
            isLocalMode: false, // Should be false to test WebSocket events
          })
        })

        await act(async () => {
          await useLogbookStore.getState().deleteEntry(existingEntry.id)
        })

        expect(mockWebSocketSync.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'ENTRY_DELETED',
            entryId: existingEntry.id,
          })
        )
      })
    })

    describe('Sync event handlers', () => {
      it('should handle incoming ENTRY_CREATED from other devices', () => {
        const newEntry: LogbookEntry = {
          ...mockEntry,
          id: 'remote-entry-1',
          updatedAt: new Date().toISOString(),
        }

        act(() => {
          useLogbookStore.getState().addEntryFromSync(newEntry)
        })

        const state = useLogbookStore.getState()
        expect(state.entriesMap.has('remote-entry-1')).toBe(true)
        expect(state.entriesMap.get('remote-entry-1')).toEqual(newEntry)
      })

      it('should not overwrite newer local entries', () => {
        const localEntry: LogbookEntry = {
          ...mockEntry,
          id: 'entry-1',
          notes: 'Local notes',
          updatedAt: new Date().toISOString(),
        }

        const olderRemoteEntry: LogbookEntry = {
          ...mockEntry,
          id: 'entry-1',
          notes: 'Remote notes',
          updatedAt: new Date(Date.now() - 10000).toISOString(),
        }

        act(() => {
          useLogbookStore.setState({
            entriesMap: new Map([[localEntry.id, localEntry]]),
          })
        })

        act(() => {
          useLogbookStore.getState().updateEntryFromSync(olderRemoteEntry)
        })

        const state = useLogbookStore.getState()
        expect(state.entriesMap.get('entry-1')?.notes).toBe('Local notes')
      })

      it('should handle incoming ENTRY_DELETED from other devices', () => {
        const existingEntry = { ...mockEntry, id: 'entry-to-delete' }
        act(() => {
          useLogbookStore.setState({
            entriesMap: new Map([[existingEntry.id, existingEntry]]),
          })
        })

        act(() => {
          useLogbookStore.getState().removeEntryFromSync('entry-to-delete')
        })

        const state = useLogbookStore.getState()
        expect(state.entriesMap.has('entry-to-delete')).toBe(false)
      })

      it('should merge bulk sync entries efficiently', () => {
        const existingEntry = {
          ...mockEntry,
          id: 'existing-1',
          updatedAt: new Date(Date.now() - 5000).toISOString(),
        }

        const newerEntry = {
          ...mockEntry,
          id: 'existing-1',
          notes: 'Updated from sync',
          updatedAt: new Date().toISOString(),
        }

        const newEntry = {
          ...mockEntry,
          id: 'new-entry-1',
          updatedAt: new Date().toISOString(),
        }

        act(() => {
          useLogbookStore.setState({
            entriesMap: new Map([[existingEntry.id, existingEntry]]),
          })
        })

        act(() => {
          useLogbookStore
            .getState()
            .mergeEntriesFromSync([newerEntry, newEntry])
        })

        const state = useLogbookStore.getState()
        expect(state.entriesMap.size).toBe(2)
        expect(state.entriesMap.get('existing-1')?.notes).toBe(
          'Updated from sync'
        )
        expect(state.entriesMap.has('new-entry-1')).toBe(true)
      })
    })
  })
})
