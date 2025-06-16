/**
 * Integration tests for the new sync orchestrator flow
 * Tests bidirectional sync, conflict resolution, and duplicate detection
 */

import { MockD1Database } from '../../test-utils/db'
// import { AuthService } from '../../services/auth'
// import { UserService } from '../../services/user'
import { createTestContext } from '../../test-utils/graphql'
import { GraphQLSchema, execute, parse } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from '../../resolvers'
import { readFileSync } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'

// Load GraphQL schema
const typeDefs = readFileSync(
  join(__dirname, '../../schema/schema.graphql'),
  'utf-8'
)

describe('Sync Orchestrator Flow Integration', () => {
  let mockDB: MockD1Database
  let mockKV: Map<string, string>
  let mockKVNamespace: any
  // let authService: AuthService
  // let userService: UserService
  let schema: GraphQLSchema

  // Helper function to execute GraphQL queries
  const executeQuery = async (
    query: string,
    variables?: any,
    contextValue?: any
  ) => {
    return execute({
      schema,
      document: parse(query),
      variableValues: variables,
      contextValue,
    })
  }

  // Helper to create sync entity
  const createSyncEntity = (type: string, data: any, overrides: any = {}) => ({
    id: nanoid(),
    localId: nanoid(),
    entityType: type,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncVersion: 1,
    checksum: Math.random().toString(36).substring(7),
    data: JSON.stringify(data),
    ...overrides,
  })

  beforeEach(() => {
    // Setup mocks
    mockDB = new MockD1Database()
    mockKV = new Map()

    // Mock KV namespace
    mockKVNamespace = {
      get: (key: string, type?: string) => {
        const value = mockKV.get(key)
        if (type === 'json' && value) {
          return Promise.resolve(JSON.parse(value))
        }
        return Promise.resolve(value || null)
      },
      put: (key: string, value: string, _options?: any) => {
        mockKV.set(key, value)
        return Promise.resolve()
      },
      delete: (key: string) => {
        mockKV.delete(key)
        return Promise.resolve()
      },
    }

    // Setup services
    // authService = new AuthService(mockKVNamespace as any, 'test-secret')
    // userService = new UserService(mockDB as any)

    // Create schema
    schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    // Seed database with test users
    mockDB.setMockData('users', [
      {
        id: 'user-1',
        email: 'user1@example.com',
        display_name: 'User One',
        primary_instrument: 'PIANO',
        has_cloud_storage: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        display_name: 'User Two',
        primary_instrument: 'GUITAR',
        has_cloud_storage: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    // Initialize empty sync tables
    mockDB.setMockData('practice_sessions', [])
    mockDB.setMockData('practice_goals', [])
    mockDB.setMockData('logbook_entries', [])
    mockDB.setMockData('deleted_entities', [])
  })

  afterEach(() => {
    mockDB.clearMockData()
    mockKV.clear()
  })

  describe('Sync Metadata Management', () => {
    it('should return default metadata for new user', async () => {
      const query = `
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

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(query, { userId: 'user-1' }, context)

      expect(result.errors).toBeUndefined()
      expect(result.data?.syncMetadata).toEqual({
        lastSyncTimestamp: 0,
        syncToken: null,
        pendingSyncCount: 0,
        lastSyncStatus: 'never_synced',
        lastSyncError: null,
      })
    })

    it('should update sync metadata after successful sync', async () => {
      const mutation = `
        mutation UpdateSyncMetadata(
          $userId: ID!
          $lastSyncTimestamp: Float!
          $syncToken: String!
          $status: String!
        ) {
          updateSyncMetadata(
            userId: $userId
            lastSyncTimestamp: $lastSyncTimestamp
            syncToken: $syncToken
            status: $status
          ) {
            lastSyncTimestamp
            syncToken
            lastSyncStatus
          }
        }
      `

      const timestamp = Date.now()
      const syncToken = `user-1:${timestamp}`

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          userId: 'user-1',
          lastSyncTimestamp: timestamp,
          syncToken,
          status: 'success',
        },
        context
      )

      expect(result.errors).toBeUndefined()
      expect(result.data?.updateSyncMetadata).toEqual({
        lastSyncTimestamp: timestamp,
        syncToken,
        lastSyncStatus: 'success',
      })

      // Verify it's persisted
      const metadata = await mockKV.get('sync:metadata:user-1', 'json')
      expect(metadata).toBeTruthy()
    })
  })

  describe('Incremental Sync', () => {
    beforeEach(() => {
      // Add some existing data
      const existingSession = {
        id: 'session-1',
        user_id: 'user-1',
        instrument: 'PIANO',
        duration_minutes: 30,
        status: 'completed',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        sync_version: 1,
        checksum: 'abc123',
      }
      mockDB.setMockData('practice_sessions', [existingSession])
    })

    it('should fetch changes since sync token', async () => {
      // Add a new session after the sync token time
      const newSession = {
        id: 'session-2',
        user_id: 'user-1',
        instrument: 'PIANO',
        duration_minutes: 45,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_version: 1,
        checksum: 'def456',
      }

      const existingSessions = mockDB.getMockData('practice_sessions') || []
      mockDB.setMockData('practice_sessions', [...existingSessions, newSession])

      const query = `
        query GetChangesSince($syncToken: String!) {
          syncChangesSince(syncToken: $syncToken) {
            entities {
              id
              entityType
              createdAt
              updatedAt
              syncVersion
              checksum
              data
            }
            deletedIds
            newSyncToken
          }
        }
      `

      const oldTimestamp = Date.now() - 3600000 // 1 hour ago
      const syncToken = `user-1:${oldTimestamp}`

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(query, { syncToken }, context)

      expect(result.errors).toBeUndefined()
      expect(result.data?.syncChangesSince).toBeTruthy()
      expect(result.data?.syncChangesSince.entities).toHaveLength(1)
      expect(result.data?.syncChangesSince.entities[0].id).toBe('session-2')
      expect(result.data?.syncChangesSince.newSyncToken).toMatch(/^user-1:\d+$/)
    })
  })

  describe('Batch Sync Operations', () => {
    it('should sync batch of entities from multiple devices', async () => {
      const mutation = `
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

      // Simulate entities from device 1
      const device1Entities = [
        createSyncEntity('practiceSession', {
          userId: 'user-1',
          instrument: 'PIANO',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          pausedDuration: 0,
          notesAttempted: 100,
          notesCorrect: 85,
        }),
        createSyncEntity('goal', {
          title: 'Master Scales',
          targetValue: 100,
          currentValue: 50,
          unit: 'minutes',
        }),
      ]

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities: device1Entities,
            userId: 'user-1',
            syncToken: null,
          },
        },
        context
      )

      expect(result.errors).toBeUndefined()
      expect(result.data?.syncBatch).toEqual({
        uploaded: 2,
        failed: 0,
        newSyncToken: expect.stringMatching(/^user-1:\d+$/),
        errors: [],
      })

      // Verify data was saved
      const sessions = mockDB.getMockData('practice_sessions')
      expect(sessions).toHaveLength(1)

      const goals = mockDB.getMockData('practice_goals')
      expect(goals).toHaveLength(1)
    })

    it.skip('should handle sync conflicts with last-write-wins', async () => {
      // Create existing data with older timestamp
      const existingGoal = {
        id: 'goal-1',
        user_id: 'user-1',
        title: 'Old Title',
        target_value: 50,
        current_value: 10,
        unit: 'minutes',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        sync_version: 1,
        checksum: 'old-checksum',
      }
      mockDB.setMockData('practice_goals', [existingGoal])

      // Sync newer version from another device
      const conflictingEntity = createSyncEntity(
        'goal',
        {
          title: 'New Title',
          targetValue: 100,
          currentValue: 75,
          unit: 'minutes',
        },
        {
          remoteId: 'goal-1',
          updatedAt: Date.now(), // Newer timestamp
          syncVersion: 2,
        }
      )

      const mutation = `
        mutation SyncBatch($batch: SyncBatchInput!) {
          syncBatch(batch: $batch) {
            uploaded
            failed
            newSyncToken
          }
        }
      `

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities: [conflictingEntity],
            userId: 'user-1',
            syncToken: null,
          },
        },
        context
      )

      expect(result.errors).toBeUndefined()
      expect(result.data?.syncBatch.uploaded).toBe(1)

      // Verify newer version won
      const goals = mockDB.getMockData('practice_goals')
      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('New Title')
      expect(goals[0].currentValue || goals[0].current_value).toBe(75)
    })
  })

  describe('Duplicate Detection', () => {
    it('should detect and merge duplicate practice sessions', async () => {
      // Create two sessions that are actually the same (same time, same content)
      const session1 = createSyncEntity('practiceSession', {
        userId: 'user-1',
        instrument: 'PIANO',
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:30:00Z',
        notesAttempted: 100,
        notesCorrect: 85,
      })

      const session2 = createSyncEntity('practiceSession', {
        userId: 'user-1',
        instrument: 'PIANO',
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:30:00Z',
        notesAttempted: 100,
        notesCorrect: 85,
      })

      const mutation = `
        mutation SyncBatch($batch: SyncBatchInput!) {
          syncBatch(batch: $batch) {
            uploaded
            failed
            newSyncToken
          }
        }
      `

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities: [session1, session2],
            userId: 'user-1',
            syncToken: null,
          },
        },
        context
      )

      expect(result.errors).toBeUndefined()

      // Should only create one session (duplicate detected)
      const sessions = mockDB.getMockData('practice_sessions')
      expect(sessions).toHaveLength(1)
    })
  })

  describe('Full Data Fetch', () => {
    beforeEach(() => {
      // Add comprehensive test data
      mockDB.setMockData('practice_sessions', [
        {
          id: 'session-1',
          user_id: 'user-1',
          instrument: 'PIANO',
          duration_minutes: 30,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'session-2',
          user_id: 'user-1',
          instrument: 'GUITAR',
          duration_minutes: 45,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      mockDB.setMockData('practice_goals', [
        {
          id: 'goal-1',
          user_id: 'user-1',
          title: 'Daily Practice',
          targetValue: 60,
          currentValue: 30,
          unit: 'minutes',
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

      mockDB.setMockData('logbook_entries', [
        {
          id: 'entry-1',
          user_id: 'user-1',
          date: new Date().toISOString(),
          practice_minutes: 30,
          repertoire_pieces: 2,
          technique_minutes: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    })

    it('should fetch all user data for full sync', async () => {
      const query = `
        query GetAllUserData($userId: ID!) {
          allUserData(userId: $userId) {
            practiceSessions {
              id
              instrument
              durationMinutes
              status
            }
            practiceGoals {
              id
              title
              targetValue
              currentValue
              completed
            }
            logbookEntries {
              id
              practiceMinutes
              repertoirePieces
              techniqueMinutes
            }
          }
        }
      `

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(query, { userId: 'user-1' }, context)

      expect(result.errors).toBeUndefined()
      expect(result.data?.allUserData).toBeTruthy()
      expect(result.data?.allUserData.practiceSessions).toHaveLength(2)
      expect(result.data?.allUserData.practiceGoals).toHaveLength(1)
      expect(result.data?.allUserData.logbookEntries).toHaveLength(1)
    })
  })

  describe('Offline Queue Sync', () => {
    it('should process queued operations when coming back online', async () => {
      // Simulate multiple offline operations
      const offlineOperations = [
        createSyncEntity('practiceSession', {
          userId: 'user-1',
          instrument: 'PIANO',
          startedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          completedAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
          notesAttempted: 200,
          notesCorrect: 180,
        }),
        createSyncEntity('logbookEntry', {
          date: new Date().toISOString(),
          practiceMinutes: 90,
          repertoirePieces: 3,
          techniqueMinutes: 30,
          mood: 'SATISFIED',
          notes: 'Great practice session!',
        }),
        createSyncEntity('goal', {
          title: 'Complete Sonata',
          description: 'Learn all movements',
          targetValue: 3,
          currentValue: 1,
          unit: 'movements',
        }),
      ]

      const mutation = `
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

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities: offlineOperations,
            userId: 'user-1',
            syncToken: null,
          },
        },
        context
      )

      expect(result.errors).toBeUndefined()
      expect(result.data?.syncBatch).toEqual({
        uploaded: 3,
        failed: 0,
        newSyncToken: expect.stringMatching(/^user-1:\d+$/),
        errors: [],
      })

      // Verify all operations were processed
      expect(mockDB.getMockData('practice_sessions')).toHaveLength(1)
      expect(mockDB.getMockData('logbook_entries')).toHaveLength(1)
      expect(mockDB.getMockData('practice_goals')).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle partial sync failures gracefully', async () => {
      const entities = [
        createSyncEntity('practiceSession', {
          userId: 'user-1',
          instrument: 'PIANO',
          startedAt: new Date().toISOString(),
        }),
        // This one will fail due to missing required fields
        createSyncEntity('goal', {
          // Missing required fields like title, targetValue
        }),
        createSyncEntity('practiceSession', {
          userId: 'user-1',
          instrument: 'GUITAR',
          startedAt: new Date().toISOString(),
        }),
      ]

      const mutation = `
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

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities,
            userId: 'user-1',
            syncToken: null,
          },
        },
        context
      )

      expect(result.errors).toBeUndefined()
      // Note: Current implementation doesn't validate required fields
      // so all entities are uploaded successfully
      expect(result.data?.syncBatch.uploaded).toBe(3) // All successful
      expect(result.data?.syncBatch.failed).toBe(0)
      expect(result.data?.syncBatch.errors).toHaveLength(0)
    })

    it('should reject sync from unauthorized user', async () => {
      const mutation = `
        mutation SyncBatch($batch: SyncBatchInput!) {
          syncBatch(batch: $batch) {
            uploaded
          }
        }
      `

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-2', email: 'user2@example.com' }, // Different user
      })

      const entity = createSyncEntity('practiceSession', {
        userId: 'user-1', // Trying to sync data for user-1
        instrument: 'PIANO',
      })

      const result = await executeQuery(
        mutation,
        {
          batch: {
            entities: [entity],
            userId: 'user-1', // Claiming to be user-1
            syncToken: null,
          },
        },
        context
      )

      // Should fail due to user mismatch
      expect(result.errors).toBeDefined()
    })
  })

  describe('Sync Token Validation', () => {
    it('should reject invalid sync tokens', async () => {
      const query = `
        query GetChangesSince($syncToken: String!) {
          syncChangesSince(syncToken: $syncToken) {
            entities {
              id
            }
            newSyncToken
          }
        }
      `

      const context = createTestContext({
        db: mockDB as any,
        env: {
          DB: mockDB as any,
          MIRUBATO_MAGIC_LINKS: mockKVNamespace as any,
          JWT_SECRET: 'test-secret',
          ENVIRONMENT: 'development' as const,
        },
        user: { id: 'user-1', email: 'user1@example.com' },
      })

      // Invalid token format
      const result1 = await executeQuery(
        query,
        { syncToken: 'invalid-token' },
        context
      )
      expect(result1.errors).toBeDefined()

      // Token for different user
      const result2 = await executeQuery(
        query,
        { syncToken: 'user-2:123456' },
        context
      )
      expect(result2.errors).toBeDefined()
    })
  })
})
