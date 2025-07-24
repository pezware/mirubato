import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cleanWikipediaTerm,
  needsDisambiguation,
  generateWikipediaUrl,
  generateWikipediaSearchUrl,
  parseBestMatch,
  validateWikipediaUrl,
  getWikipediaSuggestions,
} from '../../utils/wikipedia-url'

// Mock fetch for API tests
global.fetch = vi.fn()

describe('Wikipedia URL Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cleanWikipediaTerm', () => {
    it('should remove filler words', () => {
      expect(cleanWikipediaTerm('search for Mozart on Wikipedia')).toBe(
        'Mozart'
      )
      expect(cleanWikipediaTerm('Beethoven wikipedia page')).toBe('Beethoven')
    })

    it('should capitalize words properly', () => {
      expect(cleanWikipediaTerm('the magic flute')).toBe('The Magic Flute')
      expect(cleanWikipediaTerm('johann sebastian bach')).toBe(
        'Johann Sebastian Bach'
      )
    })

    it('should handle already clean terms', () => {
      expect(cleanWikipediaTerm('Mozart')).toBe('Mozart')
      expect(cleanWikipediaTerm('The Magic Flute')).toBe('The Magic Flute')
    })
  })

  describe('needsDisambiguation', () => {
    it('should not disambiguate unique music terms', () => {
      expect(needsDisambiguation('allegro', 'tempo')).toBe(false)
      expect(needsDisambiguation('Mozart', 'composer')).toBe(false)
      expect(needsDisambiguation('crescendo', 'dynamics')).toBe(false)
    })

    it('should disambiguate common ambiguous terms', () => {
      expect(needsDisambiguation('scale', 'theory')).toBe(true)
      expect(needsDisambiguation('key', 'theory')).toBe(true)
      expect(needsDisambiguation('dynamics', 'theory')).toBe(true)
    })

    it('should check known mappings', () => {
      expect(needsDisambiguation('Dynamics', 'theory')).toBe(true)
      expect(needsDisambiguation('The Magic Flute', 'opera')).toBe(false)
    })
  })

  describe('generateWikipediaUrl', () => {
    it('should generate correct URLs for operas', () => {
      expect(generateWikipediaUrl('The Magic Flute', 'opera')).toBe(
        'https://en.wikipedia.org/wiki/The_Magic_Flute'
      )
      expect(generateWikipediaUrl('La Traviata', 'opera')).toBe(
        'https://en.wikipedia.org/wiki/La_traviata'
      )
    })

    it('should remove composer names from opera titles', () => {
      expect(
        generateWikipediaUrl(
          'The Magic Flute',
          'opera',
          'The Magic Flute Mozart'
        )
      ).toBe('https://en.wikipedia.org/wiki/The_Magic_Flute')
      expect(
        generateWikipediaUrl('Don Giovanni', 'opera', 'Don Giovanni Mozart')
      ).toBe('https://en.wikipedia.org/wiki/Don_Giovanni')
    })

    it('should add disambiguation when needed', () => {
      expect(generateWikipediaUrl('Scale', 'theory')).toBe(
        'https://en.wikipedia.org/wiki/Scale_(music)'
      )
      expect(generateWikipediaUrl('Dynamics', 'theory')).toBe(
        'https://en.wikipedia.org/wiki/Dynamics_(music)'
      )
    })

    it('should handle composers correctly', () => {
      expect(generateWikipediaUrl('Johann Sebastian Bach', 'composer')).toBe(
        'https://en.wikipedia.org/wiki/Johann_Sebastian_Bach'
      )
      expect(generateWikipediaUrl('Mozart', 'composer')).toBe(
        'https://en.wikipedia.org/wiki/Mozart'
      )
    })

    it('should encode special characters', () => {
      expect(generateWikipediaUrl('C# major', 'key')).toBe(
        'https://en.wikipedia.org/wiki/C%23_Major'
      )
    })
  })

  describe('generateWikipediaSearchUrl', () => {
    it('should generate correct search URL', () => {
      const url = generateWikipediaSearchUrl('Mozart', 5)
      expect(url).toContain('action=opensearch')
      expect(url).toContain('search=Mozart')
      expect(url).toContain('limit=5')
      expect(url).toContain('namespace=0')
      expect(url).toContain('format=json')
      expect(url).toContain('origin=*')
    })

    it('should handle special characters in search terms', () => {
      const url = generateWikipediaSearchUrl('C# major', 3)
      expect(url).toContain('search=C%23+major')
    })
  })

  describe('parseBestMatch', () => {
    it('should return exact match when available', () => {
      const results: [string, string[], string[], string[]] = [
        'Mozart',
        ['Wolfgang Amadeus Mozart', 'Mozart', 'Leopold Mozart'],
        ['', '', ''],
        [
          'https://en.wikipedia.org/wiki/Wolfgang_Amadeus_Mozart',
          'https://en.wikipedia.org/wiki/Mozart',
          'https://en.wikipedia.org/wiki/Leopold_Mozart',
        ],
      ]

      expect(parseBestMatch(results, 'Mozart')).toBe(
        'https://en.wikipedia.org/wiki/Mozart'
      )
    })

    it('should return first result when no exact match', () => {
      const results: [string, string[], string[], string[]] = [
        'Bach',
        ['Johann Sebastian Bach', 'Carl Philipp Emanuel Bach'],
        ['', ''],
        [
          'https://en.wikipedia.org/wiki/Johann_Sebastian_Bach',
          'https://en.wikipedia.org/wiki/Carl_Philipp_Emanuel_Bach',
        ],
      ]

      expect(parseBestMatch(results, 'Bach')).toBe(
        'https://en.wikipedia.org/wiki/Johann_Sebastian_Bach'
      )
    })

    it('should return null for empty results', () => {
      const results: [string, string[], string[], string[]] = [
        'NonexistentTerm',
        [],
        [],
        [],
      ]

      expect(parseBestMatch(results, 'NonexistentTerm')).toBe(null)
    })
  })

  describe('validateWikipediaUrl', () => {
    it('should validate existing Wikipedia URL', async () => {
      const mockResponse = {
        query: {
          pages: {
            '123': { pageid: 123, title: 'Mozart' },
          },
        },
      }

      ;(fetch as any).mockResolvedValueOnce({
        json: async () => mockResponse,
      })

      const isValid = await validateWikipediaUrl(
        'https://en.wikipedia.org/wiki/Mozart'
      )
      expect(isValid).toBe(true)
    })

    it('should invalidate non-existing Wikipedia URL', async () => {
      const mockResponse = {
        query: {
          pages: {
            '-1': { missing: true },
          },
        },
      }

      ;(fetch as any).mockResolvedValueOnce({
        json: async () => mockResponse,
      })

      const isValid = await validateWikipediaUrl(
        'https://en.wikipedia.org/wiki/Nonexistent_Page_12345'
      )
      expect(isValid).toBe(false)
    })

    it('should handle malformed URLs', async () => {
      const isValid = await validateWikipediaUrl('not-a-wikipedia-url')
      expect(isValid).toBe(false)
    })
  })

  describe('getWikipediaSuggestions', () => {
    it('should return suggestions from API', async () => {
      const mockResults: [string, string[], string[], string[]] = [
        'Mozart',
        ['Wolfgang Amadeus Mozart', 'Mozart (disambiguation)'],
        ['German composer', 'Disambiguation page'],
        [
          'https://en.wikipedia.org/wiki/Wolfgang_Amadeus_Mozart',
          'https://en.wikipedia.org/wiki/Mozart_(disambiguation)',
        ],
      ]

      ;(fetch as any).mockResolvedValueOnce({
        json: async () => mockResults,
      })

      const suggestions = await getWikipediaSuggestions('Mozart', 2)

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0]).toEqual({
        title: 'Wolfgang Amadeus Mozart',
        url: 'https://en.wikipedia.org/wiki/Wolfgang_Amadeus_Mozart',
      })
      expect(suggestions[1]).toEqual({
        title: 'Mozart (disambiguation)',
        url: 'https://en.wikipedia.org/wiki/Mozart_(disambiguation)',
      })
    })

    it('should return empty array on error', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const suggestions = await getWikipediaSuggestions('Mozart')
      expect(suggestions).toEqual([])
    })
  })
})
