import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockContext } from '../../testUtils/mockContext'
import { syncResolvers } from '../sync'
import type { GraphQLContext } from '../../types/context'
import type { KVNamespace } from '@cloudflare/workers-types'

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-id-123'),
}))

describe('Sync Resolvers', () => {
  let ctx: GraphQLContext
  let mockDb: unknown

  beforeEach(() => {
    // Create mock database
    mockDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(),
          all: vi.fn(),
          run: vi.fn(),
        })),
      })),
      batch: vi.fn(),
    }

    // Create mock context
    ctx = createMockContext({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        hasCloudStorage: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      db: mockDb,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query: syncMetadata', () => {
    it('should return sync metadata for authenticated user', async () => {
      const mockMetadata = {
        user_id: 'user-123',
        last_sync_timestamp: 1704103200000,
        sync_token: 'sync-token-123',
        pending_sync_count: 0,
        last_sync_status: 'success',
        last_sync_error: null,
        device_count: 2,
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockMetadata),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncMetadata(
        null,
        { userId: 'user-123' },
        ctx
      )

      expect(result).toEqual({
        lastSyncTimestamp: 1704103200000,
        syncToken: 'sync-token-123',
        pendingSyncCount: 0,
        lastSyncStatus: 'success',
        lastSyncError: null,
      })
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      )
    })

    it('should create new metadata if none exists', async () => {
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncMetadata(
        null,
        { userId: 'user-123' },
        ctx
      )

      expect(result).toEqual({
        lastSyncTimestamp: 0,
        syncToken: null,
        pendingSyncCount: 0,
        lastSyncStatus: 'never_synced',
        lastSyncError: null,
      })
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      )
    })

    it('should throw error for unauthenticated user', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Query.syncMetadata(null, { userId: 'user-123' }, ctx)
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('Query: allUserData', () => {
    it('should fetch all user data', async () => {
      const mockData = {
        sessions: [{ id: 'session-1', user_id: 'user-123' }],
        goals: [{ id: 'goal-1', user_id: 'user-123' }],
        entries: [{ id: 'entry-1', user_id: 'user-123' }],
      }

      mockDb.prepare
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockData.sessions }),
          })),
        })
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockData.goals }),
          })),
        })
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockData.entries }),
          })),
        })

      const result = await syncResolvers.Query.allUserData(
        null,
        { userId: 'user-123' },
        ctx
      )

      expect(result).toEqual({
        practiceSessions: mockData.sessions,
        practiceGoals: mockData.goals,
        logbookEntries: mockData.entries,
      })
    })

    it('should throw error for unauthorized user', async () => {
      const differentUserId = 'different-user-456'

      await expect(
        syncResolvers.Query.allUserData(null, { userId: differentUserId }, ctx)
      ).rejects.toThrow('Not authorized')
    })
  })

  describe('Query: syncDebugInfo', () => {
    it('should return sync debug information', async () => {
      const mockDevices = [
        {
          deviceId: 'device-1',
          entryCount: 10,
          lastSeen: Date.now(),
        },
      ]

      const mockConflicts = []
      const mockSyncLogs = []

      mockDb.prepare
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockDevices }),
          })),
        })
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue({ count: 5 }),
          })),
        })
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockConflicts }),
          })),
        })
        .mockReturnValueOnce({
          bind: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: mockSyncLogs }),
          })),
        })

      const result = await syncResolvers.Query.syncDebugInfo(
        null,
        { userId: 'user-123' },
        ctx
      )

      expect(result).toHaveProperty('devices')
      expect(result).toHaveProperty('localEntryCount')
      expect(result).toHaveProperty('cloudEntryCount')
      expect(result).toHaveProperty('conflicts')
      expect(result).toHaveProperty('lastSyncLogs')
    })
  })

  describe('Query: syncChangesSince', () => {
    it('should return changes since given timestamp', async () => {
      const mockChanges = {
        sessions: [{ id: 'session-new', updated_at: '2024-01-02T00:00:00Z' }],
        goals: [{ id: 'goal-new', updated_at: '2024-01-02T00:00:00Z' }],
        entries: [],
        deleted: [{ entity_id: 'deleted-1', entity_type: 'session' }],
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          all: vi
            .fn()
            .mockResolvedValueOnce({ results: mockChanges.sessions })
            .mockResolvedValueOnce({ results: mockChanges.goals })
            .mockResolvedValueOnce({ results: mockChanges.entries })
            .mockResolvedValueOnce({ results: mockChanges.deleted }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncChangesSince(
        null,
        { syncToken: 'user-123:1704067200000' },
        ctx
      )

      expect(result).toEqual({
        entities: expect.any(Array),
        deletedIds: expect.any(Array),
        newSyncToken: expect.any(String),
      })
    })

    it('should throw error for unauthenticated user', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Query.syncChangesSince(
          null,
          { syncToken: 'user-123:1704067200000' },
          ctx
        )
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('Mutation: syncBatch', () => {
    it('should process client sync batch successfully', async () => {
      const batch = {
        userId: 'user-123',
        syncToken: 'old-token',
        entities: [
          {
            id: 'entity-1',
            localId: 'local-1',
            remoteId: null,
            entityType: 'practiceSession',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            syncVersion: 1,
            checksum: 'checksum-1',
            deviceId: 'device-1',
            data: {
              instrument: 'PIANO',
              sheetMusicId: 'sheet-1',
              sessionType: 'FREE_PRACTICE',
              startedAt: '2024-01-01T10:00:00Z',
              completedAt: '2024-01-01T10:30:00Z',
              pausedDuration: 0,
              accuracyPercentage: 85,
              notesAttempted: 100,
              notesCorrect: 85,
            },
          },
        ],
      }

      // Mock successful database operations
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null), // No conflicts
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)
      mockDb.batch.mockResolvedValue([{ success: true }])

      const result = await syncResolvers.Mutation.syncBatch(
        null,
        { batch },
        ctx
      )

      expect(result).toEqual({
        uploaded: 1,
        failed: 0,
        errors: [],
        newSyncToken: expect.any(String),
      })

      // Verify database operations were called
      expect(mockDb.prepare).toHaveBeenCalled()
    })

    it('should handle conflicts correctly', async () => {
      const batch = {
        userId: 'user-123',
        syncToken: 'old-token',
        entities: [
          {
            id: 'conflict-entity-1',
            localId: 'local-1',
            remoteId: 'remote-1',
            entityType: 'practiceSession',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null,
            syncVersion: 2,
            checksum: 'checksum-old',
            deviceId: 'device-1',
            data: {
              instrument: 'PIANO',
              duration: 1800,
            },
          },
        ],
      }

      // Mock existing entity with higher sync version (conflict)
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            id: 'remote-1',
            sync_version: 3, // Higher version = conflict
            checksum: 'checksum-different',
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      // Should still process but log the conflict
      const result = await syncResolvers.Mutation.syncBatch(
        null,
        { batch },
        ctx
      )

      expect(result.uploaded).toBe(1) // Still uploads (last-write-wins)
      expect(result.failed).toBe(0)
    })
  })

  describe('Mutation: updateSyncMetadata', () => {
    it('should update sync metadata successfully', async () => {
      const args = {
        userId: 'user-123',
        lastSyncTimestamp: Date.now(),
        syncToken: 'new-token-123',
        status: 'success',
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      // Mock KV store
      ctx.env.MIRUBATO_MAGIC_LINKS = {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as unknown as KVNamespace

      const result = await syncResolvers.Mutation.updateSyncMetadata(
        null,
        args,
        ctx
      )

      expect(result).toEqual({
        lastSyncTimestamp: args.lastSyncTimestamp,
        syncToken: args.syncToken,
        pendingSyncCount: 0,
        lastSyncStatus: args.status,
        lastSyncError: null,
      })

      expect(mockDb.prepare).toHaveBeenCalled()
      expect(ctx.env.MIRUBATO_MAGIC_LINKS.put).toHaveBeenCalledWith(
        `sync:metadata:${args.userId}`,
        expect.any(String)
      )
    })

    it('should require authentication', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Mutation.updateSyncMetadata(
          null,
          {
            userId: 'user-123',
            lastSyncTimestamp: Date.now(),
            syncToken: 'token',
            status: 'success',
          },
          ctx
        )
      ).rejects.toThrow('Not authorized')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(
        syncResolvers.Query.syncMetadata(null, { userId: 'user-123' }, ctx)
      ).rejects.toThrow('Database connection failed')
    })

    it('should validate sync token format', async () => {
      const invalidTokens = [
        'invalid-token', // No colon
        ':12345', // No user ID
        'user-123:', // No timestamp
        'user-123:abc', // Invalid timestamp
      ]

      for (const token of invalidTokens) {
        await expect(
          syncResolvers.Query.syncChangesSince(null, { syncToken: token }, ctx)
        ).rejects.toThrow()
      }
    })
  })
})
