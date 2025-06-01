// Data validation and migration utilities

import {
  PracticeSession,
  LocalPracticeSession,
  PracticeLog,
  UserPreferences,
  Validators,
  SessionType,
  ActivityType,
  Instrument,
  LocalUser,
} from './index'

export class DataValidator {
  // Validate practice session data structure
  static validatePracticeSession(data: any): data is PracticeSession {
    if (!data || typeof data !== 'object') return false

    // Required fields
    if (!data.id || typeof data.id !== 'string') return false
    if (!data.userId || typeof data.userId !== 'string') return false
    if (!Validators.isValidInstrument(data.instrument)) return false
    if (!Validators.isValidSessionType(data.sessionType)) return false
    if (!data.startedAt || !Validators.isValidISODate(data.startedAt))
      return false

    // Optional fields with type checking
    if (
      data.sheetMusicId !== undefined &&
      data.sheetMusicId !== null &&
      typeof data.sheetMusicId !== 'string'
    )
      return false
    if (
      data.completedAt !== undefined &&
      data.completedAt !== null &&
      !Validators.isValidISODate(data.completedAt)
    )
      return false
    if (
      data.pausedDuration !== undefined &&
      typeof data.pausedDuration !== 'number'
    )
      return false
    if (
      data.accuracyPercentage !== undefined &&
      data.accuracyPercentage !== null
    ) {
      if (
        typeof data.accuracyPercentage !== 'number' ||
        data.accuracyPercentage < 0 ||
        data.accuracyPercentage > 100
      )
        return false
    }
    if (typeof data.notesAttempted !== 'number' || data.notesAttempted < 0)
      return false
    if (typeof data.notesCorrect !== 'number' || data.notesCorrect < 0)
      return false

    return true
  }

  // Validate local practice session (includes synced flag)
  static validateLocalPracticeSession(data: any): data is LocalPracticeSession {
    if (!this.validatePracticeSession(data)) return false
    if (typeof (data as LocalPracticeSession).isSynced !== 'boolean')
      return false
    return true
  }

  // Validate practice log data structure
  static validatePracticeLog(data: any): data is PracticeLog {
    if (!data || typeof data !== 'object') return false

    // Required fields
    if (!data.id || typeof data.id !== 'string') return false
    if (!data.sessionId || typeof data.sessionId !== 'string') return false
    if (!Validators.isValidActivityType(data.activityType)) return false
    if (typeof data.durationSeconds !== 'number' || data.durationSeconds < 0)
      return false
    if (!data.createdAt || !Validators.isValidISODate(data.createdAt))
      return false

    // Optional fields with validation
    if (
      data.tempoPracticed !== undefined &&
      data.tempoPracticed !== null &&
      typeof data.tempoPracticed !== 'number'
    )
      return false
    if (
      data.targetTempo !== undefined &&
      data.targetTempo !== null &&
      typeof data.targetTempo !== 'number'
    )
      return false
    if (
      data.focusAreas !== undefined &&
      data.focusAreas !== null &&
      !Array.isArray(data.focusAreas)
    )
      return false
    if (
      data.selfRating !== undefined &&
      data.selfRating !== null &&
      !Validators.isValidSelfRating(data.selfRating)
    )
      return false
    if (
      data.notes !== undefined &&
      data.notes !== null &&
      typeof data.notes !== 'string'
    )
      return false

    return true
  }

  // Validate user preferences
  static validateUserPreferences(data: any): data is UserPreferences {
    if (!data || typeof data !== 'object') return false

    if (!Validators.isValidTheme(data.theme)) return false

    if (
      !data.notificationSettings ||
      typeof data.notificationSettings !== 'object'
    )
      return false
    if (typeof data.notificationSettings.practiceReminders !== 'boolean')
      return false
    if (typeof data.notificationSettings.emailUpdates !== 'boolean')
      return false

    if (!data.practiceSettings || typeof data.practiceSettings !== 'object')
      return false
    if (
      typeof data.practiceSettings.defaultSessionDuration !== 'number' ||
      data.practiceSettings.defaultSessionDuration <= 0
    )
      return false
    if (
      typeof data.practiceSettings.defaultTempo !== 'number' ||
      data.practiceSettings.defaultTempo <= 0
    )
      return false
    if (typeof data.practiceSettings.metronomeSoundEnabled !== 'boolean')
      return false

    return true
  }

  // Validate local user data
  static validateLocalUser(data: any): data is LocalUser {
    if (!data || typeof data !== 'object') return false

    if (!data.id || typeof data.id !== 'string') return false
    if (typeof data.email !== 'string') return false // Can be empty for anonymous
    if (typeof data.isAnonymous !== 'boolean') return false
    if (!Validators.isValidInstrument(data.primaryInstrument)) return false
    if (!data.createdAt || !Validators.isValidISODate(data.createdAt))
      return false
    if (!data.updatedAt || !Validators.isValidISODate(data.updatedAt))
      return false

    if (
      data.displayName !== undefined &&
      data.displayName !== null &&
      typeof data.displayName !== 'string'
    )
      return false
    if (
      data.lastSyncedAt !== undefined &&
      data.lastSyncedAt !== null &&
      !Validators.isValidISODate(data.lastSyncedAt)
    )
      return false

    return true
  }
}

// Migration utilities for schema changes
export class DataMigrator {
  // Migrate old session format to new format
  static migrateSession(oldSession: any): LocalPracticeSession | null {
    try {
      // Handle old 'duration' field -> calculate from start/end times
      let pausedDuration = 0
      if (oldSession.duration && !oldSession.pausedDuration) {
        // Old format had total duration, we'll set paused to 0
        pausedDuration = 0
      }

      // Handle old activity type mapping
      let sessionType = SessionType.FREE_PRACTICE
      if (oldSession.activityType) {
        // Map old activity types to session types
        sessionType = SessionType.FREE_PRACTICE
      }

      // Handle old accuracy field name
      const accuracyPercentage =
        oldSession.accuracy ?? oldSession.accuracyPercentage ?? null

      const migratedSession: LocalPracticeSession = {
        id: oldSession.id,
        userId: oldSession.userId,
        instrument: oldSession.instrument as Instrument,
        sheetMusicId: oldSession.sheetMusicId || null,
        sessionType,
        startedAt: oldSession.startedAt,
        completedAt: oldSession.completedAt || null,
        pausedDuration,
        accuracyPercentage,
        notesAttempted: oldSession.notesAttempted || 0,
        notesCorrect: oldSession.notesCorrect || 0,
        isSynced: oldSession.isSynced ?? false,
        sheetMusicTitle: oldSession.sheetMusicTitle,
      }

      if (DataValidator.validateLocalPracticeSession(migratedSession)) {
        return migratedSession
      }

      return null
    } catch (error) {
      console.error('Failed to migrate session:', error)
      return null
    }
  }

  // Migrate old log format to new format
  static migrateLog(oldLog: any): PracticeLog | null {
    try {
      // Map old activity types
      let activityType = ActivityType.OTHER
      switch (oldLog.activityType) {
        case 'practice':
        case 'sight-reading':
          activityType = ActivityType.SIGHT_READING
          break
        case 'technique':
          activityType = ActivityType.TECHNIQUE
          break
        case 'repertoire':
          activityType = ActivityType.REPERTOIRE
          break
        default:
          activityType = ActivityType.OTHER
      }

      // Adjust rating scale (old: 1-5, new: 1-10)
      let selfRating = oldLog.selfRating
      if (selfRating && selfRating <= 5) {
        selfRating = selfRating * 2 // Convert 1-5 to 2-10
      }

      const migratedLog: PracticeLog = {
        id: oldLog.id,
        sessionId: oldLog.sessionId,
        activityType,
        durationSeconds: oldLog.durationSeconds,
        tempoPracticed: oldLog.tempoPracticed || null,
        targetTempo: oldLog.targetTempo || null,
        focusAreas: oldLog.focusAreas || null,
        selfRating: selfRating || null,
        notes: oldLog.notes || null,
        createdAt: oldLog.createdAt || new Date().toISOString(),
      }

      if (DataValidator.validatePracticeLog(migratedLog)) {
        return migratedLog
      }

      return null
    } catch (error) {
      console.error('Failed to migrate log:', error)
      return null
    }
  }
}
