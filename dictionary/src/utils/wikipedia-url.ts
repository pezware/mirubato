/**
 * Wikipedia URL Generation and Validation Utilities
 *
 * This module provides utilities for generating accurate Wikipedia URLs
 * based on common patterns for music-related articles.
 */

/**
 * Common Wikipedia disambiguation patterns for music terms
 */
const DISAMBIGUATION_PATTERNS = {
  // Musical forms and genres
  opera: '(opera)',
  symphony: '(symphony)',
  concerto: '(concerto)',
  sonata: '(sonata)',
  ballet: '(ballet)',
  musical: '(musical)',

  // Music theory terms
  tempo: '(tempo)',
  music: '(music)',

  // Instruments
  instrument: '(instrument)',

  // People
  composer: '(composer)',
  conductor: '(conductor)',
  pianist: '(pianist)',
  violinist: '(violinist)',
  soprano: '(soprano)',
  tenor: '(tenor)',
  baritone: '(baritone)',
  bass: '(bass)',

  // Other
  band: '(band)',
  album: '(album)',
  song: '(song)',
  EP: '(EP)',
}

/**
 * Terms that typically don't need disambiguation
 */
const NO_DISAMBIGUATION_NEEDED = new Set([
  // Unique music terms
  'allegro',
  'adagio',
  'andante',
  'presto',
  'largo',
  'fortissimo',
  'pianissimo',
  'mezzoforte',
  'mezzopiano',
  'crescendo',
  'decrescendo',
  'diminuendo',
  'staccato',
  'legato',
  'pizzicato',
  'arco',
  'cadenza',
  'coda',
  'dal segno',
  'da capo',

  // Composers with unique names
  'Mozart',
  'Beethoven',
  'Chopin',
  'Liszt',
  'Brahms',
  'Tchaikovsky',
  'Vivaldi',
  'Handel',
  'Haydn',
])

/**
 * Known Wikipedia title mappings for common music terms
 * This helps avoid adding unnecessary suffixes
 */
const KNOWN_MAPPINGS: Record<string, string> = {
  // Operas - most don't need composer names
  'The Magic Flute': 'The Magic Flute',
  'La Traviata': 'La traviata',
  Carmen: 'Carmen',
  'Don Giovanni': 'Don Giovanni',
  'The Marriage of Figaro': 'The Marriage of Figaro',
  Tosca: 'Tosca',
  'La Bohème': 'La bohème',
  'Madama Butterfly': 'Madama Butterfly',
  Aida: 'Aida',
  Rigoletto: 'Rigoletto',

  // Composers
  'Johann Sebastian Bach': 'Johann Sebastian Bach',
  'Wolfgang Amadeus Mozart': 'Wolfgang Amadeus Mozart',
  'Ludwig van Beethoven': 'Ludwig van Beethoven',

  // Music theory terms
  Tempo: 'Tempo',
  Dynamics: 'Dynamics (music)',
  Harmony: 'Harmony',
  Melody: 'Melody',
  Rhythm: 'Rhythm',
  Scale: 'Scale (music)',
  Key: 'Key (music)',
  Chord: 'Chord (music)',
}

/**
 * Clean and format a term for Wikipedia URL generation
 */
export function cleanWikipediaTerm(term: string): string {
  // Remove common filler words and clean up
  let cleaned = term
    .replace(/\b(wikipedia|search|for|on|article|page)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Capitalize first letter of each word (Wikipedia convention)
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return cleaned
}

/**
 * Determine if a term needs disambiguation based on context
 */
export function needsDisambiguation(term: string, _termType: string): boolean {
  // Check if term is in the no-disambiguation list
  if (NO_DISAMBIGUATION_NEEDED.has(term.toLowerCase())) {
    return false
  }

  // Check known mappings
  if (KNOWN_MAPPINGS[term]) {
    return KNOWN_MAPPINGS[term].includes('(')
  }

  // Common terms that often need disambiguation
  const commonAmbiguousTerms = [
    'scale',
    'key',
    'chord',
    'dynamics',
    'harmony',
    'pitch',
    'tone',
    'mode',
    'movement',
    'suite',
  ]

  return commonAmbiguousTerms.includes(term.toLowerCase())
}

/**
 * Generate the most likely Wikipedia URL for a music term
 */
export function generateWikipediaUrl(
  term: string,
  termType: string,
  aiSuggestion?: string
): string {
  // Clean the term
  let wikiTitle = cleanWikipediaTerm(term)

  // Check known mappings first
  if (KNOWN_MAPPINGS[term]) {
    wikiTitle = KNOWN_MAPPINGS[term]
  } else if (aiSuggestion) {
    // Use AI suggestion but clean it
    wikiTitle = cleanWikipediaTerm(aiSuggestion)

    // Remove redundant composer names from opera titles
    // e.g., "The Magic Flute Mozart" -> "The Magic Flute"
    if (termType === 'composition' || termType === 'opera') {
      wikiTitle = wikiTitle.replace(
        /\s+(Mozart|Beethoven|Bach|Wagner|Verdi|Puccini|Handel|Haydn|Brahms|Schubert)$/i,
        ''
      )
    }
  }

  // Add disambiguation if needed
  if (needsDisambiguation(wikiTitle, termType) && !wikiTitle.includes('(')) {
    const disambiguator =
      DISAMBIGUATION_PATTERNS[
        termType as keyof typeof DISAMBIGUATION_PATTERNS
      ] || '(music)'
    wikiTitle = `${wikiTitle} ${disambiguator}`
  }

  // Encode for URL
  const encoded = encodeURIComponent(wikiTitle.replace(/ /g, '_'))

  return `https://en.wikipedia.org/wiki/${encoded}`
}

/**
 * Generate search URL for Wikipedia OpenSearch API
 */
export function generateWikipediaSearchUrl(
  term: string,
  limit: number = 5
): string {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: term,
    limit: limit.toString(),
    namespace: '0', // Only search articles
    format: 'json',
    origin: '*', // Enable CORS
  })

  return `https://en.wikipedia.org/w/api.php?${params.toString()}`
}

/**
 * Parse OpenSearch API response and return the best match
 */
export function parseBestMatch(
  searchResults: [string, string[], string[], string[]],
  originalTerm: string
): string | null {
  const [, titles, , urls] = searchResults

  if (!titles || titles.length === 0) {
    return null
  }

  // Look for exact match first
  const exactIndex = titles.findIndex(
    title => title.toLowerCase() === originalTerm.toLowerCase()
  )

  if (exactIndex !== -1) {
    return urls[exactIndex]
  }

  // Return first result as best match
  return urls[0]
}

/**
 * Validate if a Wikipedia URL exists (for use in workers)
 */
export async function validateWikipediaUrl(url: string): Promise<boolean> {
  try {
    // Extract title from URL
    const match = url.match(/wiki\/(.+)$/)
    if (!match) return false

    const title = decodeURIComponent(match[1].replace(/_/g, ' '))

    // Use Wikipedia API to check if page exists
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json&origin=*`

    const response = await fetch(apiUrl)
    const data = (await response.json()) as {
      query: { pages: Record<string, any> }
    }

    // Check if page exists (not a missing page)
    const pages = data.query.pages
    const pageId = Object.keys(pages)[0]

    return pageId !== '-1' // -1 indicates missing page
  } catch (error) {
    console.error('Error validating Wikipedia URL:', error)
    return false
  }
}

/**
 * Get Wikipedia suggestions using OpenSearch API
 */
export async function getWikipediaSuggestions(
  term: string,
  limit: number = 5
): Promise<{ title: string; url: string }[]> {
  try {
    const searchUrl = generateWikipediaSearchUrl(term, limit)
    const response = await fetch(searchUrl)
    const results = (await response.json()) as [
      string,
      string[],
      string[],
      string[],
    ]

    const [, titles, , urls] = results

    if (!titles || titles.length === 0) {
      return []
    }

    return titles.map((title, index) => ({
      title,
      url: urls[index],
    }))
  } catch (error) {
    console.error('Error fetching Wikipedia suggestions:', error)
    return []
  }
}
