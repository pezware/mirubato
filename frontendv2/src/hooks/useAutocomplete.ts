import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { autocompleteApi } from '../api/autocomplete'
import type { AutocompleteOption } from '../components/ui/Autocomplete'
import { useLogbookStore } from '../stores/logbookStore'
import { isOnline } from '../utils/offlineAutocomplete'

interface UseAutocompleteOptions {
  type: 'composer' | 'piece'
  minLength?: number
  debounceMs?: number
  composer?: string // For piece searches, optionally filter by composer
}

export function useAutocomplete({
  type,
  minLength = 2,
  debounceMs = 300,
  composer,
}: UseAutocompleteOptions) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isOffline, setIsOffline] = useState(!isOnline())
  const debounceTimer = useRef<NodeJS.Timeout>()
  const { entries } = useLogbookStore()

  // Debounce the query
  useEffect(() => {
    setIsTyping(true)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query)
      setIsTyping(false)
    }, debounceMs)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query, debounceMs])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch suggestions from API
  const { data, error, isLoading } = useSWR(
    debouncedQuery.length >= minLength
      ? ['autocomplete', type, debouncedQuery, composer]
      : null,
    () => {
      if (type === 'composer') {
        return autocompleteApi.getComposerSuggestions(debouncedQuery)
      } else {
        return autocompleteApi.getPieceSuggestions(debouncedQuery, composer)
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Get local suggestions from user's practice history
  const getLocalSuggestions = useCallback((): AutocompleteOption[] => {
    if (query.length < minLength) return []

    const suggestions = new Map<string, AutocompleteOption>()
    const queryLower = query.toLowerCase()

    entries.forEach(entry => {
      entry.pieces.forEach(piece => {
        if (type === 'composer' && piece.composer) {
          if (piece.composer.toLowerCase().includes(queryLower)) {
            suggestions.set(piece.composer, {
              value: piece.composer,
              label: piece.composer,
            })
          }
        } else if (type === 'piece') {
          if (piece.title.toLowerCase().includes(queryLower)) {
            // If filtering by composer, only include pieces by that composer
            if (!composer || piece.composer === composer) {
              suggestions.set(piece.title, {
                value: piece.title,
                label: piece.title,
                metadata: { composer: piece.composer },
              })
            }
          }
        }
      })
    })

    return Array.from(suggestions.values())
  }, [entries, query, type, composer, minLength])

  // Combine API and local suggestions
  const suggestions = useCallback((): AutocompleteOption[] => {
    const localSuggestions = getLocalSuggestions()

    // If offline or API error, return only local suggestions
    if (error || !data?.results) {
      return localSuggestions
    }

    // Merge API and local suggestions, avoiding duplicates
    const combined = new Map<string, AutocompleteOption>()

    // Add local suggestions first (higher priority)
    localSuggestions.forEach(suggestion => {
      combined.set(suggestion.value.toLowerCase(), suggestion)
    })

    // Add API suggestions
    data.results.forEach((result: any) => {
      const key = result.value.toLowerCase()
      if (!combined.has(key)) {
        combined.set(key, {
          value: result.value,
          label: result.label,
          metadata: result.metadata,
        })
      }
    })

    return Array.from(combined.values())
  }, [data, error, getLocalSuggestions])

  return {
    query,
    setQuery,
    suggestions: suggestions(),
    isLoading: isLoading || isTyping,
    error,
    isOffline,
  }
}
