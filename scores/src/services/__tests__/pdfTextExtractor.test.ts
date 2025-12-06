import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractTextFromPdf,
  extractFirstPageText,
  hasExtractableText,
  PDFTextExtractor,
} from '../pdfTextExtractor'

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    getDocument: vi.fn(),
  }
})

import * as pdfjs from 'pdfjs-dist'

describe('pdfTextExtractor', () => {
  let mockPdfDocument: any
  let mockPage: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Setup mock page
    mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [
          { str: 'Moonlight Sonata' },
          { str: 'Ludwig van Beethoven' },
          { str: 'Piano Sheet Music' },
        ],
      }),
    }

    // Setup mock document
    mockPdfDocument = {
      numPages: 3,
      getPage: vi.fn().mockResolvedValue(mockPage),
      getMetadata: vi.fn().mockResolvedValue({
        info: {
          Title: 'Moonlight Sonata',
          Author: 'Ludwig van Beethoven',
          Subject: 'Piano Music',
          Keywords: 'classical, piano, sonata',
          Creator: 'Notation Software',
          Producer: 'PDF Producer',
          CreationDate: 'D:20240101120000',
          ModDate: 'D:20240615150000',
        },
      }),
    }

    // Setup getDocument mock
    vi.mocked(pdfjs.getDocument).mockReturnValue({
      promise: Promise.resolve(mockPdfDocument),
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('extractTextFromPdf', () => {
    it('should extract text from PDF successfully', async () => {
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.text).toContain('Moonlight Sonata')
      expect(result.text).toContain('Ludwig van Beethoven')
      expect(result.pageCount).toBe(3)
      expect(result.pagesExtracted).toBe(3) // All pages since numPages < maxPages
      expect(result.extractionMethod).toBe('pdfjs')
      expect(result.hasEmbeddedText).toBe(true)
    })

    it('should extract PDF metadata', async () => {
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.metadata.title).toBe('Moonlight Sonata')
      expect(result.metadata.author).toBe('Ludwig van Beethoven')
      expect(result.metadata.subject).toBe('Piano Music')
      expect(result.metadata.keywords).toBe('classical, piano, sonata')
      expect(result.metadata.creator).toBe('Notation Software')
      expect(result.metadata.producer).toBe('PDF Producer')
      expect(result.metadata.creationDate).toBeInstanceOf(Date)
      expect(result.metadata.modificationDate).toBeInstanceOf(Date)
    })

    it('should respect maxPages option', async () => {
      mockPdfDocument.numPages = 20

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData, { maxPages: 5 })
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.pageCount).toBe(20)
      expect(result.pagesExtracted).toBe(5)
      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(5)
    })

    it('should include page breaks when option is enabled', async () => {
      mockPdfDocument.numPages = 2
      mockPdfDocument.getPage.mockImplementation((pageNum: number) => ({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: `Page ${pageNum} content` }],
        }),
      }))

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData, {
        includePageBreaks: true,
      })
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.text).toContain('--- Page Break ---')
    })

    it('should not include page breaks when option is disabled', async () => {
      mockPdfDocument.numPages = 2
      mockPdfDocument.getPage.mockImplementation((pageNum: number) => ({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: `Page ${pageNum} content` }],
        }),
      }))

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData, {
        includePageBreaks: false,
      })
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.text).not.toContain('--- Page Break ---')
    })

    it('should detect when PDF has no embedded text', async () => {
      mockPage.getTextContent.mockResolvedValue({
        items: [{ str: '' }, { str: '   ' }],
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.hasEmbeddedText).toBe(false)
    })

    it('should handle PDF loading errors gracefully', async () => {
      vi.mocked(pdfjs.getDocument).mockReturnValue({
        promise: Promise.reject(new Error('Invalid PDF')),
      } as any)

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid PDF')
      expect(result.text).toBe('')
      expect(result.hasEmbeddedText).toBe(false)
    })

    it('should handle metadata extraction errors gracefully', async () => {
      mockPdfDocument.getMetadata.mockRejectedValue(
        new Error('Metadata extraction failed')
      )

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.metadata).toEqual({})
    })

    it('should handle ArrayBuffer input', async () => {
      const pdfData = new ArrayBuffer(100)

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(pdfjs.getDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Uint8Array),
        })
      )
    })

    it('should handle text items without str property', async () => {
      mockPage.getTextContent.mockResolvedValue({
        items: [
          { str: 'Valid text' },
          { transform: [1, 0, 0, 1, 0, 0] }, // MarkedContent item without str
          { str: 'More text' },
        ],
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.text).toContain('Valid text')
      expect(result.text).toContain('More text')
    })

    it('should configure pdfjs for Workers environment', async () => {
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      await resultPromise

      expect(pdfjs.getDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: false,
          disableRange: true,
          disableStream: true,
        })
      )
    })
  })

  describe('extractFirstPageText', () => {
    it('should extract text from first page only', async () => {
      mockPdfDocument.numPages = 10

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractFirstPageText(pdfData)
      await vi.runAllTimersAsync()
      const text = await resultPromise

      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(1)
      expect(mockPdfDocument.getPage).toHaveBeenCalledWith(1)
      expect(text).toContain('Moonlight Sonata')
    })

    it('should return empty string on error', async () => {
      vi.mocked(pdfjs.getDocument).mockReturnValue({
        promise: Promise.reject(new Error('PDF error')),
      } as any)

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractFirstPageText(pdfData)
      await vi.runAllTimersAsync()
      const text = await resultPromise

      expect(text).toBe('')
    })
  })

  describe('hasExtractableText', () => {
    it('should return true when PDF has extractable text', async () => {
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = hasExtractableText(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe(true)
    })

    it('should return false when PDF has no extractable text', async () => {
      mockPage.getTextContent.mockResolvedValue({
        items: [],
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = hasExtractableText(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe(false)
    })
  })

  describe('PDFTextExtractor class', () => {
    it('should use custom options', async () => {
      const extractor = new PDFTextExtractor({
        maxPages: 2,
        includePageBreaks: false,
      })

      mockPdfDocument.numPages = 5

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractor.extract(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.pagesExtracted).toBe(2)
      expect(result.text).not.toContain('--- Page Break ---')
    })

    it('should provide extractFirstPage method', async () => {
      const extractor = new PDFTextExtractor()
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractor.extractFirstPage(pdfData)
      await vi.runAllTimersAsync()
      const text = await resultPromise

      expect(text).toContain('Moonlight Sonata')
    })

    it('should provide hasText method', async () => {
      const extractor = new PDFTextExtractor()
      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractor.hasText(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe(true)
    })
  })

  describe('metadata date parsing', () => {
    it('should parse PDF date format correctly', async () => {
      mockPdfDocument.getMetadata.mockResolvedValue({
        info: {
          CreationDate: 'D:20240315143022',
        },
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      const creationDate = result.metadata.creationDate
      expect(creationDate).toBeInstanceOf(Date)
      expect(creationDate?.getFullYear()).toBe(2024)
      expect(creationDate?.getMonth()).toBe(2) // March (0-indexed)
      expect(creationDate?.getDate()).toBe(15)
    })

    it('should handle invalid date format', async () => {
      mockPdfDocument.getMetadata.mockResolvedValue({
        info: {
          CreationDate: 'invalid-date',
        },
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.metadata.creationDate).toBeUndefined()
    })

    it('should handle missing date fields', async () => {
      mockPdfDocument.getMetadata.mockResolvedValue({
        info: {
          Title: 'Test',
        },
      })

      const pdfData = new Uint8Array([1, 2, 3, 4])

      const resultPromise = extractTextFromPdf(pdfData)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.metadata.creationDate).toBeUndefined()
      expect(result.metadata.modificationDate).toBeUndefined()
    })
  })
})
