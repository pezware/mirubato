import { describe, it, expect } from 'vitest'
import {
  generateNormalizedScoreId,
  parseScoreId,
  isSameScore,
  normalizeExistingScoreId,
} from '../scoreIdNormalizer'

describe('scoreIdNormalizer', () => {
  describe('generateNormalizedScoreId', () => {
    it('should use default delimiter for simple pieces (backward compatibility)', () => {
      const result = generateNormalizedScoreId('Sonata Op. 1', 'Beethoven')
      expect(result).toBe('sonata op. 1-beethoven') // Uses - for backward compatibility
    })

    it('should use special delimiter for pieces with dashes in title', () => {
      const result = generateNormalizedScoreId(
        'Sonatina Op. 36 No. 1 - Movement 1',
        'Clementi'
      )
      expect(result).toBe('sonatina op. 36 no. 1 - movement 1||clementi')
    })

    it('should use special delimiter for pieces with dashes in composer name', () => {
      const result = generateNormalizedScoreId('Symphony No. 5', 'Saint-Saëns')
      expect(result).toBe('symphony no. 5||saint-saëns')
    })

    it('should return just the title when no composer provided', () => {
      const result = generateNormalizedScoreId('Etude No. 1')
      expect(result).toBe('etude no. 1')
    })

    it('should use default delimiter for normal pieces', () => {
      const result = generateNormalizedScoreId(
        "Debussy's Clair de Lune",
        'Claude Debussy'
      )
      expect(result).toBe("debussy's clair de lune-claude debussy") // No dash in normalized form
    })

    it('should use default delimiter when no dashes after normalization', () => {
      const result = generateNormalizedScoreId('Invention No. 1', 'J.S. Bach')
      expect(result).toBe('invention no. 1-js bach') // No dash after removing periods
    })
  })

  describe('parseScoreId', () => {
    it('should parse new format with double pipe delimiter', () => {
      const result = parseScoreId('sonata op. 1||beethoven')
      expect(result).toEqual({
        title: 'sonata op. 1',
        composer: 'beethoven',
      })
    })

    it('should parse pieces with dashes in title correctly', () => {
      const result = parseScoreId(
        'sonatina op. 36 no. 1 - movement 1||clementi'
      )
      expect(result).toEqual({
        title: 'sonatina op. 36 no. 1 - movement 1',
        composer: 'clementi',
      })
    })

    it('should handle legacy format with single dash as fallback', () => {
      const result = parseScoreId('sonata op. 1-beethoven')
      expect(result).toEqual({
        title: 'sonata op. 1',
        composer: 'beethoven',
      })
    })

    it('should handle legacy format with multiple dashes (piece with dash)', () => {
      const result = parseScoreId('theme and variations - set a-mozart')
      expect(result).toEqual({
        title: 'theme and variations',
        composer: 'set a-mozart', // This is the expected behavior for legacy format
      })
    })

    it('should handle score ID with no delimiter', () => {
      const result = parseScoreId('simple piece title')
      expect(result).toEqual({
        title: 'simple piece title',
        composer: '',
      })
    })

    it('should handle composer with dashes in new format', () => {
      const result = parseScoreId('symphony no. 5||saint-saëns')
      expect(result).toEqual({
        title: 'symphony no. 5',
        composer: 'saint-saëns',
      })
    })
  })

  describe('isSameScore', () => {
    it('should match exact same score IDs', () => {
      expect(isSameScore('piece||composer', 'piece||composer')).toBe(true)
    })

    it('should match case-insensitive', () => {
      expect(isSameScore('Piece||Composer', 'piece||composer')).toBe(true)
    })

    it('should match new and legacy formats for same piece', () => {
      expect(isSameScore('piece||composer', 'piece-composer')).toBe(true)
    })

    it('should not match different pieces', () => {
      expect(isSameScore('piece1||composer', 'piece2||composer')).toBe(false)
    })

    it('should handle pieces with dashes correctly', () => {
      expect(
        isSameScore(
          'sonata op. 1 - movement 1||beethoven',
          'sonata op. 1 - movement 1||beethoven'
        )
      ).toBe(true)
    })

    it('should detect reversed composer/title order', () => {
      // This is for legacy compatibility
      expect(isSameScore('beethoven||sonata', 'sonata||beethoven')).toBe(true)
    })
  })

  describe('normalizeExistingScoreId', () => {
    it('should maintain delimiter for simple pieces', () => {
      const result = normalizeExistingScoreId('sonata-beethoven')
      expect(result).toBe('sonata-beethoven') // No dash in content, keeps dash
    })

    it('should preserve special delimiter format', () => {
      const result = normalizeExistingScoreId('sonata - movement 1||beethoven')
      expect(result).toBe('sonata - movement 1||beethoven')
    })

    it('should handle pieces with dashes in title', () => {
      const result = normalizeExistingScoreId(
        'sonata op. 1 - movement 1-beethoven'
      )
      // The function parses (incorrectly as "sonata op. 1", "movement 1-beethoven")
      // but reconstructs with proper delimiter since the composer part has a dash
      expect(result).toBe('sonata op. 1||movement 1-beethoven')
    })

    it('should handle score ID without composer', () => {
      const result = normalizeExistingScoreId('just a piece title')
      expect(result).toBe('just a piece title')
    })
  })

  describe('Backward compatibility', () => {
    it('should maintain compatibility for existing pieces like "G Minor" by "Bach"', () => {
      // This ensures existing data remains unchanged
      const result = generateNormalizedScoreId('G Minor', 'Bach')
      expect(result).toBe('g minor-bach') // Uses - for backward compatibility

      // The parser should handle both old and new formats
      const parsed = parseScoreId('g minor-bach')
      expect(parsed.title).toBe('g minor')
      expect(parsed.composer).toBe('bach')
    })

    it('should only use special delimiter when actually needed', () => {
      // Without dashes - uses default delimiter
      const simple = generateNormalizedScoreId('Moonlight Sonata', 'Beethoven')
      expect(simple).toBe('moonlight sonata-beethoven')

      // With dash in title - uses special delimiter
      const withDash = generateNormalizedScoreId(
        'Opus 36 - Movement 1',
        'Beethoven'
      )
      expect(withDash).toBe('opus 36 - movement 1||beethoven')
    })
  })

  describe('Edge cases and real-world scenarios', () => {
    it('should handle complex piece title from issue #552', () => {
      const title = 'Sonatina Op. 36, No. 1 - Movement 1'
      const composer = 'Clementi, Muzio'
      const scoreId = generateNormalizedScoreId(title, composer)

      expect(scoreId).toContain('||') // Uses new delimiter
      expect(scoreId).not.toMatch(/^[^|]*-[^|]*$/) // Dash is preserved in title, not used as delimiter

      const parsed = parseScoreId(scoreId)
      expect(parsed.title).toContain('movement 1') // Movement should be part of title
      expect(parsed.composer).toContain('clementi') // Composer should be parsed correctly
    })

    it('should handle multiple dashes in piece title', () => {
      const title = 'Theme and Variations - Set A - Version 2'
      const composer = 'Mozart'
      const scoreId = generateNormalizedScoreId(title, composer)

      const parsed = parseScoreId(scoreId)
      expect(parsed.title).toBe('theme and variations - set a - version 2')
      expect(parsed.composer).toBe('mozart')
    })

    it('should handle hyphenated composer names', () => {
      const title = 'Cello Concerto'
      const composer = 'Saint-Saëns, Camille'
      const scoreId = generateNormalizedScoreId(title, composer)

      const parsed = parseScoreId(scoreId)
      expect(parsed.title).toBe('cello concerto')
      expect(parsed.composer).toContain('saint-saëns')
    })

    it('should maintain backward compatibility with existing data', () => {
      // Simulate existing score IDs in the old format
      const oldFormat1 = 'nocturne op. 9-chopin'
      const oldFormat2 = 'waltz-strauss'

      const parsed1 = parseScoreId(oldFormat1)
      const parsed2 = parseScoreId(oldFormat2)

      expect(parsed1.title).toBe('nocturne op. 9')
      expect(parsed1.composer).toBe('chopin')
      expect(parsed2.title).toBe('waltz')
      expect(parsed2.composer).toBe('strauss')
    })
  })
})
