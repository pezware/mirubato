import type { LogbookEntry } from '../api/logbook'

interface AutocompleteResult {
  value: string
  label: string
  metadata?: {
    gradeLevel?: number
    instrument?: string
    composer?: string
  }
}

interface AutocompleteResponse {
  results: AutocompleteResult[]
  total: number
}

const ENTRIES_KEY = 'mirubato:logbook:entries'

export function getLocalLogbookEntries(): LogbookEntry[] {
  try {
    const entriesJson = localStorage.getItem(ENTRIES_KEY)
    if (!entriesJson) return []

    const entriesMap = JSON.parse(entriesJson) as Record<string, LogbookEntry>
    return Object.values(entriesMap)
  } catch (error) {
    console.error('Error reading local logbook entries:', error)
    return []
  }
}

export function searchLocalComposers(
  query: string,
  limit = 10
): AutocompleteResponse {
  if (query.length < 2) {
    return { results: [], total: 0 }
  }

  const entries = getLocalLogbookEntries()
  const composerSet = new Set<string>()

  // Extract all unique composers
  entries.forEach(entry => {
    if (entry.pieces && Array.isArray(entry.pieces)) {
      entry.pieces.forEach(piece => {
        if (piece.composer) {
          composerSet.add(piece.composer)
        }
      })
    }
  })

  // Filter by query
  const queryLower = query.toLowerCase()
  const matchingComposers = Array.from(composerSet)
    .filter(composer => composer.toLowerCase().includes(queryLower))
    .sort((a, b) => {
      // Prioritize matches at the beginning
      const aStartsWith = a.toLowerCase().startsWith(queryLower)
      const bStartsWith = b.toLowerCase().startsWith(queryLower)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return a.localeCompare(b)
    })
    .slice(0, limit)

  const results: AutocompleteResult[] = matchingComposers.map(composer => ({
    value: composer,
    label: composer,
  }))

  return {
    results,
    total: matchingComposers.length,
  }
}

export function searchLocalPieces(
  query: string,
  composerFilter?: string,
  limit = 10
): AutocompleteResponse {
  if (query.length < 2) {
    return { results: [], total: 0 }
  }

  const entries = getLocalLogbookEntries()
  const piecesMap = new Map<
    string,
    { composer?: string; gradeLevel?: number }
  >()

  // Extract all unique pieces with metadata
  entries.forEach(entry => {
    if (entry.pieces && Array.isArray(entry.pieces)) {
      entry.pieces.forEach(piece => {
        if (piece.title) {
          // Store the piece with its metadata, preferring existing metadata
          const existing = piecesMap.get(piece.title)
          piecesMap.set(piece.title, {
            composer: piece.composer || existing?.composer,
            gradeLevel: existing?.gradeLevel, // gradeLevel is not part of LogbookEntry pieces
          })
        }
      })
    }
  })

  // Filter by query and optional composer
  const queryLower = query.toLowerCase()
  const composerLower = composerFilter?.toLowerCase()

  const matchingPieces = Array.from(piecesMap.entries())
    .filter(([title, metadata]) => {
      const titleMatches = title.toLowerCase().includes(queryLower)
      const composerMatches =
        !composerFilter ||
        metadata.composer?.toLowerCase().includes(composerLower || '')
      return titleMatches && composerMatches
    })
    .sort(([aTitle], [bTitle]) => {
      // Prioritize matches at the beginning
      const aStartsWith = aTitle.toLowerCase().startsWith(queryLower)
      const bStartsWith = bTitle.toLowerCase().startsWith(queryLower)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return aTitle.localeCompare(bTitle)
    })
    .slice(0, limit)

  const results: AutocompleteResult[] = matchingPieces.map(
    ([title, metadata]) => ({
      value: title,
      label: title,
      metadata: {
        composer: metadata.composer,
        gradeLevel: metadata.gradeLevel,
        instrument: undefined, // Could be extracted if stored in logbook entries
      },
    })
  )

  return {
    results,
    total: matchingPieces.length,
  }
}

export function isOnline(): boolean {
  return navigator.onLine
}
