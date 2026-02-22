import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unstable_dev } from 'wrangler'
import type { Unstable_DevWorker } from 'wrangler'
import { generateAccessToken } from '../../utils/auth'

// Skip integration tests in CI as they require a real database setup
// These tests are for local development
describe.skip('Sync API Integration Tests', () => {
  let worker: Unstable_DevWorker
  let authToken: string
  const testUserId = 'test-user-123'
  const testEmail = 'test@example.com'

  beforeAll(async () => {
    // Start the worker in test mode with a longer timeout
    const jwtSecret = 'test-secret-for-integration-tests'
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      vars: {
        ENVIRONMENT: 'test',
        JWT_SECRET: jwtSecret,
        MAGIC_LINK_SECRET: 'test-magic-link-secret',
      },
    })

    // Create a valid test token using the same secret
    const token = await generateAccessToken(testUserId, testEmail, jwtSecret)
    authToken = `Bearer ${token}`
  }, 30000) // 30 second timeout for worker startup

  afterAll(async () => {
    await worker.stop()
  })

  describe('Full sync workflow', () => {
    // Helper to ensure user exists by making an authenticated request
    // The auth middleware will create the user if it doesn't exist
    const ensureUserExists = async () => {
      // Try to get sync data - this will create the user if needed
      const response = await worker.fetch(
        'http://localhost/api/sync/metadata',
        {
          method: 'GET',
          headers: {
            Authorization: authToken,
          },
        }
      )
      // We don't care if this succeeds or fails, we just need the user created
      await response.text()
    }

    it('should handle complete sync cycle', async () => {
      // Ensure user exists first
      await ensureUserExists()
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
        entries: unknown[]
        goals: unknown[]
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
        conflicts: unknown[]
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
      const pullData2 = (await pullResponse2.json()) as {
        entries: Record<string, unknown>[]
      }
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
      // Ensure user exists first
      await ensureUserExists()
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
      // Ensure user exists first
      await ensureUserExists()
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
