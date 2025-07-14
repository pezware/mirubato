import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Button } from '@/components/ui'
import {
  sanitizeSearchInput,
  isValidMusicTerm,
} from '@/utils/dictionarySecurity'
import { dictionaryAPI } from '@/api/dictionary'
import { DictionarySearchProps } from '@/types/dictionary'
import { debounce } from 'lodash'

/**
 * Dictionary search component with input validation and autocomplete
 */
const DictionarySearch: React.FC<DictionarySearchProps> = ({
  onSearch,
  onSuggestionSelect,
  placeholder,
  maxLength = 100,
}) => {
  const { t } = useTranslation(['toolbox'])
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced function to fetch suggestions
  const debouncedFetch = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
          setSuggestions([])
          return
        }

        try {
          const results = await dictionaryAPI.getSuggestions(searchQuery)
          setSuggestions(results)
        } catch (error) {
          console.error('Failed to fetch suggestions:', error)
          setSuggestions([])
        }
      }, 300),
    []
  )

  const fetchSuggestions = useCallback(
    (searchQuery: string) => {
      debouncedFetch(searchQuery)
    },
    [debouncedFetch]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setError(null)
    setSelectedIndex(-1)

    if (value) {
      const sanitized = sanitizeSearchInput(value)
      if (sanitized && isValidMusicTerm(sanitized)) {
        fetchSuggestions(sanitized)
        setShowSuggestions(true)
      } else if (value.length >= 2) {
        setError(t('toolbox:dictionary.errors.invalidTerm'))
        setSuggestions([])
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle search submission
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!query.trim()) return

    const sanitized = sanitizeSearchInput(query)
    if (!sanitized) {
      setError(t('toolbox:dictionary.errors.emptySearch'))
      return
    }

    if (!isValidMusicTerm(sanitized)) {
      setError(t('toolbox:dictionary.errors.invalidTerm'))
      return
    }

    setShowSuggestions(false)
    onSearch(sanitized)
  }

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
    onSearch(suggestion)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={
              placeholder || t('toolbox:dictionary.searchPlaceholder')
            }
            maxLength={maxLength}
            className={error ? 'border-red-500' : ''}
            aria-label={t('toolbox:dictionary.searchLabel')}
            aria-invalid={!!error}
            aria-describedby={error ? 'search-error' : undefined}
            autoComplete="off"
          />
          {error && (
            <p id="search-error" className="text-red-500 text-sm mt-1">
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={!query.trim() || !!error}
          aria-label={t('toolbox:dictionary.searchButton')}
        >
          {t('toolbox:dictionary.search')}
        </Button>
      </form>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-label={t('toolbox:dictionary.suggestions')}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              className={`w-full text-left px-4 py-2 hover:bg-sage-50 focus:bg-sage-50 focus:outline-none ${
                index === selectedIndex ? 'bg-sage-50' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DictionarySearch
