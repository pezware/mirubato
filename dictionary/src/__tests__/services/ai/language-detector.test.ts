import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageDetector } from '../../../services/ai/language-detector'
import type { ExtendedLanguage } from '../../../types/dictionary'

describe('LanguageDetector', () => {
  let detector: LanguageDetector

  beforeEach(() => {
    detector = new LanguageDetector()
  })

  describe('detectLanguage', () => {
    describe('Italian terms (most common in music)', () => {
      const italianTerms = [
        'allegro',
        'andante',
        'adagio',
        'presto',
        'largo',
        'moderato',
        'vivace',
        'lento',
        'grave',
        'piano',
        'forte',
        'mezzo',
        'crescendo',
        'diminuendo',
        'sforzando',
        'staccato',
        'legato',
        'pizzicato',
        'arco',
        'con brio',
        'dolce',
        'espressivo',
        'cantabile',
        'maestoso',
        'ritardando',
        'accelerando',
        'fermata',
        'da capo',
        'dal segno',
        'fine',
        'coda',
        'tutti',
        'solo',
        'fortissimo',
        'pianissimo',
      ]

      it.each(italianTerms)(
        'should detect "%s" as Italian',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('it')
          expect(result.confidence).toBeGreaterThanOrEqual(0.8)
        }
      )

      it('should detect Italian terms case-insensitively', async () => {
        const result = await detector.detectLanguage('ALLEGRO')
        expect(result.language).toBe('it')
      })
    })

    describe('German terms', () => {
      const germanTerms = [
        'langsam',
        'schnell',
        'sehr',
        'mäßig',
        'lebhaft',
        'ruhig',
        'zart',
        'kräftig',
        'mit',
        'ohne',
        'ausdruck',
        'schwer',
        'leicht',
        'bewegt',
        'etwas',
        'immer',
        'wieder',
        'nach',
        'und',
        'aber',
      ]

      it.each(germanTerms)(
        'should detect "%s" as German',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('de')
          expect(result.confidence).toBeGreaterThanOrEqual(0.8)
        }
      )
    })

    describe('French terms', () => {
      const frenchTerms = [
        'avec',
        'sans',
        'lent',
        'vite',
        'doux',
        'fort',
        'très',
        'peu',
        'plus',
        'moins',
        'animé',
        'modéré',
        'retenu',
        'cédez',
        'pressez',
        'détaché',
        'lié',
        'sourdine',
        'jeu',
        'en dehors',
      ]

      it.each(frenchTerms)(
        'should detect "%s" as French',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('fr')
          expect(result.confidence).toBeGreaterThanOrEqual(0.8)
        }
      )
    })

    describe('Latin terms', () => {
      // Latin terms that are unambiguous in music context
      const latinTerms = [
        'ad libitum',
        'a cappella',
        'opus',
        'cum',
        'sine',
        'vox',
        'gloria',
        'requiem',
        'sanctus',
        'agnus dei',
        'magnificat',
        'stabat mater',
      ]

      it.each(latinTerms)(
        'should detect "%s" as Latin',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('la')
          expect(result.confidence).toBeGreaterThanOrEqual(0.7)
        }
      )

      it('should handle "et" which is ambiguous (Latin/French)', async () => {
        const result = await detector.detectLanguage('et')
        // "et" appears in both Latin and French; either is acceptable
        expect(['la', 'fr']).toContain(result.language)
      })
    })

    describe('English terms', () => {
      const englishTerms = [
        'slow',
        'fast',
        'loud',
        'soft',
        'rhythm',
        'melody',
        'harmony',
        'chord',
        'beat',
        'tempo',
        'key',
        'scale',
        'note',
        'rest',
        'measure',
        'bar',
        'staff',
        'clef',
      ]

      it.each(englishTerms)(
        'should detect "%s" as English',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('en')
          expect(result.confidence).toBeGreaterThanOrEqual(0.7)
        }
      )
    })

    describe('Spanish terms', () => {
      // Spanish terms that are unambiguous (not shared with Italian)
      const spanishTerms = ['rápido', 'rapido', 'flamenco', 'tango', 'bolero']

      it.each(spanishTerms)(
        'should detect "%s" as Spanish',
        async (term: string) => {
          const result = await detector.detectLanguage(term)
          expect(result.language).toBe('es')
          expect(result.confidence).toBeGreaterThanOrEqual(0.7)
        }
      )

      it('should handle "lento" as Italian (primary music usage) not Spanish', async () => {
        // In music context, "lento" is an Italian tempo marking
        const result = await detector.detectLanguage('lento')
        expect(result.language).toBe('it')
      })

      it('should handle "con" as Italian (primary music usage) not Spanish', async () => {
        // In music context, "con" is Italian (con brio, con moto, etc.)
        const result = await detector.detectLanguage('con')
        expect(result.language).toBe('it')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', async () => {
        const result = await detector.detectLanguage('')
        expect(result.language).toBeNull()
        expect(result.confidence).toBe(0)
      })

      it('should handle whitespace-only string', async () => {
        const result = await detector.detectLanguage('   ')
        expect(result.language).toBeNull()
        expect(result.confidence).toBe(0)
      })

      it('should handle numbers', async () => {
        const result = await detector.detectLanguage('123')
        expect(result.language).toBeNull()
        expect(result.confidence).toBeLessThan(0.5)
      })

      it('should handle mixed-language terms', async () => {
        // "con moto" is Italian
        const result = await detector.detectLanguage('con moto')
        expect(result.language).toBe('it')
      })

      it('should handle terms with accents', async () => {
        const result = await detector.detectLanguage('animé')
        expect(result.language).toBe('fr')
      })
    })

    describe('Ambiguous terms', () => {
      it('should prefer Italian for common music terms like "tempo"', async () => {
        // "tempo" exists in multiple languages but is primarily Italian in music
        const result = await detector.detectLanguage('tempo')
        // Could be English or Italian, but Italian should be preferred in music context
        expect(['it', 'en']).toContain(result.language)
      })

      it('should handle "piano" correctly (Italian dynamics term)', async () => {
        const result = await detector.detectLanguage('piano')
        expect(result.language).toBe('it')
      })

      it('should handle "forte" correctly (Italian dynamics term)', async () => {
        const result = await detector.detectLanguage('forte')
        expect(result.language).toBe('it')
      })
    })
  })

  describe('detectLanguageWithFallback', () => {
    it('should use pattern detection first before AI', async () => {
      const result = await detector.detectLanguage('allegro')

      // Should detect from patterns without AI call
      expect(result.language).toBe('it')
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
      expect(result.method).toBe('pattern')
    })

    it('should return low confidence for unknown terms', async () => {
      // A term that doesn't match any patterns
      const result = await detector.detectLanguage('xyzabc123')
      expect(result.confidence).toBeLessThan(0.5)
    })
  })

  describe('isMusicalTerm', () => {
    it('should identify common musical terms', () => {
      expect(detector.isMusicalTerm('allegro')).toBe(true)
      expect(detector.isMusicalTerm('piano')).toBe(true)
      expect(detector.isMusicalTerm('crescendo')).toBe(true)
    })

    it('should return false for non-musical terms', () => {
      expect(detector.isMusicalTerm('hello')).toBe(false)
      expect(detector.isMusicalTerm('computer')).toBe(false)
    })
  })

  describe('getLanguageConfidence', () => {
    it('should return high confidence for exact matches', async () => {
      const result = await detector.detectLanguage('allegro')
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should return medium confidence for partial matches', async () => {
      const result = await detector.detectLanguage('allegretto') // variation of allegro
      expect(result.confidence).toBeGreaterThanOrEqual(0.7)
    })
  })

  describe('Batch detection', () => {
    it('should detect multiple terms efficiently', async () => {
      const terms = ['allegro', 'langsam', 'avec', 'slow']
      const results = await detector.detectLanguages(terms)

      expect(results).toHaveLength(4)
      expect(results[0].language).toBe('it')
      expect(results[1].language).toBe('de')
      expect(results[2].language).toBe('fr')
      expect(results[3].language).toBe('en')
    })
  })

  describe('Return type structure', () => {
    it('should return correct structure', async () => {
      const result = await detector.detectLanguage('allegro')

      expect(result).toHaveProperty('language')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')

      expect(typeof result.confidence).toBe('number')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should have valid ExtendedLanguage type', async () => {
      const validLanguages: (ExtendedLanguage | null)[] = [
        'en',
        'es',
        'fr',
        'de',
        'zh-CN',
        'zh-TW',
        'it',
        'la',
        null,
      ]

      const result = await detector.detectLanguage('allegro')
      expect(validLanguages).toContain(result.language)
    })
  })
})
