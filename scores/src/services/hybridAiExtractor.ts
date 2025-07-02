import { Ai } from '@cloudflare/workers-types'
import { CloudflareAiExtractor } from './cloudflareAiExtractor'
import { extractMetadataFromPdf } from './aiMetadataExtractor'
import { HybridAnalysisResult, ImageAnalysisRequest } from '../types/ai'

export interface HybridAiOptions {
  preferCloudflare?: boolean // Use Cloudflare AI as primary (cost-effective)
  geminiApiKey?: string
  confidenceThreshold?: number // Minimum confidence to accept single provider result
  enableCrossValidation?: boolean // Compare results from both providers
}

export class HybridAiExtractor {
  private cloudflareExtractor: CloudflareAiExtractor
  private geminiApiKey?: string
  private options: Required<HybridAiOptions>

  constructor(ai: Ai, options?: HybridAiOptions) {
    this.cloudflareExtractor = new CloudflareAiExtractor(ai)
    this.geminiApiKey = options?.geminiApiKey
    this.options = {
      preferCloudflare: true,
      geminiApiKey: options?.geminiApiKey || '',
      confidenceThreshold: 0.7,
      enableCrossValidation: false,
      ...options,
    } as Required<HybridAiOptions>
  }

  async extractFromPdf(
    pdfData: ArrayBuffer,
    url?: string
  ): Promise<HybridAnalysisResult> {
    const results: HybridAnalysisResult = {
      confidence: 0,
      provider: 'hybrid',
      mergedConfidence: 0,
      discrepancies: [],
      tags: [],
    }

    try {
      // If we only have Cloudflare AI (no Gemini), we'll rely on visual analysis during PDF processing
      if (!this.geminiApiKey) {
        // Return a result indicating Cloudflare-only mode
        // Visual analysis will happen during PDF rendering in the queue processor
        return {
          ...results,
          provider: 'cloudflare',
          confidence: 0.8, // Default confidence for Cloudflare-only mode
          description:
            'Metadata will be extracted via visual analysis during PDF processing',
          title: url ? this.extractTitleFromUrl(url) : undefined,
        }
      }

      // If we prefer Cloudflare and don't need cross-validation, still use Gemini as backup
      if (
        this.options.preferCloudflare &&
        !this.options.enableCrossValidation &&
        this.geminiApiKey
      ) {
        try {
          const geminiResult = await extractMetadataFromPdf(
            pdfData,
            this.geminiApiKey,
            url
          )
          results.geminiResult = {
            ...geminiResult,
            difficulty: geminiResult.difficultyLevel, // Use numeric difficulty
            confidence: this.calculateGeminiConfidence(geminiResult),
            provider: 'gemini',
            tags: geminiResult.tags || [],
          }
        } catch (error) {
          console.error('Gemini extraction failed:', error)
        }
      }

      // Merge results
      return this.mergeResults(results)
    } catch (error) {
      console.error('Hybrid extraction failed:', error)
      return results
    }
  }

  async extractFromImage(
    request: ImageAnalysisRequest
  ): Promise<HybridAnalysisResult> {
    const results: HybridAnalysisResult = {
      confidence: 0,
      provider: 'hybrid',
      mergedConfidence: 0,
      discrepancies: [],
      tags: [],
    }

    try {
      // Always try Cloudflare AI for images (it's optimized for this)
      try {
        const cloudflareResult =
          await this.cloudflareExtractor.extractFromImage(request)
        results.cloudflareResult = cloudflareResult

        // If confidence is high enough and we don't need cross-validation, return early
        if (
          cloudflareResult.confidence >= this.options.confidenceThreshold &&
          !this.options.enableCrossValidation
        ) {
          return {
            ...cloudflareResult,
            provider: 'hybrid',
            mergedConfidence: cloudflareResult.confidence,
            cloudflareResult,
          }
        }
      } catch (error) {
        console.error('Cloudflare AI extraction failed:', error)
      }

      // If we need cross-validation or Cloudflare failed/low confidence, try Gemini
      if (this.geminiApiKey && this.options.enableCrossValidation) {
        try {
          // Convert image to format Gemini expects
          const imageBuffer = this.base64ToArrayBuffer(request.imageData)
          const geminiResult = await extractMetadataFromPdf(
            imageBuffer,
            this.geminiApiKey
          )
          results.geminiResult = {
            ...geminiResult,
            difficulty: geminiResult.difficultyLevel, // Use numeric difficulty
            confidence: this.calculateGeminiConfidence(geminiResult),
            provider: 'gemini',
            tags: geminiResult.tags || [],
          }
        } catch (error) {
          console.error('Gemini extraction failed:', error)
        }
      }

      // Merge results
      return this.mergeResults(results)
    } catch (error) {
      console.error('Hybrid extraction failed:', error)
      return results
    }
  }

  private mergeResults(results: HybridAnalysisResult): HybridAnalysisResult {
    const { cloudflareResult, geminiResult } = results

    // If only one result is available, use it
    if (!cloudflareResult && geminiResult) {
      return {
        ...geminiResult,
        provider: 'hybrid',
        mergedConfidence: geminiResult.confidence,
        geminiResult,
      }
    }

    if (cloudflareResult && !geminiResult) {
      return {
        ...cloudflareResult,
        provider: 'hybrid',
        mergedConfidence: cloudflareResult.confidence,
        cloudflareResult,
      }
    }

    // If both results are available, merge them
    if (cloudflareResult && geminiResult) {
      const merged: HybridAnalysisResult = {
        provider: 'hybrid',
        cloudflareResult,
        geminiResult,
        discrepancies: [],
        confidence: 0,
        mergedConfidence: 0,
        tags: [],
      }

      // Compare and merge fields
      merged.title = this.selectBestValue(
        cloudflareResult.title,
        geminiResult.title,
        'title',
        merged.discrepancies
      )
      merged.composer = this.selectBestValue(
        cloudflareResult.composer,
        geminiResult.composer,
        'composer',
        merged.discrepancies
      )
      merged.instrument = this.selectBestValue(
        cloudflareResult.instrument,
        geminiResult.instrument,
        'instrument',
        merged.discrepancies
      )
      merged.difficulty = this.selectBestNumber(
        cloudflareResult.difficulty,
        geminiResult.difficulty,
        'difficulty',
        merged.discrepancies
      )
      merged.year = this.selectBestNumber(
        cloudflareResult.year,
        geminiResult.year,
        'year',
        merged.discrepancies
      )
      merged.stylePeriod = this.selectBestValue(
        cloudflareResult.stylePeriod,
        geminiResult.stylePeriod,
        'stylePeriod',
        merged.discrepancies
      )

      // Merge tags (union of both)
      const allTags = new Set([
        ...(cloudflareResult.tags || []),
        ...(geminiResult.tags || []),
      ])
      merged.tags = Array.from(allTags)

      // Use the longer description
      merged.description =
        (cloudflareResult.description?.length || 0) >
        (geminiResult.description?.length || 0)
          ? cloudflareResult.description
          : geminiResult.description

      // Calculate merged confidence
      merged.mergedConfidence =
        cloudflareResult.confidence * 0.6 + geminiResult.confidence * 0.4

      // If we have visual features from Cloudflare, include them
      if (
        'visualFeatures' in cloudflareResult &&
        cloudflareResult.visualFeatures
      ) {
        merged.visualFeatures = cloudflareResult.visualFeatures
      }

      merged.confidence = merged.mergedConfidence
      return merged
    }

    // No results available
    return {
      ...results,
      confidence: 0,
      mergedConfidence: 0,
      description: 'No AI extraction results available',
    }
  }

  private selectBestValue(
    value1: string | undefined,
    value2: string | undefined,
    fieldName: string,
    discrepancies?: string[]
  ): string | undefined {
    if (!value1) return value2
    if (!value2) return value1
    if (value1 === value2) return value1

    // Values differ - record discrepancy
    if (discrepancies) {
      discrepancies.push(
        `${fieldName}: Cloudflare="${value1}", Gemini="${value2}"`
      )
    }

    // Prefer non-empty, longer values
    if (value1.length > value2.length) return value1
    return value2
  }

  private selectBestNumber(
    value1: number | undefined,
    value2: number | undefined,
    fieldName: string,
    discrepancies?: string[]
  ): number | undefined {
    if (value1 === undefined) return value2
    if (value2 === undefined) return value1
    if (value1 === value2) return value1

    // Values differ - record discrepancy
    if (discrepancies) {
      discrepancies.push(`${fieldName}: Cloudflare=${value1}, Gemini=${value2}`)
    }

    // For difficulty, average them
    if (fieldName === 'difficulty') {
      return Math.round((value1 + value2) / 2)
    }

    // For year, prefer the one that seems more reasonable
    if (fieldName === 'year') {
      const currentYear = new Date().getFullYear()
      if (value1 > 1400 && value1 <= currentYear) return value1
      if (value2 > 1400 && value2 <= currentYear) return value2
    }

    return value1
  }

  private calculateGeminiConfidence(result: Record<string, unknown>): number {
    let confidence = 0
    let fields = 0

    if (result.title) {
      confidence += 0.25
      fields++
    }
    if (result.composer) {
      confidence += 0.25
      fields++
    }
    if (result.instrument) {
      confidence += 0.2
      fields++
    }
    if (result.difficulty) {
      confidence += 0.15
      fields++
    }
    const tags = result.tags as string[] | undefined
    if (tags && tags.length > 0) {
      confidence += 0.1
      fields++
    }
    if (result.description) {
      confidence += 0.05
      fields++
    }

    return fields > 0 ? Math.min(confidence, 1) : 0.1
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  private extractTitleFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop() || ''

      // Remove file extension and clean up
      const title = filename
        .replace(/\.(pdf|PDF)$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())

      return title || undefined
    } catch {
      return undefined
    }
  }
}
