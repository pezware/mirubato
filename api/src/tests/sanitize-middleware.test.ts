import { describe, it, expect } from 'vitest'
import { sanitizeForD1 } from '../utils/database'

describe('sanitizeForD1 in middleware context', () => {
  it('should convert undefined values to null', () => {
    // This simulates data that might come from a database or internal processing
    // where undefined values can exist (unlike JSON)
    const dataWithUndefined = {
      id: 'test-entry',
      notes: undefined,
      mood: undefined,
      pieces: [
        {
          title: 'Test Piece',
          composer: undefined,
          measures: undefined,
          tempo: undefined,
        },
      ],
      metadata: undefined,
      techniques: [],
      goalIds: [],
    }

    const sanitized = sanitizeForD1(dataWithUndefined)

    expect(sanitized).toEqual({
      id: 'test-entry',
      notes: null,
      mood: null,
      pieces: [
        {
          title: 'Test Piece',
          composer: null,
          measures: null,
          tempo: null,
        },
      ],
      metadata: null,
      techniques: [],
      goalIds: [],
    })
  })

  it('should handle the exact scenario from the D1 error', () => {
    // This is the actual data structure that was causing D1 errors
    const syncData = {
      changes: {
        entries: [
          {
            id: 'entry_1750717972797_0suwq20o8',
            timestamp: '2025-06-23T22:32:52.797Z',
            duration: 30,
            type: 'PRACTICE',
            instrument: 'PIANO',
            pieces: [
              {
                title: 'Russian Folk Song',
                composer: undefined, // This was causing the D1 error
                measures: undefined,
                tempo: undefined,
              },
            ],
            techniques: [],
            goalIds: [],
            notes: undefined, // This was also causing issues
            mood: undefined,
            tags: [],
            metadata: undefined,
            createdAt: '2025-06-23T22:32:52.797Z',
            updatedAt: '2025-06-23T22:32:52.797Z',
          },
        ],
      },
    }

    const sanitized = sanitizeForD1(syncData) as Record<string, unknown>

    // Check that all undefined values are now null
    const changes = sanitized.changes as Record<string, unknown>
    const entries = changes.entries as Array<Record<string, unknown>>
    const entry = entries[0]
    const pieces = entry.pieces as Array<Record<string, unknown>>
    expect(entry.notes).toBe(null)
    expect(entry.mood).toBe(null)
    expect(entry.metadata).toBe(null)
    expect(pieces[0].composer).toBe(null)
    expect(pieces[0].measures).toBe(null)
    expect(pieces[0].tempo).toBe(null)

    // But other values are preserved
    expect(entry.id).toBe('entry_1750717972797_0suwq20o8')
    expect(entry.type).toBe('PRACTICE')
    expect(pieces[0].title).toBe('Russian Folk Song')
  })

  it('should demonstrate why API-side sanitization is needed', () => {
    // When data comes from localStorage or database queries, it can have undefined
    const storedData = {
      entries: [
        {
          id: 'old-entry',
          // These fields might be undefined from old data or database nulls
          notes: undefined,
          mood: undefined,
          metadata: {
            source: 'manual',
            accuracy: undefined,
          },
        },
      ],
    }

    // After sanitization in the middleware
    const sanitized = sanitizeForD1(storedData) as Record<string, unknown>

    // All undefined values should be null for D1 compatibility
    const sanitizedEntries = sanitized.entries as Array<Record<string, unknown>>
    expect(sanitizedEntries[0].notes).toBe(null)
    expect(sanitizedEntries[0].mood).toBe(null)
    const sanitizedMetadata = sanitizedEntries[0].metadata as Record<
      string,
      unknown
    >
    expect(sanitizedMetadata.accuracy).toBe(null)
    expect(sanitizedMetadata.source).toBe('manual')
  })
})
