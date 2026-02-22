import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseHelpers, sanitizeForD1 } from '../utils/database'
import type { D1Database } from '@cloudflare/workers-types'

describe('Comprehensive Undefined Value Handling', () => {
  let mockDb: { prepare: ReturnType<typeof vi.fn> }
  let dbHelpers: DatabaseHelpers

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    }
    dbHelpers = new DatabaseHelpers(mockDb as unknown as D1Database)
  })

  describe('sanitizeForD1 comprehensive tests', () => {
    it('should handle all possible undefined scenarios in logbook entries', () => {
      const entryWithManyUndefinedFields = {
        id: 'entry_123',
        timestamp: '2025-06-27T19:00:00.000Z',
        duration: 30,
        type: 'Practice',
        instrument: 'Guitar',
        pieces: [
          {
            title: 'Test Piece',
            composer: undefined, // ❌ Common source of D1_TYPE_ERROR
            measures: undefined, // ❌ Not set in ManualEntryForm
            tempo: undefined, // ❌ Not set in ManualEntryForm
            id: undefined, // ❌ Optional field
          },
          {
            title: 'Another Piece',
            composer: 'Bach',
            measures: undefined,
            tempo: undefined,
            id: undefined,
          },
        ],
        techniques: [],
        goalIds: [],
        notes: undefined, // ❌ Empty form field
        mood: undefined, // ❌ Empty form field
        tags: [],
        metadata: {
          source: 'manual',
          accuracy: undefined, // ❌ Optional field
          notesPlayed: undefined, // ❌ Optional field
          mistakeCount: undefined, // ❌ Optional field
        },
        createdAt: '2025-06-27T19:00:00.000Z',
        updatedAt: '2025-06-27T19:00:00.000Z',
        deletedAt: undefined, // ❌ Optional field
      }

      const sanitized = sanitizeForD1(entryWithManyUndefinedFields)

      // Verify all undefined values are converted to null
      expect(sanitized).toEqual({
        id: 'entry_123',
        timestamp: '2025-06-27T19:00:00.000Z',
        duration: 30,
        type: 'Practice',
        instrument: 'Guitar',
        pieces: [
          {
            title: 'Test Piece',
            composer: null, // ✅ Converted from undefined
            measures: null, // ✅ Converted from undefined
            tempo: null, // ✅ Converted from undefined
            id: null, // ✅ Converted from undefined
          },
          {
            title: 'Another Piece',
            composer: 'Bach',
            measures: null, // ✅ Converted from undefined
            tempo: null, // ✅ Converted from undefined
            id: null, // ✅ Converted from undefined
          },
        ],
        techniques: [],
        goalIds: [],
        notes: null, // ✅ Converted from undefined
        mood: null, // ✅ Converted from undefined
        tags: [],
        metadata: {
          source: 'manual',
          accuracy: null, // ✅ Converted from undefined
          notesPlayed: null, // ✅ Converted from undefined
          mistakeCount: null, // ✅ Converted from undefined
        },
        createdAt: '2025-06-27T19:00:00.000Z',
        updatedAt: '2025-06-27T19:00:00.000Z',
        deletedAt: null, // ✅ Converted from undefined
      })
    })

    it('should handle mixed null and undefined values correctly', () => {
      const mixedData = {
        notes: undefined, // Should become null
        mood: null, // Should stay null
        composer: undefined, // Should become null
        title: 'Valid', // Should stay as is
        metadata: {
          source: 'manual',
          extra: undefined, // Should become null
          other: null, // Should stay null
        },
      }

      const result = sanitizeForD1(mixedData)

      expect(result).toEqual({
        notes: null,
        mood: null,
        composer: null,
        title: 'Valid',
        metadata: {
          source: 'manual',
          extra: null,
          other: null,
        },
      })
    })

    it('should handle deeply nested undefined values', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              value: undefined,
              array: [undefined, 'valid', undefined],
              nested: {
                deep: undefined,
              },
            },
          },
          directUndefined: undefined,
        },
      }

      const result = sanitizeForD1(deeplyNested)

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              value: null,
              array: [null, 'valid', null],
              nested: {
                deep: null,
              },
            },
          },
          directUndefined: null,
        },
      })
    })
  })

  describe('Real-world scenario tests', () => {
    it('should handle ManualEntryForm data with empty piece composers', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null)
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

      // Simulate data from ManualEntryForm where user didn't fill composer
      const formData = {
        timestamp: '2025-06-27T19:00:00.000Z',
        duration: 30,
        type: 'Practice',
        instrument: 'Piano',
        pieces: [
          {
            title: 'Moonlight Sonata',
            composer: null, // User left composer empty, form sends null
          },
          {
            title: 'Fur Elise',
            composer: null, // User left composer empty, form sends null
          },
        ],
        techniques: [],
        goalIds: [],
        notes: null, // User left notes empty, form sends null
        mood: null, // User didn't select mood, form sends null
        tags: [],
        metadata: { source: 'manual' },
      }

      await dbHelpers.upsertSyncData({
        userId: 'user_123',
        entityType: 'logbook_entry',
        entityId: 'entry_123',
        data: formData,
        checksum: 'test_checksum',
      })

      expect(mockRun).toHaveBeenCalled()

      // Verify the JSON data was stored correctly
      const calls = mockBind.mock.calls
      const insertCall = calls.find(call => call.length >= 8)
      expect(insertCall).toBeDefined()

      if (insertCall) {
        const jsonData = insertCall[4]
        const parsedData = JSON.parse(jsonData)

        // All piece composers should be null (not undefined)
        parsedData.pieces.forEach((piece: Record<string, unknown>) => {
          expect(piece.composer).toBe(null)
          expect(piece.composer).not.toBe(undefined)
        })

        expect(parsedData.notes).toBe(null)
        expect(parsedData.mood).toBe(null)
      }
    })

    it('should handle legacy entry data with undefined values', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null)
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

      // Simulate legacy data that might have undefined values
      const legacyData = {
        timestamp: '2025-06-27T19:00:00.000Z',
        duration: 45,
        type: 'Practice',
        instrument: 'Guitar',
        pieces: [
          {
            id: undefined, // Legacy data might not have IDs
            title: 'Classical Gas',
            composer: undefined, // Legacy data might not have composers
            measures: undefined, // Legacy data might not have measures
            tempo: undefined, // Legacy data might not have tempo
          },
        ],
        techniques: ['fingerpicking'],
        goalIds: [],
        notes: undefined, // Legacy data might not have notes
        mood: undefined, // Legacy data might not have mood
        tags: [],
        metadata: undefined, // Legacy data might not have metadata
        createdAt: '2025-06-27T19:00:00.000Z',
        updatedAt: '2025-06-27T19:00:00.000Z',
        deletedAt: undefined, // Legacy data might not have deletedAt
      }

      await dbHelpers.upsertSyncData({
        userId: 'user_456',
        entityType: 'logbook_entry',
        entityId: 'legacy_entry_123',
        data: legacyData,
        checksum: 'legacy_checksum',
      })

      expect(mockRun).toHaveBeenCalled()

      // Verify no undefined values made it to the database
      const calls = mockBind.mock.calls
      const insertCall = calls.find(call => call.length >= 8)

      if (insertCall) {
        const jsonData = insertCall[4]

        // The JSON string should not contain the word "undefined"
        expect(jsonData).not.toContain('undefined')

        const parsedData = JSON.parse(jsonData)

        // Check specific fields that were undefined
        expect(parsedData.pieces[0].id).toBe(null)
        expect(parsedData.pieces[0].composer).toBe(null)
        expect(parsedData.pieces[0].measures).toBe(null)
        expect(parsedData.pieces[0].tempo).toBe(null)
        expect(parsedData.notes).toBe(null)
        expect(parsedData.mood).toBe(null)
        expect(parsedData.metadata).toBe(null)
        expect(parsedData.deletedAt).toBe(null)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty objects and arrays', () => {
      const data = {
        emptyObject: {},
        emptyArray: [],
        nullValue: null,
        undefinedValue: undefined,
        zeroValue: 0,
        emptyString: '',
        falseValue: false,
      }

      const result = sanitizeForD1(data)

      expect(result).toEqual({
        emptyObject: {},
        emptyArray: [],
        nullValue: null,
        undefinedValue: null, // ✅ Converted
        zeroValue: 0, // ✅ Preserved
        emptyString: '', // ✅ Preserved
        falseValue: false, // ✅ Preserved
      })
    })

    it('should handle circular references safely', () => {
      // This would cause infinite recursion if not handled properly
      const parent: Record<string, unknown> = { name: 'parent' }
      const child: Record<string, unknown> = { name: 'child', parent }
      parent.child = child

      // Should not throw an error
      expect(() => sanitizeForD1(parent)).not.toThrow()
    })
  })
})
