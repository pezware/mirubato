/**
 * Dictionary Generator Service
 * Handles AI-powered generation and enhancement of dictionary entries
 */

import { Env } from '../../types/env'
import {
  DictionaryEntry,
  TermType,
  Definition,
  References,
  QualityScore,
  EntryMetadata,
} from '../../types/dictionary'
import { CloudflareAIService } from './cloudflare-ai-service'
import { PROMPT_TEMPLATES, selectModel } from '../../config/ai-models'
import { normalizeTerm } from '../../utils/validation'
// import { AIServiceError } from '../../utils/errors'

export interface GenerationOptions {
  term: string
  type: TermType
  lang?: string
  context?: {
    instruments?: string[]
    difficulty_level?: string
    requested_by?: string
    generation_reason?: string
  }
}

export interface EnhancementOptions {
  focus_areas?: Array<
    'definition' | 'references' | 'related_terms' | 'examples' | 'etymology'
  >
  target_quality?: number
  preserve_manual_edits?: boolean
}

export class DictionaryGenerator {
  private aiService: CloudflareAIService

  constructor(private env: Env) {
    this.aiService = new CloudflareAIService(env)
  }

  /**
   * Generate a new dictionary entry from scratch
   */
  async generateEntry(
    options: GenerationOptions
  ): Promise<DictionaryEntry | null> {
    const maxRetries = 3
    const qualityThreshold = parseInt(this.env.QUALITY_THRESHOLD || '70')

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Step 1: Generate definition
        const definition = await this.generateDefinition(options)
        if (!definition) continue

        // Step 2: Generate references
        const references = await this.generateReferences(
          options.term,
          options.type
        )

        // Step 3: Calculate initial quality score
        const qualityScore = await this.calculateQualityScore(
          definition,
          references
        )

        // Step 4: Generate metadata
        const metadata = this.generateMetadata(options)

        // Create the entry
        const entry: DictionaryEntry = {
          id: crypto.randomUUID(),
          term: options.term,
          normalized_term: normalizeTerm(options.term),
          type: options.type,
          lang: (options.lang || 'en') as DictionaryEntry['lang'],
          definition,
          references,
          metadata,
          quality_score: qualityScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        }

        // Step 5: Validate quality with AI (if score is below threshold)
        if (entry.quality_score.overall < qualityThreshold) {
          const validation = await this.validateQuality(entry)

          // If AI validation gives a higher score, update it
          if (validation.score >= qualityThreshold) {
            entry.quality_score.overall = validation.score
            return entry
          }

          // If this is not the last attempt, try again
          if (attempt < maxRetries) {
            // console.log(
            //   `Quality score ${entry.quality_score.overall} below threshold ${qualityThreshold}, retrying (attempt ${attempt}/${maxRetries})`
            // )
            continue
          }
        } else {
          return entry
        }
      } catch (error) {
        console.error(`Entry generation attempt ${attempt} failed:`, error)
        if (attempt === maxRetries) {
          throw new Error('Failed to generate entry with acceptable quality')
        }
      }
    }

    throw new Error('Failed to generate entry with acceptable quality')
  }

  /**
   * Enhance an existing dictionary entry
   */
  async enhanceEntry(
    entry: DictionaryEntry,
    options: EnhancementOptions = {}
  ): Promise<DictionaryEntry | null> {
    try {
      const enhanced = { ...entry }
      const focusAreas = options.focus_areas || [
        'definition',
        'references',
        'examples',
      ]

      // Enhance definition if requested
      if (focusAreas.includes('definition')) {
        const enhancedDefinition = await this.enhanceDefinition(entry)
        if (enhancedDefinition) {
          enhanced.definition = this.mergeDefinitions(
            entry.definition,
            enhancedDefinition
          )
        }
      }

      // Enhance references if requested
      if (focusAreas.includes('references')) {
        const enhancedReferences = await this.enhanceReferences(entry)
        if (enhancedReferences) {
          enhanced.references = this.mergeReferences(
            entry.references,
            enhancedReferences
          )
        }
      }

      // Add related terms if requested
      if (focusAreas.includes('related_terms')) {
        const relatedTerms = await this.generateRelatedTerms(entry)
        if (relatedTerms) {
          enhanced.metadata.related_terms = relatedTerms
        }
      }

      // Recalculate quality score
      enhanced.quality_score = await this.calculateQualityScore(
        enhanced.definition,
        enhanced.references
      )

      // Return if quality improved OR if we added missing fields while maintaining quality
      const addedNewFields =
        (enhanced.definition.usage_example &&
          !entry.definition.usage_example) ||
        (enhanced.definition.etymology && !entry.definition.etymology) ||
        (enhanced.definition.pronunciation &&
          !entry.definition.pronunciation) ||
        (enhanced.metadata.related_terms &&
          enhanced.metadata.related_terms.length >
            (entry.metadata.related_terms?.length || 0))

      if (
        enhanced.quality_score.overall > entry.quality_score.overall ||
        (enhanced.quality_score.overall >= entry.quality_score.overall &&
          addedNewFields)
      ) {
        enhanced.updated_at = new Date().toISOString()
        enhanced.version = entry.version + 1
        enhanced.metadata.last_accessed = new Date().toISOString()
        return enhanced
      }

      return null
    } catch (error) {
      console.error('Entry enhancement failed:', error)
      return null
    }
  }

  /**
   * Generate definition using AI
   */
  private async generateDefinition(
    options: GenerationOptions
  ): Promise<Definition | null> {
    const prompt = PROMPT_TEMPLATES.definition(
      options.term,
      options.type,
      options.context,
      options.lang || 'en'
    )

    const model = selectModel('definition')
    const response = await this.aiService.generateStructuredContent(
      prompt,
      model
    )

    if (!response.response) return null

    try {
      const parsed = this.aiService.parseJSONResponse(
        response.response
      ) as any as any

      // Validate the structure
      if (!parsed.concise || !parsed.detailed) {
        throw new Error('Invalid definition structure')
      }

      return {
        concise: parsed.concise,
        detailed: parsed.detailed,
        etymology: parsed.etymology || undefined,
        pronunciation: parsed.pronunciation || undefined,
        usage_example: parsed.usage_example || undefined,
      }
    } catch (error) {
      console.error('Failed to parse definition:', error)
      return null
    }
  }

  /**
   * Generate references using AI
   */
  private async generateReferences(
    term: string,
    type: TermType
  ): Promise<References> {
    const prompt = PROMPT_TEMPLATES.referenceExtraction(term, type)

    const model = selectModel('definition', true) // Use fast model for references
    const response = await this.aiService.generateStructuredContent(
      prompt,
      model,
      {
        max_tokens: 200,
        temperature: 0.1,
      }
    )

    const references: References = {
      wikipedia: undefined,
      books: [],
      research_papers: [],
      media: undefined,
      shopping: undefined,
      educational: [],
    }

    if (!response.response) return references

    try {
      const parsed = this.aiService.parseJSONResponse(response.response) as any

      // Generate placeholder references based on AI suggestions
      if (parsed.wikipedia_search) {
        references.wikipedia = {
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(parsed.wikipedia_search)}`,
          extract: 'Search Wikipedia for more information',
          last_verified: new Date().toISOString(),
        }
      }

      if (parsed.youtube_search) {
        references.media = {
          youtube: {
            educational_videos: [
              {
                title: `Search results for ${parsed.youtube_search}`,
                channel: 'YouTube Search',
                channel_id: 'search',
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(parsed.youtube_search)}`,
                video_id: 'search',
                duration: 0,
                view_count: 0,
                published_date: new Date().toISOString(),
                relevance_score: 0.5,
              },
            ],
          },
        }
      }

      return references
    } catch (error) {
      console.error('Failed to parse references:', error)
      return references
    }
  }

  /**
   * Calculate quality score for an entry
   */
  private async calculateQualityScore(
    definition: Definition,
    references: References
  ): Promise<QualityScore> {
    // Completeness score
    let completeness = 0
    if (definition.concise) completeness += 30
    if (definition.detailed) completeness += 40
    if (definition.etymology) completeness += 10
    if (definition.pronunciation) completeness += 10
    if (definition.usage_example) completeness += 10

    // Clarity score (base score for AI-generated content)
    const clarity = 70

    // References score
    let totalRefs = 0
    if (references.wikipedia) totalRefs += 1
    if (references.books && references.books.length > 0)
      totalRefs += references.books.length
    if (references.research_papers && references.research_papers.length > 0)
      totalRefs += references.research_papers.length
    if (references.media) totalRefs += 1
    if (references.educational && references.educational.length > 0)
      totalRefs += references.educational.length

    const referenceScore = Math.min(100, totalRefs * 20)

    // Calculate overall score
    const overall = Math.round(
      (70 + completeness + clarity + referenceScore) / 4
    )

    return {
      overall,
      definition_clarity: clarity,
      reference_completeness: referenceScore,
      accuracy_verification: 70, // Base score for AI content
      last_ai_check: new Date().toISOString(),
      human_verified: false,
      confidence_level:
        overall >= 80 ? 'high' : overall >= 60 ? 'medium' : 'low',
    }
  }

  /**
   * Generate metadata for entry
   */
  private generateMetadata(options: GenerationOptions): EntryMetadata {
    return {
      search_frequency: 0,
      last_accessed: new Date().toISOString(),
      access_count: 0,
      related_terms: [],
      categories: [],
      tags: [],
      difficulty_level: options.context
        ?.difficulty_level as EntryMetadata['difficulty_level'],
      instruments: options.context?.instruments,
      language: 'en',
    }
  }

  /**
   * Enhance existing definition
   */
  private async enhanceDefinition(
    entry: DictionaryEntry
  ): Promise<Definition | null> {
    const prompt = PROMPT_TEMPLATES.enhancement(entry, ['definition'])

    const model = selectModel('enhancement')
    const response = await this.aiService.generateStructuredContent(
      prompt,
      model,
      {
        temperature: 0.7,
        max_tokens: 1500,
      }
    )

    if (!response.response) return null

    try {
      const parsed = this.aiService.parseJSONResponse(response.response) as any
      return parsed.definition || null
    } catch (error) {
      console.error('Failed to parse enhanced definition:', error)
      return null
    }
  }

  /**
   * Enhance existing references
   */
  private async enhanceReferences(
    entry: DictionaryEntry
  ): Promise<References | null> {
    const prompt = PROMPT_TEMPLATES.enhancement(entry, ['references'])

    const model = selectModel('enhancement')
    const response = await this.aiService.generateStructuredContent(
      prompt,
      model,
      {
        temperature: 0.5,
        max_tokens: 800,
      }
    )

    if (!response.response) return null

    try {
      const parsed = this.aiService.parseJSONResponse(response.response) as any
      return parsed.references || null
    } catch (error) {
      console.error('Failed to parse enhanced references:', error)
      return null
    }
  }

  /**
   * Validate entry quality using AI
   */
  async validateQuality(entry: DictionaryEntry): Promise<{
    score: number
    issues: string[]
    suggestions: string[]
  }> {
    try {
      const prompt = PROMPT_TEMPLATES.qualityCheck(entry)
      const model = selectModel('quality', true) // Use fast model

      const response = await this.aiService.generateStructuredContent(
        prompt,
        model,
        {
          temperature: 0.1,
          max_tokens: 500,
        }
      )

      if (!response.response) {
        return {
          score: 0,
          issues: ['Validation failed'],
          suggestions: [],
        }
      }

      const parsed = this.aiService.parseJSONResponse(response.response) as any

      return {
        score: parsed.score || 0,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
      }
    } catch (error) {
      console.error('Quality validation failed:', error)
      return {
        score: 0,
        issues: ['Validation failed'],
        suggestions: [],
      }
    }
  }

  /**
   * Generate related terms
   */
  private async generateRelatedTerms(
    entry: DictionaryEntry
  ): Promise<any[] | null> {
    const prompt = PROMPT_TEMPLATES.relatedTerms(
      entry.term,
      entry.definition.detailed
    )

    const model = selectModel('definition', true)
    const response = await this.aiService.generateStructuredContent(
      prompt,
      model,
      {
        temperature: 0.3,
        max_tokens: 400,
      }
    )

    if (!response.response) return null

    try {
      const parsed = this.aiService.parseJSONResponse(response.response) as any
      return parsed.related_terms || null
    } catch (error) {
      console.error('Failed to parse related terms:', error)
      return null
    }
  }

  /**
   * Merge two definitions, preserving the best of both
   */
  private mergeDefinitions(
    original: Definition,
    enhanced: Definition
  ): Definition {
    return {
      concise: enhanced.concise || original.concise,
      detailed: enhanced.detailed || original.detailed,
      etymology: enhanced.etymology || original.etymology,
      pronunciation: enhanced.pronunciation || original.pronunciation,
      usage_example: enhanced.usage_example || original.usage_example,
    }
  }

  /**
   * Merge two reference sets
   */
  private mergeReferences(
    original: References,
    enhanced: References
  ): References {
    const merged: References = {
      wikipedia: enhanced.wikipedia || original.wikipedia,
      books: [...(original.books || [])],
      research_papers: [...(original.research_papers || [])],
      media: enhanced.media || original.media,
      shopping: enhanced.shopping || original.shopping,
      educational: [...(original.educational || [])],
    }

    // Merge book arrays
    if (enhanced.books) {
      for (const book of enhanced.books) {
        const isDuplicate = merged.books?.some(b => b.isbn === book.isbn)
        if (!isDuplicate && merged.books) {
          merged.books.push(book)
        }
      }
    }

    // Merge research papers
    if (enhanced.research_papers) {
      for (const paper of enhanced.research_papers) {
        const isDuplicate = merged.research_papers?.some(
          p => p.doi === paper.doi
        )
        if (!isDuplicate && merged.research_papers) {
          merged.research_papers.push(paper)
        }
      }
    }

    // Merge educational resources
    if (enhanced.educational) {
      for (const resource of enhanced.educational) {
        const isDuplicate = merged.educational?.some(
          e => e.url === resource.url
        )
        if (!isDuplicate && merged.educational) {
          merged.educational.push(resource)
        }
      }
    }

    return merged
  }
}

/**
 * Quality validation service
 */
export class QualityValidator {
  constructor(private env: Env) {}

  /**
   * Validate definition quality
   */
  async validateDefinition(
    definition: Definition,
    term: string,
    type: TermType
  ): Promise<{
    score: number
    issues: string[]
    suggestions: string[]
  }> {
    const aiService = new CloudflareAIService(this.env)

    const prompt = PROMPT_TEMPLATES.validation(
      JSON.stringify(definition),
      term,
      type
    )

    const model = selectModel('validation')
    const response = await aiService.generateStructuredContent(prompt, model, {
      temperature: 0.1,
      max_tokens: 300,
    })

    if (!response.response) {
      return {
        score: 50,
        issues: ['Validation failed'],
        suggestions: [],
      }
    }

    try {
      const parsed = aiService.parseJSONResponse(response.response) as any
      return {
        score: parsed.score || 50,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
      }
    } catch (error) {
      console.error('Failed to parse validation:', error)
      return {
        score: 50,
        issues: ['Validation parsing failed'],
        suggestions: [],
      }
    }
  }
}
