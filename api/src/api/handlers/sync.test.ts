import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import { syncHandler } from './sync'
import type { Env } from '../../index'
import type { Variables } from '../middleware'
import type { D1Database } from '@cloudflare/workers-types'

// Mock database instance
const mockDbInstance = {
  getSyncData: vi.fn(),
  getSyncMetadata: vi.fn(),
  upsertSyncData: vi.fn(),
  updateSyncMetadata: vi.fn(),
}

// Mock dependencies
vi.mock('../../utils/database', () => ({
  DatabaseHelpers: vi.fn(() => mockDbInstance),
  generateId: vi.fn(() => 'test-id-123'),
  calculateChecksum: vi.fn(() => 'test-checksum-abc'),
}))

vi.mock('../middleware', () => ({
  authMiddleware: (c: unknown, next: () => Promise<void>) => {
    const context = c as any
    context.set('userId', 'test-user-123')
    return next()
  },
  validateBody:
    (_schema: unknown) => async (c: unknown, next: () => Promise<void>) => {
      try {
        const body = await (c as any).req.json()
        const context = c as any
        context.set('validatedBody', body)
        return next()
      } catch (e) {
        return (c as any).json({ error: 'Invalid body' }, 400)
      }
    },
}))

describe('Sync Handlers', () => {
  let app: Hono<{ Bindings: Env; Variables: Variables }>

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono<{ Bindings: Env; Variables: Variables }>()
    app.route('/api/sync', syncHandler)
  })

  afterEach(() => {
    // Clear all mocks and reset mock implementations
    vi.clearAllMocks()
    mockDbInstance.getSyncData.mockReset()
    mockDbInstance.getSyncMetadata.mockReset()
    mockDbInstance.upsertSyncData.mockReset()
    mockDbInstance.updateSyncMetadata.mockReset()

    // Clear app instance
    app = null as any
  })

  describe('POST /api/sync/pull', () => {
    it('should return user sync data successfully', async () => {
      // Mock sync data response
      mockDbInstance.getSyncData.mockResolvedValue({
        results: [
          {
            entity_type: 'logbook_entry',
            entity_id: 'entry-1',
            data: JSON.stringify({
              id: 'entry-1',
              type: 'practice',
              duration: 30,
            }),
          },
          {
            entity_type: 'goal',
            entity_id: 'goal-1',
            data: JSON.stringify({
              id: 'goal-1',
              title: 'Test Goal',
            }),
          },
        ],
      })

      mockDbInstance.getSyncMetadata.mockResolvedValue({
        last_sync_token: 'existing-token',
      })

      const req = new Request('http://localhost/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data).toHaveProperty('entries')
      expect(data).toHaveProperty('goals')
      expect(data).toHaveProperty('syncToken')
      expect(data).toHaveProperty('timestamp')
      expect(data.entries).toHaveLength(1)
      expect(data.goals).toHaveLength(1)
    })

    it('should handle empty sync data', async () => {
      mockDbInstance.getSyncData.mockResolvedValue({ results: [] })
      mockDbInstance.getSyncMetadata.mockResolvedValue(null)

      const req = new Request('http://localhost/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data.entries).toHaveLength(0)
      expect(data.goals).toHaveLength(0)
      expect(data.syncToken).toBeTruthy()
    })
  })

  describe('POST /api/sync/push', () => {
    it('should successfully push entries', async () => {
      mockDbInstance.upsertSyncData.mockResolvedValue({
        id: 'sync-id',
        entity_id: 'entry_1750717972797_0suwq20o8',
        action: 'created',
      })
      mockDbInstance.updateSyncMetadata.mockResolvedValue(undefined)

      const testEntry = {
        id: 'entry_1750717972797_0suwq20o8',
        timestamp: '2025-06-23T22:32:52.797Z',
        duration: 30,
        type: 'practice',
        instrument: 'piano',
        pieces: [],
        techniques: [],
        goalIds: [],
        notes: '',
        tags: [],
        metadata: { source: 'manual' },
        createdAt: '2025-06-23T22:32:52.797Z',
        updatedAt: '2025-06-23T22:32:52.797Z',
      }

      const req = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [testEntry],
          },
        }),
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data.success).toBe(true)
      expect(data.syncToken).toBeTruthy()
      expect(data.conflicts).toEqual([])

      // Verify upsertSyncData was called correctly
      // Note: fields are transformed and normalized
      expect(mockDbInstance.upsertSyncData).toHaveBeenCalledWith({
        userId: 'test-user-123',
        entityType: 'logbook_entry',
        entityId: testEntry.id,
        data: expect.objectContaining({
          goal_ids: [],
          user_id: 'test-user-123',
          instrument: 'piano',
          createdAt: testEntry.createdAt,
          updatedAt: testEntry.updatedAt,
          created_at: testEntry.createdAt,
          updated_at: testEntry.updatedAt,
        }),
        checksum: 'test-checksum-abc',
        deviceId: undefined,
      })
    })

    it('should handle multiple entries and goals', async () => {
      mockDbInstance.upsertSyncData.mockResolvedValue({
        id: 'sync-id',
        entity_id: 'test-id',
        action: 'created',
      })
      mockDbInstance.updateSyncMetadata.mockResolvedValue(undefined)

      const testGoal = {
        id: 'goal-123',
        title: 'Practice 30 minutes daily',
        progress: 50,
      }

      const req = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [{ id: 'entry-1' }, { id: 'entry-2' }],
            goals: [testGoal],
          },
        }),
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)
      expect(mockDbInstance.upsertSyncData).toHaveBeenCalledTimes(3)
      expect(mockDbInstance.updateSyncMetadata).toHaveBeenCalledOnce()
    })

    it('should accept both goalIds and goal_ids field names', async () => {
      mockDbInstance.upsertSyncData.mockResolvedValue({
        id: 'sync-id',
        entity_id: 'entry-test',
        action: 'created',
      })
      mockDbInstance.updateSyncMetadata.mockResolvedValue(undefined)

      const testEntry = {
        id: 'entry-test',
        timestamp: 1724115660000, // Also test number timestamp
        duration: 45,
        type: 'practice',
        instrument: 'guitar',
        pieces: [],
        techniques: [],
        goal_ids: ['goal-1', 'goal-2'], // Using snake_case
        notes: 'Test with goal_ids',
        tags: [],
        metadata: { source: 'manual' },
        created_at: 1724115660000,
        updated_at: 1724115660000,
      }

      const req = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [testEntry],
          },
        }),
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)
      const data = (await res.json()) as Record<string, unknown>
      expect(data.success).toBe(true)

      // Verify it processes correctly
      expect(mockDbInstance.upsertSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'logbook_entry',
          entityId: testEntry.id,
          data: expect.objectContaining({
            goal_ids: ['goal-1', 'goal-2'],
            user_id: 'test-user-123',
          }),
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockDbInstance.upsertSyncData.mockRejectedValue(
        new Error('Database error')
      )

      const req = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [{ id: 'entry-1' }],
          },
        }),
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
        ENVIRONMENT: 'development',
      } as Env)

      // The endpoint should return 200 but with conflicts listed
      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data.success).toBe(true)
      expect(data.conflicts as unknown[]).toHaveLength(1)
      expect((data.conflicts as unknown[])[0]).toMatchObject({
        entityId: 'entry-1',
        entityType: 'logbook_entry',
        reason: 'Database error',
      })
    })
  })

  describe('POST /api/sync/batch', () => {
    it('should handle batch sync operations', async () => {
      mockDbInstance.getSyncData.mockResolvedValue({
        results: [
          {
            entity_type: 'logbook_entry',
            entity_id: 'entry-1',
            data: '{"id":"entry-1"}',
            checksum: 'checksum-1',
            version: 1,
          },
        ],
      })
      mockDbInstance.upsertSyncData.mockResolvedValue(undefined)
      mockDbInstance.updateSyncMetadata.mockResolvedValue(undefined)

      const req = new Request('http://localhost/api/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          entities: [
            {
              type: 'logbook_entry',
              id: 'entry-2',
              data: { id: 'entry-2' },
              checksum: 'checksum-2',
              version: 1,
            },
          ],
        }),
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data.uploaded).toBe(1)
      expect(data.downloaded).toBe(1)
      expect(data.conflicts).toEqual([])
      expect(data.newSyncToken).toBeTruthy()
    })
  })

  describe('GET /api/sync/status', () => {
    it('should return sync status', async () => {
      mockDbInstance.getSyncMetadata.mockResolvedValue({
        last_sync_time: '2025-06-23T22:32:52.797Z',
        last_sync_token: 'token-123',
        device_count: 2,
      })
      mockDbInstance.getSyncData.mockResolvedValue({
        results: new Array(5),
      })

      const req = new Request('http://localhost/api/sync/status', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      })

      const res = await app.fetch(req, {
        DB: { prepare: vi.fn() } as unknown as D1Database,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as Record<string, unknown>
      expect(data.lastSyncTime).toBe('2025-06-23T22:32:52.797Z')
      expect(data.syncToken).toBe('token-123')
      expect(data.deviceCount).toBe(2)
      expect(data.entityCount).toBe(5)
    })
  })
})
