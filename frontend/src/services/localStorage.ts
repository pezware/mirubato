// Local storage service for managing user data (both anonymous and authenticated)
import {
  Instrument,
  Theme,
  LocalPracticeSession,
  PracticeLog,
  LocalUserData,
  UserPreferences,
} from '@mirubato/shared/types'

// Re-export types for backward compatibility
export type {
  UserPreferences,
  UserStats,
  PracticeLog,
  LocalUserData,
} from '@mirubato/shared/types'
export type PracticeSession = LocalPracticeSession

const STORAGE_KEYS = {
  USER_DATA: 'mirubato_user_data',
  PRACTICE_SESSIONS: 'mirubato_practice_sessions',
  PRACTICE_LOGS: 'mirubato_practice_logs',
  PENDING_SYNC: 'mirubato_pending_sync',
}

class LocalStorageService {
  // User Data Management
  getUserData(): LocalUserData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA)
      if (!data) {
        // Initialize anonymous user if no data exists
        const anonymousUser = this.createAnonymousUser()
        this.setUserData(anonymousUser)
        return anonymousUser
      }
      const userData = JSON.parse(data)

      // Validate required fields
      if (
        !userData.id ||
        typeof userData.isAnonymous !== 'boolean' ||
        !userData.preferences ||
        !userData.stats
      ) {
        // Create new anonymous user if data is invalid
        const anonymousUser = this.createAnonymousUser()
        this.setUserData(anonymousUser)
        return anonymousUser
      }

      return userData
    } catch (error) {
      console.error('Error parsing user data:', error)
      // Create new anonymous user if data is corrupted
      const anonymousUser = this.createAnonymousUser()
      this.setUserData(anonymousUser)
      return anonymousUser
    }
  }

  setUserData(userData: LocalUserData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
    } catch (error) {
      console.error('Error saving user data:', error)
      // Silently fail for quota exceeded errors
    }
  }

  createAnonymousUser(): LocalUserData {
    const now = new Date().toISOString()
    const anonymousUser: LocalUserData = {
      id: `anon_${crypto.randomUUID()}`,
      email: '', // Empty for anonymous users
      isAnonymous: true,
      primaryInstrument: Instrument.PIANO,
      createdAt: now,
      updatedAt: now,
      preferences: {
        theme: Theme.AUTO,
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
        lastPracticeDate: null,
        averageAccuracy: 0,
      },
    }
    this.setUserData(anonymousUser)
    return anonymousUser
  }

  // Practice Sessions Management
  getPracticeSessions(): PracticeSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_SESSIONS)
      if (!data) return []

      const sessions = JSON.parse(data)
      if (!Array.isArray(sessions)) return []

      // Filter out invalid sessions
      return sessions.filter(session => {
        return (
          session &&
          session.id &&
          session.userId &&
          session.instrument &&
          session.sessionType &&
          session.startedAt &&
          typeof session.pausedDuration === 'number' &&
          typeof session.notesAttempted === 'number' &&
          typeof session.notesCorrect === 'number' &&
          // Validate enum values
          ['PIANO', 'GUITAR'].includes(session.instrument) &&
          ['FREE_PRACTICE', 'GUIDED_PRACTICE', 'ASSESSMENT'].includes(
            session.sessionType
          )
        )
      })
    } catch (error) {
      console.error('Error parsing practice sessions:', error)
      return []
    }
  }

  savePracticeSession(session: PracticeSession): void {
    try {
      const sessions = this.getPracticeSessions()
      const index = sessions.findIndex(s => s.id === session.id)

      if (index >= 0) {
        sessions[index] = session
      } else {
        sessions.push(session)
      }

      localStorage.setItem(
        STORAGE_KEYS.PRACTICE_SESSIONS,
        JSON.stringify(sessions)
      )

      // Update user stats
      this.updateUserStats(session)
    } catch (error) {
      console.error('Error saving practice session:', error)
      // Silently fail for quota exceeded errors
    }
  }

  // Practice Logs Management
  getPracticeLogs(sessionId?: string): PracticeLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_LOGS)
    const logs: PracticeLog[] = data ? JSON.parse(data) : []

    if (sessionId) {
      return logs.filter(log => log.sessionId === sessionId)
    }

    return logs
  }

  savePracticeLog(log: PracticeLog): void {
    const logs = this.getPracticeLogs()
    logs.push(log)
    localStorage.setItem(STORAGE_KEYS.PRACTICE_LOGS, JSON.stringify(logs))
  }

  getLogsBySessionId(sessionId: string): PracticeLog[] {
    const logs = this.getPracticeLogs()
    return logs.filter(log => log.sessionId === sessionId)
  }

  // User Stats Update
  private updateUserStats(session: PracticeSession): void {
    const userData = this.getUserData()
    if (!userData) return

    // Update total practice time
    if (session.completedAt) {
      const duration =
        (new Date(session.completedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          1000 -
        session.pausedDuration
      userData.stats.totalPracticeTime += duration
    }

    // Update last practice date and consecutive days
    const today = new Date().toISOString().split('T')[0]
    const lastPractice = userData.stats.lastPracticeDate

    if (!lastPractice || lastPractice !== today) {
      userData.stats.lastPracticeDate = today

      if (lastPractice) {
        const lastDate = new Date(lastPractice)
        const todayDate = new Date(today)
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays === 1) {
          userData.stats.consecutiveDays += 1
        } else {
          userData.stats.consecutiveDays = 1
        }
      } else {
        userData.stats.consecutiveDays = 1
      }
    }

    // Update average accuracy
    if (session.accuracyPercentage !== undefined) {
      const sessions = this.getPracticeSessions().filter(
        s => s.accuracyPercentage !== undefined
      )
      const totalAccuracy = sessions.reduce(
        (sum, s) => sum + (s.accuracyPercentage || 0),
        0
      )
      userData.stats.averageAccuracy = totalAccuracy / sessions.length
    }

    this.setUserData(userData)
  }

  // Sync Management for Authenticated Users
  getPendingSyncData(): {
    sessions: PracticeSession[]
    logs: PracticeLog[]
  } {
    // Get all unsynced sessions
    const sessions = this.getPracticeSessions().filter(s => !s.isSynced)

    // For now, we consider all logs as needing sync
    // In a real implementation, we'd track sync status for logs too
    const logs = this.getPracticeLogs()

    return { sessions, logs }
  }

  markAsSynced(sessionIds: string[], logIds: string[]): void {
    // Update sessions
    const sessions = this.getPracticeSessions()
    sessions.forEach(session => {
      if (sessionIds.includes(session.id)) {
        session.isSynced = true
      }
    })
    localStorage.setItem(
      STORAGE_KEYS.PRACTICE_SESSIONS,
      JSON.stringify(sessions)
    )

    // Clear pending sync data
    const pendingData = this.getPendingSyncData()
    pendingData.sessions = pendingData.sessions.filter(
      s => !sessionIds.includes(s.id)
    )
    pendingData.logs = pendingData.logs.filter(l => !logIds.includes(l.id))
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pendingData))
  }

  // Migration from anonymous to authenticated user
  migrateToAuthenticatedUser(authenticatedUserId: string, email: string): void {
    const userData = this.getUserData()
    if (userData && userData.isAnonymous) {
      // Update user data
      userData.id = authenticatedUserId
      userData.email = email
      userData.isAnonymous = false
      userData.lastSyncedAt = new Date().toISOString()
      this.setUserData(userData)

      // Mark all sessions for sync
      const sessions = this.getPracticeSessions()
      sessions.forEach(session => {
        session.userId = authenticatedUserId
        session.isSynced = false
      })
      localStorage.setItem(
        STORAGE_KEYS.PRACTICE_SESSIONS,
        JSON.stringify(sessions)
      )

      // Prepare sync data
      const logs = this.getPracticeLogs()
      localStorage.setItem(
        STORAGE_KEYS.PENDING_SYNC,
        JSON.stringify({ sessions, logs })
      )
    }
  }

  // Update user preferences
  updateUserPreferences(preferences: UserPreferences): void {
    const userData = this.getUserData()
    if (userData) {
      userData.preferences = preferences
      userData.updatedAt = new Date().toISOString()
      this.setUserData(userData)
    }
  }

  // Update primary instrument
  updatePrimaryInstrument(instrument: Instrument): void {
    const userData = this.getUserData()
    if (userData) {
      userData.primaryInstrument = instrument
      userData.updatedAt = new Date().toISOString()
      this.setUserData(userData)
    }
  }

  // Clear all local data (for logout or data reset)
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // Export user data (for backup)
  exportUserData(): string {
    const data = {
      userData: this.getUserData(),
      sessions: this.getPracticeSessions(),
      logs: this.getPracticeLogs(),
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }

  // Import user data (restore from backup)
  importUserData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)

      if (data.userData) {
        this.setUserData(data.userData)
      }

      if (data.sessions) {
        localStorage.setItem(
          STORAGE_KEYS.PRACTICE_SESSIONS,
          JSON.stringify(data.sessions)
        )
      }

      if (data.logs) {
        localStorage.setItem(
          STORAGE_KEYS.PRACTICE_LOGS,
          JSON.stringify(data.logs)
        )
      }

      return true
    } catch (error) {
      console.error('Failed to import user data:', error)
      return false
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService()
