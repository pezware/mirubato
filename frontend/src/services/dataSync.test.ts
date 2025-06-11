import { ApolloClient, InMemoryCache } from '@apollo/client'
import { DataSyncService, createDataSyncService } from './dataSync'
import { localStorageService } from './localStorage'
import {
  LocalPracticeSession,
  PracticeLog,
  LocalUserData,
  SessionType,
  ActivityType,
  Instrument,
  Theme,
  NotationSize,
} from '@mirubato/shared/types'

// Mock localStorage service
jest.mock('./localStorage', () => ({
  localStorageService: {
    getPendingSyncData: jest.fn(),
    markAsSynced: jest.fn(),
    updateSessionRemoteId: jest.fn(),
    getRemoteSessionId: jest.fn(),
  },
}))

// Mock shared types validators and converters
jest.mock('@mirubato/shared/types', () => {
  const actual = jest.requireActual('@mirubato/shared/types')
  return {
    ...actual,
    DataValidator: {
      validateLocalPracticeSession: jest.fn().mockReturnValue(true),
      validatePracticeLog: jest.fn().mockReturnValue(true),
      validateUserPreferences: jest.fn().mockReturnValue(true),
    },
    DataConverters: {
      localSessionToDbSession: jest.fn(session => ({
        ...session,
        sessionType: session.sessionType,
        accuracyPercentage: session.accuracy * 100,
      })),
    },
  }
})

describe('DataSyncService', () => {
  let apolloClient: ApolloClient<unknown>
  let dataSyncService: DataSyncService
  let mutateSpy: jest.SpyInstance

  const mockSession: LocalPracticeSession = {
    id: 'local-session-1',
    userId: 'user-123',
    instrument: Instrument.PIANO,
    sessionType: SessionType.FREE_PRACTICE,
    startedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:30:00Z',
    pausedDuration: 0,
    accuracyPercentage: 85,
    notesAttempted: 100,
    notesCorrect: 85,
    sheetMusicId: 'sheet-1',
    isSynced: false,
  }

  const mockLog: PracticeLog = {
    id: 'log-1',
    sessionId: 'local-session-1',
    activityType: ActivityType.SIGHT_READING,
    durationSeconds: 300,
    tempoPracticed: 60,
    targetTempo: 80,
    focusAreas: ['rhythm', 'accuracy'],
    selfRating: 4,
    notes: 'Good practice session',
    createdAt: '2024-01-01T00:15:00Z',
  }

  const mockUserData: LocalUserData = {
    id: 'user-123',
    email: 'test@example.com',
    isAnonymous: false,
    primaryInstrument: Instrument.PIANO,
    hasCloudStorage: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    preferences: {
      theme: Theme.LIGHT,
      notationSize: NotationSize.MEDIUM,
      practiceReminders: true,
      dailyGoalMinutes: 30,
      customSettings: {},
    },
    stats: {
      totalPracticeTime: 7200,
      consecutiveDays: 5,
      piecesCompleted: 10,
      accuracyAverage: 85,
      lastPracticeDate: '2024-01-01',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    apolloClient = new ApolloClient({
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: { fetchPolicy: 'no-cache' },
        query: { fetchPolicy: 'no-cache' },
      },
    })

    mutateSpy = jest.spyOn(apolloClient, 'mutate')
    dataSyncService = new DataSyncService(apolloClient)
  })

  describe('syncAllPendingData', () => {
    it('should sync all pending sessions and logs successfully', async () => {
      // Mock pending data
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [mockSession],
        logs: [mockLog],
      })

      // Mock successful mutations
      mutateSpy
        .mockResolvedValueOnce({
          data: {
            startPracticeSession: {
              id: 'remote-session-1',
              user: { id: 'user-123' },
              instrument: 'PIANO',
              sessionType: 'FREE_PRACTICE',
              startedAt: mockSession.startedAt,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            completePracticeSession: {
              id: 'remote-session-1',
              completedAt: mockSession.completedAt,
              accuracy: 0.85,
              notesAttempted: 100,
              notesCorrect: 85,
            },
          },
        })
      const getRemoteSessionIdMock =
        localStorageService.getRemoteSessionId as jest.Mock
      getRemoteSessionIdMock.mockReturnValue('remote-session-1')

      mutateSpy.mockResolvedValueOnce({
        data: {
          createPracticeLog: {
            id: 'remote-log-1',
            session: { id: 'remote-session-1' },
            activityType: 'SIGHT_READING',
            durationSeconds: 300,
            createdAt: mockLog.createdAt,
          },
        },
      })

      const result = await dataSyncService.syncAllPendingData()

      expect(result).toEqual({
        sessionsSynced: 1,
        logsSynced: 1,
        errors: [],
      })

      expect(localStorageService.markAsSynced).toHaveBeenCalledWith(
        ['local-session-1'],
        ['log-1']
      )

      expect(localStorageService.updateSessionRemoteId).toHaveBeenCalledWith(
        'local-session-1',
        'remote-session-1'
      )
    })

    it('should handle session sync failures gracefully', async () => {
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [mockSession, { ...mockSession, id: 'local-session-2' }],
        logs: [],
      })

      // First session succeeds, second fails
      mutateSpy
        .mockResolvedValueOnce({
          data: {
            startPracticeSession: {
              id: 'remote-session-1',
              user: { id: 'user-123' },
              instrument: 'PIANO',
              sessionType: 'FREE_PRACTICE',
              startedAt: mockSession.startedAt,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            completePracticeSession: {
              id: 'remote-session-1',
              completedAt: mockSession.completedAt,
              accuracy: 0.85,
              notesAttempted: 100,
              notesCorrect: 85,
            },
          },
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const result = await dataSyncService.syncAllPendingData()

      expect(result.sessionsSynced).toBe(1)
      expect(result.logsSynced).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Network error')

      expect(localStorageService.markAsSynced).toHaveBeenCalledWith(
        ['local-session-1'],
        []
      )

      consoleError.mockRestore()
    })

    it('should handle log sync failures gracefully', async () => {
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [],
        logs: [mockLog, { ...mockLog, id: 'log-2' }],
      })
      const getRemoteSessionIdMock =
        localStorageService.getRemoteSessionId as jest.Mock
      getRemoteSessionIdMock.mockReturnValue('remote-session-1')

      // First log succeeds, second fails
      mutateSpy
        .mockResolvedValueOnce({
          data: {
            createPracticeLog: {
              id: 'remote-log-1',
              session: { id: 'remote-session-1' },
              activityType: 'SIGHT_READING',
              durationSeconds: 300,
              createdAt: mockLog.createdAt,
            },
          },
        })
        .mockRejectedValueOnce(new Error('Server error'))

      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const result = await dataSyncService.syncAllPendingData()

      expect(result.sessionsSynced).toBe(0)
      expect(result.logsSynced).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Server error')

      expect(localStorageService.markAsSynced).toHaveBeenCalledWith(
        [],
        ['log-1']
      )

      consoleError.mockRestore()
    })

    it('should handle empty pending data', async () => {
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [],
        logs: [],
      })

      const result = await dataSyncService.syncAllPendingData()

      expect(result).toEqual({
        sessionsSynced: 0,
        logsSynced: 0,
        errors: [],
      })

      expect(mutateSpy).not.toHaveBeenCalled()
      expect(localStorageService.markAsSynced).toHaveBeenCalledWith([], [])
    })

    it('should handle invalid session data', async () => {
      const { DataValidator } = jest.requireMock('@mirubato/shared/types')
      DataValidator.validateLocalPracticeSession.mockReturnValueOnce(false)
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [mockSession],
        logs: [],
      })

      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const result = await dataSyncService.syncAllPendingData()

      expect(result.sessionsSynced).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Invalid session data')

      consoleError.mockRestore()
    })

    it('should handle missing remote session ID for log sync', async () => {
      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [],
        logs: [mockLog],
      })
      const getRemoteSessionIdMock =
        localStorageService.getRemoteSessionId as jest.Mock
      getRemoteSessionIdMock.mockReturnValue(null)

      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const result = await dataSyncService.syncAllPendingData()

      expect(result.logsSynced).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('No remote session ID found')

      consoleError.mockRestore()
    })

    it('should handle session without completion', async () => {
      const incompleteSession = {
        ...mockSession,
        completedAt: undefined,
        accuracy: undefined,
        notesAttempted: undefined,
        notesCorrect: undefined,
      }

      const getPendingSyncDataMock =
        localStorageService.getPendingSyncData as jest.Mock
      getPendingSyncDataMock.mockReturnValue({
        sessions: [incompleteSession],
        logs: [],
      })

      mutateSpy.mockResolvedValueOnce({
        data: {
          startPracticeSession: {
            id: 'remote-session-1',
            user: { id: 'user-123' },
            instrument: 'PIANO',
            sessionType: 'FREE_PRACTICE',
            startedAt: incompleteSession.startedAt,
          },
        },
      })

      const result = await dataSyncService.syncAllPendingData()

      expect(result.sessionsSynced).toBe(1)
      expect(mutateSpy).toHaveBeenCalledTimes(1) // Only start, no complete
      expect(mutateSpy).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          input: {
            sessionType: 'FREE_PRACTICE',
            instrument: 'PIANO',
            sheetMusicId: 'sheet-1',
          },
        },
      })
    })
  })

  describe('syncUserPreferences', () => {
    it('should sync user preferences successfully', async () => {
      mutateSpy.mockResolvedValueOnce({
        data: {
          updateUser: {
            id: 'user-123',
            preferences: mockUserData.preferences,
          },
        },
      })

      await dataSyncService.syncUserPreferences(mockUserData)

      expect(mutateSpy).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          input: {
            preferences: mockUserData.preferences,
          },
        },
      })
    })

    it('should throw error for invalid preferences', async () => {
      const { DataValidator } = jest.requireMock('@mirubato/shared/types')
      DataValidator.validateUserPreferences.mockReturnValueOnce(false)

      await expect(
        dataSyncService.syncUserPreferences(mockUserData)
      ).rejects.toThrow('Invalid user preferences')
    })
  })

  describe('checkForConflicts', () => {
    it('should return no conflicts (TODO implementation)', async () => {
      const result = await dataSyncService.checkForConflicts()

      expect(result).toEqual({
        hasConflicts: false,
        conflicts: [],
      })
    })
  })

  describe('createDataSyncService', () => {
    it('should create a new DataSyncService instance', () => {
      const service = createDataSyncService(apolloClient)
      expect(service).toBeInstanceOf(DataSyncService)
    })
  })
})
