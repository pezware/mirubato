// Data synchronization service for handling local to remote sync

import { ApolloClient, gql } from '@apollo/client'
import {
  LocalPracticeSession,
  PracticeLog,
  DataConverters,
  DataValidator,
  LocalUserData,
} from '@mirubato/shared/types'
import { localStorageService } from './localStorage'

// GraphQL mutations for syncing data
const SYNC_PRACTICE_SESSION = gql`
  mutation SyncPracticeSession($session: PracticeSessionInput!) {
    syncPracticeSession(session: $session) {
      id
      success
    }
  }
`

const SYNC_PRACTICE_LOGS = gql`
  mutation SyncPracticeLogs($logs: [PracticeLogInput!]!) {
    syncPracticeLogs(logs: $logs) {
      syncedIds
      failedIds
    }
  }
`

const SYNC_USER_PREFERENCES = gql`
  mutation SyncUserPreferences($preferences: UserPreferencesInput!) {
    updateUserPreferences(preferences: $preferences) {
      theme
      notificationSettings {
        practiceReminders
        emailUpdates
      }
      practiceSettings {
        defaultSessionDuration
        defaultTempo
        metronomeSoundEnabled
      }
    }
  }
`

export class DataSyncService {
  constructor(private apolloClient: ApolloClient<any>) {}

  // Sync all pending data to the cloud
  async syncAllPendingData(): Promise<{
    sessionsSynced: number
    logsSynced: number
    errors: Error[]
  }> {
    const errors: Error[] = []
    let sessionsSynced = 0
    let logsSynced = 0

    try {
      // Get pending sync data
      const pendingData = localStorageService.getPendingSyncData()

      // Sync sessions
      for (const session of pendingData.sessions) {
        try {
          await this.syncSession(session)
          sessionsSynced++
        } catch (error) {
          errors.push(error as Error)
          console.error('Failed to sync session:', session.id, error)
        }
      }

      // Sync logs in batches
      const logBatches = this.batchArray(pendingData.logs, 50) // Batch size of 50
      for (const batch of logBatches) {
        try {
          const syncedIds = await this.syncLogBatch(batch)
          logsSynced += syncedIds.length
        } catch (error) {
          errors.push(error as Error)
          console.error('Failed to sync log batch:', error)
        }
      }

      // Mark successfully synced items
      const syncedSessionIds = pendingData.sessions
        .slice(0, sessionsSynced)
        .map(s => s.id)
      const syncedLogIds = pendingData.logs.slice(0, logsSynced).map(l => l.id)

      localStorageService.markAsSynced(syncedSessionIds, syncedLogIds)
    } catch (error) {
      errors.push(error as Error)
      console.error('Sync failed:', error)
    }

    return { sessionsSynced, logsSynced, errors }
  }

  // Sync a single practice session
  private async syncSession(session: LocalPracticeSession): Promise<void> {
    // Validate data before syncing
    if (!DataValidator.validateLocalPracticeSession(session)) {
      throw new Error('Invalid session data')
    }

    // Convert to database format
    const dbSession = DataConverters.localSessionToDbSession(session)

    const { data } = await this.apolloClient.mutate({
      mutation: SYNC_PRACTICE_SESSION,
      variables: {
        session: {
          id: dbSession.id,
          userId: dbSession.userId,
          instrument: dbSession.instrument,
          sheetMusicId: dbSession.sheetMusicId,
          sessionType: dbSession.sessionType,
          startedAt: dbSession.startedAt,
          completedAt: dbSession.completedAt,
          pausedDuration: dbSession.pausedDuration,
          accuracyPercentage: dbSession.accuracyPercentage,
          notesAttempted: dbSession.notesAttempted,
          notesCorrect: dbSession.notesCorrect,
        },
      },
    })

    if (!data?.syncPracticeSession?.success) {
      throw new Error(`Failed to sync session: ${session.id}`)
    }
  }

  // Sync a batch of practice logs
  private async syncLogBatch(logs: PracticeLog[]): Promise<string[]> {
    // Validate all logs
    const validLogs = logs.filter(log => DataValidator.validatePracticeLog(log))

    if (validLogs.length === 0) {
      return []
    }

    const { data } = await this.apolloClient.mutate({
      mutation: SYNC_PRACTICE_LOGS,
      variables: {
        logs: validLogs.map(log => ({
          id: log.id,
          sessionId: log.sessionId,
          activityType: log.activityType,
          durationSeconds: log.durationSeconds,
          tempoPracticed: log.tempoPracticed,
          targetTempo: log.targetTempo,
          focusAreas: log.focusAreas,
          selfRating: log.selfRating,
          notes: log.notes,
          createdAt: log.createdAt,
        })),
      },
    })

    return data?.syncPracticeLogs?.syncedIds || []
  }

  // Sync user preferences
  async syncUserPreferences(userData: LocalUserData): Promise<void> {
    if (!DataValidator.validateUserPreferences(userData.preferences)) {
      throw new Error('Invalid user preferences')
    }

    await this.apolloClient.mutate({
      mutation: SYNC_USER_PREFERENCES,
      variables: {
        preferences: userData.preferences,
      },
    })
  }

  // Helper to batch arrays
  private batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  // Check for conflicts between local and remote data
  async checkForConflicts(): Promise<{
    hasConflicts: boolean
    conflicts: Array<{
      type: 'session' | 'log' | 'preferences'
      localId: string
      message: string
    }>
  }> {
    // TODO: Implement conflict detection
    // This would compare local timestamps with server timestamps
    // and detect if remote data has been updated since last sync
    return { hasConflicts: false, conflicts: [] }
  }
}

// Singleton instance factory
export const createDataSyncService = (apolloClient: ApolloClient<any>) => {
  return new DataSyncService(apolloClient)
}
