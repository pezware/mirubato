/**
 * PDF Text Extraction Service
 *
 * Extracts text content and metadata from PDF documents using pdfjs-dist.
 * Designed to work in Cloudflare Workers environment with appropriate fallbacks.
 *
 * @see https://github.com/pezware/mirubato/issues/676
 */

import * as pdfjs from 'pdfjs-dist'
import {
  PDFMetadata,
  PDFTextExtractionResult,
  PDFExtractionError,
} from '../types/ai'

// Configure PDF.js for Workers environment
// Disable worker thread since we're already in a Worker context
pdfjs.GlobalWorkerOptions.workerSrc = ''

export interface PDFTextExtractorOptions {
  /** Maximum number of pages to extract text from (default: 10) */
  maxPages?: number
  /** Whether to include page breaks in extracted text (default: true) */
  includePageBreaks?: boolean
  /** Timeout in milliseconds for extraction (default: 30000) */
  timeout?: number
}

const DEFAULT_OPTIONS: Required<PDFTextExtractorOptions> = {
  maxPages: 10,
  includePageBreaks: true,
  timeout: 30000,
}

/**
 * Extract text content and metadata from a PDF document
 *
 * @param pdfData - PDF document as ArrayBuffer or Uint8Array
 * @param options - Extraction options
 * @returns Extraction result with text, metadata, and status
 */
export async function extractTextFromPdf(
  pdfData: ArrayBuffer | Uint8Array,
  options?: PDFTextExtractorOptions
): Promise<PDFTextExtractionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    // Wrap the entire extraction in a timeout to protect against slow page extraction
    const extractionPromise = performExtraction(pdfData, opts)
    const result = await Promise.race([
      extractionPromise,
      createTimeout(opts.timeout),
    ])

    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during extraction'

    return {
      success: false,
      text: '',
      pageCount: 0,
      pagesExtracted: 0,
      metadata: {},
      hasEmbeddedText: false,
      extractionMethod: 'pdfjs',
      error: errorMessage,
      extractedAt: new Date().toISOString(),
    }
  }
}

/**
 * Internal function that performs the actual PDF extraction
 * Separated to allow timeout wrapper in extractTextFromPdf
 */
async function performExtraction(
  pdfData: ArrayBuffer | Uint8Array,
  opts: Required<PDFTextExtractorOptions>
): Promise<PDFTextExtractionResult> {
  // Convert to Uint8Array if needed
  const data =
    pdfData instanceof ArrayBuffer ? new Uint8Array(pdfData) : pdfData

  // Load the PDF document
  // Using specific options for Workers compatibility
  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
    // Disable range requests (not needed for in-memory data)
    disableRange: true,
    disableStream: true,
  })

  const pdf = await loadingTask.promise

  if (!pdf) {
    throw new PDFExtractionError(
      'PDF loading failed',
      'pdfjs',
      new Error('No PDF document returned')
    )
  }

  const pageCount = pdf.numPages
  const pagesToExtract = Math.min(pageCount, opts.maxPages)

  // Extract metadata
  const metadata = await extractPdfMetadata(pdf)

  // Extract text from pages
  const textParts: string[] = []
  let totalChars = 0

  for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Combine text items into a single string for this page
    const pageText = textContent.items
      .map(item => {
        // Type guard for TextItem (has 'str' property)
        if ('str' in item) {
          return item.str
        }
        return ''
      })
      .join(' ')
      .trim()

    if (pageText) {
      textParts.push(pageText)
      totalChars += pageText.length
    }

    if (opts.includePageBreaks && pageNum < pagesToExtract) {
      textParts.push('\n--- Page Break ---\n')
    }
  }

  const extractedText = textParts.join('\n').trim()
  const hasEmbeddedText = totalChars > 50 // Minimum threshold for meaningful text

  return {
    success: true,
    text: extractedText,
    pageCount,
    pagesExtracted: pagesToExtract,
    metadata,
    hasEmbeddedText,
    extractionMethod: 'pdfjs',
    extractedAt: new Date().toISOString(),
  }
}

/**
 * Extract metadata from a PDF document
 */
async function extractPdfMetadata(
  pdf: pdfjs.PDFDocumentProxy
): Promise<PDFMetadata> {
  try {
    const metadataResult = await pdf.getMetadata()
    const info = metadataResult.info as Record<string, unknown>

    return {
      title: normalizeMetadataString(info?.Title),
      author: normalizeMetadataString(info?.Author),
      subject: normalizeMetadataString(info?.Subject),
      keywords: normalizeMetadataString(info?.Keywords),
      creator: normalizeMetadataString(info?.Creator),
      producer: normalizeMetadataString(info?.Producer),
      creationDate: parseMetadataDate(info?.CreationDate),
      modificationDate: parseMetadataDate(info?.ModDate),
    }
  } catch (error) {
    console.warn('Failed to extract PDF metadata:', error)
    return {}
  }
}

/**
 * Normalize metadata string values
 */
function normalizeMetadataString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return undefined
}

/**
 * Parse PDF date format to JavaScript Date
 * PDF dates are typically in format: D:YYYYMMDDHHmmSSOHH'mm'
 */
function parseMetadataDate(value: unknown): Date | undefined {
  if (!value || typeof value !== 'string') {
    return undefined
  }

  try {
    // Remove 'D:' prefix if present
    const dateStr = value.startsWith('D:') ? value.slice(2) : value

    // Basic parsing of PDF date format
    // Format: YYYYMMDDHHmmSS with optional timezone
    const year = parseInt(dateStr.slice(0, 4), 10)
    const month = parseInt(dateStr.slice(4, 6), 10) - 1
    const day = parseInt(dateStr.slice(6, 8), 10)
    const hour = parseInt(dateStr.slice(8, 10), 10) || 0
    const minute = parseInt(dateStr.slice(10, 12), 10) || 0
    const second = parseInt(dateStr.slice(12, 14), 10) || 0

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return undefined
    }

    return new Date(year, month, day, hour, minute, second)
  } catch {
    return undefined
  }
}

/**
 * Create a timeout promise for race conditions
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`))
    }, ms)
  })
}

/**
 * Extract text from the first page only (for quick metadata extraction)
 */
export async function extractFirstPageText(
  pdfData: ArrayBuffer | Uint8Array
): Promise<string> {
  const result = await extractTextFromPdf(pdfData, {
    maxPages: 1,
    includePageBreaks: false,
    timeout: 10000,
  })

  return result.text
}

/**
 * Check if a PDF has extractable text content
 */
export async function hasExtractableText(
  pdfData: ArrayBuffer | Uint8Array
): Promise<boolean> {
  const result = await extractTextFromPdf(pdfData, {
    maxPages: 1,
    includePageBreaks: false,
    timeout: 5000,
  })

  return result.hasEmbeddedText
}

/**
 * PDFTextExtractor class for more control over extraction
 */
export class PDFTextExtractor {
  private options: Required<PDFTextExtractorOptions>

  constructor(options?: PDFTextExtractorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async extract(
    pdfData: ArrayBuffer | Uint8Array
  ): Promise<PDFTextExtractionResult> {
    return extractTextFromPdf(pdfData, this.options)
  }

  async extractFirstPage(pdfData: ArrayBuffer | Uint8Array): Promise<string> {
    return extractFirstPageText(pdfData)
  }

  async hasText(pdfData: ArrayBuffer | Uint8Array): Promise<boolean> {
    return hasExtractableText(pdfData)
  }
}
