import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  runScoreIdNormalization,
  isScoreIdNormalizationComplete,
  isRepertoireNormalizationComplete,
  resetScoreIdNormalization,
} from '../scoreIdNormalization'

// Mock the normalizeRepertoireIds function
vi.mock('../normalizeRepertoireIds', () => ({
  normalizeRepertoireIds: vi.fn(),
}))

// Mock the scoreIdNormalizer functions
vi.mock('../../scoreIdNormalizer', () => ({
  generateNormalizedScoreId: vi.fn(
    (title: string, composer?: string | null) => {
      const normalizedTitle = title.toLowerCase().trim()
      const normalizedComposer = composer ? composer.toLowerCase().trim() : ''

      if (normalizedComposer) {
        const needsSpecialDelimiter =
          normalizedTitle.includes('-') || normalizedComposer.includes('-')
        const delimiter = needsSpecialDelimiter ? '||' : '-'
        return `${normalizedTitle}${delimiter}${normalizedComposer}`
      }

      return normalizedTitle
    }
  ),
  parseScoreId: vi.fn((scoreId: string) => {
    if (scoreId.includes('||')) {
      const parts = scoreId.split('||')
      return { title: parts[0], composer: parts[1] || '' }
    }
    if (scoreId.includes('-')) {
      const parts = scoreId.split('-')
      return { title: parts[0], composer: parts.slice(1).join('-') }
    }
    return { title: scoreId, composer: '' }
  }),
  normalizeExistingScoreId: vi.fn((scoreId: string) => {
    return scoreId.toLowerCase().trim()
  }),
}))

describe('scoreIdNormalization', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('runScoreIdNormalization', () => {
    it('should normalize logbook entries with mixed case composers', () => {
      // Setup test data with mixed case
      const testEntries = [
        {
          id: 'entry1',
          scoreId: 'Nocturne Op.9-CHOPIN',
          pieces: [
            { id: 'old-id', title: 'Nocturne Op.9', composer: 'CHOPIN' },
            { id: 'another-id', title: 'Für Elise', composer: 'Beethoven' },
          ],
        },
        {
          id: 'entry2',
          scoreTitle: 'Moonlight Sonata',
          scoreComposer: 'BEETHOVEN',
          pieces: [],
        },
      ]

      localStorage.setItem(
        'mirubato:logbook:entries',
        JSON.stringify(testEntries)
      )

      // Run migration
      runScoreIdNormalization()

      // Check results
      const stored = localStorage.getItem('mirubato:logbook:entries')
      expect(stored).toBeTruthy()

      const normalized = JSON.parse(stored!)

      // Check first entry
      expect(normalized[0].scoreId).toBe('nocturne op.9-chopin')
      expect(normalized[0].pieces[0].id).toBe('nocturne op.9-chopin')
      expect(normalized[0].pieces[1].id).toBe('für elise-beethoven')

      // Check second entry (scoreTitle/scoreComposer converted to scoreId)
      expect(normalized[1].scoreId).toBe('moonlight sonata-beethoven')
    })

    it('should handle pieces with dashes using special delimiter', () => {
      const testEntries = [
        {
          id: 'entry1',
          pieces: [
            {
              id: 'old-id',
              title: 'Peer Gynt - Morning',
              composer: 'Grieg',
            },
            {
              id: 'old-id2',
              title: 'Gavotte I & II B-flat',
              composer: 'Johann Sebastian Bach',
            },
          ],
        },
      ]

      localStorage.setItem(
        'mirubato:logbook:entries',
        JSON.stringify(testEntries)
      )

      // Run migration
      runScoreIdNormalization()

      const stored = localStorage.getItem('mirubato:logbook:entries')
      const normalized = JSON.parse(stored!)

      // Should use || delimiter when title contains dash
      expect(normalized[0].pieces[0].id).toBe('peer gynt - morning||grieg')
      // Should use || delimiter when title contains dash
      expect(normalized[0].pieces[1].id).toBe(
        'gavotte i & ii b-flat||johann sebastian bach'
      )
    })

    it('should set migration flag after completion', () => {
      expect(isScoreIdNormalizationComplete()).toBe(false)

      runScoreIdNormalization()

      expect(isScoreIdNormalizationComplete()).toBe(true)
      expect(
        localStorage.getItem('mirubato:score-id-normalization-v1')
      ).toBeTruthy()
    })

    it('should not run twice if already completed', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      // First run
      runScoreIdNormalization()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Migration] Starting score ID normalization...'
      )

      // Clear spy calls
      consoleSpy.mockClear()

      // Second run
      runScoreIdNormalization()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Migration] Score ID normalization already completed'
      )
    })

    it('should handle missing or empty localStorage gracefully', () => {
      // No data in localStorage
      expect(() => runScoreIdNormalization()).not.toThrow()
      expect(isScoreIdNormalizationComplete()).toBe(true)
    })

    it('should normalize nested score-related data', () => {
      // Setup various score-related keys
      localStorage.setItem(
        'mirubato:piece-data',
        JSON.stringify({
          scoreId: 'Test Piece-COMPOSER',
          nested: {
            scoreId: 'Nested Score-ANOTHER',
          },
        })
      )

      runScoreIdNormalization()

      const customData = JSON.parse(
        localStorage.getItem('mirubato:piece-data')!
      )
      // The mock normalizeExistingScoreId just lowercases, so we expect lowercase
      expect(customData.scoreId).toBe('test piece-composer')
      expect(customData.nested.scoreId).toBe('nested score-another')
    })

    it('should set repertoire normalization flag', () => {
      expect(isRepertoireNormalizationComplete()).toBe(false)

      runScoreIdNormalization()

      expect(isRepertoireNormalizationComplete()).toBe(true)
      expect(
        localStorage.getItem('mirubato:repertoire-normalization-v1')
      ).toBeTruthy()
    })

    it('should handle error in logbook normalization without marking complete', () => {
      // Setup invalid JSON that will cause parsing error when normalized
      localStorage.setItem('mirubato:logbook:entries', 'invalid json')

      const consoleSpy = vi.spyOn(console, 'error')

      runScoreIdNormalization()

      expect(consoleSpy).toHaveBeenCalled()
      // Should NOT mark as complete due to error
      expect(isScoreIdNormalizationComplete()).toBe(false)
    })
  })

  describe('resetScoreIdNormalization', () => {
    it('should clear migration flags', () => {
      // Set flags
      localStorage.setItem(
        'mirubato:score-id-normalization-v1',
        new Date().toISOString()
      )
      localStorage.setItem(
        'mirubato:repertoire-normalization-v1',
        new Date().toISOString()
      )

      expect(isScoreIdNormalizationComplete()).toBe(true)
      expect(isRepertoireNormalizationComplete()).toBe(true)

      // Reset
      resetScoreIdNormalization()

      expect(isScoreIdNormalizationComplete()).toBe(false)
      expect(isRepertoireNormalizationComplete()).toBe(false)
    })
  })
})
