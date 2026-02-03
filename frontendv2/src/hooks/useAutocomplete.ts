import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { autocompleteApi } from '../api/autocomplete'
import type { AutocompleteOption } from '@mirubato/ui'
import { useLogbookStore } from '../stores/logbookStore'
import { isOnline } from '../utils/offlineAutocomplete'
import { getCanonicalComposerName } from '../utils/composerCanonicalizer'
import { generateNormalizedScoreId } from '../utils/scoreIdNormalizer'
import { formatComposerName } from '../utils/textFormatting'

interface UseAutocompleteOptions {
  type: 'composer' | 'piece'
  minLength?: number
  debounceMs?: number
  composer?: string | null // For piece searches, optionally filter by composer
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
  const debounceTimer = useRef<NodeJS.Timeout>(undefined)
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
        return autocompleteApi.getPieceSuggestions(
          debouncedQuery,
          composer || undefined
        )
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
          // Apply canonicalization to composer names
          const canonicalComposer =
            getCanonicalComposerName(piece.composer) || piece.composer

          if (canonicalComposer.toLowerCase().includes(queryLower)) {
            // Use canonical name as both key and value to avoid duplicates
            suggestions.set(canonicalComposer, {
              value: canonicalComposer,
              label: canonicalComposer,
            })
          }
        } else if (type === 'piece') {
          if (piece.title.toLowerCase().includes(queryLower)) {
            // Apply canonicalization to composer in metadata
            const canonicalComposer = piece.composer
              ? getCanonicalComposerName(piece.composer) || piece.composer
              : undefined

            // If filtering by composer, only include pieces by that composer
            if (!composer || canonicalComposer === composer) {
              suggestions.set(piece.title, {
                value: piece.title,
                label: piece.title,
                metadata: { composer: canonicalComposer },
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
      if (type === 'piece') {
        // For pieces, use normalized ID as key for deduplication
        const normalizedKey = generateNormalizedScoreId(
          suggestion.value,
          suggestion.metadata?.composer
        )
        // Format composer name properly for display
        if (suggestion.metadata?.composer) {
          suggestion.metadata.composer = formatComposerName(
            suggestion.metadata.composer
          )
        }
        combined.set(normalizedKey, suggestion)
      } else if (type === 'composer') {
        // For composers, format the display value
        const formattedComposer = formatComposerName(suggestion.value)
        const normalizedKey = formattedComposer.toLowerCase()
        combined.set(normalizedKey, {
          ...suggestion,
          value: formattedComposer,
          label: formattedComposer,
        })
      }
    })

    // Add API suggestions
    data.results.forEach((result: AutocompleteOption) => {
      if (type === 'piece') {
        // For pieces, use normalized ID as key
        const normalizedKey = generateNormalizedScoreId(
          result.value,
          result.metadata?.composer
        )
        // Format composer in metadata for display
        if (result.metadata?.composer) {
          result.metadata.composer = formatComposerName(
            result.metadata.composer
          )
        }
        if (!combined.has(normalizedKey)) {
          combined.set(normalizedKey, result)
        }
      } else if (type === 'composer') {
        // For composers, format and deduplicate
        const formattedComposer = formatComposerName(result.value)
        const normalizedKey = formattedComposer.toLowerCase()
        if (!combined.has(normalizedKey)) {
          combined.set(normalizedKey, {
            ...result,
            value: formattedComposer,
            label: formattedComposer,
          })
        }
      }
    })

    return Array.from(combined.values())
  }, [data, error, getLocalSuggestions, type])

  return {
    query,
    setQuery,
    suggestions: suggestions(),
    isLoading: isLoading || isTyping,
    error,
    isOffline,
  }
}
