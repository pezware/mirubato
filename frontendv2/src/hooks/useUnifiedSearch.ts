import { useMemo } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import { useScoreStore } from '../stores/scoreStore'
import type { LogbookEntry } from '../api/logbook'
import type { Score } from '../stores/scoreStore'

export interface UnifiedSearchResult {
  type: 'logbook' | 'score'
  id: string
  title: string
  subtitle?: string
  date?: string
  duration?: number
  instrument?: string
  score?: number
  data: LogbookEntry | Score
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim()
}

function searchLogEntries(
  entries: LogbookEntry[],
  query: string
): UnifiedSearchResult[] {
  const normalizedQuery = normalizeString(query)

  return entries
    .filter(entry => {
      const searchableText = [
        entry.notes || '',
        entry.scoreTitle || '',
        entry.scoreComposer || '',
        ...entry.pieces.map(p => `${p.title} ${p.composer || ''}`),
        ...entry.techniques,
        ...entry.tags,
        entry.type,
        entry.instrument,
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
    .map(entry => ({
      type: 'logbook' as const,
      id: entry.id,
      title:
        entry.scoreTitle ||
        entry.pieces.map(p => p.title).join(', ') ||
        'Practice Session',
      subtitle: entry.notes?.substring(0, 100),
      date: entry.timestamp,
      duration: entry.duration,
      instrument: entry.instrument,
      data: entry,
    }))
}

function searchScores(scores: Score[], query: string): UnifiedSearchResult[] {
  const normalizedQuery = normalizeString(query)

  return scores
    .filter(score => {
      const searchableText = [
        score.title,
        score.composer,
        score.genre || '',
        score.difficulty || '',
        ...(score.tags || []),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
    .map(score => ({
      type: 'score' as const,
      id: score.id,
      title: score.title,
      subtitle: score.composer,
      score: 100, // Placeholder relevance score
      data: score,
    }))
}

export function useUnifiedSearch(query: string) {
  const { entries } = useLogbookStore()
  const { scores } = useScoreStore()

  const results = useMemo(() => {
    if (!query || query.length < 2) {
      return {
        logResults: [],
        scoreResults: [],
        combined: [],
      }
    }

    const logResults = searchLogEntries(entries, query)
    const scoreResults = searchScores(scores, query)

    // Combine and sort by relevance/date
    const combined = [...logResults, ...scoreResults].sort((a, b) => {
      // Prioritize exact title matches
      const aExactMatch = normalizeString(a.title).includes(
        normalizeString(query)
      )
      const bExactMatch = normalizeString(b.title).includes(
        normalizeString(query)
      )

      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1

      // Then sort by date (most recent first)
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }

      // Scores without dates come after logs with dates
      if (a.date && !b.date) return -1
      if (!a.date && b.date) return 1

      return 0
    })

    return {
      logResults,
      scoreResults,
      combined,
    }
  }, [entries, scores, query])

  return results
}
