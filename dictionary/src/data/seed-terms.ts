/**
 * Seed terms for pre-population of the dictionary
 * These are common musical terms that should be available in all languages
 */

import { TermType, SupportedLanguage } from '../types/dictionary'

export interface SeedTerm {
  term: string
  type: TermType
  priority: number // 1-10, higher is more important
  languages: SupportedLanguage[]
}

/**
 * High-priority musical terms commonly used in sight-reading and music education
 */
export const SEED_TERMS: SeedTerm[] = [
  // Tempo markings - Essential for sight-reading
  {
    term: 'Allegro',
    type: 'tempo',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Andante',
    type: 'tempo',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Adagio',
    type: 'tempo',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Presto',
    type: 'tempo',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Largo',
    type: 'tempo',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Moderato',
    type: 'tempo',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Dynamics - Critical for expression
  {
    term: 'Forte',
    type: 'dynamics',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Piano',
    type: 'dynamics',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Mezzo forte',
    type: 'dynamics',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Mezzo piano',
    type: 'dynamics',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Fortissimo',
    type: 'dynamics',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Pianissimo',
    type: 'dynamics',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Crescendo',
    type: 'dynamics',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Diminuendo',
    type: 'dynamics',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Articulation - Essential for performance
  {
    term: 'Staccato',
    type: 'articulation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Legato',
    type: 'articulation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Accent',
    type: 'articulation',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Tenuto',
    type: 'articulation',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Marcato',
    type: 'articulation',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Form - Important for structure understanding
  {
    term: 'Sonata',
    type: 'form',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Fugue',
    type: 'form',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Rondo',
    type: 'form',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Minuet',
    type: 'form',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Scherzo',
    type: 'form',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Theory - Fundamental concepts
  {
    term: 'Scale',
    type: 'theory',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Chord',
    type: 'theory',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Key signature',
    type: 'theory',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Time signature',
    type: 'theory',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Interval',
    type: 'theory',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Octave',
    type: 'theory',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Arpeggio',
    type: 'theory',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Notation - Reading music
  {
    term: 'Staff',
    type: 'notation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Clef',
    type: 'notation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Note',
    type: 'notation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Rest',
    type: 'notation',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Sharp',
    type: 'notation',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Flat',
    type: 'notation',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Natural',
    type: 'notation',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Instruments - Common instruments
  {
    term: 'Piano',
    type: 'instrument',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Guitar',
    type: 'instrument',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Violin',
    type: 'instrument',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Flute',
    type: 'instrument',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // Techniques - Performance techniques
  {
    term: 'Vibrato',
    type: 'technique',
    priority: 8,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Tremolo',
    type: 'technique',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Glissando',
    type: 'technique',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Pizzicato',
    type: 'technique',
    priority: 7,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },

  // General musical terms
  {
    term: 'Rhythm',
    type: 'general',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Melody',
    type: 'general',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Harmony',
    type: 'general',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Tempo',
    type: 'general',
    priority: 10,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Beat',
    type: 'general',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Measure',
    type: 'general',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
  {
    term: 'Bar',
    type: 'general',
    priority: 9,
    languages: ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
  },
]

/**
 * Group seed terms by priority for batch processing
 */
export function getSeedTermsByPriority(): Map<number, SeedTerm[]> {
  const grouped = new Map<number, SeedTerm[]>()

  for (const term of SEED_TERMS) {
    const priority = term.priority
    if (!grouped.has(priority)) {
      grouped.set(priority, [])
    }
    grouped.get(priority)!.push(term)
  }

  return grouped
}

/**
 * Get seed terms for a specific language
 */
export function getSeedTermsForLanguage(lang: SupportedLanguage): SeedTerm[] {
  return SEED_TERMS.filter(term => term.languages.includes(lang))
}

/**
 * Get high-priority terms (priority >= 8)
 */
export function getHighPrioritySeedTerms(): SeedTerm[] {
  return SEED_TERMS.filter(term => term.priority >= 8)
}

/**
 * Convert seed terms to seed queue entries
 */
export function seedTermsToQueueEntries(terms: SeedTerm[]): Array<{
  term: string
  languages: string[]
  priority: number
}> {
  return terms.map(term => ({
    term: term.term,
    languages: term.languages,
    priority: term.priority,
  }))
}
