import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateContentSignature,
  detectDuplicates,
  chooseBestEntry,
  removeDuplicates,
  getDuplicateReport,
} from '../duplicateCleanup'
import type { LogbookEntry } from '../../api/logbook'

describe('duplicateCleanup', () => {
  let sampleEntry: LogbookEntry

  beforeEach(() => {
    sampleEntry = {
      id: 'test-1',
      timestamp: '2024-01-15T10:00:00Z',
      duration: 1800, // 30 minutes
      type: 'practice',
      instrument: 'piano',
      pieces: [
        {
          title: 'Moonlight Sonata',
          composer: 'Beethoven',
        },
      ],
      notes: 'Good practice session',
      mood: 'satisfied',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    }
  })

  describe('generateContentSignature', () => {
    it('should generate consistent signatures for identical content', () => {
      const entry1: LogbookEntry = { ...sampleEntry }
      const entry2: LogbookEntry = { ...sampleEntry, id: 'different-id' }

      const sig1 = generateContentSignature(entry1)
      const sig2 = generateContentSignature(entry2)

      expect(sig1).toBe(sig2)
    })

    it('should generate different signatures for different content', () => {
      const entry1: LogbookEntry = { ...sampleEntry }
      const entry2: LogbookEntry = {
        ...sampleEntry,
        pieces: [{ title: 'Different Piece', composer: 'Different Composer' }],
      }

      const sig1 = generateContentSignature(entry1)
      const sig2 = generateContentSignature(entry2)

      expect(sig1).not.toBe(sig2)
    })

    it('should normalize case and whitespace in pieces', () => {
      const entry1: LogbookEntry = {
        ...sampleEntry,
        pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
      }
      const entry2: LogbookEntry = {
        ...sampleEntry,
        pieces: [{ title: '  moonlight sonata  ', composer: '  BEETHOVEN  ' }],
      }

      const sig1 = generateContentSignature(entry1)
      const sig2 = generateContentSignature(entry2)

      expect(sig1).toBe(sig2)
    })

    it('should round duration to 5-minute intervals', () => {
      const entry1: LogbookEntry = { ...sampleEntry, duration: 1800 } // 30:00
      const entry2: LogbookEntry = { ...sampleEntry, duration: 1920 } // 32:00 (within rounding)

      const sig1 = generateContentSignature(entry1)
      const sig2 = generateContentSignature(entry2)

      expect(sig1).toBe(sig2)
    })
  })

  describe('detectDuplicates', () => {
    it('should detect exact duplicates', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1' },
        { ...sampleEntry, id: 'entry-2' }, // Exact duplicate
        {
          ...sampleEntry,
          id: 'entry-3',
          pieces: [{ title: 'Different', composer: 'Piece' }],
        },
      ]

      const duplicates = detectDuplicates(entries)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].entry.id).toBe('entry-2')
      expect(duplicates[0].duplicateOf).toBe('entry-1')
      expect(duplicates[0].confidence).toBe(0.95)
      expect(duplicates[0].reason).toBe('Identical content signature')
    })

    it('should detect near-identical timestamps', () => {
      const baseTime = new Date('2024-01-15T10:00:00Z')
      const entries: LogbookEntry[] = [
        {
          ...sampleEntry,
          id: 'entry-1',
          timestamp: baseTime.toISOString(),
          duration: 1800, // Exact same duration
        },
        {
          ...sampleEntry,
          id: 'entry-2',
          timestamp: new Date(baseTime.getTime() + 90000).toISOString(), // 1.5 minutes later
          duration: 1800, // Exact same duration
        },
      ]

      const duplicates = detectDuplicates(entries)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].entry.id).toBe('entry-2')
      // This should be caught by content signature match (0.95), not timestamp match (0.85)
      expect(duplicates[0].confidence).toBe(0.95)
      expect(duplicates[0].reason).toBe('Identical content signature')
    })

    it('should not detect duplicates with different pieces', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1' },
        {
          ...sampleEntry,
          id: 'entry-2',
          pieces: [
            { title: 'Different Piece', composer: 'Different Composer' },
          ],
        },
      ]

      const duplicates = detectDuplicates(entries)

      expect(duplicates).toHaveLength(0)
    })

    it('should not detect duplicates with significantly different durations', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1', duration: 1800 }, // 30 minutes
        { ...sampleEntry, id: 'entry-2', duration: 3600 }, // 60 minutes
      ]

      const duplicates = detectDuplicates(entries)

      expect(duplicates).toHaveLength(0)
    })

    it('should detect identical IDs', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'same-id' },
        { ...sampleEntry, id: 'same-id' },
      ]

      const duplicates = detectDuplicates(entries)

      // Both entries have identical content signature AND identical ID
      // The algorithm detects identical IDs with highest confidence
      expect(duplicates.length).toBeGreaterThanOrEqual(1)
      expect(
        duplicates.some(
          d => d.confidence === 1.0 && d.reason === 'Identical ID'
        )
      ).toBe(true)
    })
  })

  describe('chooseBestEntry', () => {
    it('should prefer entry with more complete data', () => {
      const incomplete: LogbookEntry = {
        ...sampleEntry,
        notes: undefined,
        mood: undefined,
        instrument: undefined,
      }
      const complete: LogbookEntry = { ...sampleEntry }

      const best = chooseBestEntry(incomplete, complete)

      expect(best).toBe(complete)
    })

    it('should prefer more recent entry when completeness is equal', () => {
      const older: LogbookEntry = {
        ...sampleEntry,
        updatedAt: '2024-01-15T10:00:00Z',
      }
      const newer: LogbookEntry = {
        ...sampleEntry,
        updatedAt: '2024-01-15T11:00:00Z',
      }

      const best = chooseBestEntry(older, newer)

      expect(best).toBe(newer)
    })

    it('should handle entries without updatedAt', () => {
      const entry1: LogbookEntry = {
        ...sampleEntry,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: undefined,
      }
      const entry2: LogbookEntry = {
        ...sampleEntry,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: undefined,
      }

      const best = chooseBestEntry(entry1, entry2)

      expect(best).toBe(entry2)
    })
  })

  describe('removeDuplicates', () => {
    it('should remove duplicate entries', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1' },
        { ...sampleEntry, id: 'entry-2' }, // Duplicate
        {
          ...sampleEntry,
          id: 'entry-3',
          pieces: [{ title: 'Different', composer: 'Piece' }],
        },
      ]

      const cleaned = removeDuplicates(entries)

      expect(cleaned).toHaveLength(2)
      expect(cleaned.map(e => e.id)).toEqual(['entry-1', 'entry-3'])
    })

    it('should return original array when no duplicates found', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1' },
        {
          ...sampleEntry,
          id: 'entry-2',
          pieces: [{ title: 'Different', composer: 'Piece' }],
        },
      ]

      const cleaned = removeDuplicates(entries)

      expect(cleaned).toHaveLength(2)
      expect(cleaned).toEqual(entries)
    })
  })

  describe('getDuplicateReport', () => {
    it('should generate comprehensive duplicate report', () => {
      const entries: LogbookEntry[] = [
        { ...sampleEntry, id: 'entry-1' },
        { ...sampleEntry, id: 'entry-2' }, // High confidence duplicate
        {
          ...sampleEntry,
          id: 'entry-3',
          timestamp: new Date(
            new Date(sampleEntry.timestamp).getTime() + 90000
          ).toISOString(),
        }, // Medium confidence duplicate
        {
          ...sampleEntry,
          id: 'entry-4',
          pieces: [{ title: 'Different', composer: 'Piece' }],
        },
      ]

      const report = getDuplicateReport(entries)

      expect(report.summary.totalEntries).toBe(4)
      expect(report.summary.duplicatesFound).toBe(2)
      expect(report.summary.highConfidence).toBe(2) // Both duplicates are high confidence
      expect(report.summary.mediumConfidence).toBe(0)
      expect(report.summary.lowConfidence).toBe(0)
      expect(report.duplicates).toHaveLength(2)
    })

    it('should handle empty entries array', () => {
      const report = getDuplicateReport([])

      expect(report.summary.totalEntries).toBe(0)
      expect(report.summary.duplicatesFound).toBe(0)
      expect(report.duplicates).toHaveLength(0)
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple duplicate chains', () => {
      const entries: LogbookEntry[] = [
        // Chain 1: Moonlight Sonata duplicates
        { ...sampleEntry, id: 'moonlight-1' },
        { ...sampleEntry, id: 'moonlight-2' },
        { ...sampleEntry, id: 'moonlight-3' },
        // Chain 2: Different piece duplicates
        {
          ...sampleEntry,
          id: 'waltz-1',
          pieces: [{ title: 'Minute Waltz', composer: 'Chopin' }],
        },
        {
          ...sampleEntry,
          id: 'waltz-2',
          pieces: [{ title: 'Minute Waltz', composer: 'Chopin' }],
        },
        // Unique entry
        {
          ...sampleEntry,
          id: 'unique-1',
          pieces: [{ title: 'Unique Piece', composer: 'Unique Composer' }],
        },
      ]

      const duplicates = detectDuplicates(entries)
      const cleaned = removeDuplicates(entries)

      expect(duplicates).toHaveLength(3) // 2 from moonlight chain, 1 from waltz chain
      expect(cleaned).toHaveLength(3) // One from each chain + unique
    })

    it('should handle edge cases with missing data', () => {
      const entries: LogbookEntry[] = [
        {
          id: 'minimal-1',
          timestamp: '2024-01-15T10:00:00Z',
          duration: 1800,
          type: 'practice',
          instrument: 'piano',
          pieces: [],
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'minimal-2',
          timestamp: '2024-01-15T10:00:00Z',
          duration: 1800,
          type: 'practice',
          instrument: 'piano',
          pieces: [],
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ]

      const duplicates = detectDuplicates(entries)
      expect(duplicates).toHaveLength(1)
    })
  })
})
