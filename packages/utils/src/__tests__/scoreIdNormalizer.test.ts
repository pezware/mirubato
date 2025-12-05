import { describe, it, expect } from 'vitest'
import {
  normalizePieceTitle,
  normalizeComposer,
  generateNormalizedScoreId,
  parseScoreId,
  isSameScore,
  normalizeExistingScoreId,
  findSimilarPieces,
  isSameScoreWithFuzzy,
} from '../scoreIdNormalizer'

describe('scoreIdNormalizer', () => {
  describe('normalizePieceTitle', () => {
    it('should convert to lowercase', () => {
      expect(normalizePieceTitle('Moonlight Sonata')).toBe('moonlight sonata')
      expect(normalizePieceTitle('ETUDE')).toBe('etude')
    })

    it('should normalize spaces', () => {
      expect(normalizePieceTitle('  Moonlight   Sonata  ')).toBe(
        'moonlight sonata'
      )
      expect(normalizePieceTitle('Multiple   Spaces')).toBe('multiple spaces')
    })

    it('should normalize special characters', () => {
      expect(normalizePieceTitle("Chopin's Waltz")).toBe("chopin's waltz")
      expect(normalizePieceTitle('Prelude "The Storm"')).toBe(
        'prelude "the storm"'
      )
      expect(normalizePieceTitle('Piece—Part 1')).toBe('piece-part 1')
    })

    it('should normalize smart quotes to standard quotes', () => {
      // Left/right single quotes to straight apostrophe
      expect(normalizePieceTitle('Chopin\u2018s Waltz')).toBe("chopin's waltz")
      expect(normalizePieceTitle('Chopin\u2019s Waltz')).toBe("chopin's waltz")
      // Left/right double quotes to straight quotes
      expect(normalizePieceTitle('Prelude \u201CThe Storm\u201D')).toBe(
        'prelude "the storm"'
      )
    })

    it('should normalize en-dash and em-dash to hyphen', () => {
      expect(normalizePieceTitle('Piece\u2013Part 1')).toBe('piece-part 1') // en-dash
      expect(normalizePieceTitle('Piece\u2014Part 1')).toBe('piece-part 1') // em-dash
    })
  })

  describe('normalizeComposer', () => {
    it('should convert to lowercase', () => {
      expect(normalizeComposer('Bach')).toBe('bach')
      expect(normalizeComposer('BEETHOVEN')).toBe('beethoven')
    })

    it('should remove periods', () => {
      expect(normalizeComposer('J.S. Bach')).toBe('js bach')
      expect(normalizeComposer('W.A. Mozart')).toBe('wa mozart')
    })

    it('should normalize spaces and special characters', () => {
      expect(normalizeComposer('  Bach  ')).toBe('bach')
      expect(normalizeComposer("Bach's")).toBe("bach's")
    })

    it('should normalize smart apostrophes', () => {
      expect(normalizeComposer('Bach\u2019s')).toBe("bach's")
    })
  })

  describe('generateNormalizedScoreId', () => {
    it('should generate ID with title only', () => {
      expect(generateNormalizedScoreId('Moonlight Sonata')).toBe(
        'moonlight sonata-unknown'
      )
    })

    it('should use default delimiter when no dashes present', () => {
      expect(generateNormalizedScoreId('Moonlight Sonata', 'Beethoven')).toBe(
        'moonlight sonata-beethoven'
      )
    })

    it('should use special delimiter when title contains dash', () => {
      expect(
        generateNormalizedScoreId('Etude Op. 10 No. 3 - Tristesse', 'Chopin')
      ).toBe('etude op. 10 no. 3 - tristesse||chopin')
    })

    it('should use special delimiter when composer contains dash', () => {
      expect(generateNormalizedScoreId('Moonlight Sonata', 'Saint-Saëns')).toBe(
        'moonlight sonata||saint-saëns'
      )
    })

    it('should handle null/undefined composer', () => {
      expect(generateNormalizedScoreId('Piece', null)).toBe('piece-unknown')
      expect(generateNormalizedScoreId('Piece', undefined)).toBe(
        'piece-unknown'
      )
    })

    it('should handle mixed case consistently', () => {
      const id1 = generateNormalizedScoreId('Moonlight SONATA', 'BEETHOVEN')
      const id2 = generateNormalizedScoreId('moonlight sonata', 'beethoven')
      expect(id1).toBe(id2)
    })
  })

  describe('parseScoreId', () => {
    it('should parse new format with ||', () => {
      const result = parseScoreId('moonlight sonata||beethoven')
      expect(result.title).toBe('moonlight sonata')
      expect(result.composer).toBe('beethoven')
    })

    it('should parse legacy format with -', () => {
      const result = parseScoreId('moonlight sonata-beethoven')
      expect(result.title).toBe('moonlight sonata')
      expect(result.composer).toBe('beethoven')
    })

    it('should handle complex legacy format', () => {
      const result = parseScoreId('etude-op-10-chopin')
      expect(result.title).toBe('etude')
      expect(result.composer).toBe('op-10-chopin')
    })

    it('should handle title only', () => {
      const result = parseScoreId('moonlight sonata')
      expect(result.title).toBe('moonlight sonata')
      expect(result.composer).toBe('')
    })

    it('should handle mixed delimiters correctly', () => {
      const result = parseScoreId('piece-with-dash||composer-with-dash')
      expect(result.title).toBe('piece-with-dash')
      expect(result.composer).toBe('composer-with-dash')
    })
  })

  describe('isSameScore', () => {
    it('should match identical IDs', () => {
      expect(isSameScore('piece-composer', 'piece-composer')).toBe(true)
    })

    it('should match case-insensitive', () => {
      expect(isSameScore('Piece-Composer', 'piece-composer')).toBe(true)
    })

    it('should match with extra spaces', () => {
      expect(isSameScore(' piece-composer ', 'piece-composer')).toBe(true)
    })

    it('should match parsed equivalents', () => {
      expect(isSameScore('piece||composer', 'piece-composer')).toBe(true)
    })

    it('should not match different pieces', () => {
      expect(isSameScore('piece1-composer', 'piece2-composer')).toBe(false)
    })

    it('should handle reversed order (legacy support)', () => {
      expect(isSameScore('bach-invention', 'invention-bach')).toBe(true)
    })
  })

  describe('normalizeExistingScoreId', () => {
    it('should preserve simple format', () => {
      expect(normalizeExistingScoreId('piece-composer')).toBe('piece-composer')
    })

    it('should convert to special delimiter when needed', () => {
      expect(normalizeExistingScoreId('piece-with-dash||composer')).toBe(
        'piece-with-dash||composer'
      )
    })

    it('should normalize mixed case', () => {
      expect(normalizeExistingScoreId('Piece-Composer')).toBe('piece-composer')
    })

    it('should handle title only', () => {
      expect(normalizeExistingScoreId('piece')).toBe('piece-unknown')
    })

    it('should leave canonical score IDs untouched', () => {
      expect(normalizeExistingScoreId('score_abc123')).toBe('score_abc123')
      expect(normalizeExistingScoreId(' score_XY-123 ')).toBe('score_XY-123')
    })
  })

  describe('findSimilarPieces', () => {
    const existingPieces = [
      {
        scoreId: 'moonlight-beethoven',
        title: 'Moonlight',
        composer: 'Beethoven',
      },
      { scoreId: 'moonlite-bethoven', title: 'Moonlite', composer: 'Bethoven' },
      { scoreId: 'etude-chopin', title: 'Etude', composer: 'Chopin' },
    ]

    it('should find exact matches with high confidence', () => {
      const matches = findSimilarPieces(
        'Moonlight',
        'Beethoven',
        existingPieces
      )
      // May find multiple matches due to similar titles
      expect(matches.length).toBeGreaterThan(0)
      // The best match should be the exact one
      expect(matches[0].scoreId).toBe('moonlight-beethoven')
      expect(matches[0].confidence).toBe('high')
    })

    it('should find similar pieces with typos', () => {
      const matches = findSimilarPieces(
        'Moonlit',
        'Bethowen',
        existingPieces,
        0.6
      )
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].scoreId).toBe('moonlite-bethoven')
    })

    it('should not find dissimilar pieces', () => {
      const matches = findSimilarPieces('Symphony', 'Mozart', existingPieces)
      expect(matches).toHaveLength(0)
    })

    it('should handle missing composer', () => {
      const matches = findSimilarPieces('Etude', undefined, existingPieces)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('isSameScoreWithFuzzy', () => {
    it('should match exact IDs', () => {
      expect(isSameScoreWithFuzzy('piece-composer', 'piece-composer')).toBe(
        true
      )
    })

    it('should match very similar IDs', () => {
      expect(
        isSameScoreWithFuzzy('moonlight-beethoven', 'moonlite-bethoven', 0.7)
      ).toBe(true)
    })

    it('should not match dissimilar IDs', () => {
      expect(isSameScoreWithFuzzy('piece1-composer1', 'piece2-composer2')).toBe(
        false
      )
    })

    it('should respect threshold', () => {
      expect(isSameScoreWithFuzzy('abc-def', 'abcd-defg', 0.99)).toBe(false)
      expect(isSameScoreWithFuzzy('abc-def', 'abcd-defg', 0.7)).toBe(true)
    })
  })

  describe('Edge cases and data consistency', () => {
    it('should handle empty strings', () => {
      expect(normalizePieceTitle('')).toBe('')
      expect(normalizeComposer('')).toBe('')
      expect(generateNormalizedScoreId('', '')).toBe('-unknown')
    })

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200)
      const result = normalizePieceTitle(longTitle)
      expect(result).toBe('a'.repeat(200))
    })

    it('should handle unicode characters', () => {
      expect(normalizePieceTitle('Prélude № 1')).toBe('prélude № 1')
      expect(normalizeComposer('Dvořák')).toBe('dvořák')
    })

    it('should handle multiple delimiters consistently', () => {
      const id1 = generateNormalizedScoreId('Piece - Part 1', 'Composer - Name')
      const id2 = generateNormalizedScoreId('piece - part 1', 'composer - name')
      expect(id1).toBe(id2)
      expect(id1).toContain('||')
    })
  })
})
