import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HybridAiExtractor } from '../hybridAiExtractor'
import { ImageAnalysisRequest } from '../../types/ai'
import * as cloudflareModule from '../cloudflareAiExtractor'
import * as aiMetadataModule from '../aiMetadataExtractor'

// Mock modules
vi.mock('../cloudflareAiExtractor')
vi.mock('../aiMetadataExtractor')

// Mock AI binding
const mockAi = {
  run: vi.fn(),
}

describe('HybridAiExtractor', () => {
  let extractor: HybridAiExtractor
  let mockCloudflareExtractor: any
  let mockExtractMetadataFromPdf: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks
    mockCloudflareExtractor = {
      extractFromImage: vi.fn(),
    }
    vi.mocked(cloudflareModule.CloudflareAiExtractor).mockImplementation(
      () => mockCloudflareExtractor
    )

    mockExtractMetadataFromPdf = vi.fn()
    vi.mocked(aiMetadataModule).extractMetadataFromPdf =
      mockExtractMetadataFromPdf

    extractor = new HybridAiExtractor(mockAi as any, {
      geminiApiKey: 'test-api-key',
    })
  })

  describe('extractFromImage', () => {
    it('should use Cloudflare AI when confidence is high', async () => {
      const cloudflareResult = {
        title: 'Cloudflare Title',
        composer: 'Cloudflare Composer',
        confidence: 0.85,
        provider: 'cloudflare',
        visualFeatures: {
          notationType: 'standard',
          staffCount: 2,
        },
      }

      mockCloudflareExtractor.extractFromImage.mockResolvedValue(
        cloudflareResult
      )

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await extractor.extractFromImage(request)

      expect(mockCloudflareExtractor.extractFromImage).toHaveBeenCalledWith(
        request
      )
      expect(mockExtractMetadataFromPdf).not.toHaveBeenCalled()

      expect(result).toMatchObject({
        title: 'Cloudflare Title',
        composer: 'Cloudflare Composer',
        provider: 'hybrid',
        mergedConfidence: 0.85,
        cloudflareResult,
      })
    })

    it('should use both providers with cross-validation enabled', async () => {
      const cloudflareResult = {
        title: 'Cloudflare Title',
        composer: 'Beethoven',
        instrument: 'Piano',
        difficulty: 7,
        confidence: 0.8,
        provider: 'cloudflare',
      }

      const geminiResult = {
        title: 'Gemini Title',
        composer: 'Ludwig van Beethoven',
        instrument: 'Piano',
        difficultyLevel: 8,
        year: 1801,
      }

      mockCloudflareExtractor.extractFromImage.mockResolvedValue(
        cloudflareResult
      )
      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const hybridExtractor = new HybridAiExtractor(mockAi as any, {
        geminiApiKey: 'test-api-key',
        enableCrossValidation: true,
      })

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await hybridExtractor.extractFromImage(request)

      expect(mockCloudflareExtractor.extractFromImage).toHaveBeenCalled()
      expect(mockExtractMetadataFromPdf).toHaveBeenCalled()

      expect(result.provider).toBe('hybrid')
      expect(result.cloudflareResult).toBeDefined()
      expect(result.geminiResult).toBeDefined()
      expect(result.discrepancies).toContain(
        'title: Cloudflare="Cloudflare Title", Gemini="Gemini Title"'
      )
      expect(result.discrepancies).toContain(
        'composer: Cloudflare="Beethoven", Gemini="Ludwig van Beethoven"'
      )
      expect(result.discrepancies).toContain(
        'difficulty: Cloudflare=7, Gemini=8'
      )

      // Should use longer composer name
      expect(result.composer).toBe('Ludwig van Beethoven')
      // Should average difficulty
      expect(result.difficulty).toBe(8) // Rounded from 7.5
      // Should include year from Gemini
      expect(result.year).toBe(1801)
    })

    it('should handle Cloudflare AI failure gracefully', async () => {
      mockCloudflareExtractor.extractFromImage.mockRejectedValue(
        new Error('Cloudflare AI error')
      )

      const geminiResult = {
        title: 'Gemini Title',
        composer: 'Composer',
        confidence: 0.7,
      }

      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const hybridExtractor = new HybridAiExtractor(mockAi as any, {
        geminiApiKey: 'test-api-key',
        enableCrossValidation: true,
      })

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await hybridExtractor.extractFromImage(request)

      expect(result.title).toBe('Gemini Title')
      expect(result.provider).toBe('hybrid')
      expect(result.cloudflareResult).toBeUndefined()
      expect(result.geminiResult).toBeDefined()
    })

    it('should handle both providers failing', async () => {
      mockCloudflareExtractor.extractFromImage.mockRejectedValue(
        new Error('Cloudflare AI error')
      )
      mockExtractMetadataFromPdf.mockRejectedValue(new Error('Gemini error'))

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await extractor.extractFromImage(request)

      expect(result.confidence).toBe(0)
      expect(result.mergedConfidence).toBe(0)
      expect(result.description).toBe('No AI extraction results available')
    })
  })

  describe('extractFromPdf', () => {
    it('should use Gemini for PDF analysis', async () => {
      const geminiResult = {
        title: 'PDF Title',
        composer: 'PDF Composer',
        instrument: 'Guitar',
        difficulty: 'intermediate',
        difficultyLevel: 5,
      }

      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const pdfBuffer = new ArrayBuffer(100)
      const result = await extractor.extractFromPdf(
        pdfBuffer,
        'http://example.com/score.pdf'
      )

      expect(mockExtractMetadataFromPdf).toHaveBeenCalledWith(
        pdfBuffer,
        'test-api-key',
        'http://example.com/score.pdf'
      )

      expect(result).toMatchObject({
        title: 'PDF Title',
        composer: 'PDF Composer',
        instrument: 'Guitar',
        provider: 'hybrid',
        geminiResult: expect.objectContaining({
          title: 'PDF Title',
          provider: 'gemini',
        }),
      })
    })

    it('should handle PDF extraction without Gemini API key', async () => {
      const extractorNoGemini = new HybridAiExtractor(mockAi as any)

      const pdfBuffer = new ArrayBuffer(100)
      const result = await extractorNoGemini.extractFromPdf(pdfBuffer)

      expect(mockExtractMetadataFromPdf).not.toHaveBeenCalled()
      expect(result.confidence).toBe(0.8)
      expect(result.description).toBe(
        'Metadata will be extracted via visual analysis during PDF processing'
      )
    })
  })

  describe('merging logic', () => {
    it('should merge tags from both providers', async () => {
      const cloudflareResult = {
        tags: ['piano', 'classical'],
        confidence: 0.8,
        provider: 'cloudflare',
      }

      const geminiResult = {
        tags: ['classical', 'sonata'],
      }

      mockCloudflareExtractor.extractFromImage.mockResolvedValue(
        cloudflareResult
      )
      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const hybridExtractor = new HybridAiExtractor(mockAi as any, {
        geminiApiKey: 'test-api-key',
        enableCrossValidation: true,
      })

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await hybridExtractor.extractFromImage(request)

      // Should have union of tags
      expect(result.tags).toContain('piano')
      expect(result.tags).toContain('classical')
      expect(result.tags).toContain('sonata')
      expect(result.tags?.length).toBe(3)
    })

    it('should prefer longer descriptions', async () => {
      const cloudflareResult = {
        description: 'Short description',
        confidence: 0.8,
        provider: 'cloudflare',
      }

      const geminiResult = {
        description:
          'This is a much longer and more detailed description of the piece',
      }

      mockCloudflareExtractor.extractFromImage.mockResolvedValue(
        cloudflareResult
      )
      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const hybridExtractor = new HybridAiExtractor(mockAi as any, {
        geminiApiKey: 'test-api-key',
        enableCrossValidation: true,
      })

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await hybridExtractor.extractFromImage(request)

      expect(result.description).toBe(
        'This is a much longer and more detailed description of the piece'
      )
    })

    it('should calculate merged confidence correctly', async () => {
      const cloudflareResult = {
        confidence: 0.8,
        provider: 'cloudflare',
      }

      const geminiResult = {
        // Gemini confidence calculated as 0.5 based on fields
        title: 'Title',
        composer: 'Composer',
      }

      mockCloudflareExtractor.extractFromImage.mockResolvedValue(
        cloudflareResult
      )
      mockExtractMetadataFromPdf.mockResolvedValue(geminiResult)

      const hybridExtractor = new HybridAiExtractor(mockAi as any, {
        geminiApiKey: 'test-api-key',
        enableCrossValidation: true,
      })

      const request: ImageAnalysisRequest = {
        imageData: 'base64image',
        mimeType: 'image/jpeg' as const,
        analysisType: 'score-metadata' as const,
      }

      const result = await hybridExtractor.extractFromImage(request)

      // Merged confidence = cloudflare * 0.6 + gemini * 0.4
      // 0.8 * 0.6 + 0.5 * 0.4 = 0.48 + 0.2 = 0.68
      expect(result.mergedConfidence).toBeCloseTo(0.68, 1)
    })
  })
})
