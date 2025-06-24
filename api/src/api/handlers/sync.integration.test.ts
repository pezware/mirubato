import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'

describe.skip('Sync API Integration Tests (using unstable_dev)', () => {
  let worker: Unstable_DevWorker
  let authToken: string

  beforeAll(async () => {
    // Start the worker in test mode
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      vars: {
        ENVIRONMENT: 'test',
      },
    })

    // First, create a test user and get auth token
    // This would typically involve calling the auth endpoints
    // For now, we'll assume we have a test token
    authToken = 'Bearer test-integration-token'
  })

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
      const pullData1 = await pullResponse1.json()
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
      const pushData = await pushResponse.json()
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
      const pullData2 = await pullResponse2.json()
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
      const statusData = await statusResponse.json()
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
      const batchData = await batchResponse.json()
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
