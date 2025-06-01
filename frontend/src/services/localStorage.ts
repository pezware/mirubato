// Local storage service for managing user data (both anonymous and authenticated)

export interface LocalUserData {
  id: string // For anonymous users, this will be a local UUID
  isAnonymous: boolean
  displayName?: string
  primaryInstrument: 'PIANO' | 'GUITAR'
  preferences: UserPreferences
  stats: UserStats
  lastSyncedAt?: string // ISO date string, only for authenticated users
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  notificationSettings: {
    practiceReminders: boolean
    emailUpdates: boolean
  }
  practiceSettings: {
    defaultSessionDuration: number // in minutes
    defaultTempo: number
    metronomeSoundEnabled: boolean
  }
}

export interface UserStats {
  totalPracticeTime: number // in seconds
  consecutiveDays: number
  lastPracticeDate?: string // ISO date string
  averageAccuracy: number
}

export interface PracticeSession {
  id: string
  userId: string
  instrument: 'PIANO' | 'GUITAR'
  sheetMusicId?: string
  sheetMusicTitle?: string
  startedAt: string // ISO date string
  completedAt?: string // ISO date string
  duration: number // in seconds
  accuracy?: number
  notesAttempted: number
  notesCorrect: number
  isSynced: boolean // false for local-only sessions
}

export interface PracticeLog {
  id: string
  sessionId: string
  activityType: 'practice' | 'sight-reading' | 'technique' | 'repertoire'
  durationSeconds: number
  tempoPracticed?: number
  targetTempo?: number
  focusAreas?: string[]
  selfRating?: number // 1-5
  notes?: string
  createdAt: string // ISO date string
}

const STORAGE_KEYS = {
  USER_DATA: 'mirubato_user_data',
  PRACTICE_SESSIONS: 'mirubato_practice_sessions',
  PRACTICE_LOGS: 'mirubato_practice_logs',
  PENDING_SYNC: 'mirubato_pending_sync',
}

class LocalStorageService {
  // User Data Management
  getUserData(): LocalUserData | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return data ? JSON.parse(data) : null
  }

  setUserData(userData: LocalUserData): void {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData))
  }

  createAnonymousUser(): LocalUserData {
    const anonymousUser: LocalUserData = {
      id: `anon_${crypto.randomUUID()}`,
      isAnonymous: true,
      primaryInstrument: 'PIANO',
      preferences: {
        theme: 'auto',
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
        averageAccuracy: 0,
      },
    }
    this.setUserData(anonymousUser)
    return anonymousUser
  }

  // Practice Sessions Management
  getPracticeSessions(): PracticeSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_SESSIONS)
    return data ? JSON.parse(data) : []
  }

  savePracticeSession(session: PracticeSession): void {
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

  // User Stats Update
  private updateUserStats(session: PracticeSession): void {
    const userData = this.getUserData()
    if (!userData) return

    // Update total practice time
    if (session.duration) {
      userData.stats.totalPracticeTime += session.duration
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
    if (session.accuracy !== undefined) {
      const sessions = this.getPracticeSessions().filter(
        s => s.accuracy !== undefined
      )
      const totalAccuracy = sessions.reduce(
        (sum, s) => sum + (s.accuracy || 0),
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
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC)
    return data ? JSON.parse(data) : { sessions: [], logs: [] }
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
  migrateToAuthenticatedUser(authenticatedUserId: string): void {
    const userData = this.getUserData()
    if (userData && userData.isAnonymous) {
      // Update user data
      userData.id = authenticatedUserId
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
