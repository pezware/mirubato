import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'

describe('Sync API Integration Tests', () => {
  let worker: Unstable_DevWorker
  let authToken: string
  let testUserId: string

  beforeAll(async () => {
    // Start the worker in test mode with a longer timeout
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      vars: {
        ENVIRONMENT: 'test',
        JWT_SECRET: 'test-secret-for-integration-tests',
        MAGIC_LINK_SECRET: 'test-magic-link-secret',
      },
    })

    // For integration tests, we'll use the test JWT creation endpoint if available
    // Otherwise, we'll create a mock authenticated request

    // Create a test token using the debug endpoint if available in test mode
    const debugTokenResponse = await worker.fetch(
      'http://localhost/api/debug/jwt-test',
      {
        method: 'GET',
      }
    )

    if (debugTokenResponse.status === 200) {
      const debugData = (await debugTokenResponse.json()) as {
        testToken: string
        testUserId: string
      }
      authToken = `Bearer ${debugData.testToken}`
      testUserId = debugData.testUserId
    } else {
      // Fallback: Skip auth for these tests as they're testing sync logic, not auth
      console.warn('Debug JWT endpoint not available, tests may fail')
      authToken = 'Bearer test-token'
      testUserId = 'test-user-123'
    }
  }, 30000) // 30 second timeout for worker startup

  afterAll(async () => {
    await worker.stop()
  })

  describe('Full sync workflow', () => {
    it('should handle complete sync cycle', async () => {
      // 1. Pull initial data (should be empty)
      const pullResponse1 = await worker.fetch(
        'http://localhost/api/sync/pull',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        }
      )

      expect(pullResponse1.status).toBe(200)
      const pullData1 = (await pullResponse1.json()) as {
        entries: any[]
        goals: any[]
      }
      expect(pullData1.entries).toEqual([])
      expect(pullData1.goals).toEqual([])

      // 2. Push new data
      const testEntry = {
        id: 'entry_test_123',
        timestamp: new Date().toISOString(),
        duration: 45,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
        techniques: ['scales', 'arpeggios'],
        goalIds: [],
        notes: 'Great practice session!',
        tags: ['classical', 'beethoven'],
        metadata: { source: 'integration-test' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const pushResponse = await worker.fetch(
        'http://localhost/api/sync/push',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            changes: {
              entries: [testEntry],
            },
          }),
        }
      )

      expect(pushResponse.status).toBe(200)
      const pushData = (await pushResponse.json()) as {
        success: boolean
        syncToken: string
        conflicts: any[]
      }
      expect(pushData.success).toBe(true)
      expect(pushData.syncToken).toBeTruthy()
      expect(pushData.conflicts).toEqual([])

      // 3. Pull again to verify data was saved
      const pullResponse2 = await worker.fetch(
        'http://localhost/api/sync/pull',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        }
      )

      expect(pullResponse2.status).toBe(200)
      const pullData2 = (await pullResponse2.json()) as { entries: any[] }
      expect(pullData2.entries).toHaveLength(1)
      expect(pullData2.entries[0].id).toBe(testEntry.id)
      expect(pullData2.entries[0].notes).toBe('Great practice session!')

      // 4. Check sync status
      const statusResponse = await worker.fetch(
        'http://localhost/api/sync/status',
        {
          method: 'GET',
          headers: {
            Authorization: authToken,
          },
        }
      )

      expect(statusResponse.status).toBe(200)
      const statusData = (await statusResponse.json()) as {
        entityCount: number
        lastSyncTime: string
      }
      expect(statusData.entityCount).toBe(1)
      expect(statusData.lastSyncTime).toBeTruthy()
    })

    it('should handle conflicts in batch sync', async () => {
      // Create initial data
      const entity1 = {
        type: 'logbook_entry' as const,
        id: 'conflict-test-1',
        data: { id: 'conflict-test-1', content: 'Version 1' },
        checksum: 'checksum-v1',
        version: 1,
      }

      // Push initial version
      await worker.fetch('http://localhost/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
        body: JSON.stringify({
          changes: {
            entries: [entity1.data],
          },
        }),
      })

      // Try batch sync with outdated version
      const batchResponse = await worker.fetch(
        'http://localhost/api/sync/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            entities: [
              {
                ...entity1,
                data: { ...entity1.data, content: 'Version 2' },
                checksum: 'checksum-v2',
                version: 0, // Outdated version
              },
            ],
          }),
        }
      )

      expect(batchResponse.status).toBe(200)
      const batchData = (await batchResponse.json()) as {
        conflicts: Array<{ entityId: string }>
      }
      expect(batchData.conflicts).toHaveLength(1)
      expect(batchData.conflicts[0].entityId).toBe(entity1.id)
    })

    it('should handle validation errors', async () => {
      // Send invalid data
      const invalidResponse = await worker.fetch(
        'http://localhost/api/sync/push',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
          body: JSON.stringify({
            // Missing required 'changes' field
            entries: [{ id: 'test' }],
          }),
        }
      )

      expect(invalidResponse.status).toBe(400)
    })

    it('should require authentication', async () => {
      const unauthResponse = await worker.fetch(
        'http://localhost/api/sync/pull',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header
          },
        }
      )

      expect(unauthResponse.status).toBe(401)
    })
  })
})
