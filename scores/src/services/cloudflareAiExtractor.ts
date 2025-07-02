import { Ai } from '@cloudflare/workers-types'
import {
  AiExtractionError,
  CloudflareAiOptions,
  ImageAnalysisRequest,
  ImageAnalysisResult,
} from '../types/ai'

export class CloudflareAiExtractor {
  private ai: Ai
  private defaultOptions: CloudflareAiOptions = {
    model: '@cf/meta/llama-3.2-11b-vision-instruct',
    maxTokens: 500,
    temperature: 0.1, // Low temperature for consistent extraction
  }

  constructor(ai: Ai, options?: Partial<CloudflareAiOptions>) {
    this.ai = ai
    if (options) {
      this.defaultOptions = { ...this.defaultOptions, ...options }
    }
  }

  async extractFromImage(
    request: ImageAnalysisRequest
  ): Promise<ImageAnalysisResult> {
    try {
      // Prepare the image data URL
      const imageDataUrl = request.imageData.startsWith('data:')
        ? request.imageData
        : `data:${request.mimeType};base64,${request.imageData}`

      // Create the prompt based on analysis type
      const prompt = this.createPrompt(request.analysisType)

      // Call Cloudflare AI
      const response = await this.ai.run(this.defaultOptions.model!, {
        messages: [
          {
            role: 'user',
            content: prompt,
            image: imageDataUrl,
          },
        ],
        max_tokens: this.defaultOptions.maxTokens,
        temperature: this.defaultOptions.temperature,
      })

      // Parse the response
      return this.parseResponse(response, request.analysisType)
    } catch (error) {
      throw new AiExtractionError(
        `Cloudflare AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'cloudflare',
        error instanceof Error ? error : undefined
      )
    }
  }

  private createPrompt(analysisType: string): string {
    const basePrompt = `You are a music score analysis expert. Analyze this sheet music image and extract the following information in JSON format:`

    switch (analysisType) {
      case 'score-metadata':
        return `${basePrompt}
{
  "title": "exact title from the score",
  "composer": "composer name",
  "arranger": "arranger if different from composer",
  "instrument": "primary instrument (Piano, Guitar, Violin, etc.)",
  "difficulty": "estimated difficulty 1-10",
  "year": "composition year if visible",
  "stylePeriod": "Baroque, Classical, Romantic, Modern, Contemporary, Popular",
  "tags": ["relevant", "musical", "tags"],
  "description": "brief description of the piece",
  "visualFeatures": {
    "notationType": "standard, tablature, chord-chart, or lead-sheet",
    "staffCount": number of staves,
    "hasLyrics": true/false,
    "hasFingerings": true/false,
    "hasDynamics": true/false,
    "complexity": "simple, moderate, or complex",
    "isHandwritten": true/false
  }
}

Be precise and only include information that is clearly visible in the image.`

      case 'quality-check':
        return `${basePrompt}
{
  "quality": "excellent, good, fair, or poor",
  "issues": ["list any quality issues like blur, cutoff, skew"],
  "readability": "percentage 0-100",
  "recommendations": ["suggestions for improvement"]
}

Focus on the scan quality and readability of the score.`

      case 'notation-density':
        return `${basePrompt}
{
  "noteDensity": "sparse, moderate, or dense",
  "averageNotesPerMeasure": estimated number,
  "tempoIndication": "tempo marking if visible",
  "technicalElements": ["list technical requirements like scales, arpeggios, chords"],
  "sightReadingDifficulty": "beginner, intermediate, advanced, or expert"
}

Analyze the complexity and density of the musical notation.`

      default:
        return basePrompt
    }
  }

  private parseResponse(
    response: unknown,
    _analysisType: string
  ): ImageAnalysisResult {
    try {
      // Extract JSON from the response
      let parsedData: Record<string, unknown>
      const responseRecord = response as Record<string, unknown>
      const choices = responseRecord?.choices as
        | Array<{ message?: { content?: string } }>
        | undefined
      const responseText = String(
        responseRecord?.response || choices?.[0]?.message?.content || ''
      )

      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try to parse the entire response
        parsedData = JSON.parse(responseText)
      }

      // Map to our result structure
      const result: ImageAnalysisResult = {
        title: parsedData.title as string | undefined,
        composer: (parsedData.composer || parsedData.arranger) as
          | string
          | undefined,
        instrument: parsedData.instrument as string | undefined,
        difficulty: parsedData.difficulty as number | undefined,
        difficultyLabel: this.getDifficultyLabel(
          parsedData.difficulty as number | undefined
        ),
        year: parsedData.year as number | undefined,
        stylePeriod: parsedData.stylePeriod as string | undefined,
        tags: (parsedData.tags as string[]) || [],
        description: parsedData.description as string | undefined,
        confidence: this.calculateConfidence(parsedData),
        provider: 'cloudflare',
        visualFeatures:
          parsedData.visualFeatures as ImageAnalysisResult['visualFeatures'],
        rawResponse: response,
      }

      return result
    } catch (error) {
      console.error('Failed to parse Cloudflare AI response:', error)
      // Return minimal result with low confidence
      return {
        confidence: 0.1,
        provider: 'cloudflare',
        rawResponse: response,
        description: 'Failed to parse AI response',
        tags: [],
      }
    }
  }

  private calculateConfidence(data: Record<string, unknown>): number {
    let confidence = 0
    let fields = 0

    // Check each field and add to confidence
    const title = data.title as string | undefined
    if (title && title.length > 0) {
      confidence += 0.2
      fields++
    }

    const composer = data.composer as string | undefined
    if (composer && composer.length > 0) {
      confidence += 0.2
      fields++
    }

    const instrument = data.instrument as string | undefined
    if (instrument && instrument.length > 0) {
      confidence += 0.15
      fields++
    }

    const difficulty = data.difficulty as number | undefined
    if (difficulty && difficulty >= 1 && difficulty <= 10) {
      confidence += 0.15
      fields++
    }

    const visualFeatures = data.visualFeatures as
      | Record<string, unknown>
      | undefined
    if (visualFeatures && Object.keys(visualFeatures).length > 3) {
      confidence += 0.15
      fields++
    }

    const tags = data.tags as unknown[]
    if (tags && Array.isArray(tags) && tags.length > 0) {
      confidence += 0.1
      fields++
    }

    const description = data.description as string | undefined
    if (description && description.length > 10) {
      confidence += 0.05
      fields++
    }

    // Normalize confidence based on fields found
    return fields > 0 ? Math.min(confidence, 1) : 0.1
  }

  private getDifficultyLabel(difficulty?: number): string | undefined {
    if (!difficulty) return undefined

    if (difficulty <= 2) return 'Beginner'
    if (difficulty <= 4) return 'Easy'
    if (difficulty <= 6) return 'Intermediate'
    if (difficulty <= 8) return 'Advanced'
    return 'Expert'
  }

  // Utility method to convert PDF page to image if needed
  async convertPdfPageToImage(
    _pdfData: ArrayBuffer,
    _pageNumber: number = 1
  ): Promise<{ imageData: string; mimeType: 'image/png' }> {
    // This would need to be implemented using PDF.js or similar
    // For now, throw an error indicating this needs external processing
    throw new Error(
      'PDF to image conversion requires external processing (e.g., Puppeteer)'
    )
  }
}
