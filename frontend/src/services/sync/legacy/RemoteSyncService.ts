import { GraphQLClient } from 'graphql-request'
import {
  SyncMetadata,
  SyncableEntity,
  SyncBatch,
  SyncDelta,
  SyncablePracticeSession,
} from '../types'

// Type guards for GraphQL responses

interface PracticeSessionResponse {
  id: string
  startedAt: string
  completedAt?: string
  instrument: string
  sessionType: string
  pausedDuration: number
  accuracy?: number
  notesAttempted: number
  notesCorrect: number
  user?: { id: string }
  sheetMusic?: { id: string; title: string }
}

interface GoalResponse {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  description: string
  targetValue: number
  currentValue: number
  unit: string
  deadline?: string
  completed: boolean
  completedAt?: string
}

interface SyncMetadataResponse {
  syncMetadata: {
    lastSyncTimestamp: string
    syncToken: string
    pendingSyncCount: number
    lastSyncStatus: string
    lastSyncError?: string
  }
}

interface AllUserDataResponse {
  allUserData: {
    practiceSessions: PracticeSessionResponse[]
    practiceGoals: GoalResponse[]
  }
}

interface SyncChangesResponse {
  syncChangesSince: {
    entities: SyncableEntity[]
    deletedIds: string[]
    newSyncToken: string
  }
}

interface SyncBatchResponse {
  syncBatch: {
    processedCount: number
    conflicts: Array<{
      entityId: string
      type: string
      resolution: string
    }>
    errors: Array<{
      entityId: string
      message: string
    }>
  }
}

const SYNC_METADATA_QUERY = `
  query GetSyncMetadata($userId: ID!) {
    syncMetadata(userId: $userId) {
      lastSyncTimestamp
      syncToken
      pendingSyncCount
      lastSyncStatus
      lastSyncError
    }
  }
`

const SYNC_CHANGES_QUERY = `
  query GetChangesSince($syncToken: String!) {
    syncChangesSince(syncToken: $syncToken) {
      entities {
        id
        entityType
        createdAt
        updatedAt
        deletedAt
        syncVersion
        checksum
        data
      }
      deletedIds
      newSyncToken
    }
  }
`

const FETCH_ALL_DATA_QUERY = `
  query FetchAllUserData($userId: ID!) {
    allUserData(userId: $userId) {
      practiceSessions {
        id
        startedAt
        completedAt
        instrument
        sessionType
        pausedDuration
        accuracy
        notesAttempted
        notesCorrect
        sheetMusic {
          id
          title
        }
      }
      practiceGoals {
        id
        title
        description
        targetValue
        currentValue
        unit
        deadline
        completed
        completedAt
        createdAt
        updatedAt
      }
    }
  }
`

const SYNC_BATCH_MUTATION = `
  mutation SyncBatch($batch: SyncBatchInput!) {
    syncBatch(batch: $batch) {
      uploaded
      failed
      newSyncToken
      errors {
        entityId
        error
      }
    }
  }
`

export interface RemoteSyncServiceConfig {
  graphqlEndpoint: string
  authToken?: string // Deprecated - using cookies
}

/**
 * Service for syncing with remote GraphQL API
 */
export class RemoteSyncService {
  private client: GraphQLClient

  constructor(private config: RemoteSyncServiceConfig) {
    this.client = new GraphQLClient(config.graphqlEndpoint, {
      credentials: 'include', // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        'apollo-require-preflight': 'true',
      },
    })
  }

  /**
   * Update auth token for requests
   * @deprecated Auth is now handled via HTTP-only cookies
   */
  setAuthToken(_token: string): void {
    // No-op - authentication is now handled via cookies
    console.warn(
      'setAuthToken is deprecated - authentication is now handled via HTTP-only cookies'
    )
  }

  /**
   * Fetch sync metadata from remote
   */
  async fetchSyncMetadata(userId: string): Promise<SyncMetadata | null> {
    try {
      console.log(
        '[RemoteSyncService] Fetching sync metadata for user:',
        userId
      )
      console.log(
        '[RemoteSyncService] Auth token present:',
        !!this.config.authToken
      )
      console.log(
        '[RemoteSyncService] GraphQL endpoint:',
        this.config.graphqlEndpoint
      )
      console.log(
        '[RemoteSyncService] Auth header:',
        this.config.authToken
          ? `Bearer ${this.config.authToken.substring(0, 20)}...`
          : 'none'
      )

      // Debug: Log the exact request being made
      console.log('[RemoteSyncService] Making request with:', {
        query: SYNC_METADATA_QUERY,
        variables: { userId },
        endpoint: this.config.graphqlEndpoint,
      })

      const data = (await this.client.request(SYNC_METADATA_QUERY, {
        userId,
      })) as SyncMetadataResponse
      return {
        ...data.syncMetadata,
        lastSyncTimestamp: new Date(
          data.syncMetadata.lastSyncTimestamp
        ).getTime(),
        lastSyncStatus: data.syncMetadata.lastSyncStatus as
          | 'success'
          | 'partial'
          | 'failed',
      }
    } catch (error: unknown) {
      console.error('[RemoteSyncService] Sync metadata fetch error:', error)

      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        interface GraphQLError {
          response?: {
            status?: number
            errors?: Array<{ extensions?: { code?: string } }>
            data?: unknown
            headers?: unknown
          }
          request?: {
            body?: unknown
            headers?: unknown
            url?: string
          }
        }
        const graphqlError = error as GraphQLError
        console.error('[RemoteSyncService] GraphQL Error Response:', {
          status: graphqlError.response?.status,
          errors: graphqlError.response?.errors,
          data: graphqlError.response?.data,
          headers: graphqlError.response?.headers,
        })

        // Check if it's an authentication error
        if (graphqlError.response?.status === 400) {
          console.error(
            '[RemoteSyncService] 400 Bad Request - possible authentication issue'
          )
          console.error('[RemoteSyncService] Request details:', {
            body: graphqlError.request?.body,
            headers: graphqlError.request?.headers,
            url: graphqlError.request?.url,
          })
          console.error('[RemoteSyncService] Full error object:', graphqlError)
        }

        if (
          graphqlError.response?.errors?.[0]?.extensions?.code === 'NOT_FOUND'
        ) {
          return null
        }
      }
      throw error
    }
  }

  /**
   * Fetch initial data for a user
   */
  async fetchInitialData(userId: string): Promise<SyncableEntity[]> {
    const data = (await this.client.request(FETCH_ALL_DATA_QUERY, {
      userId,
    })) as AllUserDataResponse

    const entities: SyncableEntity[] = []

    // Convert practice sessions
    if (data.allUserData.practiceSessions) {
      const sessions = this.convertPracticeSessions(
        data.allUserData.practiceSessions
      )
      entities.push(...sessions)
    }

    // Convert goals
    if (data.allUserData.practiceGoals) {
      const goals = this.convertGoals(data.allUserData.practiceGoals)
      entities.push(...goals)
    }

    return entities
  }

  /**
   * Fetch changes since a sync token
   */
  async fetchChangesSince(syncToken: string): Promise<SyncDelta> {
    const data = (await this.client.request(SYNC_CHANGES_QUERY, {
      syncToken,
    })) as SyncChangesResponse

    return {
      entities: data.syncChangesSince.entities.map(this.deserializeEntity),
      deletedIds: data.syncChangesSince.deletedIds,
      newSyncToken: data.syncChangesSince.newSyncToken,
    }
  }

  /**
   * Fetch all data for a user (used in full sync)
   */
  async fetchAllData(userId: string): Promise<SyncableEntity[]> {
    return this.fetchInitialData(userId)
  }

  /**
   * Upload a batch of changes
   */
  async uploadBatch(batch: SyncBatch): Promise<{
    uploaded: number
    failed: number
    newSyncToken: string
    errors: Array<{ entityId: string; error: string }>
  }> {
    // Serialize entities for GraphQL
    const serializedBatch = {
      ...batch,
      entities: batch.entities.map(this.serializeEntity),
    }

    const data = (await this.client.request(SYNC_BATCH_MUTATION, {
      batch: serializedBatch,
    })) as SyncBatchResponse

    return {
      uploaded: data.syncBatch.processedCount,
      failed: data.syncBatch.errors.length,
      newSyncToken: '', // TODO: get from response when backend implements it
      errors: data.syncBatch.errors.map(err => ({
        entityId: err.entityId,
        error: err.message,
      })),
    }
  }

  // Private helper methods

  private convertPracticeSessions(
    sessions: PracticeSessionResponse[]
  ): SyncablePracticeSession[] {
    return sessions.map(session => ({
      id: session.id,
      localId: session.id,
      remoteId: session.id,
      createdAt: new Date(session.startedAt).getTime(),
      updatedAt: new Date(session.completedAt || session.startedAt).getTime(),
      syncStatus: 'synced' as const,
      syncVersion: 1,
      checksum: this.generateChecksum(session),
      entityType: 'practiceSession' as const,
      data: {
        userId: session.user?.id || '',
        instrument: session.instrument,
        sheetMusicId: session.sheetMusic?.id || null,
        sessionType: session.sessionType as
          | 'FREE_PRACTICE'
          | 'GUIDED_PRACTICE'
          | 'ASSESSMENT',
        startedAt: session.startedAt,
        completedAt: session.completedAt || null,
        pausedDuration: session.pausedDuration,
        accuracyPercentage: session.accuracy ? session.accuracy * 100 : null,
        notesAttempted: session.notesAttempted,
        notesCorrect: session.notesCorrect,
        sheetMusicTitle: session.sheetMusic?.title,
      },
    }))
  }

  private convertGoals(goals: GoalResponse[]): SyncableEntity[] {
    return goals.map(goal => ({
      id: goal.id,
      localId: goal.id,
      remoteId: goal.id,
      createdAt: new Date(goal.createdAt).getTime(),
      updatedAt: new Date(goal.updatedAt).getTime(),
      syncStatus: 'synced' as const,
      syncVersion: 1,
      checksum: this.generateChecksum(goal),
      entityType: 'goal' as const,
      data: {
        title: goal.title,
        description: goal.description,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        unit: goal.unit,
        deadline: goal.deadline || null,
        completed: goal.completed,
        completedAt: goal.completedAt || null,
      },
    }))
  }

  private serializeEntity(entity: SyncableEntity): Record<string, unknown> {
    // Deep clean the data to remove __typename fields before stringifying
    const cleanData = this.removeTypenameFields(entity.data)

    return {
      id: entity.id,
      localId: entity.localId,
      remoteId: entity.remoteId,
      entityType: entity.entityType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      syncVersion: entity.syncVersion,
      checksum: entity.checksum,
      data: JSON.stringify(cleanData),
    }
  }

  private removeTypenameFields(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeTypenameFields(item))
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: Record<string, unknown> = {}
      for (const key in obj) {
        if (
          key !== '__typename' &&
          Object.prototype.hasOwnProperty.call(obj, key)
        ) {
          cleaned[key] = this.removeTypenameFields(
            (obj as Record<string, unknown>)[key]
          )
        }
      }
      return cleaned
    }

    return obj
  }

  private deserializeEntity(entity: unknown): SyncableEntity {
    interface DeserializedEntity {
      id: string
      localId: string
      remoteId?: string
      entityType: string
      createdAt: number
      updatedAt: number
      deletedAt?: number
      syncVersion: number
      checksum: string
      data: string | Record<string, unknown>
      syncStatus?: 'pending' | 'syncing' | 'synced' | 'conflict'
    }
    const e = entity as DeserializedEntity
    return {
      ...e,
      data: typeof e.data === 'string' ? JSON.parse(e.data) : e.data,
      syncStatus: e.syncStatus || 'synced',
      entityType: e.entityType as
        | 'practiceSession'
        | 'practiceLog'
        | 'goal'
        | 'logbookEntry',
    } as SyncableEntity
  }

  private generateChecksum(data: unknown): string {
    // Simple checksum for now - in production use proper hashing
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}
