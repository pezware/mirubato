// AI-related types and interfaces

export interface AiMetadataResult {
  title?: string
  subtitle?: string
  composer?: string
  opus?: string
  instrument?: string
  difficulty?: number
  difficultyLabel?: string
  year?: number
  stylePeriod?: string
  tags: string[]
  description?: string
  confidence: number
  provider: 'cloudflare' | 'gemini' | 'hybrid'
  rawResponse?: unknown
  visualFeatures?: {
    notationType?: 'standard' | 'tablature' | 'chord-chart' | 'lead-sheet'
    staffCount?: number
    hasLyrics?: boolean
    hasFingerings?: boolean
    hasDynamics?: boolean
    complexity?: 'simple' | 'moderate' | 'complex'
    quality?: 'excellent' | 'good' | 'fair' | 'poor'
    isHandwritten?: boolean
  }
}

export interface ImageAnalysisRequest {
  imageData: string // base64 encoded image
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  analysisType: 'score-metadata' | 'quality-check' | 'notation-density'
}

export interface ImageAnalysisResult extends AiMetadataResult {
  visualFeatures?: {
    notationType?: 'standard' | 'tablature' | 'chord-chart' | 'lead-sheet'
    staffCount?: number
    hasLyrics?: boolean
    hasFingerings?: boolean
    hasDynamics?: boolean
    complexity?: 'simple' | 'moderate' | 'complex'
    quality?: 'excellent' | 'good' | 'fair' | 'poor'
    isHandwritten?: boolean
  }
}

export interface HybridAnalysisResult extends AiMetadataResult {
  cloudflareResult?: AiMetadataResult
  geminiResult?: AiMetadataResult
  mergedConfidence: number
  discrepancies?: string[]
  // Additional fields from hybrid processing
  visualFeatures?: AiMetadataResult['visualFeatures']
}

// Cloudflare AI model options
export interface CloudflareAiOptions {
  model?:
    | '@cf/meta/llama-3.2-11b-vision-instruct'
    | '@cf/llava-hf/llava-1.5-7b-hf'
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

// PDF text extraction types
export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
}

export interface PDFTextExtractionResult {
  success: boolean
  text: string
  pageCount: number
  pagesExtracted: number
  metadata: PDFMetadata
  hasEmbeddedText: boolean
  extractionMethod: 'pdfjs' | 'puppeteer' | 'fallback'
  error?: string
  extractedAt: string
}

// Error types
export class AiExtractionError extends Error {
  constructor(
    message: string,
    public provider: 'cloudflare' | 'gemini',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AiExtractionError'
  }
}

export class PDFExtractionError extends Error {
  constructor(
    message: string,
    public extractionMethod: 'pdfjs' | 'puppeteer' | 'fallback',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'PDFExtractionError'
  }
}
