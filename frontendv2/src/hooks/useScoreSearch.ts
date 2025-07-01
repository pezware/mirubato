import { useState, useEffect, useRef } from 'react'
import { scoreService } from '../services/scoreService'
import type { Score } from '../services/scoreService'
import type { AutocompleteOption } from '../components/ui/Autocomplete'

interface UseScoreSearchOptions {
  minLength?: number
  debounceMs?: number
}

export function useScoreSearch({
  minLength = 2,
  debounceMs = 300,
}: UseScoreSearchOptions = {}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Score[]>([])
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Debounce the query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query, debounceMs])

  // Search when debounced query changes
  useEffect(() => {
    const searchScores = async () => {
      if (debouncedQuery.length < minLength) {
        setResults([])
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        const response = await scoreService.searchScores({
          query: debouncedQuery,
          limit: 10,
        })
        setResults(response.items || [])
      } catch (err) {
        console.error('Score search failed:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchScores()
  }, [debouncedQuery, minLength])

  // Convert scores to autocomplete options
  const suggestions: AutocompleteOption[] = results.map(score => ({
    value: score.id,
    label: score.title,
    metadata: {
      composer: score.composer,
      instrument: score.instrument,
      difficulty: score.difficulty,
    },
  }))

  return {
    query,
    setQuery,
    suggestions,
    isLoading: isSearching,
    error,
    results,
  }
}
