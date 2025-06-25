import { describe, it, expect, vi } from 'vitest'
import {
  transformLegacyEntry,
  transformLegacyEntries,
  isNewFormatEntry,
} from '../../../utils/transformLegacyEntry'
import type { LogbookEntry } from '../../../api/logbook'

describe('transformLegacyEntry', () => {
  describe('timestamp conversion', () => {
    it('should convert unix timestamp to ISO string', () => {
      const unixTimestamp = 1704067200000 // 2024-01-01T00:00:00.000Z
      const legacy = {
        id: 'test-1',
        timestamp: unixTimestamp,
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should handle ISO string timestamps', () => {
      const isoString = '2024-01-01T12:00:00.000Z'
      const legacy = {
        id: 'test-2',
        timestamp: isoString,
        duration: 45,
        type: 'lesson' as const,
        instrument: 'guitar' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.timestamp).toBe(isoString)
    })

    it('should use current time for invalid timestamps', () => {
      const now = new Date()
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const legacy = {
        id: 'test-3',
        timestamp: null as unknown as string,
        duration: 60,
        type: 'performance' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.timestamp).toBe(now.toISOString())

      vi.useRealTimers()
    })
  })

  describe('type conversion', () => {
    it('should convert lowercase types to uppercase', () => {
      const types = ['practice', 'performance', 'lesson', 'rehearsal'] as const
      const expectedTypes = ['PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL']

      types.forEach((type, index) => {
        const legacy = {
          id: `test-type-${index}`,
          timestamp: Date.now(),
          duration: 30,
          type,
          instrument: 'piano' as const,
          pieces: [],
          techniques: [],
          tags: [],
        }

        const result = transformLegacyEntry(legacy)
        expect(result.type).toBe(expectedTypes[index])
      })
    })

    it('should handle already uppercase types', () => {
      const legacy = {
        id: 'test-uppercase',
        timestamp: Date.now(),
        duration: 30,
        type: 'PRACTICE' as const,
        instrument: 'PIANO' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.type).toBe('PRACTICE')
    })
  })

  describe('instrument conversion', () => {
    it('should convert lowercase instruments to uppercase', () => {
      const instruments = ['piano', 'guitar'] as const
      const expectedInstruments = ['PIANO', 'GUITAR']

      instruments.forEach((instrument, index) => {
        const legacy = {
          id: `test-instrument-${index}`,
          timestamp: Date.now(),
          duration: 30,
          type: 'practice' as const,
          instrument,
          pieces: [],
          techniques: [],
          tags: [],
        }

        const result = transformLegacyEntry(legacy)
        expect(result.instrument).toBe(expectedInstruments[index])
      })
    })
  })

  describe('mood conversion', () => {
    it('should convert lowercase moods to uppercase', () => {
      const moods = ['frustrated', 'neutral', 'satisfied', 'excited'] as const
      const expectedMoods = ['FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED']

      moods.forEach((mood, index) => {
        const legacy = {
          id: `test-mood-${index}`,
          timestamp: Date.now(),
          duration: 30,
          type: 'practice' as const,
          instrument: 'piano' as const,
          pieces: [],
          techniques: [],
          tags: [],
          mood,
        }

        const result = transformLegacyEntry(legacy)
        expect(result.mood).toBe(expectedMoods[index])
      })
    })

    it('should handle undefined mood', () => {
      const legacy = {
        id: 'test-no-mood',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.mood).toBeUndefined()
    })
  })

  describe('pieces transformation', () => {
    it('should transform pieces with all fields', () => {
      const legacy = {
        id: 'test-pieces',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [
          {
            id: 'piece-1',
            title: 'Sonata No. 14',
            composer: 'Beethoven',
            measures: '1-32',
            tempo: 120,
          },
        ],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.pieces).toHaveLength(1)
      expect(result.pieces[0]).toEqual({
        id: 'piece-1',
        title: 'Sonata No. 14',
        composer: 'Beethoven',
        measures: '1-32',
        tempo: 120,
      })
    })

    it('should handle pieces with missing fields', () => {
      const legacy = {
        id: 'test-incomplete-pieces',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [
          {
            title: undefined as unknown as string,
          },
        ],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.pieces).toHaveLength(1)
      expect(result.pieces[0].title).toBe('Untitled')
      expect(result.pieces[0].composer).toBeUndefined()
    })

    it('should handle missing pieces array', () => {
      const legacy = {
        id: 'test-no-pieces',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        techniques: [],
        tags: [],
      } as any

      const result = transformLegacyEntry(legacy)
      expect(result.pieces).toEqual([])
    })
  })

  describe('goals handling', () => {
    it('should use goalIds when available', () => {
      const legacy = {
        id: 'test-goalids',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        goalIds: ['goal-1', 'goal-2'],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.goalIds).toEqual(['goal-1', 'goal-2'])
    })

    it('should fall back to goals when goalIds not available', () => {
      const legacy = {
        id: 'test-goals',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        goals: ['goal-3', 'goal-4'],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.goalIds).toEqual(['goal-3', 'goal-4'])
    })

    it('should prefer goalIds over goals', () => {
      const legacy = {
        id: 'test-both-goals',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        goals: ['goal-old'],
        goalIds: ['goal-new'],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.goalIds).toEqual(['goal-new'])
    })

    it('should handle missing goals', () => {
      const legacy = {
        id: 'test-no-goals',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.goalIds).toEqual([])
    })
  })

  describe('metadata handling', () => {
    it('should preserve metadata with source field', () => {
      const legacy = {
        id: 'test-metadata',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        metadata: {
          source: 'auto',
          accuracy: 0.95,
          notesPlayed: 100,
          mistakeCount: 5,
        },
      }

      const result = transformLegacyEntry(legacy)
      expect(result.metadata).toEqual({
        source: 'auto',
        accuracy: 0.95,
        notesPlayed: 100,
        mistakeCount: 5,
      })
    })

    it('should wrap generic metadata with legacy source', () => {
      const legacy = {
        id: 'test-generic-metadata',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        metadata: {
          customField: 'value',
          anotherField: 123,
        },
      }

      const result = transformLegacyEntry(legacy)
      expect(result.metadata).toEqual({
        source: 'legacy',
        customField: 'value',
        anotherField: 123,
      })
    })

    it('should handle missing metadata', () => {
      const legacy = {
        id: 'test-no-metadata',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.metadata).toBeUndefined()
    })
  })

  describe('timestamps', () => {
    it('should use existing createdAt and updatedAt', () => {
      const createdAt = '2024-01-01T10:00:00.000Z'
      const updatedAt = '2024-01-02T10:00:00.000Z'
      const legacy = {
        id: 'test-timestamps',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        createdAt,
        updatedAt,
      }

      const result = transformLegacyEntry(legacy)
      expect(result.createdAt).toBe(createdAt)
      expect(result.updatedAt).toBe(updatedAt)
    })

    it('should use timestamp for missing createdAt and updatedAt', () => {
      const timestamp = '2024-01-01T12:00:00.000Z'
      const legacy = {
        id: 'test-no-timestamps',
        timestamp,
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.createdAt).toBe(timestamp)
      expect(result.updatedAt).toBe(timestamp)
    })
  })

  describe('edge cases', () => {
    it('should handle missing optional fields', () => {
      const minimal = {
        id: 'test-minimal',
        timestamp: Date.now(),
        duration: 0,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
      }

      const result = transformLegacyEntry(minimal)
      expect(result.id).toBe('test-minimal')
      expect(result.duration).toBe(0)
      expect(result.notes).toBeUndefined()
      expect(result.mood).toBeUndefined()
      expect(result.metadata).toBeUndefined()
    })

    it('should handle empty arrays', () => {
      const legacy = {
        id: 'test-empty-arrays',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice' as const,
        instrument: 'piano' as const,
        pieces: [],
        techniques: [],
        tags: [],
        goals: [],
      }

      const result = transformLegacyEntry(legacy)
      expect(result.pieces).toEqual([])
      expect(result.techniques).toEqual([])
      expect(result.tags).toEqual([])
      expect(result.goalIds).toEqual([])
    })
  })
})

describe('transformLegacyEntries', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  afterEach(() => {
    consoleWarnSpy.mockClear()
  })

  it('should transform array of valid entries', () => {
    const entries = [
      {
        id: 'entry-1',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice',
        instrument: 'piano',
        pieces: [],
        techniques: [],
        tags: [],
      },
      {
        id: 'entry-2',
        timestamp: Date.now(),
        duration: 45,
        type: 'lesson',
        instrument: 'guitar',
        pieces: [],
        techniques: [],
        tags: [],
      },
    ]

    const result = transformLegacyEntries(entries)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('entry-1')
    expect(result[1].id).toBe('entry-2')
  })

  it('should skip invalid entries', () => {
    const entries = [
      null,
      undefined,
      'not an object',
      123,
      { notAnEntry: true },
      { id: 'missing-duration' },
      { duration: 30 }, // missing id
    ]

    const result = transformLegacyEntries(entries)
    expect(result).toHaveLength(0)
  })

  it('should handle transformation errors gracefully', () => {
    const entries = [
      {
        id: 'valid-entry',
        timestamp: Date.now(),
        duration: 30,
        type: 'practice',
        instrument: 'piano',
        pieces: [],
        techniques: [],
        tags: [],
      },
      {
        id: 'invalid-entry',
        timestamp: Date.now(),
        duration: 30,
        type: 'INVALID_TYPE' as unknown,
        instrument: 'piano',
        pieces: [],
        techniques: [],
        tags: [],
      },
    ]

    const result = transformLegacyEntries(entries)
    // Should still transform both, even if one has invalid type
    expect(result).toHaveLength(2)
  })

  it('should log warnings for failed transformations', () => {
    // Create a truly invalid entry that will cause transformation to fail
    const badEntry = {
      id: 'bad-entry',
      duration: 30,
      type: null as unknown, // This will cause toUpperCase() to fail
      instrument: 'piano',
      pieces: [],
      techniques: [],
      tags: [],
    }

    transformLegacyEntries([badEntry])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to transform entry:',
      badEntry,
      expect.any(Error)
    )
  })
})

describe('isNewFormatEntry', () => {
  it('should return true for valid new format entries', () => {
    const entry: LogbookEntry = {
      id: 'test-id',
      timestamp: '2024-01-01T12:00:00.000Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [],
      techniques: [],
      goalIds: [],
      tags: [],
      createdAt: '2024-01-01T12:00:00.000Z',
      updatedAt: '2024-01-01T12:00:00.000Z',
    }

    expect(isNewFormatEntry(entry)).toBe(true)
  })

  it('should return false for non-objects', () => {
    expect(isNewFormatEntry(null)).toBe(false)
    expect(isNewFormatEntry(undefined)).toBe(false)
    expect(isNewFormatEntry('string')).toBe(false)
    expect(isNewFormatEntry(123)).toBe(false)
    expect(isNewFormatEntry([])).toBe(false)
  })

  it('should return false for objects missing required fields', () => {
    const invalidEntries = [
      {}, // empty object
      { id: 'test' }, // missing other fields
      {
        // missing id
        timestamp: '2024-01-01T12:00:00.000Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
      {
        // invalid type
        id: 'test',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration: 30,
        type: 'practice', // lowercase
        instrument: 'PIANO',
        pieces: [],
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
      {
        // invalid instrument
        id: 'test',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'piano', // lowercase
        pieces: [],
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
      {
        // pieces not array
        id: 'test',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: 'not an array',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
    ]

    invalidEntries.forEach(entry => {
      expect(isNewFormatEntry(entry)).toBe(false)
    })
  })

  it('should return false for wrong field types', () => {
    const wrongTypes = {
      id: 123, // should be string
      timestamp: Date.now(), // should be string
      duration: '30', // should be number
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [],
      createdAt: Date.now(), // should be string
      updatedAt: Date.now(), // should be string
    }

    expect(isNewFormatEntry(wrongTypes)).toBe(false)
  })

  it('should validate all entry types', () => {
    const types = ['PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL']
    const instruments = ['PIANO', 'GUITAR']

    types.forEach(type => {
      instruments.forEach(instrument => {
        const entry = {
          id: 'test',
          timestamp: '2024-01-01T12:00:00.000Z',
          duration: 30,
          type,
          instrument,
          pieces: [],
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
        }
        expect(isNewFormatEntry(entry)).toBe(true)
      })
    })
  })
})
