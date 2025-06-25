import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseHelpers, calculateChecksum, generateId } from './database'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'

describe('DatabaseHelpers', () => {
  let mockDb: D1Database
  let dbHelpers: DatabaseHelpers

  beforeEach(() => {
    // Create mock D1 database
    const mockPreparedStatement = {
      bind: vi.fn().mockReturnThis(),
      run: vi.fn(),
      first: vi.fn(),
      all: vi.fn(),
    }

    mockDb = {
      prepare: vi.fn(() => mockPreparedStatement),
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
    } as unknown as D1Database

    dbHelpers = new DatabaseHelpers(mockDb)
  })

  describe('upsertUser', () => {
    it('should insert a new user', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockFirst = vi.fn().mockResolvedValue(null) // No existing user
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            run: mockRun,
            first: mockFirst,
          }) as unknown as D1PreparedStatement
      )

      await dbHelpers.upsertUser({
        email: 'test@example.com',
        displayName: 'Test User',
        authProvider: 'magic_link',
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users')
      )
      expect(mockRun).toHaveBeenCalled()
    })

    it('should update existing user on conflict', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      const existingUser = {
        id: 'existing-user-id',
        email: 'test@example.com',
        displayName: 'Old Name',
      }
      const mockFirst = vi.fn().mockResolvedValue(existingUser)
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: mockBind,
            run: mockRun,
            first: mockFirst,
          }) as unknown as D1PreparedStatement
      )

      await dbHelpers.upsertUser({
        email: 'test@example.com',
        displayName: 'Updated Name',
        authProvider: 'google',
        googleId: 'google-123',
      })

      // Since upsertUser doesn't accept an id parameter, we can't verify
      // the exact bind parameters without mocking findUserByEmail
      expect(mockBind).toHaveBeenCalled()
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users')
      )
    })
  })

  describe('getSyncData', () => {
    it('should fetch all sync data for a user', async () => {
      const mockResults = {
        results: [
          { entity_type: 'logbook_entry', entity_id: '1', data: '{}' },
          { entity_type: 'goal', entity_id: '2', data: '{}' },
        ],
        success: true,
        meta: {},
      }

      const mockAll = vi.fn().mockResolvedValue(mockResults)
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            all: mockAll,
          }) as unknown as D1PreparedStatement
      )

      const result = await dbHelpers.getSyncData('user-123')

      expect(result).toEqual(mockResults)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sync_data')
      )
    })

    it('should filter by entity type when provided', async () => {
      const mockBind = vi.fn().mockReturnThis()
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: mockBind,
            all: vi.fn().mockResolvedValue({ results: [], success: true }),
          }) as unknown as D1PreparedStatement
      )

      await dbHelpers.getSyncData('user-123', 'logbook_entry')

      expect(mockBind).toHaveBeenCalledWith('user-123', 'logbook_entry')
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND entity_type = ?')
      )
    })

    it('should handle database errors gracefully', async () => {
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockRejectedValue(new Error('Database error')),
          }) as unknown as D1PreparedStatement
      )

      const result = await dbHelpers.getSyncData('user-123')

      expect(result).toEqual({ results: [], success: true, meta: {} })
    })
  })

  describe('upsertSyncData', () => {
    it('should insert new sync data', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: mockBind,
            run: mockRun,
          }) as unknown as D1PreparedStatement
      )

      const testData = {
        userId: 'user-123',
        entityType: 'logbook_entry',
        entityId: 'entry-456',
        data: { id: 'entry-456', content: 'Test entry' },
        checksum: 'checksum-789',
        version: 1,
      }

      await dbHelpers.upsertSyncData(testData)

      expect(mockBind).toHaveBeenCalledWith(
        expect.stringMatching(/^sync_/), // Generated ID
        'user-123',
        'logbook_entry',
        'entry-456',
        JSON.stringify(testData.data),
        'checksum-789',
        1,
        null // deleted_at
      )
      expect(mockRun).toHaveBeenCalled()
    })

    it('should handle upsert conflicts', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            run: mockRun,
          }) as unknown as D1PreparedStatement
      )

      await dbHelpers.upsertSyncData({
        userId: 'user-123',
        entityType: 'goal',
        entityId: 'goal-123',
        data: { id: 'goal-123', title: 'Test Goal' },
        checksum: 'new-checksum',
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(user_id, entity_type, entity_id)')
      )
    })

    it('should log and rethrow database errors', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const dbError = new Error('Database connection failed')

      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockRejectedValue(dbError),
          }) as unknown as D1PreparedStatement
      )

      await expect(
        dbHelpers.upsertSyncData({
          userId: 'user-123',
          entityType: 'logbook_entry',
          entityId: 'entry-123',
          data: { test: true },
          checksum: 'checksum',
        })
      ).rejects.toThrow('Database connection failed')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Database] upsertSyncData error:',
        dbError
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateSyncMetadata', () => {
    it('should update sync metadata', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: mockBind,
            run: mockRun,
          }) as unknown as D1PreparedStatement
      )

      await dbHelpers.updateSyncMetadata('user-123', 'sync-token-abc', 3)

      expect(mockBind).toHaveBeenCalledWith('user-123', 'sync-token-abc', 3, 3)
      expect(mockRun).toHaveBeenCalled()
    })

    it('should handle errors with logging', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const dbError = new Error('Constraint violation')

      mockDb.prepare = vi.fn(
        () =>
          ({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockRejectedValue(dbError),
          }) as unknown as D1PreparedStatement
      )

      await expect(
        dbHelpers.updateSyncMetadata('user-123', 'token')
      ).rejects.toThrow('Constraint violation')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Database] updateSyncMetadata error:',
        dbError
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('deleteUser', () => {
    it('should delete user and all associated data', async () => {
      const mockBatch = vi
        .fn()
        .mockResolvedValue([
          { success: true },
          { success: true },
          { success: true },
        ])
      mockDb.batch = mockBatch

      await dbHelpers.deleteUser('user-123')

      expect(mockBatch).toHaveBeenCalled()
      const batchCalls = mockBatch.mock.calls[0][0]
      expect(batchCalls).toHaveLength(3)
    })
  })
})

describe('Utility functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test')
      const id2 = generateId('test')

      expect(id1).toMatch(/^test_[\w-]+$/)
      expect(id2).toMatch(/^test_[\w-]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should generate ID without prefix', () => {
      const id = generateId()

      expect(id).toMatch(/^[\w-]+$/)
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe('calculateChecksum', () => {
    it('should generate consistent checksums', async () => {
      const data = { id: 'test', value: 42, nested: { array: [1, 2, 3] } }

      const checksum1 = await calculateChecksum(data)
      const checksum2 = await calculateChecksum(data)

      expect(checksum1).toBe(checksum2)
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
    })

    it('should generate different checksums for different data', async () => {
      // We need to test the actual calculateChecksum, not a mock
      // Import the actual function
      vi.unmock('./database')
      const { calculateChecksum: realCalculateChecksum } = await import(
        './database'
      )

      const data1 = { id: 'test1' }
      const data2 = { id: 'test2' }

      const checksum1 = await realCalculateChecksum(data1)
      const checksum2 = await realCalculateChecksum(data2)

      expect(checksum1).not.toBe(checksum2)
    })

    it('should handle complex objects consistently', async () => {
      const complexData = {
        timestamp: '2025-06-23T22:32:52.797Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Piece 1' }, { title: 'Piece 2' }],
        techniques: ['technique1', 'technique2'],
        metadata: { source: 'test', nested: { deep: true } },
      }

      const checksum = await calculateChecksum(complexData)
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)

      // Ensure order doesn't matter for objects
      const reorderedData = {
        metadata: complexData.metadata,
        duration: complexData.duration,
        timestamp: complexData.timestamp,
        techniques: complexData.techniques,
        pieces: complexData.pieces,
        type: complexData.type,
        instrument: complexData.instrument,
      }

      const reorderedChecksum = await calculateChecksum(reorderedData)
      expect(reorderedChecksum).toBe(checksum)
    })
  })
})
