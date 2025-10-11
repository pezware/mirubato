import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseHelpers, sanitizeForD1 } from '../utils/database'

describe('D1 Type Error Prevention', () => {
  let mockDb: any
  let dbHelpers: DatabaseHelpers

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    }
    dbHelpers = new DatabaseHelpers(mockDb)
  })

  describe('sanitizeForD1', () => {
    it('should convert undefined to null', () => {
      expect(sanitizeForD1(undefined)).toBe(null)
    })

    it('should preserve null values', () => {
      expect(sanitizeForD1(null)).toBe(null)
    })

    it('should handle objects with undefined properties', () => {
      const input = {
        notes: undefined,
        mood: undefined,
        duration: 30,
        valid: 'value',
      }

      const result = sanitizeForD1(input)
      expect(result).toEqual({
        notes: null,
        mood: null,
        duration: 30,
        valid: 'value',
      })
    })

    it('should handle nested objects with undefined values', () => {
      const input = {
        entry: {
          notes: undefined,
          metadata: {
            source: 'manual',
            extra: undefined,
          },
        },
        mood: undefined,
      }

      const result = sanitizeForD1(input)
      expect(result).toEqual({
        entry: {
          notes: null,
          metadata: {
            source: 'manual',
            extra: null,
          },
        },
        mood: null,
      })
    })

    it('should handle arrays with undefined values', () => {
      const input = [undefined, 'valid', undefined, null]
      const result = sanitizeForD1(input)
      expect(result).toEqual([null, 'valid', null, null])
    })
  })

  describe('upsertSyncData with undefined values', () => {
    it('should handle entry data with undefined notes and mood', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null) // No existing record
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      const sequenceFirst = vi.fn().mockResolvedValue({ current_value: 1 })

      mockDb.prepare = vi.fn((sql: string) => {
        if (sql.includes('sync_sequence')) {
          return {
            bind: mockBind,
            first: sequenceFirst,
          }
        }
        if (sql.includes('SELECT')) {
          return { bind: mockBind, first: mockFirst }
        }
        return { bind: mockBind, run: mockRun }
      })

      // Simulate the exact entry data that causes D1_TYPE_ERROR
      const entryWithUndefined = {
        id: 'entry_123',
        timestamp: '2025-06-27T23:00:00.000Z',
        duration: 19, // The duration being changed from 9 to 19
        type: 'Practice',
        instrument: 'Guitar',
        pieces: [{ title: 'Test Piece', composer: 'Test Composer' }],
        techniques: ['scales'],
        goalIds: [],
        notes: undefined, // This would cause D1_TYPE_ERROR
        mood: undefined, // This would cause D1_TYPE_ERROR
        tags: [],
        metadata: { source: 'manual' },
        createdAt: '2025-06-27T22:00:00.000Z',
        updatedAt: '2025-06-27T23:00:00.000Z',
      }

      await dbHelpers.upsertSyncData({
        userId: 'user_123',
        entityType: 'logbook_entry',
        entityId: 'entry_123',
        data: entryWithUndefined,
        checksum: 'test_checksum',
      })

      // Verify that the INSERT was called (not update since no existing record)
      expect(mockRun).toHaveBeenCalled()

      // Verify that the JSON data passed to bind doesn't contain undefined
      const calls = mockBind.mock.calls
      const insertCall = calls.find(call => call.length >= 8) // INSERT has 8 parameters

      expect(insertCall).toBeDefined()
      if (insertCall) {
        const jsonData = insertCall[4] // The 5th parameter (index 4) is the JSON data
        const parsedData = JSON.parse(jsonData)
        expect(parsedData.notes).toBe(null) // Should be null, not undefined
        expect(parsedData.mood).toBe(null) // Should be null, not undefined
        expect(parsedData.duration).toBe(19) // Should preserve the actual value
      }
    })

    it('should handle entry updates with undefined values', async () => {
      let selectCallCount = 0
      const mockFirst = vi.fn(() => {
        selectCallCount++
        if (selectCallCount === 1) {
          // First SELECT checks for duplicate by checksum - return null
          return Promise.resolve(null)
        } else {
          // Second SELECT checks by entity_id - return existing record
          return Promise.resolve({ id: 'existing_id', version: 1 })
        }
      })
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      const sequenceFirst = vi.fn().mockResolvedValue({ current_value: 2 })

      mockDb.prepare = vi.fn((sql: string) => {
        if (sql.includes('sync_sequence')) {
          return {
            bind: mockBind,
            first: sequenceFirst,
          }
        }
        if (sql.includes('SELECT')) {
          return { bind: mockBind, first: mockFirst }
        }
        return { bind: mockBind, run: mockRun }
      })

      const entryUpdate = {
        id: 'entry_123',
        duration: 19, // Changed from 9 to 19
        notes: undefined, // Empty notes field
        mood: undefined, // Empty mood field
        updatedAt: '2025-06-27T23:00:00.000Z',
      }

      await dbHelpers.upsertSyncData({
        userId: 'user_123',
        entityType: 'logbook_entry',
        entityId: 'entry_123',
        data: entryUpdate,
        checksum: 'updated_checksum',
      })

      // Should call UPDATE since record exists
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_data')
      )

      // Verify JSON doesn't contain undefined
      const updateCalls = mockBind.mock.calls
      const jsonCall = updateCalls.find(call => {
        try {
          const parsed = JSON.parse(call[0])
          return parsed && typeof parsed === 'object'
        } catch {
          return false
        }
      })

      if (jsonCall) {
        const parsedData = JSON.parse(jsonCall[0])
        expect(parsedData.notes).toBe(null)
        expect(parsedData.mood).toBe(null)
        expect(parsedData.duration).toBe(19)
      }
    })
  })

  describe('Real-world D1_TYPE_ERROR scenario', () => {
    it('should prevent the exact error from the user report', async () => {
      // This test reproduces the exact scenario described by the user:
      // - Updating duration from 9 to 19 minutes
      // - Empty notes and mood fields sending undefined

      let selectCallCount = 0
      const mockFirst = vi.fn(() => {
        selectCallCount++
        if (selectCallCount === 1) {
          // First SELECT checks for duplicate by checksum - return null
          return Promise.resolve(null)
        } else {
          // Second SELECT checks by entity_id - return existing record
          return Promise.resolve({ id: 'existing', version: 1 })
        }
      })
      const mockRun = vi.fn().mockResolvedValue({ success: true })
      const mockBind = vi.fn().mockReturnThis()
      const sequenceFirst = vi.fn().mockResolvedValue({ current_value: 3 })

      mockDb.prepare = vi.fn((sql: string) => {
        if (sql.includes('sync_sequence')) {
          return {
            bind: mockBind,
            first: sequenceFirst,
          }
        }
        if (sql.includes('SELECT')) {
          return { bind: mockBind, first: mockFirst }
        }
        return { bind: mockBind, run: mockRun }
      })

      // Simulate the exact payload that would come from ManualEntryForm
      const problemEntry = {
        timestamp: '2025-06-27T19:00:00.000Z',
        duration: 19, // Updated from 9
        type: 'Practice',
        instrument: 'Guitar',
        pieces: [{ title: 'Russian Folk Song', composer: 'Beethoven Op. 107' }],
        techniques: [],
        goalIds: [],
        notes: undefined, // Empty string becomes undefined in form
        mood: undefined, // Empty mood becomes undefined
        tags: [],
        metadata: { source: 'manual' },
        updatedAt: '2025-06-27T19:05:00.000Z',
      }

      // This should NOT throw a D1_TYPE_ERROR
      await expect(
        dbHelpers.upsertSyncData({
          userId: 'user_abc123',
          entityType: 'logbook_entry',
          entityId: 'entry_xyz789',
          data: problemEntry,
          checksum: 'checksum_def456',
        })
      ).resolves.not.toThrow()

      // Verify the data was sanitized properly
      expect(mockRun).toHaveBeenCalled()

      // Check that no undefined values were passed to D1
      const bindCalls = mockBind.mock.calls
      bindCalls.forEach(call => {
        call.forEach((arg: any) => {
          if (typeof arg === 'string') {
            try {
              const parsed = JSON.parse(arg)
              // Recursively check for undefined values
              const hasUndefined = JSON.stringify(parsed).includes('undefined')
              expect(hasUndefined).toBe(false)
            } catch {
              // Not JSON, ignore
            }
          }
          expect(arg).not.toBe(undefined)
        })
      })
    })
  })
})
