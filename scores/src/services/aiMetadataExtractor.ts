import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

export interface ExtractedMetadata {
  title?: string
  subtitle?: string
  composer?: string
  opus?: string
  instrument?: string
  difficulty?: string
  difficultyLevel?: number
  year?: number
  stylePeriod?: string
  tags?: string[]
  description?: string
  extractedAt: string
  confidence: number
  error?: string
  [key: string]: unknown // Add index signature
}

export class AiMetadataExtractor {
  private genAI: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null
  private isInitialized = false

  constructor(private apiKey?: string) {
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey)
        // Using Gemini 1.5 Pro for better accuracy with sheet music analysis
        // Cost: ~$8 per 1000 PDFs vs $1 for Flash, but much better accuracy
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
        this.isInitialized = true
      } catch (error) {
        console.error('Failed to initialize Gemini AI:', error)
      }
    }
  }

  // Test AI connectivity with a simple prompt
  async ping(): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.model) {
      return { success: false, error: 'AI not initialized' }
    }

    try {
      const result = await this.model.generateContent(
        'Hello, please respond with "pong"'
      )
      const response = await result.response
      // Validate response exists
      response.text()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI ping failed',
      }
    }
  }

  async extractFromPdf(
    pdfBytes: Uint8Array,
    sourceUrl: string
  ): Promise<ExtractedMetadata> {
    // If AI is not available, fall back to URL-based extraction
    if (!this.isInitialized || !this.model) {
      return this.fallbackExtraction(sourceUrl)
    }

    try {
      const base64Pdf = Buffer.from(pdfBytes).toString('base64')

      const prompt = `Analyze this sheet music PDF and extract the following information:
1. Title of the piece
2. Subtitle (if any)
3. Composer name
4. Opus number or catalog number (if any)
5. Instrument (PIANO or GUITAR)
6. Difficulty level (BEGINNER, INTERMEDIATE, or ADVANCED)
7. Estimated difficulty on scale 1-10
8. Year of composition (if visible)
9. Style period (BAROQUE, CLASSICAL, ROMANTIC, MODERN, or CONTEMPORARY)
10. Relevant tags (e.g., sonata, waltz, study, prelude)
11. Brief educational description (1-2 sentences)

Return the information in JSON format. If you cannot determine a field, use null.
Example response:
{
  "title": "Moonlight Sonata",
  "subtitle": "Sonata No. 14 in C# minor",
  "composer": "Ludwig van Beethoven",
  "opus": "Op. 27, No. 2",
  "instrument": "PIANO",
  "difficulty": "INTERMEDIATE",
  "difficultyLevel": 6,
  "year": 1801,
  "stylePeriod": "CLASSICAL",
  "tags": ["sonata", "classical", "romantic"],
  "description": "A beloved piano sonata known for its hauntingly beautiful first movement."
}`

      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
        prompt,
      ])

      const response = await result.response
      const text = response.text()

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const extracted = JSON.parse(jsonMatch[0])

      return {
        title: extracted.title || undefined,
        subtitle: extracted.subtitle || undefined,
        composer: extracted.composer || undefined,
        opus: extracted.opus || undefined,
        instrument: extracted.instrument || 'PIANO',
        difficulty: extracted.difficulty || 'INTERMEDIATE',
        difficultyLevel: extracted.difficultyLevel || 5,
        year: extracted.year || undefined,
        stylePeriod: extracted.stylePeriod || undefined,
        tags: extracted.tags || [],
        description: extracted.description || undefined,
        extractedAt: new Date().toISOString(),
        confidence: 0.8, // High confidence for AI extraction
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
      // Fall back to URL-based extraction
      const fallback = this.fallbackExtraction(sourceUrl)
      return {
        ...fallback,
        error: 'AI extraction failed, used fallback',
      }
    }
  }

  private fallbackExtraction(sourceUrl: string): ExtractedMetadata {
    const urlLower = sourceUrl.toLowerCase()
    const isGuitar = urlLower.includes('guitar') || urlLower.includes('gtr')

    // Extract potential title from URL
    const urlParts =
      sourceUrl.split('/').pop()?.replace('.pdf', '') || 'Unknown'
    const titleParts = urlParts
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))

    return {
      title: titleParts.join(' '),
      composer: 'Unknown',
      instrument: isGuitar ? 'GUITAR' : 'PIANO',
      difficulty: 'INTERMEDIATE',
      difficultyLevel: 5,
      tags: [isGuitar ? 'guitar' : 'piano', 'imported', 'public-domain'],
      description: `Imported from ${new URL(sourceUrl).hostname}`,
      extractedAt: new Date().toISOString(),
      confidence: 0.3, // Low confidence for fallback
    }
  }

  // Check if AI is available
  isAvailable(): boolean {
    return this.isInitialized
  }
}

// Export helper function for backward compatibility
export async function extractMetadataFromPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  apiKey?: string,
  sourceUrl?: string
): Promise<ExtractedMetadata> {
  const extractor = new AiMetadataExtractor(apiKey)
  const uint8Array =
    pdfBytes instanceof ArrayBuffer ? new Uint8Array(pdfBytes) : pdfBytes
  return extractor.extractFromPdf(uint8Array, sourceUrl || '')
}
