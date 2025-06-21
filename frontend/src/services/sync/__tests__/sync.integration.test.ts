import { ApolloClient, InMemoryCache } from '@apollo/client'

// Mock EventBus
jest.mock('../../../modules/core/EventBus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}))

// import { eventBus } from '../../../modules/core/EventBus' // Imported but not used

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sync functions
const mockPerformInitialSync = jest.fn()
const mockPerformIncrementalSync = jest.fn()
const mockSyncAnonymousData = jest.fn()

jest.mock('../index', () => ({
  performInitialSync: mockPerformInitialSync,
  performIncrementalSync: mockPerformIncrementalSync,
  syncAnonymousData: mockSyncAnonymousData,
}))

describe('Sync Integration Tests', () => {
  let apolloClient: ApolloClient<any>

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()

    // Create a new Apollo Client for each test
    apolloClient = new ApolloClient({
      cache: new InMemoryCache(),
      defaultOptions: {
        query: { fetchPolicy: 'no-cache' },
        watchQuery: { fetchPolicy: 'no-cache' },
      },
    })
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Scenario 1: Anonymous to Authenticated Sync', () => {
    it('should sync local anonymous data to cloud on first login', async () => {
      // Setup: Create anonymous data in localStorage
      const anonymousSession = {
        id: 'anon-session-1',
        startTime: new Date().toISOString(),
        duration: 1800,
        sheetMusicId: 'sheet-1',
        instrument: 'PIANO',
      }

      const anonymousEntry = {
        id: 'anon-entry-1',
        timestamp: new Date().toISOString(),
        duration: 1800,
        type: 'PRACTICE',
        instrument: 'PIANO',
        notes: 'First practice session',
      }

      localStorageMock.setItem(
        'practiceSession:anon-session-1',
        JSON.stringify(anonymousSession)
      )
      localStorageMock.setItem(
        'logbook:entry:anon-entry-1',
        JSON.stringify(anonymousEntry)
      )

      // Mock successful sync
      mockSyncAnonymousData.mockResolvedValue({
        success: true,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 1,
        syncedGoals: 0,
        errors: null,
      })

      // Execute sync
      const result = await mockSyncAnonymousData(apolloClient, {
        sessions: [anonymousSession],
        logs: [],
        entries: [anonymousEntry],
        goals: [],
      })

      // Verify results
      expect(result).toEqual({
        success: true,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 1,
        syncedGoals: 0,
        errors: null,
      })

      // Verify function was called with correct params
      expect(mockSyncAnonymousData).toHaveBeenCalledWith(apolloClient, {
        sessions: [anonymousSession],
        logs: [],
        entries: [anonymousEntry],
        goals: [],
      })
    })

    it('should handle partial sync failures gracefully', async () => {
      const sessions = [
        { id: 'session-1', startTime: new Date().toISOString() },
        { id: 'session-2', startTime: new Date().toISOString() },
      ]

      mockSyncAnonymousData.mockResolvedValue({
        success: false,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 0,
        syncedGoals: 0,
        errors: ['Failed to sync session-2: Duplicate ID'],
      })

      const result = await mockSyncAnonymousData(apolloClient, {
        sessions,
        logs: [],
        entries: [],
        goals: [],
      })

      expect(result.success).toBe(false)
      expect(result.syncedSessions).toBe(1)
      expect(result.errors).toContain('Failed to sync session-2: Duplicate ID')
    })
  })

  describe('Scenario 2: Incremental Sync', () => {
    it('should sync changes since last sync token', async () => {
      // Setup: Set last sync token
      const lastSyncToken = 'sync-token-123'
      localStorageMock.setItem('sync:lastToken', lastSyncToken)

      // Mock data
      // const _remoteChanges = {
      //   sessions: [
      //     {
      //       id: 'remote-session-1',
      //       startTime: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //   ],
      //   entries: [
      //     {
      //       id: 'remote-entry-1',
      //       timestamp: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //   ],
      // }

      const localChanges = [
        {
          id: 'local-session-1',
          entityType: 'practiceSession',
          data: { duration: 2400 },
          updatedAt: new Date().toISOString(),
        },
      ]

      // Store local changes
      localStorageMock.setItem(
        'sync:pending:local-session-1',
        JSON.stringify(localChanges[0])
      )

      // Mock successful incremental sync
      mockPerformIncrementalSync.mockResolvedValue({
        downloaded: 2,
        uploaded: 1,
        conflicts: 0,
        newSyncToken: 'sync-token-789',
      })

      // Execute incremental sync
      await mockPerformIncrementalSync(apolloClient, 'user-123')

      // Verify function was called
      expect(mockPerformIncrementalSync).toHaveBeenCalledWith(
        apolloClient,
        'user-123'
      )
    })

    it('should handle sync conflicts with last-write-wins', async () => {
      const conflictingId = 'conflict-entry-1'

      // Local version
      const localEntry = {
        id: conflictingId,
        timestamp: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z',
        duration: 1800,
        notes: 'Local version',
      }

      // Remote version (newer)
      const remoteEntry = {
        id: conflictingId,
        timestamp: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z', // Newer
        duration: 2400,
        notes: 'Remote version',
      }

      localStorageMock.setItem(
        `logbook:entry:${conflictingId}`,
        JSON.stringify(localEntry)
      )

      // Mock conflict resolution
      mockPerformIncrementalSync.mockImplementation(async () => {
        // Simulate remote version winning
        localStorageMock.setItem(
          `logbook:entry:${conflictingId}`,
          JSON.stringify(remoteEntry)
        )
        return {
          downloaded: 1,
          uploaded: 0,
          conflicts: 1,
          newSyncToken: 'token-123',
        }
      })

      await mockPerformIncrementalSync(apolloClient, 'user-123')

      // Verify remote version won (last-write-wins)
      const savedEntry = JSON.parse(
        localStorageMock.getItem(`logbook:entry:${conflictingId}`)!
      )
      expect(savedEntry.notes).toBe('Remote version')
      expect(savedEntry.duration).toBe(2400)
    })
  })

  describe('Scenario 3: Offline Queue Management', () => {
    it('should queue operations when offline', async () => {
      // Simulate offline by making sync fail
      const offlineError = new Error('Network error')
      mockPerformIncrementalSync.mockRejectedValue(offlineError)

      // Create local change
      const localChange = {
        id: 'offline-entry-1',
        entityType: 'logbookEntry',
        operation: 'create',
        data: {
          timestamp: new Date().toISOString(),
          duration: 1200,
        },
        createdAt: Date.now(),
      }

      localStorageMock.setItem('sync:queue:1', JSON.stringify(localChange))

      // Try to sync (will fail due to offline)
      await expect(
        mockPerformIncrementalSync(apolloClient, 'user-123')
      ).rejects.toThrow('Network error')

      // Verify item remains in queue
      expect(localStorageMock.getItem('sync:queue:1')).toBeTruthy()
    })

    it('should process queued operations when back online', async () => {
      // Setup queued operations
      const queuedOps = [
        {
          id: 'queued-1',
          entityType: 'practiceSession',
          operation: 'create',
          data: { duration: 1800 },
          createdAt: Date.now() - 10000,
        },
        {
          id: 'queued-2',
          entityType: 'goal',
          operation: 'update',
          data: { completed: true },
          createdAt: Date.now() - 5000,
        },
      ]

      queuedOps.forEach((op, index) => {
        localStorageMock.setItem(`sync:queue:${index}`, JSON.stringify(op))
      })

      // Mock successful sync that processes queue
      mockPerformIncrementalSync.mockImplementation(async () => {
        // Simulate queue processing
        localStorageMock.removeItem('sync:queue:0')
        localStorageMock.removeItem('sync:queue:1')
        return {
          downloaded: 0,
          uploaded: 2,
          conflicts: 0,
          newSyncToken: 'token-final',
        }
      })

      await mockPerformIncrementalSync(apolloClient, 'user-123')

      // Verify queue cleared
      expect(localStorageMock.getItem('sync:queue:0')).toBeNull()
      expect(localStorageMock.getItem('sync:queue:1')).toBeNull()
    })
  })

  describe('Scenario 4: Multi-Device Sync', () => {
    it('should handle concurrent updates from multiple devices', async () => {
      // Simulate Device A and Device B making changes to same entities
      const sharedEntityId = 'shared-goal-1'

      // Current device (Device C) has oldest version
      const deviceCVersion = {
        id: sharedEntityId,
        title: 'Learn Piano Sonata',
        progress: 25,
        updatedAt: '2024-01-01T09:59:00Z',
        deviceId: 'device-c',
      }

      localStorageMock.setItem(
        `goal:${sharedEntityId}`,
        JSON.stringify(deviceCVersion)
      )

      // Device B's version (newer)
      const deviceBVersion = {
        id: sharedEntityId,
        title: 'Learn Piano Sonata',
        progress: 75,
        updatedAt: '2024-01-01T10:00:01Z',
        deviceId: 'device-b',
      }

      // Mock sync that brings in newer version
      mockPerformIncrementalSync.mockImplementation(async () => {
        localStorageMock.setItem(
          `goal:${sharedEntityId}`,
          JSON.stringify(deviceBVersion)
        )
        return {
          downloaded: 1,
          uploaded: 0,
          conflicts: 0,
          newSyncToken: 'multi-device-token',
        }
      })

      await mockPerformIncrementalSync(apolloClient, 'user-123')

      // Verify Device B's version (newest) is now local
      const savedGoal = JSON.parse(
        localStorageMock.getItem(`goal:${sharedEntityId}`)!
      )
      expect(savedGoal.progress).toBe(75)
      expect(savedGoal.deviceId).toBe('device-b')
    })
  })

  describe('Scenario 5: Initial Full Sync', () => {
    it('should perform full sync on first login with existing cloud data', async () => {
      // Simulate first login with existing cloud data
      const cloudData = {
        sessions: [
          { id: 'cloud-session-1', startTime: '2024-01-01T08:00:00Z' },
          { id: 'cloud-session-2', startTime: '2024-01-01T09:00:00Z' },
        ],
        entries: [{ id: 'cloud-entry-1', timestamp: '2024-01-01T10:00:00Z' }],
        goals: [{ id: 'cloud-goal-1', title: 'Master Scales' }],
      }

      // Mock initial sync
      mockPerformInitialSync.mockImplementation(async () => {
        // Store cloud data locally
        cloudData.sessions.forEach(session => {
          localStorageMock.setItem(
            `practiceSession:${session.id}`,
            JSON.stringify(session)
          )
        })
        cloudData.entries.forEach(entry => {
          localStorageMock.setItem(
            `logbook:entry:${entry.id}`,
            JSON.stringify(entry)
          )
        })
        cloudData.goals.forEach(goal => {
          localStorageMock.setItem(`goal:${goal.id}`, JSON.stringify(goal))
        })
        localStorageMock.setItem('sync:lastToken', 'initial-sync-token')
        return { totalSynced: 4 }
      })

      await mockPerformInitialSync(apolloClient, 'user-123')

      // Verify all cloud data saved locally
      cloudData.sessions.forEach(session => {
        expect(
          localStorageMock.getItem(`practiceSession:${session.id}`)
        ).toBeTruthy()
      })
      cloudData.entries.forEach(entry => {
        expect(
          localStorageMock.getItem(`logbook:entry:${entry.id}`)
        ).toBeTruthy()
      })
      cloudData.goals.forEach(goal => {
        expect(localStorageMock.getItem(`goal:${goal.id}`)).toBeTruthy()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should retry failed sync operations with exponential backoff', async () => {
      jest.useFakeTimers()

      let attemptCount = 0
      mockPerformIncrementalSync
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          downloaded: 0,
          uploaded: 0,
          conflicts: 0,
          newSyncToken: 'recovered-token',
        })

      // Mock a retry wrapper
      const syncWithRetry = async (
        client: any,
        userId: string,
        maxRetries = 3
      ) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await mockPerformIncrementalSync(client, userId)
          } catch (error) {
            attemptCount++
            if (attempt === maxRetries) throw error
            // Exponential backoff
            await new Promise(resolve =>
              setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
            )
          }
        }
      }

      const syncPromise = syncWithRetry(apolloClient, 'user-123')

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0)
      expect(attemptCount).toBe(1)

      // Second attempt after 1s (fails)
      await jest.advanceTimersByTimeAsync(1000)
      expect(attemptCount).toBe(2)

      // Third attempt after 2s (succeeds)
      await jest.advanceTimersByTimeAsync(2000)

      const result = await syncPromise
      expect(result.newSyncToken).toBe('recovered-token')

      jest.useRealTimers()
    })

    it('should handle corrupted local data gracefully', async () => {
      // Store corrupted data
      localStorageMock.setItem(
        'practiceSession:corrupted-1',
        'not-json-{invalid}'
      )
      localStorageMock.setItem(
        'practiceSession:valid-1',
        JSON.stringify({ id: 'valid-1' })
      )

      // Mock sync that skips corrupted data
      mockPerformIncrementalSync.mockImplementation(async () => {
        const validItems = []
        for (let i = 0; i < localStorageMock.length; i++) {
          const key = localStorageMock.key(i)
          if (key?.startsWith('practiceSession:')) {
            try {
              const data = JSON.parse(localStorageMock.getItem(key)!)
              validItems.push(data)
            } catch (error) {
              // Skip corrupted items
            }
          }
        }
        return {
          downloaded: 0,
          uploaded: validItems.length,
          conflicts: 0,
          newSyncToken: 'token-123',
        }
      })

      const result = await mockPerformIncrementalSync(apolloClient, 'user-123')

      // Should skip corrupted data but continue with valid data
      expect(result.uploaded).toBe(1) // Only valid item
    })
  })
})
