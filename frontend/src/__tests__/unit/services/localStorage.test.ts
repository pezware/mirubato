import { localStorageService } from '../../../services/localStorage'
import {
  Instrument,
  Theme,
  NotationSize,
  SessionType,
  ActivityType,
} from '@mirubato/shared/types'

describe('localStorageService', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Anonymous User Management', () => {
    it('should create anonymous user on first visit', () => {
      const userData = localStorageService.createAnonymousUser()

      expect(userData).toMatchObject({
        email: '',
        isAnonymous: true,
        primaryInstrument: Instrument.PIANO,
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
          notificationSettings: {
            practiceReminders: false,
            emailUpdates: false,
          },
          practiceSettings: {
            defaultSessionDuration: 30,
            defaultTempo: 120,
            metronomeSoundEnabled: true,
          },
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
          lastPracticeDate: null,
          averageAccuracy: 0,
        },
      })
      expect(userData.id).toMatch(/^anon_/)
      expect(userData.createdAt).toBeDefined()
      expect(userData.updatedAt).toBeDefined()
    })

    it('should persist anonymous user data', () => {
      const userData = localStorageService.createAnonymousUser()
      localStorageService.setUserData(userData)

      const retrievedData = localStorageService.getUserData()
      expect(retrievedData).toEqual(userData)
    })

    it('should initialize anonymous user on getUserData if none exists', () => {
      // Clear any existing data first
      localStorage.clear()

      const userData = localStorageService.getUserData()

      expect(userData).toBeDefined()
      expect(userData?.isAnonymous).toBe(true)
      expect(userData?.email).toBe('')
    })
  })

  describe('Authenticated User Management', () => {
    it('should update user data for authenticated user', () => {
      const authenticatedUser = {
        id: 'user_123',
        email: 'test@example.com',
        isAnonymous: false,
        displayName: 'Test User',
        primaryInstrument: Instrument.GUITAR,
        hasCloudStorage: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        preferences: {
          theme: Theme.DARK,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: true,
          dailyGoalMinutes: 45,
          notificationSettings: {
            practiceReminders: true,
            emailUpdates: true,
          },
          practiceSettings: {
            defaultSessionDuration: 45,
            defaultTempo: 100,
            metronomeSoundEnabled: false,
          },
        },
        stats: {
          totalPracticeTime: 3600,
          consecutiveDays: 5,
          piecesCompleted: 0,
          accuracyAverage: 85,
          lastPracticeDate: new Date().toISOString().split('T')[0],
          averageAccuracy: 85,
        },
      }

      localStorageService.setUserData(authenticatedUser)
      const retrievedData = localStorageService.getUserData()

      expect(retrievedData).toEqual(authenticatedUser)
      expect(retrievedData?.isAnonymous).toBe(false)
    })

    it('should clear all local data on clearAllData', () => {
      // Set up some data
      const userData = localStorageService.createAnonymousUser()
      localStorageService.setUserData(userData)

      const session = {
        id: 'session_1',
        userId: userData.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }
      localStorageService.savePracticeSession(session)

      // Clear all data
      localStorageService.clearAllData()

      // Verify everything is cleared
      expect(localStorage.getItem('mirubato_user_data')).toBeNull()
      expect(localStorage.getItem('mirubato_practice_sessions')).toBeNull()
      expect(localStorage.getItem('mirubato_practice_logs')).toBeNull()
      expect(localStorage.getItem('mirubato_pending_sync')).toBeNull()
    })
  })

  describe('Practice Session Management', () => {
    it('should save practice session', () => {
      const userData = localStorageService.getUserData()
      const session = {
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pausedDuration: 300, // 5 minutes paused
        accuracyPercentage: 87.5,
        notesAttempted: 100,
        notesCorrect: 87,
        isSynced: false,
      }

      localStorageService.savePracticeSession(session)
      const sessions = localStorageService.getPracticeSessions()

      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(session)
    })

    it('should update user stats when saving completed session', () => {
      const userData = localStorageService.getUserData()
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes later

      const session = {
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        pausedDuration: 300, // 5 minutes paused
        accuracyPercentage: 90,
        notesAttempted: 100,
        notesCorrect: 90,
        isSynced: false,
      }

      localStorageService.savePracticeSession(session)
      const updatedUserData = localStorageService.getUserData()

      // Should update total practice time (30 minutes - 5 minutes paused = 25 minutes = 1500 seconds)
      expect(updatedUserData?.stats.totalPracticeTime).toBe(1500)
      // Should update average accuracy
      expect(updatedUserData?.stats.accuracyAverage).toBe(90)
      // Should update consecutive days
      expect(updatedUserData?.stats.consecutiveDays).toBe(1)
      // Should update last practice date
      expect(updatedUserData?.stats.lastPracticeDate).toBe(
        new Date().toISOString().split('T')[0]
      )
    })

    it('should handle multiple sessions for average accuracy', () => {
      const userData = localStorageService.getUserData()

      // Save first session with 80% accuracy
      localStorageService.savePracticeSession({
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pausedDuration: 0,
        accuracyPercentage: 80,
        notesAttempted: 100,
        notesCorrect: 80,
        isSynced: false,
      })

      // Save second session with 90% accuracy
      localStorageService.savePracticeSession({
        id: 'session_2',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.GUIDED_PRACTICE,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        pausedDuration: 0,
        accuracyPercentage: 90,
        notesAttempted: 100,
        notesCorrect: 90,
        isSynced: false,
      })

      const updatedUserData = localStorageService.getUserData()
      // Average of 80 and 90 should be 85
      expect(updatedUserData?.stats.accuracyAverage).toBe(85)
    })
  })

  describe('Practice Log Management', () => {
    it('should save practice log', () => {
      const log = {
        id: 'log_1',
        sessionId: 'session_1',
        activityType: ActivityType.SIGHT_READING,
        durationSeconds: 600,
        tempoPracticed: 120,
        targetTempo: 140,
        focusAreas: ['rhythm', 'dynamics'],
        selfRating: 7,
        notes: 'Good progress on sight reading',
        createdAt: new Date().toISOString(),
      }

      localStorageService.savePracticeLog(log)
      const logs = localStorageService.getPracticeLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0]).toEqual(log)
    })

    it('should get logs by session ID', () => {
      const sessionId = 'session_1'
      const logs = [
        {
          id: 'log_1',
          sessionId,
          activityType: ActivityType.SIGHT_READING,
          durationSeconds: 300,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log_2',
          sessionId,
          activityType: ActivityType.SCALES,
          durationSeconds: 300,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log_3',
          sessionId: 'session_2',
          activityType: ActivityType.REPERTOIRE,
          durationSeconds: 600,
          createdAt: new Date().toISOString(),
        },
      ]

      logs.forEach(log => localStorageService.savePracticeLog(log))
      const sessionLogs = localStorageService.getLogsBySessionId(sessionId)

      expect(sessionLogs).toHaveLength(2)
      expect(sessionLogs.map(l => l.id)).toEqual(['log_1', 'log_2'])
    })
  })

  describe('Sync Management', () => {
    it('should get pending sync data for unsynced items', () => {
      const userData = localStorageService.getUserData()

      // Save some unsynced sessions
      const unsyncedSession = {
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }

      const syncedSession = {
        ...unsyncedSession,
        id: 'session_2',
        isSynced: true,
      }

      localStorageService.savePracticeSession(unsyncedSession)
      localStorageService.savePracticeSession(syncedSession)

      // Save some logs
      const unsyncedLog = {
        id: 'log_1',
        sessionId: 'session_1',
        activityType: ActivityType.SIGHT_READING,
        durationSeconds: 300,
        createdAt: new Date().toISOString(),
      }

      localStorageService.savePracticeLog(unsyncedLog)

      const pendingData = localStorageService.getPendingSyncData()

      expect(pendingData.sessions).toHaveLength(1)
      expect(pendingData.sessions[0].id).toBe('session_1')
      expect(pendingData.logs).toHaveLength(1)
      expect(pendingData.logs[0].id).toBe('log_1')
    })

    it('should mark items as synced', () => {
      const userData = localStorageService.getUserData()

      // Save unsynced items
      const session1 = {
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }

      const session2 = {
        ...session1,
        id: 'session_2',
      }

      localStorageService.savePracticeSession(session1)
      localStorageService.savePracticeSession(session2)

      // Mark session1 as synced
      localStorageService.markAsSynced(['session_1'], [])

      const sessions = localStorageService.getPracticeSessions()
      const syncedSession = sessions.find(s => s.id === 'session_1')
      const unsyncedSession = sessions.find(s => s.id === 'session_2')

      expect(syncedSession?.isSynced).toBe(true)
      expect(unsyncedSession?.isSynced).toBe(false)
    })

    it('should handle migration from anonymous to authenticated user', () => {
      // Create anonymous user with some data
      const anonUser = localStorageService.getUserData()
      const anonSession = {
        id: 'anon_session_1',
        userId: anonUser!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }
      localStorageService.savePracticeSession(anonSession)

      // Simulate authentication by updating user data
      const authUserId = 'auth_user_123'
      localStorageService.migrateToAuthenticatedUser(
        authUserId,
        'test@example.com'
      )

      const updatedUser = localStorageService.getUserData()
      const sessions = localStorageService.getPracticeSessions()

      // User should be updated
      expect(updatedUser?.id).toBe(authUserId)
      expect(updatedUser?.email).toBe('test@example.com')
      expect(updatedUser?.isAnonymous).toBe(false)

      // Sessions should be migrated to new user ID
      expect(sessions[0].userId).toBe(authUserId)
      expect(sessions[0].isSynced).toBe(false) // Still needs to be synced
    })
  })

  describe('User Preferences', () => {
    it('should update user preferences', () => {
      localStorageService.getUserData() // Initialize user
      const newPreferences = {
        theme: Theme.DARK,
        notationSize: NotationSize.MEDIUM,
        practiceReminders: true,
        dailyGoalMinutes: 45,
        notificationSettings: {
          practiceReminders: true,
          emailUpdates: false,
        },
        practiceSettings: {
          defaultSessionDuration: 45,
          defaultTempo: 100,
          metronomeSoundEnabled: false,
        },
      }

      localStorageService.updateUserPreferences(newPreferences)
      const updatedUser = localStorageService.getUserData()

      expect(updatedUser?.preferences).toEqual(newPreferences)
    })

    it('should update primary instrument', () => {
      expect(localStorageService.getUserData()?.primaryInstrument).toBe(
        Instrument.PIANO
      )

      localStorageService.updatePrimaryInstrument(Instrument.GUITAR)
      const updatedUser = localStorageService.getUserData()

      expect(updatedUser?.primaryInstrument).toBe(Instrument.GUITAR)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupt localStorage data gracefully', () => {
      // Set corrupt data
      localStorage.setItem('mirubato_user_data', 'invalid json{')

      const userData = localStorageService.getUserData()

      // Should create new anonymous user instead of crashing
      expect(userData).toBeDefined()
      expect(userData?.isAnonymous).toBe(true)
    })

    it('should handle missing required fields in stored data', () => {
      const incompleteData = {
        id: 'user_123',
        email: 'test@example.com',
        // Missing required fields
      }
      localStorage.setItem('mirubato_user_data', JSON.stringify(incompleteData))

      const userData = localStorageService.getUserData()

      // Should create new anonymous user if data is invalid
      expect(userData).toBeDefined()
      expect(userData?.isAnonymous).toBe(true)
      expect(userData?.email).toBe('') // Anonymous users have empty email
    })

    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')
      mockSetItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const userData = localStorageService.getUserData()
      const session = {
        id: 'session_1',
        userId: userData!.id,
        instrument: Instrument.PIANO,
        sessionType: SessionType.FREE_PRACTICE,
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }

      // Should not throw, but handle gracefully
      expect(() => {
        localStorageService.savePracticeSession(session)
      }).not.toThrow()

      mockSetItem.mockRestore()
    })

    it('should filter out invalid sessions when retrieving', () => {
      // Restore setItem if it was mocked in previous test
      if (jest.isMockFunction(Storage.prototype.setItem)) {
        jest.spyOn(Storage.prototype, 'setItem').mockRestore()
      }

      const validSession = {
        id: 'session_1',
        userId: 'user_123',
        instrument: Instrument.PIANO,
        sessionType: 'FREE_PRACTICE',
        startedAt: new Date().toISOString(),
        pausedDuration: 0,
        notesAttempted: 100,
        notesCorrect: 85,
        isSynced: false,
      }

      const invalidSession = {
        id: 'session_2',
        // Missing required fields
        instrument: 'INVALID_INSTRUMENT',
      }

      localStorage.setItem(
        'mirubato_practice_sessions',
        JSON.stringify([validSession, invalidSession])
      )

      const sessions = localStorageService.getPracticeSessions()

      // Should only return valid sessions
      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe('session_1')
    })
  })
})
