import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { syncHandler } from './sync'
import type { Env } from '../../index'
import type { Variables } from '../middleware'

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
  authMiddleware: (c: any, next: any) => {
    c.set('userId', 'test-user-123')
    return next()
  },
  validateBody: (_schema: any) => async (c: any, next: any) => {
    try {
      const body = await c.req.json()
      c.set('validatedBody', body)
      return next()
    } catch (e) {
      return c.json({ error: 'Invalid body' }, 400)
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
              type: 'PRACTICE',
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as any
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as any
      expect(data.entries).toHaveLength(0)
      expect(data.goals).toHaveLength(0)
      expect(data.syncToken).toBeTruthy()
    })
  })

  describe('POST /api/sync/push', () => {
    it('should successfully push entries', async () => {
      mockDbInstance.upsertSyncData.mockResolvedValue(undefined)
      mockDbInstance.updateSyncMetadata.mockResolvedValue(undefined)

      const testEntry = {
        id: 'entry_1750717972797_0suwq20o8',
        timestamp: '2025-06-23T22:32:52.797Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data.syncToken).toBeTruthy()
      expect(data.conflicts).toEqual([])

      // Verify upsertSyncData was called correctly
      expect(mockDbInstance.upsertSyncData).toHaveBeenCalledWith({
        userId: 'test-user-123',
        entityType: 'logbook_entry',
        entityId: testEntry.id,
        data: testEntry,
        checksum: 'test-checksum-abc',
      })
    })

    it('should handle multiple entries and goals', async () => {
      mockDbInstance.upsertSyncData.mockResolvedValue(undefined)
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)
      expect(mockDbInstance.upsertSyncData).toHaveBeenCalledTimes(3)
      expect(mockDbInstance.updateSyncMetadata).toHaveBeenCalledOnce()
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
        DB: { prepare: vi.fn() } as any,
        ENVIRONMENT: 'development',
      } as Env)

      // The endpoint should return 200 but with conflicts listed
      expect(res.status).toBe(200)

      const data = (await res.json()) as any
      expect(data.success).toBe(true)
      expect(data.conflicts).toHaveLength(1)
      expect(data.conflicts[0]).toMatchObject({
        entityId: 'entry-1',
        entityType: 'logbook_entry',
        error: 'Database error',
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as any
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
        DB: { prepare: vi.fn() } as any,
      } as Env)

      expect(res.status).toBe(200)

      const data = (await res.json()) as any
      expect(data.lastSyncTime).toBe('2025-06-23T22:32:52.797Z')
      expect(data.syncToken).toBe('token-123')
      expect(data.deviceCount).toBe(2)
      expect(data.entityCount).toBe(5)
    })
  })
})
