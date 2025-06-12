// Data synchronization service for handling local to remote sync

import { ApolloClient, gql } from '@apollo/client'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import { createLogger } from '../utils/logger'
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

const logger = createLogger('DataSyncService')

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
          logger.error('Failed to sync session', error, {
            sessionId: session.id,
          })
        }
      }

      // Sync logs individually (no batch mutation available)
      for (const log of pendingData.logs) {
        try {
          await this.syncLog(log)
          logsSynced++
        } catch (error) {
          errors.push(error as Error)
          logger.error('Failed to sync log', error, { logId: log.id })
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
      logger.error('Sync failed', error)
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
    const conflicts: Array<{
      type: 'session' | 'log' | 'preferences'
      localId: string
      message: string
    }> = []

    try {
      // Get local sync metadata
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      if (!lastSyncTime) {
        // First sync, no conflicts possible
        return { hasConflicts: false, conflicts: [] }
      }

      const lastSync = new Date(lastSyncTime)
      const userData = localStorageService.getUserData()

      if (!userData || userData.isAnonymous) {
        return { hasConflicts: false, conflicts: [] }
      }

      // Check for remote updates since last sync
      const { data } = await this.apolloClient.query({
        query: GET_CURRENT_USER,
        fetchPolicy: 'network-only',
      })

      if (data?.currentUser) {
        // Check if remote user was updated after last sync
        const remoteUpdatedAt = new Date(data.currentUser.updatedAt)
        if (remoteUpdatedAt > lastSync) {
          // Check specific fields for conflicts
          if (data.currentUser.preferences.updatedAt) {
            const prefsUpdatedAt = new Date(
              data.currentUser.preferences.updatedAt
            )
            if (prefsUpdatedAt > lastSync) {
              conflicts.push({
                type: 'preferences',
                localId: userData.id,
                message: 'User preferences have been updated on another device',
              })
            }
          }
        }
      }

      // For practice sessions, we use a simple strategy:
      // - Local changes always win for unsynced sessions
      // - Remote changes win for synced sessions that were modified remotely

      // Note: In a production app, you might want to:
      // 1. Compare individual fields to detect real conflicts
      // 2. Implement merge strategies (e.g., highest accuracy wins)
      // 3. Allow user to choose which version to keep
    } catch (error) {
      logger.error('Error checking for conflicts:', error)
      // If we can't check, assume no conflicts to allow sync to proceed
      return { hasConflicts: false, conflicts: [] }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    }
  }

  // Resolve conflicts with a simple strategy
  async resolveConflicts(
    strategy: 'local' | 'remote' | 'merge' = 'local'
  ): Promise<void> {
    const { hasConflicts, conflicts } = await this.checkForConflicts()

    if (!hasConflicts) {
      return
    }

    logger.info(
      `Resolving ${conflicts.length} conflicts with strategy: ${strategy}`
    )

    switch (strategy) {
      case 'local':
        // Local changes win - no action needed
        logger.info('Using local data for all conflicts')
        break

      case 'remote':
        // Remote changes win - would need to fetch and overwrite local
        logger.warn('Remote strategy not fully implemented')
        break

      case 'merge':
        // Merge changes - would need field-by-field comparison
        logger.warn('Merge strategy not fully implemented')
        break
    }

    // Update last sync time to prevent re-detection of same conflicts
    localStorage.setItem('lastSyncTime', new Date().toISOString())
  }
}

// Singleton instance factory
export const createDataSyncService = (apolloClient: ApolloClient<unknown>) => {
  return new DataSyncService(apolloClient)
}
