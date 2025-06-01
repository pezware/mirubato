// Data synchronization service for handling local to remote sync

import { ApolloClient, gql } from '@apollo/client'
import {
  LocalPracticeSession,
  PracticeLog,
  DataConverters,
  DataValidator,
  LocalUserData,
  SessionType,
  ActivityType,
} from '@mirubato/shared/types'
import { localStorageService } from './localStorage'

// GraphQL mutations for creating practice sessions and logs
const START_PRACTICE_SESSION = gql`
  mutation StartPracticeSession($input: StartPracticeSessionInput!) {
    startPracticeSession(input: $input) {
      id
      user {
        id
      }
      instrument
      sessionType
      startedAt
    }
  }
`

const COMPLETE_PRACTICE_SESSION = gql`
  mutation CompletePracticeSession($input: CompletePracticeSessionInput!) {
    completePracticeSession(input: $input) {
      id
      completedAt
      accuracy
      notesAttempted
      notesCorrect
    }
  }
`

const CREATE_PRACTICE_LOG = gql`
  mutation CreatePracticeLog($input: CreatePracticeLogInput!) {
    createPracticeLog(input: $input) {
      id
      session {
        id
      }
      activityType
      durationSeconds
      createdAt
    }
  }
`

const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      preferences {
        theme
        notationSize
        practiceReminders
        dailyGoalMinutes
        customSettings
      }
    }
  }
`

export class DataSyncService {
  constructor(private apolloClient: ApolloClient<unknown>) {}

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

      // Sync sessions - for each session, we need to create it first, then complete it
      for (const session of pendingData.sessions) {
        try {
          await this.syncSession(session)
          sessionsSynced++
        } catch (error) {
          errors.push(error as Error)
          console.error('Failed to sync session:', session.id, error)
        }
      }

      // Sync logs individually (no batch mutation available)
      for (const log of pendingData.logs) {
        try {
          await this.syncLog(log)
          logsSynced++
        } catch (error) {
          errors.push(error as Error)
          console.error('Failed to sync log:', log.id, error)
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

    // First, start the practice session
    const { data: startData } = await this.apolloClient.mutate({
      mutation: START_PRACTICE_SESSION,
      variables: {
        input: {
          sessionType: dbSession.sessionType as SessionType,
          instrument: dbSession.instrument,
          sheetMusicId: dbSession.sheetMusicId,
        },
      },
    })

    const remoteSessionId = startData?.startPracticeSession?.id

    if (!remoteSessionId) {
      throw new Error(
        `Failed to start practice session for local session: ${session.id}`
      )
    }

    // If the session is completed, complete it on the server
    if (dbSession.completedAt) {
      const { data: completeData } = await this.apolloClient.mutate({
        mutation: COMPLETE_PRACTICE_SESSION,
        variables: {
          input: {
            sessionId: remoteSessionId,
            accuracy: dbSession.accuracyPercentage
              ? dbSession.accuracyPercentage / 100
              : undefined,
            notesAttempted: dbSession.notesAttempted,
            notesCorrect: dbSession.notesCorrect,
          },
        },
      })

      if (!completeData?.completePracticeSession?.id) {
        throw new Error(
          `Failed to complete practice session: ${remoteSessionId}`
        )
      }
    }

    // Update local storage to map local ID to remote ID
    localStorageService.updateSessionRemoteId(session.id, remoteSessionId)
  }

  // Sync a single practice log
  private async syncLog(log: PracticeLog): Promise<void> {
    // Validate log
    if (!DataValidator.validatePracticeLog(log)) {
      throw new Error('Invalid log data')
    }

    // Get the remote session ID if available
    const remoteSessionId = localStorageService.getRemoteSessionId(
      log.sessionId
    )
    if (!remoteSessionId) {
      throw new Error(
        `No remote session ID found for local session: ${log.sessionId}`
      )
    }

    const { data } = await this.apolloClient.mutate({
      mutation: CREATE_PRACTICE_LOG,
      variables: {
        input: {
          sessionId: remoteSessionId,
          activityType: log.activityType as ActivityType,
          durationSeconds: log.durationSeconds,
          tempoPracticed: log.tempoPracticed,
          targetTempo: log.targetTempo,
          focusAreas: log.focusAreas,
          selfRating: log.selfRating,
          notes: log.notes,
        },
      },
    })

    if (!data?.createPracticeLog?.id) {
      throw new Error(
        `Failed to create practice log for session: ${remoteSessionId}`
      )
    }
  }

  // Sync user preferences
  async syncUserPreferences(userData: LocalUserData): Promise<void> {
    if (!DataValidator.validateUserPreferences(userData.preferences)) {
      throw new Error('Invalid user preferences')
    }

    await this.apolloClient.mutate({
      mutation: UPDATE_USER,
      variables: {
        input: {
          preferences: {
            theme: userData.preferences.theme,
            notationSize: userData.preferences.notationSize,
            practiceReminders: userData.preferences.practiceReminders,
            dailyGoalMinutes: userData.preferences.dailyGoalMinutes,
            customSettings: userData.preferences.customSettings,
          },
        },
      },
    })
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
export const createDataSyncService = (apolloClient: ApolloClient<unknown>) => {
  return new DataSyncService(apolloClient)
}
