import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockContext } from '../../testUtils/mockContext'
import { syncResolvers } from '../sync'
import type { GraphQLContext } from '../../types/context'

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-id-123'),
}))

describe('Sync Resolvers', () => {
  let ctx: GraphQLContext
  let mockDb: any

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
        last_sync_at: '2024-01-01T10:00:00Z',
        sync_version: 1,
        device_count: 2,
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockMetadata),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncMetadata(null, {}, ctx)

      expect(result).toEqual({
        lastSyncAt: '2024-01-01T10:00:00Z',
        syncVersion: 1,
        deviceCount: 2,
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

      const result = await syncResolvers.Query.syncMetadata(null, {}, ctx)

      expect(result).toEqual({
        lastSyncAt: expect.any(String),
        syncVersion: 1,
        deviceCount: 1,
      })
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT')
      )
    })

    it('should throw error for unauthenticated user', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Query.syncMetadata(null, {}, ctx)
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('Query: syncBatch', () => {
    it('should fetch sync batch data', async () => {
      const mockBatch = {
        sessions: [{ id: 'session-1', user_id: 'user-123' }],
        logs: [{ id: 'log-1', session_id: 'session-1' }],
        entries: [{ id: 'entry-1', user_id: 'user-123' }],
        goals: [{ id: 'goal-1', user_id: 'user-123' }],
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          all: vi
            .fn()
            .mockResolvedValueOnce({ results: mockBatch.sessions })
            .mockResolvedValueOnce({ results: mockBatch.logs })
            .mockResolvedValueOnce({ results: mockBatch.entries })
            .mockResolvedValueOnce({ results: mockBatch.goals }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncBatch(
        null,
        { lastSyncAt: '2024-01-01T00:00:00Z', limit: 100 },
        ctx
      )

      expect(result).toEqual({
        sessions: mockBatch.sessions,
        logs: mockBatch.logs,
        entries: mockBatch.entries,
        goals: mockBatch.goals,
        hasMore: false,
      })
    })

    it('should handle pagination correctly', async () => {
      const largeResults = Array(101)
        .fill(null)
        .map((_, i) => ({
          id: `session-${i}`,
          user_id: 'user-123',
        }))

      const mockStmts = {
        bind: vi.fn(() => ({
          all: vi
            .fn()
            .mockResolvedValueOnce({ results: largeResults })
            .mockResolvedValueOnce({ results: [] })
            .mockResolvedValueOnce({ results: [] })
            .mockResolvedValueOnce({ results: [] }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Query.syncBatch(
        null,
        { lastSyncAt: '2024-01-01T00:00:00Z', limit: 100 },
        ctx
      )

      expect(result.sessions).toHaveLength(100) // Limited to 100
      expect(result.hasMore).toBe(true)
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
        { since: '2024-01-01T00:00:00Z', limit: 50 },
        ctx
      )

      expect(result).toEqual({
        sessions: mockChanges.sessions,
        goals: mockChanges.goals,
        entries: mockChanges.entries,
        deleted: mockChanges.deleted,
        hasMore: false,
        newSyncToken: expect.any(String),
      })
    })

    it('should throw error for unauthenticated user', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Query.syncChangesSince(
          null,
          { since: '2024-01-01T00:00:00Z' },
          ctx
        )
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('Mutation: syncPull', () => {
    it('should process client sync batch successfully', async () => {
      const input = {
        clientBatch: {
          sessions: [
            {
              id: 'client-session-1',
              startTime: '2024-01-01T10:00:00Z',
              duration: 1800,
              sheetMusicId: 'sheet-1',
              instrument: 'PIANO',
              updatedAt: '2024-01-01T11:00:00Z',
            },
          ],
          logs: [],
          entries: [],
          goals: [],
        },
        lastSyncVersion: 1,
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

      const result = await syncResolvers.Mutation.syncPull(null, { input }, ctx)

      expect(result).toEqual({
        serverBatch: {
          sessions: [],
          logs: [],
          entries: [],
          goals: [],
          hasMore: false,
        },
        syncVersion: 2,
        conflicts: [],
      })

      // Verify upsert was called
      expect(mockDb.batch).toHaveBeenCalled()
    })

    it('should handle conflicts correctly', async () => {
      const input = {
        clientBatch: {
          sessions: [
            {
              id: 'conflict-session-1',
              startTime: '2024-01-01T10:00:00Z',
              duration: 1800,
              updatedAt: '2024-01-01T10:00:00Z',
            },
          ],
          logs: [],
          entries: [],
          goals: [],
        },
        lastSyncVersion: 1,
      }

      // Mock existing session with newer timestamp
      const existingSession = {
        id: 'conflict-session-1',
        updated_at: '2024-01-01T11:00:00Z', // Newer than client
        duration: 2400,
      }

      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(existingSession),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Mutation.syncPull(null, { input }, ctx)

      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toEqual({
        id: 'conflict-session-1',
        type: 'SESSION',
        clientVersion: input.clientBatch.sessions[0],
        serverVersion: expect.any(Object),
      })
    })
  })

  describe('Mutation: syncAnonymousData', () => {
    it('should sync anonymous data successfully', async () => {
      const input = {
        sessions: [
          {
            id: 'anon-session-1',
            startTime: '2024-01-01T09:00:00Z',
            duration: 1800,
            sheetMusicId: 'sheet-1',
            instrument: 'GUITAR',
          },
        ],
        logs: [],
        entries: [
          {
            id: 'anon-entry-1',
            timestamp: '2024-01-01T10:00:00Z',
            duration: 1800,
            type: 'PRACTICE',
            instrument: 'GUITAR',
            pieces: [],
            techniques: ['scales'],
            goalIds: [],
            notes: 'Anonymous practice',
            mood: 'FOCUSED',
            tags: ['morning'],
          },
        ],
        goals: [],
      }

      // Mock successful inserts
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null), // No duplicates
          run: vi.fn().mockResolvedValue({ success: true }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)
      mockDb.batch.mockResolvedValue(
        Array(input.sessions.length + input.entries.length).fill({
          success: true,
        })
      )

      const result = await syncResolvers.Mutation.syncAnonymousData(
        null,
        { input },
        ctx
      )

      expect(result).toEqual({
        success: true,
        syncedSessions: 1,
        syncedLogs: 0,
        syncedEntries: 1,
        syncedGoals: 0,
        errors: null,
      })

      expect(mockDb.batch).toHaveBeenCalled()
    })

    it('should handle duplicate entries gracefully', async () => {
      const input = {
        sessions: [
          {
            id: 'duplicate-session-1',
            startTime: '2024-01-01T09:00:00Z',
            duration: 1800,
          },
        ],
        logs: [],
        entries: [],
        goals: [],
      }

      // Mock duplicate detection
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ id: 'duplicate-session-1' }), // Duplicate exists
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Mutation.syncAnonymousData(
        null,
        { input },
        ctx
      )

      expect(result.success).toBe(true)
      expect(result.syncedSessions).toBe(0) // Skipped duplicate
      expect(result.errors).toBeNull()
    })

    it('should handle partial failures', async () => {
      const input = {
        sessions: [
          { id: 'session-1', startTime: '2024-01-01T09:00:00Z' },
          { id: 'session-2', startTime: '2024-01-01T10:00:00Z' },
        ],
        logs: [],
        entries: [],
        goals: [],
      }

      // Mock one success, one failure
      const mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          run: vi
            .fn()
            .mockResolvedValueOnce({ success: true })
            .mockRejectedValueOnce(new Error('DB Error')),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      const result = await syncResolvers.Mutation.syncAnonymousData(
        null,
        { input },
        ctx
      )

      expect(result.success).toBe(false)
      expect(result.syncedSessions).toBe(1)
      expect(result.errors).toContain('Failed to sync session-2')
    })

    it('should require authentication', async () => {
      ctx.user = null

      await expect(
        syncResolvers.Mutation.syncAnonymousData(
          null,
          { input: { sessions: [], logs: [], entries: [], goals: [] } },
          ctx
        )
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('Helper Functions', () => {
    it('should correctly detect conflicts based on timestamps', async () => {
      const input = {
        clientBatch: {
          sessions: [
            {
              id: 'test-session',
              updatedAt: '2024-01-01T10:00:00Z',
              duration: 1800,
            },
          ],
          logs: [],
          entries: [],
          goals: [],
        },
        lastSyncVersion: 1,
      }

      // Test case 1: Server version is newer (conflict)
      let mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            id: 'test-session',
            updated_at: '2024-01-01T11:00:00Z', // Newer
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)

      let result = await syncResolvers.Mutation.syncPull(null, { input }, ctx)
      expect(result.conflicts).toHaveLength(1)

      // Test case 2: Client version is newer (no conflict)
      mockStmts = {
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            id: 'test-session',
            updated_at: '2024-01-01T09:00:00Z', // Older
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      }
      mockDb.prepare.mockReturnValue(mockStmts)
      mockDb.batch.mockResolvedValue([{ success: true }])

      result = await syncResolvers.Mutation.syncPull(null, { input }, ctx)
      expect(result.conflicts).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await expect(
        syncResolvers.Query.syncMetadata(null, {}, ctx)
      ).rejects.toThrow('Database connection failed')
    })

    it('should validate input data', async () => {
      const invalidInput = {
        sessions: [
          {
            // Missing required fields
            id: 'invalid-session',
          },
        ],
        logs: [],
        entries: [],
        goals: [],
      }

      await expect(
        syncResolvers.Mutation.syncAnonymousData(
          null,
          { input: invalidInput },
          ctx
        )
      ).rejects.toThrow()
    })
  })
})
