import { describe, it, expect } from 'vitest'
import {
  removeCatalogNumbers,
  normalizeComposerForMatching,
  getCanonicalComposerName,
  formatCanonicalComposerName,
  isSameComposer,
  extractCatalogInfo,
  getDisplayComposerName,
} from './composerCanonicalizer'

describe('composerCanonicalizer (Frontend)', () => {
  describe('removeCatalogNumbers', () => {
    it('should remove BWV numbers', () => {
      expect(removeCatalogNumbers('Bach BWV 772')).toBe('Bach')
      expect(removeCatalogNumbers('JS Bach BWV 988')).toBe('JS Bach')
    })

    it('should remove opus numbers', () => {
      expect(removeCatalogNumbers('Beethoven Op. 27')).toBe('Beethoven')
      expect(removeCatalogNumbers('Beethoven Op. 107')).toBe('Beethoven')
      expect(removeCatalogNumbers('Chopin Op.10')).toBe('Chopin')
    })

    it('should remove Köchel numbers', () => {
      expect(removeCatalogNumbers('Mozart K. 331')).toBe('Mozart')
      expect(removeCatalogNumbers('Mozart KV 626')).toBe('Mozart')
    })

    it('should remove multiple catalog numbers', () => {
      expect(removeCatalogNumbers('Bach BWV 772 No. 1')).toBe('Bach')
    })

    it('should handle names without catalog numbers', () => {
      expect(removeCatalogNumbers('Johann Sebastian Bach')).toBe(
        'Johann Sebastian Bach'
      )
      expect(removeCatalogNumbers('Beethoven')).toBe('Beethoven')
    })

    it('should handle empty strings', () => {
      expect(removeCatalogNumbers('')).toBe('')
      expect(removeCatalogNumbers('   ')).toBe('')
    })
  })

  describe('normalizeComposerForMatching', () => {
    it('should convert to lowercase', () => {
      expect(normalizeComposerForMatching('BACH')).toBe('bach')
      expect(normalizeComposerForMatching('Mozart')).toBe('mozart')
    })

    it('should remove periods', () => {
      expect(normalizeComposerForMatching('J.S. Bach')).toBe('js bach')
      expect(normalizeComposerForMatching('W.A. Mozart')).toBe('wa mozart')
    })

    it('should normalize whitespace', () => {
      expect(normalizeComposerForMatching('  Bach   ')).toBe('bach')
      expect(normalizeComposerForMatching('Johann  Sebastian   Bach')).toBe(
        'johann sebastian bach'
      )
    })

    it('should normalize special characters', () => {
      expect(normalizeComposerForMatching("Bach's")).toBe("bach's")
      expect(normalizeComposerForMatching('Bach—Works')).toBe('bach-works')
    })
  })

  describe('getCanonicalComposerName', () => {
    it('should return canonical name for common variations', () => {
      expect(getCanonicalComposerName('Bach')).toBe('Johann Sebastian Bach')
      expect(getCanonicalComposerName('bach')).toBe('Johann Sebastian Bach')
      expect(getCanonicalComposerName('J.S. Bach')).toBe(
        'Johann Sebastian Bach'
      )
      expect(getCanonicalComposerName('JS Bach')).toBe('Johann Sebastian Bach')
      expect(getCanonicalComposerName('Bach, Johann Sebastian')).toBe(
        'Johann Sebastian Bach'
      )
    })

    it('should handle composers with catalog numbers', () => {
      expect(getCanonicalComposerName('Bach BWV 772')).toBe(
        'Johann Sebastian Bach'
      )
      expect(getCanonicalComposerName('Beethoven Op. 27')).toBe(
        'Ludwig van Beethoven'
      )
      expect(getCanonicalComposerName('Mozart K. 331')).toBe(
        'Wolfgang Amadeus Mozart'
      )
    })

    it('should return canonical names for other composers', () => {
      expect(getCanonicalComposerName('Beethoven')).toBe('Ludwig van Beethoven')
      expect(getCanonicalComposerName('Mozart')).toBe('Wolfgang Amadeus Mozart')
      expect(getCanonicalComposerName('Chopin')).toBe('Frédéric Chopin')
      expect(getCanonicalComposerName('Rachmaninoff')).toBe(
        'Sergei Rachmaninoff'
      )
      expect(getCanonicalComposerName('Rachmaninov')).toBe(
        'Sergei Rachmaninoff'
      )
    })

    it('should handle traditional and anonymous', () => {
      expect(getCanonicalComposerName('traditional')).toBe('Traditional')
      expect(getCanonicalComposerName('folk')).toBe('Traditional')
      expect(getCanonicalComposerName('anonymous')).toBe('Anonymous')
      expect(getCanonicalComposerName('anon')).toBe('Anonymous')
      expect(getCanonicalComposerName('unknown')).toBe('Unknown')
    })

    it('should handle guitar composers', () => {
      expect(getCanonicalComposerName('sor')).toBe('Fernando Sor')
      expect(getCanonicalComposerName('villa-lobos')).toBe('Heitor Villa-Lobos')
      expect(getCanonicalComposerName('tarrega')).toBe('Francisco Tárrega')
    })

    it('should format unknown composers properly', () => {
      expect(getCanonicalComposerName('john smith')).toBe('John Smith')
      expect(getCanonicalComposerName('UNKNOWN COMPOSER')).toBe(
        'Unknown Composer'
      )
    })

    it('should handle null and undefined', () => {
      expect(getCanonicalComposerName(null)).toBe('')
      expect(getCanonicalComposerName(undefined)).toBe('')
      expect(getCanonicalComposerName('')).toBe('')
      expect(getCanonicalComposerName('  ')).toBe('')
    })

    it('should handle when only catalog number is provided', () => {
      expect(getCanonicalComposerName('BWV 772')).toBe('')
      expect(getCanonicalComposerName('Op. 27')).toBe('')
    })
  })

  describe('formatCanonicalComposerName', () => {
    it('should capitalize properly', () => {
      expect(formatCanonicalComposerName('johann sebastian bach')).toBe(
        'Johann Sebastian Bach'
      )
      expect(formatCanonicalComposerName('LUDWIG VAN BEETHOVEN')).toBe(
        'Ludwig van Beethoven'
      )
    })

    it('should handle particles correctly', () => {
      expect(formatCanonicalComposerName('ludwig van beethoven')).toBe(
        'Ludwig van Beethoven'
      )
      expect(formatCanonicalComposerName('claude de france')).toBe(
        'Claude de France'
      )
    })

    it('should handle hyphenated names', () => {
      expect(formatCanonicalComposerName('villa-lobos')).toBe('Villa-Lobos')
      expect(formatCanonicalComposerName('mendelssohn-bartholdy')).toBe(
        'Mendelssohn-Bartholdy'
      )
    })

    it('should handle initials', () => {
      expect(formatCanonicalComposerName('j.s. bach')).toBe('J.S. Bach')
      expect(formatCanonicalComposerName('c.p.e. bach')).toBe('C.P.E. Bach')
    })

    it('should handle empty strings', () => {
      expect(formatCanonicalComposerName('')).toBe('')
      expect(formatCanonicalComposerName('  ')).toBe('')
    })
  })

  describe('isSameComposer', () => {
    it('should recognize same composer with different variations', () => {
      expect(isSameComposer('Bach', 'J.S. Bach')).toBe(true)
      expect(isSameComposer('JS Bach', 'Johann Sebastian Bach')).toBe(true)
      expect(isSameComposer('beethoven', 'L.V. Beethoven')).toBe(true)
      expect(isSameComposer('Rachmaninoff', 'Rachmaninov')).toBe(true)
    })

    it('should handle catalog numbers', () => {
      expect(isSameComposer('Bach BWV 772', 'J.S. Bach')).toBe(true)
      expect(isSameComposer('Beethoven Op. 27', 'Ludwig van Beethoven')).toBe(
        true
      )
    })

    it('should recognize different composers', () => {
      expect(isSameComposer('Bach', 'Beethoven')).toBe(false)
      expect(isSameComposer('Mozart', 'Chopin')).toBe(false)
      expect(isSameComposer('J.S. Bach', 'C.P.E. Bach')).toBe(false)
    })

    it('should handle case differences', () => {
      expect(isSameComposer('BACH', 'bach')).toBe(true)
      expect(isSameComposer('Mozart', 'MOZART')).toBe(true)
    })
  })

  describe('extractCatalogInfo', () => {
    it('should extract BWV numbers', () => {
      const result = extractCatalogInfo('Bach BWV 772')
      expect(result.composer).toBe('Johann Sebastian Bach')
      expect(result.catalogNumber).toBe('BWV 772')
    })

    it('should extract opus numbers', () => {
      const result = extractCatalogInfo('Beethoven Op. 27')
      expect(result.composer).toBe('Ludwig van Beethoven')
      expect(result.catalogNumber).toBe('Op. 27')
    })

    it('should extract Köchel numbers', () => {
      const result = extractCatalogInfo('Mozart K. 331')
      expect(result.composer).toBe('Wolfgang Amadeus Mozart')
      expect(result.catalogNumber).toBe('K. 331')
    })

    it('should handle names without catalog numbers', () => {
      const result = extractCatalogInfo('Johann Sebastian Bach')
      expect(result.composer).toBe('Johann Sebastian Bach')
      expect(result.catalogNumber).toBeUndefined()
    })

    it('should handle unknown composers with catalog numbers', () => {
      const result = extractCatalogInfo('Unknown Composer Op. 99')
      expect(result.composer).toBe('Unknown Composer')
      expect(result.catalogNumber).toBe('Op. 99')
    })

    it('should handle empty strings', () => {
      const result = extractCatalogInfo('')
      expect(result.composer).toBe('')
      expect(result.catalogNumber).toBeUndefined()
    })

    it('should only extract the first catalog number', () => {
      const result = extractCatalogInfo('Bach BWV 772 No. 1')
      expect(result.composer).toBe('Johann Sebastian Bach')
      expect(result.catalogNumber).toBe('BWV 772')
    })
  })

  describe('getDisplayComposerName', () => {
    it('should return canonical name for display', () => {
      expect(getDisplayComposerName('Bach')).toBe('Johann Sebastian Bach')
      expect(getDisplayComposerName('Bach BWV 772')).toBe(
        'Johann Sebastian Bach'
      )
      expect(getDisplayComposerName('beethoven')).toBe('Ludwig van Beethoven')
    })

    it('should handle null and undefined', () => {
      expect(getDisplayComposerName(null)).toBe('')
      expect(getDisplayComposerName(undefined)).toBe('')
    })

    it('should format unknown composers', () => {
      expect(getDisplayComposerName('john doe')).toBe('John Doe')
    })
  })
})
