import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import type { Env } from '../../index'
import { getMiniflare } from '../../../tests/setup'

// Mark this as an integration test
process.env.VITEST_INTEGRATION_TEST = 'true'

describe('Sync API Integration Tests with Miniflare', () => {
  let env: Env
  let ctx: ExecutionContext

  beforeEach(async () => {
    const mf = getMiniflare()
    if (!mf) {
      throw new Error('Miniflare not initialized')
    }

    const db = await mf.getD1Database('DB')

    // Ensure test user exists
    await db
      .prepare(
        `
      INSERT OR REPLACE INTO users (id, email, display_name, auth_provider)
      VALUES ('test-user-123', 'test@example.com', 'Test User', 'magic_link')
    `
      )
      .run()

    env = {
      DB: db,
      ENVIRONMENT: 'test',
      JWT_SECRET: 'test-jwt-secret',
      SENDGRID_API_KEY: 'test-sendgrid-key',
      FRONTEND_URL: 'http://localhost:3000',
    } as Env

    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext
  })

  describe('Full sync workflow', () => {
    it('should handle complete sync cycle', async () => {
      // 1. Pull initial data (should be empty)
      const pullRequest1 = new Request('http://localhost/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
      })

      const pullResponse1 = await app.fetch(pullRequest1, env, ctx)

      // Debug error if not 200
      if (pullResponse1.status !== 200) {
        const error = await pullResponse1.text()
        console.error('Pull error:', pullResponse1.status, error)
      }

      expect(pullResponse1.status).toBe(200)

      const pullData1 = (await pullResponse1.json()) as any
      expect(pullData1.entries).toEqual([])
      expect(pullData1.goals).toEqual([])

      // 2. Push new data
      const testEntry = {
        id: 'entry_test_123',
        timestamp: new Date().toISOString(),
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Test Piece' }],
        techniques: ['Scales'],
        goalIds: [],
        notes: 'Test practice session',
        tags: ['test'],
        metadata: { source: 'test' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const pushRequest = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [testEntry],
          },
        }),
      })

      const pushResponse = await app.fetch(pushRequest, env, ctx)
      expect(pushResponse.status).toBe(200)

      const pushData = (await pushResponse.json()) as any
      expect(pushData.success).toBe(true)
      expect(pushData.syncToken).toBeTruthy()
      expect(pushData.conflicts).toEqual([])

      // 3. Pull again to verify data was saved
      const pullRequest2 = new Request('http://localhost/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
      })

      const pullResponse2 = await app.fetch(pullRequest2, env, ctx)
      expect(pullResponse2.status).toBe(200)

      const pullData2 = (await pullResponse2.json()) as any
      expect(pullData2.entries).toHaveLength(1)
      expect(pullData2.entries[0].id).toBe('entry_test_123')
    })

    it('should handle conflicts in batch sync', async () => {
      // First, add an entry
      const existingEntry = {
        id: 'entry_conflict_123',
        timestamp: new Date().toISOString(),
        duration: 20,
        type: 'PRACTICE',
        instrument: 'GUITAR',
        pieces: [],
        techniques: [],
        goalIds: [],
        notes: 'Original note',
        tags: [],
        metadata: { source: 'test' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const pushRequest1 = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
        body: JSON.stringify({
          changes: {
            entries: [existingEntry],
          },
        }),
      })

      const pushResponse1 = await app.fetch(pushRequest1, env, ctx)
      expect(pushResponse1.status).toBe(200)

      // Now try to sync a conflicting version
      const conflictingEntry = {
        ...existingEntry,
        notes: 'Conflicting note',
        updatedAt: new Date(Date.now() - 1000).toISOString(), // Older timestamp
      }

      const batchRequest = new Request('http://localhost/api/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
        body: JSON.stringify({
          entities: [
            {
              type: 'logbook_entry',
              id: conflictingEntry.id,
              checksum: 'different-checksum', // Different from original to trigger conflict
              data: conflictingEntry,
              version: 0, // Lower version to ensure conflict
            },
          ],
          // syncToken is optional, don't send null
        }),
      })

      const batchResponse = await app.fetch(batchRequest, env, ctx)

      // Debug error if not 200
      if (batchResponse.status !== 200) {
        const error = await batchResponse.text()
        console.error('Batch error:', batchResponse.status, error)
        console.error(
          'Request body was:',
          JSON.stringify(
            {
              entities: [
                {
                  type: 'logbook_entry',
                  id: conflictingEntry.id,
                  checksum: 'different-checksum',
                  data: conflictingEntry,
                  version: 1,
                },
              ],
              // syncToken is optional, don't send null
            },
            null,
            2
          )
        )
      }

      expect(batchResponse.status).toBe(200)

      const batchData = (await batchResponse.json()) as any
      expect(batchData.conflicts).toHaveLength(1)
      expect(batchData.conflicts[0].entityId).toBe('entry_conflict_123')
    })
  })

  describe('Error handling', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await app.fetch(request, env, ctx)
      expect(response.status).toBe(401)
    })

    it('should validate request body', async () => {
      const request = new Request('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-integration-token',
        },
        body: JSON.stringify({
          // Missing required 'changes' field
        }),
      })

      const response = await app.fetch(request, env, ctx)
      expect(response.status).toBe(400)
    })
  })
})
