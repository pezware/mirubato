import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudflareAiExtractor } from '../cloudflareAiExtractor'
import { ImageAnalysisRequest } from '../../types/ai'

// Mock AI binding
const mockAi = {
  run: vi.fn(),
}

describe('CloudflareAiExtractor', () => {
  let extractor: CloudflareAiExtractor

  beforeEach(() => {
    vi.clearAllMocks()
    extractor = new CloudflareAiExtractor(mockAi as any)
  })

  describe('extractFromImage', () => {
    it('should extract metadata from a sheet music image', async () => {
      const mockResponse = {
        response: JSON.stringify({
          title: 'Moonlight Sonata',
          composer: 'Ludwig van Beethoven',
          instrument: 'Piano',
          difficulty: 7,
          year: 1801,
          stylePeriod: 'Classical',
          tags: ['sonata', 'piano', 'classical'],
          description: 'First movement of Piano Sonata No. 14',
          visualFeatures: {
            notationType: 'standard',
            staffCount: 2,
            hasLyrics: false,
            hasFingerings: true,
            hasDynamics: true,
            complexity: 'complex',
            isHandwritten: false,
          },
        }),
      }

      mockAi.run.mockResolvedValue(mockResponse)

      const request: ImageAnalysisRequest = {
        imageData: 'base64encodedimage',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      const result = await extractor.extractFromImage(request)

      expect(mockAi.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.2-11b-vision-instruct',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('sheet music'),
              image: 'data:image/jpeg;base64,base64encodedimage',
            }),
          ]),
          max_tokens: 500,
          temperature: 0.1,
        })
      )

      expect(result).toMatchObject({
        title: 'Moonlight Sonata',
        composer: 'Ludwig van Beethoven',
        instrument: 'Piano',
        difficulty: 7,
        difficultyLabel: 'Advanced',
        year: 1801,
        stylePeriod: 'Classical',
        tags: ['sonata', 'piano', 'classical'],
        description: 'First movement of Piano Sonata No. 14',
        provider: 'cloudflare',
        visualFeatures: {
          notationType: 'standard',
          staffCount: 2,
          hasLyrics: false,
          hasFingerings: true,
          hasDynamics: true,
          complexity: 'complex',
          isHandwritten: false,
        },
      })

      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should handle quality check analysis', async () => {
      const mockResponse = {
        response: JSON.stringify({
          quality: 'good',
          issues: ['slight skew'],
          readability: 85,
          recommendations: ['Consider straightening the scan'],
        }),
      }

      mockAi.run.mockResolvedValue(mockResponse)

      const request: ImageAnalysisRequest = {
        imageData: 'base64encodedimage',
        mimeType: 'image/png',
        analysisType: 'quality-check',
      }

      const result = await extractor.extractFromImage(request)

      expect(mockAi.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.2-11b-vision-instruct',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('quality'),
            }),
          ]),
        })
      )

      expect(result.provider).toBe('cloudflare')
    })

    it('should handle AI errors gracefully', async () => {
      mockAi.run.mockRejectedValue(new Error('AI service unavailable'))

      const request: ImageAnalysisRequest = {
        imageData: 'base64encodedimage',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      await expect(extractor.extractFromImage(request)).rejects.toThrow(
        'Cloudflare AI extraction failed'
      )
    })

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        response: 'This is not valid JSON',
      }

      mockAi.run.mockResolvedValue(mockResponse)

      const request: ImageAnalysisRequest = {
        imageData: 'base64encodedimage',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      const result = await extractor.extractFromImage(request)

      expect(result.confidence).toBe(0.1)
      expect(result.description).toBe('Failed to parse AI response')
      expect(result.provider).toBe('cloudflare')
    })

    it('should calculate confidence based on extracted fields', async () => {
      const mockResponse = {
        response: JSON.stringify({
          title: 'Test Piece',
          composer: 'Test Composer',
          instrument: 'Piano',
          // Missing other fields
        }),
      }

      mockAi.run.mockResolvedValue(mockResponse)

      const request: ImageAnalysisRequest = {
        imageData: 'base64encodedimage',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      const result = await extractor.extractFromImage(request)

      // Should have lower confidence due to missing fields
      expect(result.confidence).toBeLessThan(0.7)
      expect(result.confidence).toBeGreaterThan(0.3)
    })

    it('should properly format data URLs', async () => {
      const mockResponse = {
        response: JSON.stringify({ title: 'Test' }),
      }

      mockAi.run.mockResolvedValue(mockResponse)

      // Test with raw base64
      const request1: ImageAnalysisRequest = {
        imageData: 'rawbase64data',
        mimeType: 'image/png',
        analysisType: 'score-metadata',
      }

      await extractor.extractFromImage(request1)

      expect(mockAi.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              image: 'data:image/png;base64,rawbase64data',
            }),
          ]),
        })
      )

      // Test with existing data URL
      const request2: ImageAnalysisRequest = {
        imageData: 'data:image/jpeg;base64,alreadyformatted',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      await extractor.extractFromImage(request2)

      expect(mockAi.run).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              image: 'data:image/jpeg;base64,alreadyformatted',
            }),
          ]),
        })
      )
    })

    it('should use correct difficulty labels', async () => {
      const difficulties = [
        { value: 1, expectedLabel: 'Beginner' },
        { value: 2, expectedLabel: 'Beginner' },
        { value: 3, expectedLabel: 'Easy' },
        { value: 4, expectedLabel: 'Easy' },
        { value: 5, expectedLabel: 'Intermediate' },
        { value: 6, expectedLabel: 'Intermediate' },
        { value: 7, expectedLabel: 'Advanced' },
        { value: 8, expectedLabel: 'Advanced' },
        { value: 9, expectedLabel: 'Expert' },
        { value: 10, expectedLabel: 'Expert' },
      ]

      for (const { value, expectedLabel } of difficulties) {
        const mockResponse = {
          response: JSON.stringify({
            title: 'Test',
            difficulty: value,
          }),
        }

        mockAi.run.mockResolvedValue(mockResponse)

        const request: ImageAnalysisRequest = {
          imageData: 'test',
          mimeType: 'image/jpeg',
          analysisType: 'score-metadata',
        }

        const result = await extractor.extractFromImage(request)

        expect(result.difficulty).toBe(value)
        expect(result.difficultyLabel).toBe(expectedLabel)
      }
    })
  })

  describe('constructor options', () => {
    it('should allow custom model configuration', async () => {
      const customExtractor = new CloudflareAiExtractor(mockAi as any, {
        model: '@cf/llava-hf/llava-1.5-7b-hf',
        maxTokens: 1000,
        temperature: 0.5,
      })

      const mockResponse = {
        response: JSON.stringify({ title: 'Test' }),
      }

      mockAi.run.mockResolvedValue(mockResponse)

      const request: ImageAnalysisRequest = {
        imageData: 'test',
        mimeType: 'image/jpeg',
        analysisType: 'score-metadata',
      }

      await customExtractor.extractFromImage(request)

      expect(mockAi.run).toHaveBeenCalledWith(
        '@cf/llava-hf/llava-1.5-7b-hf',
        expect.objectContaining({
          max_tokens: 1000,
          temperature: 0.5,
        })
      )
    })
  })
})
