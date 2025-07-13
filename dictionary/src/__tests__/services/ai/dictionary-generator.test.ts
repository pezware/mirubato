import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DictionaryGenerator } from '../../../services/ai/dictionary-generator'
import type { Env } from '../../../types/env'
import type { DictionaryEntry, Definition, References } from '../../../types/dictionary'
import { CloudflareAIService } from '../../../services/ai/cloudflare-ai-service'

// Mock CloudflareAIService
vi.mock('../../../services/ai/cloudflare-ai-service')

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
      ANTHROPIC_API_KEY: 'test-anthropic-key'
    }

    // Create mock AI service
    mockAIService = {
      generateStructuredContent: vi.fn(),
      parseJSONResponse: vi.fn()
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
          ipa: '/piˈænoʊ/'
        },
        usage_example: 'She plays the piano beautifully.'
      }

      const mockReferences: References = {
        wikipedia: {
          url: 'https://en.wikipedia.org/wiki/Piano',
          extract: 'The piano is an acoustic instrument...',
          last_verified: new Date().toISOString()
        }
      }

      // Mock AI responses
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ response: JSON.stringify(mockDefinition) })
        .mockResolvedValueOnce({ 
          response: JSON.stringify({
            wikipedia_search: 'Piano',
            youtube_search: 'piano instrument'
          })
        })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 85,
            issues: [],
            suggestions: []
          })
        })

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

      const result = await generator.generateEntry({ term: 'piano', type: 'instrument' })

      expect(result).toBeDefined()
      expect(result.term).toBe('piano')
      expect(result.normalized_term).toBe('piano')
      expect(result.type).toBe('instrument')
      expect(result.definition).toEqual(mockDefinition)
      expect(result.quality_score.overall).toBeGreaterThanOrEqual(70)
      expect(result.id).toBeDefined()
      expect(result.id).toHaveLength(36) // UUID length
    })

    it('should retry on low quality score', async () => {
      const lowQualityDefinition = {
        concise: 'Piano.',
        detailed: 'A piano.'
      }

      const improvedDefinition = {
        concise: 'A large keyboard instrument with strings struck by hammers.',
        detailed: 'The piano is an acoustic, stringed musical instrument...',
        etymology: 'From Italian pianoforte'
      }

      // First attempt - low quality
      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ response: JSON.stringify(lowQualityDefinition) })
        .mockResolvedValueOnce({ response: '{}' })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 50,
            issues: ['Definition too short', 'Missing details'],
            suggestions: ['Add more detail', 'Include etymology']
          })
        })
        // Second attempt - improved
        .mockResolvedValueOnce({ response: JSON.stringify(improvedDefinition) })
        .mockResolvedValueOnce({ response: '{}' })
        .mockResolvedValueOnce({
          response: JSON.stringify({
            score: 80,
            issues: [],
            suggestions: []
          })
        })

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

      const result = await generator.generateEntry({ term: 'piano', type: 'instrument' })

      expect(result.definition).toEqual(improvedDefinition)
      expect(result.quality_score.overall).toBeGreaterThanOrEqual(70)
      expect(mockAIService.generateStructuredContent).toHaveBeenCalledTimes(6)
    })

    it('should throw error after max retries', async () => {
      const lowQualityDefinition = {
        concise: 'Bad.',
        detailed: 'Bad definition.'
      }

      // Mock all attempts to return low quality
      for (let i = 0; i < 9; i++) { // 3 attempts * 3 calls each
        if (i % 3 === 0) {
          mockAIService.generateStructuredContent
            .mockResolvedValueOnce({ response: JSON.stringify(lowQualityDefinition) })
        } else if (i % 3 === 1) {
          mockAIService.generateStructuredContent
            .mockResolvedValueOnce({ response: '{}' })
        } else {
          mockAIService.generateStructuredContent
            .mockResolvedValueOnce({
              response: JSON.stringify({
                score: 40,
                issues: ['Poor quality'],
                suggestions: ['Improve everything']
              })
            })
        }
      }

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

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
          detailed: 'A piano is a musical instrument.'
        },
        references: {},
        metadata: {
          search_frequency: 10,
          last_accessed: new Date().toISOString(),
          related_terms: [],
          categories: []
        },
        quality_score: {
          overall: 50,
          definition_clarity: 60,
          reference_completeness: 0,
          accuracy_verification: 70,
          last_ai_check: new Date().toISOString(),
          human_verified: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }

      const enhancedDefinition = {
        concise: 'A large keyboard instrument with strings struck by hammers when keys are pressed.',
        detailed: 'The piano is an acoustic, stringed musical instrument invented in Italy...',
        etymology: 'From Italian pianoforte, meaning "soft-loud"',
        pronunciation: {
          ipa: '/piˈænoʊ/'
        },
        usage_example: 'She has been playing the piano since childhood.'
      }

      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ response: JSON.stringify({ definition: enhancedDefinition }) })
        .mockResolvedValueOnce({ 
          response: JSON.stringify({
            references: {
              wikipedia: {
                url: 'https://en.wikipedia.org/wiki/Piano',
                extract: 'Enhanced reference',
                last_verified: new Date().toISOString()
              }
            }
          })
        })

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

      const result = await generator.enhanceEntry(existingEntry)

      expect(result.definition).toEqual(enhancedDefinition)
      expect(result.quality_score.overall).toBeGreaterThan(existingEntry.quality_score.overall)
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
          detailed: 'Forte is an Italian musical term meaning loud or strong...',
          etymology: 'From Italian forte, meaning "strong"',
          pronunciation: {
            ipa: '/ˈfɔrteɪ/'
          }
        },
        references: {
          wikipedia: {
            url: 'https://en.wikipedia.org/wiki/Dynamics_(music)',
            extract: 'Dynamics are indicators of the relative intensity...',
            last_verified: new Date().toISOString()
          }
        },
        metadata: {
          search_frequency: 100,
          last_accessed: new Date().toISOString(),
          related_terms: ['piano', 'fortissimo'],
          categories: ['dynamics', 'musical notation']
        },
        quality_score: {
          overall: 90,
          definition_clarity: 95,
          reference_completeness: 85,
          accuracy_verification: 90,
          last_ai_check: new Date().toISOString(),
          human_verified: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 3
      }

      mockAIService.generateStructuredContent
        .mockResolvedValueOnce({ 
          response: JSON.stringify({
            definition: {
              ...highQualityEntry.definition,
              usage_example: 'The passage should be played forte throughout.'
            }
          })
        })

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

      const result = await generator.enhanceEntry(highQualityEntry, { focus_areas: ['definition'] })

      // Should add missing fields but preserve existing quality content
      expect(result.definition.concise).toBe(highQualityEntry.definition.concise)
      expect(result.definition.detailed).toBe(highQualityEntry.definition.detailed)
      expect(result.definition.usage_example).toBe('The passage should be played forte throughout.')
      expect(result.references.wikipedia).toEqual(highQualityEntry.references.wikipedia)
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
          detailed: 'This is a detailed test definition with sufficient content.'
        },
        references: {},
        metadata: {
          search_frequency: 0,
          last_accessed: new Date().toISOString(),
          related_terms: [],
          categories: []
        },
        quality_score: {
          overall: 0,
          definition_clarity: 0,
          reference_completeness: 0,
          accuracy_verification: 0,
          last_ai_check: new Date().toISOString(),
          human_verified: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }

      mockAIService.generateStructuredContent.mockResolvedValueOnce({
        response: JSON.stringify({
          score: 75,
          issues: [],
          suggestions: ['Add references for completeness']
        })
      })

      mockAIService.parseJSONResponse
        .mockImplementation((response: string) => JSON.parse(response))

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