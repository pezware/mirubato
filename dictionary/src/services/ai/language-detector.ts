/**
 * Language Detector Service
 * Detects the source language of musical terminology
 */

import { ExtendedLanguage } from '../../types/dictionary'

export interface LanguageDetectionResult {
  language: ExtendedLanguage | null
  confidence: number
  method: 'pattern' | 'ai' | 'fallback'
}

// Italian music terms (most common in classical music)
const ITALIAN_TERMS = new Set([
  // Tempo markings
  'allegro',
  'allegretto',
  'andante',
  'andantino',
  'adagio',
  'adagietto',
  'presto',
  'prestissimo',
  'largo',
  'larghetto',
  'lento',
  'moderato',
  'vivace',
  'vivacissimo',
  'grave',
  'maestoso',
  // Dynamics
  'piano',
  'pianissimo',
  'forte',
  'fortissimo',
  'mezzo',
  'mezzopiano',
  'mezzoforte',
  'crescendo',
  'decrescendo',
  'diminuendo',
  'sforzando',
  'sforzato',
  'fortepiano',
  'rinforzando',
  'smorzando',
  'morendo',
  'perdendosi',
  'calando',
  // Articulation and expression
  'staccato',
  'staccatissimo',
  'legato',
  'legatissimo',
  'tenuto',
  'marcato',
  'pizzicato',
  'arco',
  'tremolo',
  'vibrato',
  'portamento',
  'portato',
  'glissando',
  // Expression terms
  'dolce',
  'espressivo',
  'cantabile',
  'affettuoso',
  'agitato',
  'animato',
  'appassionato',
  'brillante',
  'con brio',
  'con fuoco',
  'con moto',
  'con spirito',
  'delicato',
  'energico',
  'furioso',
  'giocoso',
  'grazioso',
  'lamentoso',
  'leggiero',
  'lusingando',
  'misterioso',
  'nobile',
  'patetico',
  'pesante',
  'risoluto',
  'scherzando',
  'serioso',
  'sostenuto',
  'teneramente',
  'tranquillo',
  'trionfante',
  // Tempo modifications
  'accelerando',
  'ritardando',
  'rallentando',
  'ritenuto',
  'rubato',
  'stringendo',
  'allargando',
  'slentando',
  // Structure and directions
  'fermata',
  'coda',
  'fine',
  'tutti',
  'solo',
  'soli',
  'tacet',
  'attacca',
  'segue',
  'subito',
  'sempre',
  'simile',
  'ossia',
  'sopra',
  'sotto',
  'voce',
  'mano',
  'destra',
  'sinistra',
  // Da capo and dal segno
  'da capo',
  'dal segno',
  'capo',
  'segno',
  // Common phrases
  'a tempo',
  'in tempo',
  'tempo primo',
  'tempo giusto',
  "l'istesso tempo",
  'meno mosso',
  'più mosso',
  'poco a poco',
  'molto',
  'poco',
  'più',
  'meno',
  'assai',
  'troppo',
  'non troppo',
  'quasi',
  'come',
  'senza',
  'col',
  'colla',
  'con',
  'prima',
  'secondo',
  'terzo',
  // Forms
  'sonata',
  'concerto',
  'sinfonia',
  'opera',
  'aria',
  'recitativo',
  'scherzo',
  'intermezzo',
  'capriccio',
  'fantasia',
  // Instruments (Italian names)
  'violino',
  'viola',
  'violoncello',
  'contrabbasso',
  'flauto',
  'oboe',
  'clarinetto',
  'fagotto',
  'corno',
  'tromba',
  'trombone',
  'timpani',
  'arpa',
  'pianoforte',
  'cembalo',
  'organo',
])

// Italian patterns (prefixes and suffixes)
const ITALIAN_PATTERNS = [
  /^allegr/i,
  /^andant/i,
  /^adagi/i,
  /^prest/i,
  /^larg/i,
  /^lent/i,
  /^vivac/i,
  /issimo$/i,
  /issima$/i,
  /etto$/i,
  /etta$/i,
  /ino$/i,
  /ina$/i,
  /ando$/i,
  /endo$/i,
  /ato$/i,
  /ata$/i,
  /abile$/i,
  /oso$/i,
  /osa$/i,
]

// German music terms
const GERMAN_TERMS = new Set([
  // Tempo and expression
  'langsam',
  'schnell',
  'sehr',
  'mäßig',
  'massig',
  'lebhaft',
  'ruhig',
  'bewegt',
  'gehend',
  'fließend',
  'schleppend',
  'breit',
  'schwer',
  'leicht',
  'zart',
  'kräftig',
  'stark',
  'schwach',
  'laut',
  'leise',
  // Expression modifiers
  'mit',
  'ohne',
  'und',
  'aber',
  'oder',
  'nicht',
  'immer',
  'wieder',
  'noch',
  'etwas',
  'wenig',
  'viel',
  'mehr',
  'ganz',
  'recht',
  'ziemlich',
  // Common musical directions
  'ausdruck',
  'empfindung',
  'gefühl',
  'innigkeit',
  'kraft',
  'leidenschaft',
  'seele',
  'wärme',
  'nach',
  // Instruments (German names)
  'geige',
  'bratsche',
  'flöte',
  'klarinette',
  'fagott',
  'horn',
  'trompete',
  'posaune',
  'pauke',
  'harfe',
  'klavier',
  'orgel',
  // Forms
  'lied',
  'lieder',
  'singspiel',
])

// German patterns
const GERMAN_PATTERNS = [
  /^sehr\s/i,
  /^mit\s/i,
  /^ohne\s/i,
  /lich$/i,
  /keit$/i,
  /ung$/i,
  /schaft$/i,
]

// French music terms
const FRENCH_TERMS = new Set([
  // Tempo and expression
  'lent',
  'vite',
  'modéré',
  'modere',
  'animé',
  'anime',
  'vif',
  'rapide',
  'lentement',
  'doucement',
  // Dynamics and expression
  'doux',
  'fort',
  'très',
  'tres',
  'peu',
  'plus',
  'moins',
  'assez',
  'beaucoup',
  'trop',
  // Expression terms
  'avec',
  'sans',
  'et',
  'ou',
  'mais',
  'comme',
  'en',
  'sur',
  'sous',
  'dans',
  'chaleur',
  'tendresse',
  'passion',
  'élan',
  'elan',
  'grâce',
  'grace',
  'légèreté',
  'legerete',
  // Directions
  'retenu',
  'cédez',
  'cedez',
  'pressez',
  'élargissez',
  'elargissez',
  'retenez',
  'ralentissez',
  'accélérez',
  'accelerez',
  // Articulation
  'détaché',
  'detache',
  'lié',
  'lie',
  'lourd',
  'léger',
  'leger',
  'sec',
  'soutenu',
  // Musical directions
  'sourdine',
  'jeu',
  'en dehors',
  'bouché',
  'bouche',
  'cuivré',
  'cuivre',
  'ouvert',
  // Instruments (French names)
  'violon',
  'alto',
  'violoncelle',
  'contrebasse',
  'flûte',
  'flute',
  'hautbois',
  'clarinette',
  'basson',
  'cor',
  'trompette',
  'trombone',
  'timbales',
  'harpe',
  'piano',
  'orgue',
  'clavecin',
  // Forms
  'chanson',
  'ballet',
  'suite',
  'prélude',
  'prelude',
  'ballade',
  'berceuse',
  'nocturne',
])

// French patterns
const FRENCH_PATTERNS = [
  /^très\s/i,
  /^tres\s/i,
  /^avec\s/i,
  /^sans\s/i,
  /^en\s/i,
  /ment$/i,
  /é$/i,
  /ée$/i,
  /er$/i,
  /ez$/i,
  /eur$/i,
  /euse$/i,
]

// Latin terms (religious and older music)
const LATIN_TERMS = new Set([
  // Religious music
  'requiem',
  'gloria',
  'sanctus',
  'agnus',
  'agnus dei',
  'kyrie',
  'kyrie eleison',
  'credo',
  'benedictus',
  'hosanna',
  'magnificat',
  'stabat mater',
  'te deum',
  'ave maria',
  'miserere',
  'nunc dimittis',
  'dies irae',
  // Musical directions
  'ad libitum',
  'a cappella',
  'a capella',
  'opus',
  'tacet',
  // Common Latin words in music
  'et',
  'cum',
  'sine',
  'vox',
  'voce',
  'in',
  'ex',
  'de',
  'pro',
  'per',
  'ante',
  'post',
  // Other terms
  'cantus',
  'cantus firmus',
  'discantus',
  'organum',
  'motetus',
  'motet',
])

// English terms
const ENGLISH_TERMS = new Set([
  // Basic musical terms (English origin or commonly used in English)
  'slow',
  'fast',
  'loud',
  'soft',
  'quick',
  'quiet',
  'smooth',
  'detached',
  'connected',
  // Music theory (primarily English usage)
  'rhythm',
  'melody',
  'harmony',
  'chord',
  'beat',
  'tempo',
  'key',
  'scale',
  'note',
  'rest',
  'measure',
  'bar',
  'staff',
  'stave',
  'clef',
  'sharp',
  'flat',
  'natural',
  'pitch',
  'tone',
  'interval',
  'octave',
  // Instruments (English names)
  'piano',
  'violin',
  'viola',
  'cello',
  'bass',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'horn',
  'trumpet',
  'trombone',
  'tuba',
  'drum',
  'drums',
  'harp',
  'guitar',
  'organ',
  // Genres
  'jazz',
  'blues',
  'rock',
  'pop',
  'folk',
  'country',
  'swing',
  'funk',
  'soul',
  'gospel',
  // Modern terms
  'loop',
  'sample',
  'beat',
  'track',
  'mix',
  'fade',
  'groove',
  // Playing instructions
  'mute',
  'muted',
  'open',
  'stopped',
  'damped',
  'sustained',
  'plucked',
  'bowed',
  'struck',
])

// Spanish terms
const SPANISH_TERMS = new Set([
  'rápido',
  'rapido',
  'lento',
  'fuerte',
  'suave',
  'con',
  'sin',
  'muy',
  'poco',
  'más',
  'mas',
  'menos',
  'y',
  'o',
  'pero',
  // Genres
  'flamenco',
  'tango',
  'bolero',
  'fandango',
  'jota',
  'seguidilla',
  'habanera',
  'zarzuela',
  // Instruments
  'guitarra',
  'castañuelas',
  'castanuelas',
])

export class LanguageDetector {
  constructor() {}

  /**
   * Detect the language of a musical term
   */
  async detectLanguage(term: string): Promise<LanguageDetectionResult> {
    const normalizedTerm = term.trim().toLowerCase()

    // Handle empty or whitespace-only input
    if (!normalizedTerm) {
      return { language: null, confidence: 0, method: 'pattern' }
    }

    // Handle numeric-only input
    if (/^\d+$/.test(normalizedTerm)) {
      return { language: null, confidence: 0.2, method: 'pattern' }
    }

    // Try pattern-based detection first (fastest, most reliable for common terms)
    const patternResult = this.detectByPattern(normalizedTerm)
    if (patternResult.confidence >= 0.7) {
      return patternResult
    }

    // Return low-confidence result for unknown terms
    return {
      language: patternResult.language,
      confidence: patternResult.confidence,
      method: 'fallback',
    }
  }

  /**
   * Detect language using pattern matching
   */
  private detectByPattern(term: string): LanguageDetectionResult {
    // Check exact matches first (highest confidence)
    if (ITALIAN_TERMS.has(term)) {
      return { language: 'it', confidence: 0.95, method: 'pattern' }
    }
    if (GERMAN_TERMS.has(term)) {
      return { language: 'de', confidence: 0.95, method: 'pattern' }
    }
    if (FRENCH_TERMS.has(term)) {
      return { language: 'fr', confidence: 0.95, method: 'pattern' }
    }
    if (LATIN_TERMS.has(term)) {
      return { language: 'la', confidence: 0.9, method: 'pattern' }
    }
    if (ENGLISH_TERMS.has(term)) {
      return { language: 'en', confidence: 0.85, method: 'pattern' }
    }
    if (SPANISH_TERMS.has(term)) {
      return { language: 'es', confidence: 0.9, method: 'pattern' }
    }

    // Check for multi-word phrases
    const phraseResult = this.detectPhrase(term)
    if (phraseResult) {
      return phraseResult
    }

    // Check Italian patterns (most common in music)
    for (const pattern of ITALIAN_PATTERNS) {
      if (pattern.test(term)) {
        return { language: 'it', confidence: 0.8, method: 'pattern' }
      }
    }

    // Check German patterns
    for (const pattern of GERMAN_PATTERNS) {
      if (pattern.test(term)) {
        return { language: 'de', confidence: 0.8, method: 'pattern' }
      }
    }

    // Check French patterns
    for (const pattern of FRENCH_PATTERNS) {
      if (pattern.test(term)) {
        return { language: 'fr', confidence: 0.8, method: 'pattern' }
      }
    }

    // Check for partial matches in term sets
    const partialMatch = this.detectPartialMatch(term)
    if (partialMatch) {
      return partialMatch
    }

    // Default to null with low confidence
    return { language: null, confidence: 0.3, method: 'pattern' }
  }

  /**
   * Detect language from multi-word phrases
   */
  private detectPhrase(term: string): LanguageDetectionResult | null {
    const words = term.split(/\s+/)

    if (words.length < 2) {
      return null
    }

    // Check if any word matches a language set
    const languageScores: Record<string, number> = {
      it: 0,
      de: 0,
      fr: 0,
      la: 0,
      en: 0,
      es: 0,
    }

    for (const word of words) {
      if (ITALIAN_TERMS.has(word)) languageScores.it += 2
      if (GERMAN_TERMS.has(word)) languageScores.de += 2
      if (FRENCH_TERMS.has(word)) languageScores.fr += 2
      if (LATIN_TERMS.has(word)) languageScores.la += 2
      if (ENGLISH_TERMS.has(word)) languageScores.en += 1
      if (SPANISH_TERMS.has(word)) languageScores.es += 2

      // Check patterns
      for (const pattern of ITALIAN_PATTERNS) {
        if (pattern.test(word)) languageScores.it += 1
      }
      for (const pattern of GERMAN_PATTERNS) {
        if (pattern.test(word)) languageScores.de += 1
      }
      for (const pattern of FRENCH_PATTERNS) {
        if (pattern.test(word)) languageScores.fr += 1
      }
    }

    // Find the highest scoring language
    let maxScore = 0
    let detectedLang: ExtendedLanguage | null = null

    for (const [lang, score] of Object.entries(languageScores)) {
      if (score > maxScore) {
        maxScore = score
        detectedLang = lang as ExtendedLanguage
      }
    }

    if (maxScore >= 2) {
      const confidence = Math.min(0.95, 0.7 + maxScore * 0.05)
      return { language: detectedLang, confidence, method: 'pattern' }
    }

    return null
  }

  /**
   * Detect language from partial word matches
   */
  private detectPartialMatch(term: string): LanguageDetectionResult | null {
    // Check if term starts with or contains any known term
    for (const italianTerm of ITALIAN_TERMS) {
      if (term.startsWith(italianTerm) || italianTerm.startsWith(term)) {
        return { language: 'it', confidence: 0.75, method: 'pattern' }
      }
    }

    for (const germanTerm of GERMAN_TERMS) {
      if (term.startsWith(germanTerm) || germanTerm.startsWith(term)) {
        return { language: 'de', confidence: 0.75, method: 'pattern' }
      }
    }

    for (const frenchTerm of FRENCH_TERMS) {
      if (term.startsWith(frenchTerm) || frenchTerm.startsWith(term)) {
        return { language: 'fr', confidence: 0.75, method: 'pattern' }
      }
    }

    return null
  }

  /**
   * Check if a term is a known musical term
   */
  isMusicalTerm(term: string): boolean {
    const normalizedTerm = term.trim().toLowerCase()

    return (
      ITALIAN_TERMS.has(normalizedTerm) ||
      GERMAN_TERMS.has(normalizedTerm) ||
      FRENCH_TERMS.has(normalizedTerm) ||
      LATIN_TERMS.has(normalizedTerm) ||
      ENGLISH_TERMS.has(normalizedTerm) ||
      SPANISH_TERMS.has(normalizedTerm)
    )
  }

  /**
   * Detect languages for multiple terms
   */
  async detectLanguages(terms: string[]): Promise<LanguageDetectionResult[]> {
    return Promise.all(terms.map(term => this.detectLanguage(term)))
  }
}
