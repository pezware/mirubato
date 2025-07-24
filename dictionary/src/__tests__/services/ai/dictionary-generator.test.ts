import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DictionaryGenerator } from '../../../services/ai/dictionary-generator'
import type { Env } from '../../../types/env'
import type {
  DictionaryEntry,
  Definition,
  // References,
} from '../../../types/dictionary'
import { CloudflareAIService } from '../../../services/ai/cloudflare-ai-service'
import { getWikipediaSuggestions } from '../../../utils/wikipedia-url'

// Mock CloudflareAIService
vi.mock('../../../services/ai/cloudflare-ai-service')

// Mock Wikipedia URL utilities
vi.mock('../../../utils/wikipedia-url', () => ({
  generateWikipediaUrl: vi.fn((term, type, suggestion, language = 'en') => {
    // Mock implementation that returns clean URLs
    const lang = language || 'en'
    if (term === 'piano') return `https://${lang}.wikipedia.org/wiki/Piano`
    if (term === 'The Magic Flute')
      return `https://${lang}.wikipedia.org/wiki/The_Magic_Flute`
    if (term === 'Allegro' && suggestion === 'Allegro (music)')
      return `https://${lang}.wikipedia.org/wiki/Allegro_(music)`
    if (term === 'Johann Sebastian Bach')
      return `https://${lang}.wikipedia.org/wiki/Johann%20Sebastian%20Bach`
    return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(term)}`
  }),
  getWikipediaSuggestions: vi.fn(async (term, limit, language) => {
    // Mock suggestions
    const lang = language || 'en'
    if (term === 'piano') {
      return [
        { title: 'Piano', url: `https://${lang}.wikipedia.org/wiki/Piano` },
      ]
    }
    if (term === 'The Magic Flute') {
      return [
        {
          title: 'The Magic Flute',
          url: `https://${lang}.wikipedia.org/wiki/The_Magic_Flute`,
        },
        {
          title: 'The Magic Flute (2006 film)',
          url: `https://${lang}.wikipedia.org/wiki/The_Magic_Flute_(2006_film)`,
        },
        {
          title: 'The Magic Flute (1975 film)',
          url: `https://${lang}.wikipedia.org/wiki/The_Magic_Flute_(1975_film)`,
        },
      ]
    }
    return []
  }),
  validateWikipediaUrl: vi.fn(async () => true),
}))

describe('DictionaryGenerator', () => {
  let generator: DictionaryGenerator
  let mockEnv: Env
  let mockAIService: any

  beforeEach(() => {
    mockEnv = {
      AI: {} as any,
      DB: {} as any,
      CACHE: {} as any,
      STORAGE: {} as any,
      QUALITY_THRESHOLD: '70',
      CACHE_TTL: '3600',
      ENVIRONMENT: 'test',
      API_SERVICE_URL: 'http://localhost:8787',
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    }

    // Create mock AI service
    mockAIService = {
      generateStructuredContent: vi.fn(),
      parseJSONResponse: vi.fn(),
    }

    // Mock the CloudflareAIService constructor
    ;(CloudflareAIService as any).mockImplementation(() => mockAIService)

    generator = new DictionaryGenerator(mockEnv)
  })

  describe('generateEntry', () => {
    it('should generate a complete dictionary entry', async () => {
      const mockDefinition: Definition = {
        concise: 'A large keyboard instrument.',
        detailed: 'The piano is an acoustic, stringed musical instrument...',
        etymology: 'From Italian pianoforte',
        pronunciation: {
          ipa: '/piˈænoʊ/',
        },
        usage_example: 'She plays the piano beautifully.',
      }

      // const mockReferences: References = {
      //   wikipedia: {
      //     url: 'https://en.wikipedia.org/wiki/Piano',
      //     extract: 'The piano is an acoustic instrument...',
      //     last_verified: new Date().toISOString(),
      //   },
      // }

      // Mock AI responses
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ response: JSON.stringify(mockDefinition) })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'Piano',
            youtube_search: 'piano instrument',
          }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 85,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.generateEntry({
        term: 'piano',
        type: 'instrument',
      })

      expect(result).toBeDefined()
      expect(result.term).toBe('piano')
      expect(result.normalized_term).toBe('piano')
      expect(result.type).toBe('instrument')
      expect(result.definition).toEqual(mockDefinition)
      expect(result.quality_score.overall).toBeGreaterThanOrEqual(70)
      expect(result.id).toBeDefined()
      expect(result.id).toHaveLength(36) // UUID length
    })

    it('should fix Wikipedia URLs for operas by removing composer names', async () => {
      const mockDefinition: Definition = {
        concise: 'A famous opera by Mozart.',
        detailed:
          'The Magic Flute is a two-act opera composed by Wolfgang Amadeus Mozart...',
      }

      // Mock AI responses with problematic Wikipedia search term
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ response: JSON.stringify(mockDefinition) })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'The Magic Flute Mozart', // AI adds composer name
            youtube_search: 'The Magic Flute',
          }),
        })
        .mockResolvedValueOnce({
          response: '1', // AI selection of Wikipedia result
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 85,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.generateEntry({
        term: 'The Magic Flute',
        type: 'genre',
      })

      expect(result).toBeDefined()
      expect(result.references.wikipedia).toBeDefined()
      // Should have cleaned URL without Mozart
      expect(result.references.wikipedia?.url).toBe(
        'https://en.wikipedia.org/wiki/The_Magic_Flute'
      )
    })

    it('should retry on low quality score', async () => {
      const lowQualityDefinition = {
        concise: 'Piano.',
        detailed: 'A piano.',
      }

      const improvedDefinition = {
        concise: 'A large keyboard instrument with strings struck by hammers.',
        detailed: 'The piano is an acoustic, stringed musical instrument...',
        etymology: 'From Italian pianoforte',
      }

      // First attempt - low quality
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify(lowQualityDefinition),
        })
        .mockResolvedValueOnce({ response: '{}' })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 50,
            issues: ['Definition too short', 'Missing details'],
            suggestions: ['Add more detail', 'Include etymology'],
          }),
        })
        // Second attempt - improved
        .mockResolvedValueOnce({ response: JSON.stringify(improvedDefinition) })
        .mockResolvedValueOnce({ response: '{}' })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 80,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.generateEntry({
        term: 'piano',
        type: 'instrument',
      })

      expect(result.definition).toEqual(improvedDefinition)
      expect(result.quality_score.overall).toBeGreaterThanOrEqual(70)
      expect(mockAIService.generateStructuredContent).toHaveBeenCalledTimes(6)
    })

    it('should throw error after max retries', async () => {
      const lowQualityDefinition = {
        concise: 'Bad.',
        detailed: 'Bad definition.',
      }

      // Mock all attempts to return low quality
      for (let i = 0; i < 9; i++) {
        // 3 attempts * 3 calls each
        if (i % 3 === 0) {
          mockAIService.generateStructuredContent.mockResolvedValueOnce({
            response: JSON.stringify(lowQualityDefinition),
          })
        } else if (i % 3 === 1) {
          mockAIService.generateStructuredContent.mockResolvedValueOnce({
            response: '{}',
          })
        } else {
          mockAIService.generateStructuredContent.mockResolvedValueOnce({
            response: JSON.stringify({
              score: 40,
              issues: ['Poor quality'],
              suggestions: ['Improve everything'],
            }),
          })
        }
      }

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      await expect(
        generator.generateEntry({ term: 'test', type: 'general' })
      ).rejects.toThrow('Failed to generate entry with acceptable quality')
    })
  })

  describe('enhanceEntry', () => {
    it('should enhance an existing entry', async () => {
      const existingEntry: DictionaryEntry = {
        id: 'dict_piano_001',
        term: 'piano',
        normalized_term: 'piano',
        type: 'instrument',
        definition: {
          concise: 'A keyboard instrument.',
          detailed: 'A piano is a musical instrument.',
        },
        references: {},
        metadata: {
          search_frequency: 10,
          last_accessed: new Date().toISOString(),
          related_terms: [],
          categories: [],
        },
        quality_score: {
          overall: 50,
          definition_clarity: 60,
          reference_completeness: 0,
          accuracy_verification: 70,
          last_ai_check: new Date().toISOString(),
          human_verified: false,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      }

      const enhancedDefinition = {
        concise:
          'A large keyboard instrument with strings struck by hammers when keys are pressed.',
        detailed:
          'The piano is an acoustic, stringed musical instrument invented in Italy...',
        etymology: 'From Italian pianoforte, meaning "soft-loud"',
        pronunciation: {
          ipa: '/piˈænoʊ/',
        },
        usage_example: 'She has been playing the piano since childhood.',
      }

      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify({ definition: enhancedDefinition }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            references: {
              wikipedia: {
                url: 'https://en.wikipedia.org/wiki/Piano',
                extract: 'Enhanced reference',
                last_verified: new Date().toISOString(),
              },
            },
          }),
        })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.enhanceEntry(existingEntry)

      expect(result.definition).toEqual(enhancedDefinition)
      expect(result.quality_score.overall).toBeGreaterThan(
        existingEntry.quality_score.overall
      )
      expect(result.version).toBe(2)
      expect(result.id).toBe(existingEntry.id)
    })

    it.skip('should preserve existing high-quality fields', async () => {
      const highQualityEntry: DictionaryEntry = {
        id: 'dict_forte_001',
        term: 'forte',
        normalized_term: 'forte',
        type: 'technique',
        definition: {
          concise: 'A dynamic marking in music indicating loud or strong.',
          detailed:
            'Forte is an Italian musical term meaning loud or strong...',
          etymology: 'From Italian forte, meaning "strong"',
          pronunciation: {
            ipa: '/ˈfɔrteɪ/',
          },
        },
        references: {
          wikipedia: {
            url: 'https://en.wikipedia.org/wiki/Dynamics_(music)',
            extract: 'Dynamics are indicators of the relative intensity...',
            last_verified: new Date().toISOString(),
          },
        },
        metadata: {
          search_frequency: 100,
          last_accessed: new Date().toISOString(),
          related_terms: ['piano', 'fortissimo'],
          categories: ['dynamics', 'musical notation'],
        },
        quality_score: {
          overall: 90,
          definition_clarity: 95,
          reference_completeness: 85,
          accuracy_verification: 90,
          last_ai_check: new Date().toISOString(),
          human_verified: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 3,
      }

      mockAIService.generateStructuredContent.mockResolvedValueOnce({
        response: JSON.stringify({
          definition: {
            ...highQualityEntry.definition,
            usage_example: 'The passage should be played forte throughout.',
          },
        }),
      })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.enhanceEntry(highQualityEntry, {
        focus_areas: ['definition'],
      })

      // Should add missing fields but preserve existing quality content
      expect(result.definition.concise).toBe(
        highQualityEntry.definition.concise
      )
      expect(result.definition.detailed).toBe(
        highQualityEntry.definition.detailed
      )
      expect(result.definition.usage_example).toBe(
        'The passage should be played forte throughout.'
      )
      expect(result.references.wikipedia).toEqual(
        highQualityEntry.references.wikipedia
      )
    })

    it('should properly clean Wikipedia search terms', async () => {
      const mockDefinition: Definition = {
        concise: 'A moderate tempo marking.',
        detailed: 'Allegro is a tempo marking indicating a fast, lively pace.',
      }

      // Set up mocks with problematic Wikipedia search term
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify(mockDefinition),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'Allegro (music) Wikipedia',
            youtube_search: 'tempo music definition educational video',
          }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 75,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse
        .mockReturnValueOnce(mockDefinition)
        .mockReturnValueOnce({
          wikipedia_search: 'Allegro (music) Wikipedia',
          youtube_search: 'tempo music definition educational video',
        })
        .mockReturnValueOnce({ score: 75, issues: [], suggestions: [] })

      const result = await generator.generateEntry({
        term: 'Allegro',
        type: 'tempo',
      })

      expect(result).toBeDefined()
      // Our improved logic correctly identifies Allegro as a unique music term
      // that doesn't need disambiguation
      expect(result?.references.wikipedia?.url).toBe(
        'https://en.wikipedia.org/wiki/Allegro'
      )
      expect(
        result?.references.media?.youtube?.educational_videos?.[0].url
      ).toContain('search_query=tempo%20music%20theory')
    })

    it('should generate focused YouTube search queries', async () => {
      const mockDefinition: Definition = {
        concise: 'A famous composer.',
        detailed:
          'Johann Sebastian Bach was a German composer of the Baroque period.',
      }

      // Set up mocks with overly broad YouTube search
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify(mockDefinition),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'Johann Sebastian Bach',
            youtube_search: 'Johann Sebastian Bach music lessons',
          }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 80,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse
        .mockReturnValueOnce(mockDefinition)
        .mockReturnValueOnce({
          wikipedia_search: 'Johann Sebastian Bach',
          youtube_search: 'Johann Sebastian Bach music lessons',
        })
        .mockReturnValueOnce({ score: 80, issues: [], suggestions: [] })

      const result = await generator.generateEntry({
        term: 'Johann Sebastian Bach',
        type: 'composer',
      })

      expect(result).toBeDefined()
      expect(result?.references.wikipedia?.url).toBe(
        'https://en.wikipedia.org/wiki/Johann%20Sebastian%20Bach'
      )
      // Should have cleaned up the search query and added appropriate context
      expect(
        result?.references.media?.youtube?.educational_videos?.[0].url
      ).toContain('Johann%20Sebastian%20Bach%20composer%20biography')
      expect(
        result?.references.media?.youtube?.educational_videos?.[0].url
      ).not.toContain('music%20lessons')
    })

    it('should use Wikipedia API and AI selection for multiple results', async () => {
      const mockDefinition: Definition = {
        concise: 'An opera by Mozart.',
        detailed:
          'The Magic Flute is a two-act opera by Wolfgang Amadeus Mozart.',
      }

      // Mock Wikipedia API suggestions
      vi.mocked(getWikipediaSuggestions).mockResolvedValueOnce([
        {
          title: 'The Magic Flute',
          url: 'https://en.wikipedia.org/wiki/The_Magic_Flute',
        },
        {
          title: 'The Magic Flute (2006 film)',
          url: 'https://en.wikipedia.org/wiki/The_Magic_Flute_(2006_film)',
        },
        {
          title: 'The Magic Flute (1975 film)',
          url: 'https://en.wikipedia.org/wiki/The_Magic_Flute_(1975_film)',
        },
      ])

      // Set up mocks
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify(mockDefinition),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'The Magic Flute Mozart',
            youtube_search: 'The Magic Flute opera',
          }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 80,
            issues: [],
            suggestions: [],
          }),
        })
        // Mock AI selection response
        .mockResolvedValueOnce({
          response: '1', // Select the first option (main article)
        })

      mockAIService.parseJSONResponse
        .mockReturnValueOnce(mockDefinition)
        .mockReturnValueOnce({
          wikipedia_search: 'The Magic Flute Mozart',
          youtube_search: 'The Magic Flute opera',
        })
        .mockReturnValueOnce({ score: 80, issues: [], suggestions: [] })

      const result = await generator.generateEntry({
        term: 'The Magic Flute',
        type: 'genre',
      })

      expect(result).toBeDefined()
      // Should use the Wikipedia API result, not the AI-generated one
      expect(result?.references.wikipedia?.url).toBe(
        'https://en.wikipedia.org/wiki/The_Magic_Flute'
      )
      // Verify Wikipedia API was called with language parameter
      expect(getWikipediaSuggestions).toHaveBeenCalledWith(
        'The Magic Flute',
        5,
        'en'
      )
    })

    it('should fall back to AI-generated URL when Wikipedia API fails', async () => {
      const mockDefinition: Definition = {
        concise: 'A tempo marking.',
        detailed: 'Allegro is a tempo marking indicating a fast pace.',
      }

      // Mock Wikipedia API failure
      vi.mocked(getWikipediaSuggestions).mockRejectedValueOnce(
        new Error('Network error')
      )

      // Set up mocks
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({
          response: JSON.stringify(mockDefinition),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            wikipedia_search: 'Allegro (music)',
            youtube_search: 'Allegro',
          }),
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 75,
            issues: [],
            suggestions: [],
          }),
        })

      mockAIService.parseJSONResponse
        .mockReturnValueOnce(mockDefinition)
        .mockReturnValueOnce({
          wikipedia_search: 'Allegro (music)',
          youtube_search: 'Allegro',
        })
        .mockReturnValueOnce({ score: 75, issues: [], suggestions: [] })

      const result = await generator.generateEntry({
        term: 'Allegro',
        type: 'tempo',
      })

      expect(result).toBeDefined()
      // Should fall back to AI-generated URL
      expect(result?.references.wikipedia?.url).toBe(
        'https://en.wikipedia.org/wiki/Allegro_(music)'
      )
    })
  })

  describe('validateQuality', () => {
    it('should validate entry quality', async () => {
      const entry: DictionaryEntry = {
        id: 'test',
        term: 'test',
        normalized_term: 'test',
        type: 'general',
        definition: {
          concise: 'A test definition.',
          detailed:
            'This is a detailed test definition with sufficient content.',
        },
        references: {},
        metadata: {
          search_frequency: 0,
          last_accessed: new Date().toISOString(),
          related_terms: [],
          categories: [],
        },
        quality_score: {
          overall: 0,
          definition_clarity: 0,
          reference_completeness: 0,
          accuracy_verification: 0,
          last_ai_check: new Date().toISOString(),
          human_verified: false,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      }

      mockAIService.generateStructuredContent.mockResolvedValueOnce({
        response: JSON.stringify({
          score: 75,
          issues: [],
          suggestions: ['Add references for completeness'],
        }),
      })

      mockAIService.parseJSONResponse.mockImplementation((response: string) =>
        JSON.parse(response)
      )

      const result = await generator.validateQuality(entry)

      expect(result.score).toBe(75)
      expect(result.issues).toEqual([])
      expect(result.suggestions).toContain('Add references for completeness')
    })

    it('should handle validation errors', async () => {
      const entry = {} as DictionaryEntry

      mockAIService.generateStructuredContent.mockRejectedValueOnce(
        new Error('AI service error')
      )

      const result = await generator.validateQuality(entry)

      expect(result.score).toBe(0)
      expect(result.issues).toContain('Validation failed')
      expect(result.suggestions).toEqual([])
    })
  })
})
