/**
 * Term Type Classifier Service
 * Automatically determines the appropriate TermType for musical terms using AI
 */

import { TermType } from '../../types/dictionary'
import { CloudflareAIService } from './cloudflare-ai-service'
import { CLOUDFLARE_AI_MODELS } from '../../config/ai-models'

// Term type descriptions for classification
const TERM_TYPE_DESCRIPTIONS: Record<TermType, string> = {
  tempo: 'Speed and pace indicators (e.g., allegro, andante, presto, largo)',
  dynamics:
    'Volume and intensity markings (e.g., forte, piano, crescendo, diminuendo)',
  articulation:
    'Note attack and playing techniques (e.g., staccato, legato, accent, tenuto)',
  form: 'Musical structures and compositions (e.g., sonata, fugue, rondo, symphony)',
  genre:
    'Musical styles and categories (e.g., jazz, classical, baroque, romantic)',
  instrument:
    'Musical instruments and their families (e.g., piano, violin, trumpet, drums)',
  technique:
    'Performance methods and skills (e.g., vibrato, glissando, arpeggio, scales)',
  theory:
    'Music theory concepts (e.g., harmony, counterpoint, intervals, chords)',
  composer: 'Names of composers and musicians (e.g., Mozart, Beethoven, Bach)',
  period:
    'Historical musical eras (e.g., Baroque, Classical, Romantic, Modern)',
  notation:
    'Written music symbols and systems (e.g., staff, clef, time signature, key signature)',
  general: "Other musical terms that don't fit specific categories",
}

export class TermClassifier {
  private aiService: CloudflareAIService

  constructor(private env: any) {
    this.aiService = new CloudflareAIService(env)
  }

  /**
   * Classify a musical term into the most appropriate TermType
   */
  async classifyTerm(term: string): Promise<TermType> {
    try {
      const prompt = this.createClassificationPrompt(term)

      // Use the reliable 8B model for classification since 3B is having issues
      const model = CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B.model

      const response = await this.aiService.generateStructuredContent(
        prompt,
        model,
        {
          max_tokens: 100,
          temperature: 0.1, // Low temperature for consistent classification
        }
      )

      if (!response.response) {
        console.warn(`Failed to classify term "${term}", defaulting to general`)
        return 'general'
      }

      try {
        const parsed = this.aiService.parseJSONResponse(response.response) as {
          type: string
        }

        // Validate that the returned type is valid
        if (parsed.type && this.isValidTermType(parsed.type)) {
          return parsed.type as TermType
        }

        // If not valid, try to match common patterns
        return this.fallbackClassification(term)
      } catch (error) {
        console.error('Failed to parse classification response:', error)
        return this.fallbackClassification(term)
      }
    } catch (error) {
      console.error('Term classification error:', error)
      return this.fallbackClassification(term)
    }
  }

  /**
   * Create the classification prompt
   */
  private createClassificationPrompt(term: string): string {
    return `You are a music terminology expert. Classify the following musical term into the most appropriate category.

Term to classify: "${term}"

Available categories:
${Object.entries(TERM_TYPE_DESCRIPTIONS)
  .map(([type, desc]) => `- ${type}: ${desc}`)
  .join('\n')}

IMPORTANT: 
1. Choose the MOST SPECIFIC category that fits the term
2. Only use "general" if the term truly doesn't fit any other category
3. Consider the primary usage and meaning of the term in musical contexts

Return your classification in JSON format:
{
  "type": "the_selected_category"
}

Only return the JSON, no additional text.`
  }

  /**
   * Validate if a string is a valid TermType
   */
  private isValidTermType(type: string): boolean {
    return Object.keys(TERM_TYPE_DESCRIPTIONS).includes(type)
  }

  /**
   * Fallback classification based on common patterns
   */
  fallbackClassification(term: string): TermType {
    const lowerTerm = term.toLowerCase()

    // Tempo terms
    if (
      /^(allegro|andante|adagio|presto|largo|moderato|vivace|lento|grave)/.test(
        lowerTerm
      )
    ) {
      return 'tempo'
    }

    // Dynamics terms
    if (
      /^(forte|piano|mezzo|crescendo|diminuendo|sforzando|pp|ff|mp|mf)/.test(
        lowerTerm
      )
    ) {
      return 'dynamics'
    }

    // Notation terms
    if (
      /(clef|staff|stave|signature|rest|note|sharp|flat|natural|bar|measure)/.test(
        lowerTerm
      )
    ) {
      return 'notation'
    }

    // Form terms
    if (
      /(sonata|fugue|concerto|symphony|suite|prelude|etude|nocturne|waltz|march)/.test(
        lowerTerm
      )
    ) {
      return 'form'
    }

    // Instrument terms
    if (
      /(piano|violin|guitar|trumpet|flute|clarinet|drum|cello|bass|organ)/.test(
        lowerTerm
      )
    ) {
      return 'instrument'
    }

    // Technique terms
    if (
      /(vibrato|tremolo|glissando|arpeggio|scale|trill|mordent|portamento|pizzicato)/.test(
        lowerTerm
      )
    ) {
      return 'technique'
    }

    // Theory terms
    if (
      /(chord|interval|harmony|key|mode|cadence|modulation|progression|circle)/.test(
        lowerTerm
      )
    ) {
      return 'theory'
    }

    // Period terms
    if (
      /(baroque|classical|romantic|modern|contemporary|renaissance|medieval)/.test(
        lowerTerm
      )
    ) {
      return 'period'
    }

    // Default to general if no patterns match
    return 'general'
  }

  /**
   * Batch classify multiple terms (for efficiency)
   */
  async classifyTerms(terms: string[]): Promise<Record<string, TermType>> {
    const results: Record<string, TermType> = {}

    // Process in batches to avoid overwhelming the AI
    const batchSize = 5
    for (let i = 0; i < terms.length; i += batchSize) {
      const batch = terms.slice(i, i + batchSize)
      const classifications = await Promise.all(
        batch.map(term => this.classifyTerm(term))
      )

      batch.forEach((term, index) => {
        results[term] = classifications[index]
      })
    }

    return results
  }
}
