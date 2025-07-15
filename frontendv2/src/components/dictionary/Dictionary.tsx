import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { dictionaryAPI } from '@/api/dictionary'
import {
  DictionaryEntry,
  SearchOptions,
  SearchFilters,
  DictionaryState,
  SupportedLanguage,
} from '@/types/dictionary'
import { Card, Button } from '@/components/ui'
import DictionarySearch from './DictionarySearch'
import DictionaryResults from './DictionaryResults'
import DictionaryTerm from './DictionaryTerm'
import DictionaryPopular from './DictionaryPopular'
import DictionaryCategories from './DictionaryCategories'

// Error type for dictionary errors
interface DictionaryError extends Error {
  code?: string
  suggestions?: string[]
  jobId?: string
  estimatedCompletion?: string
}

/**
 * Main Dictionary component container
 * Manages state and orchestrates dictionary functionality
 */
const Dictionary: React.FC = () => {
  const { t, i18n } = useTranslation(['toolbox'])

  // Component state
  const [state, setState] = useState<
    DictionaryState & {
      errorDetails?: {
        code?: string
        suggestions?: string[]
        jobId?: string
        estimatedCompletion?: string
      }
    }
  >({
    searchQuery: '',
    searchResults: [],
    selectedTerm: null,
    popularTerms: [],
    recentSearches: [],
    searchHistory: [],
    isLoading: false,
    error: null,
    filters: {},
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
  })

  // State for language options
  const [searchAllLanguages, setSearchAllLanguages] = useState(true)
  const [showLanguageComparison] = useState(false)

  // Get current UI language
  const currentLanguage = i18n.language as SupportedLanguage

  // Load popular terms and recent searches on mount
  useEffect(() => {
    loadPopularTerms()
    loadRecentSearches()
  }, [])

  // Load popular terms
  const loadPopularTerms = async () => {
    try {
      const terms = await dictionaryAPI.getPopularTerms(8)
      setState(prev => ({ ...prev, popularTerms: terms }))
    } catch (error) {
      console.error('Failed to load popular terms:', error)
    }
  }

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('dictionary_recent_searches')
      if (saved) {
        const searches = JSON.parse(saved) as string[]
        setState(prev => ({ ...prev, recentSearches: searches.slice(0, 5) }))
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error)
    }
  }

  // Save search to recent searches
  const saveToRecentSearches = useCallback((query: string) => {
    setState(prev => {
      const updated = [
        query,
        ...prev.recentSearches.filter(s => s !== query),
      ].slice(0, 5)
      localStorage.setItem(
        'dictionary_recent_searches',
        JSON.stringify(updated)
      )
      return { ...prev, recentSearches: updated }
    })
  }, [])

  // Handle search with language support
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setState(prev => ({
          ...prev,
          searchResults: [],
          selectedTerm: null,
          error: null,
        }))
        return
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        searchQuery: query,
      }))

      try {
        const searchOptions: SearchOptions = {
          query,
          lang: currentLanguage,
          searchAllLanguages: searchAllLanguages,
          filters: state.filters,
          page: 1,
          limit: 20,
        }

        const results = await dictionaryAPI.searchTerms(searchOptions)

        // If no results found, try to get the exact term with AI generation
        if (results.entries.length === 0) {
          try {
            const entry = await dictionaryAPI.getTerm(query, {
              generateIfMissing: true,
              lang: currentLanguage,
              searchAllLanguages: false, // Only generate for the current UI language
            })

            setState(prev => ({
              ...prev,
              selectedTerm: entry,
              searchResults: [],
              isLoading: false,
            }))

            // Save successful search
            saveToRecentSearches(query)
            return
          } catch (termError) {
            // If term fetch also fails, continue with normal error handling
            console.log('Term fetch failed:', termError)
          }
        }

        setState(prev => ({
          ...prev,
          searchResults: results.entries,
          totalResults: results.total,
          totalPages: Math.ceil(results.total / results.limit),
          currentPage: results.page,
          isLoading: false,
        }))

        // Save successful search
        saveToRecentSearches(query)

        // If only one result, auto-select it
        if (results.entries.length === 1) {
          setState(prev => ({ ...prev, selectedTerm: results.entries[0] }))
        }
      } catch (error) {
        // Handle different error types for search
        let errorMessage = t('toolbox:dictionary.errors.searchFailed')
        let errorDetails: { code?: string } = {}

        if (error instanceof Error) {
          errorMessage = error.message
          errorDetails = { code: (error as DictionaryError).code }
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          errorDetails,
          searchResults: [],
        }))
      }
    },
    [
      state.filters,
      t,
      saveToRecentSearches,
      currentLanguage,
      searchAllLanguages,
    ]
  )

  // Handle term selection with language support
  const handleTermSelect = useCallback(
    async (term: string | DictionaryEntry) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        let entry: DictionaryEntry

        if (typeof term === 'string') {
          // Fetch the term with language preference and AI generation enabled
          entry = await dictionaryAPI.getTerm(term, {
            generateIfMissing: true, // Enable AI generation if term not found
            lang: currentLanguage,
            searchAllLanguages: searchAllLanguages, // Respect the user's language preference
          })
        } else {
          entry = term
        }

        setState(prev => ({
          ...prev,
          selectedTerm: entry,
          isLoading: false,
        }))

        // If showing language comparison, fetch other languages
        if (showLanguageComparison && entry) {
          try {
            const multiLangData = await dictionaryAPI.getTermInLanguages(
              entry.normalized_term,
              ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW']
            )
            // Store multi-language data in state if needed
            console.log('Multi-language data:', multiLangData)
          } catch (error) {
            console.error('Failed to fetch multi-language data:', error)
          }
        }
      } catch (error) {
        // Handle different error types
        let errorMessage = t('toolbox:dictionary.errors.loadFailed')
        let errorDetails: {
          code?: string
          suggestions?: string[]
          jobId?: string
          estimatedCompletion?: string
        } = {}

        if (error instanceof Error) {
          const dictError = error as DictionaryError
          errorMessage = error.message
          errorDetails = {
            code: dictError.code,
            suggestions: dictError.suggestions,
            jobId: dictError.jobId,
            estimatedCompletion: dictError.estimatedCompletion,
          }
        }

        // Handle specific error codes
        if (errorDetails.code === 'TERM_NOT_FOUND') {
          errorMessage = t('toolbox:dictionary.termNotFound', {
            term: typeof term === 'string' ? term : term.term,
          })
          if (errorDetails.suggestions && errorDetails.suggestions.length > 0) {
            errorMessage += '. ' + t('toolbox:dictionary.didYouMean')
          }
        } else if (errorDetails.code === 'AI_GENERATION_PENDING') {
          errorMessage = t('toolbox:dictionary.aiGenerating')
          if (errorDetails.estimatedCompletion) {
            errorMessage +=
              ' ' +
              t('toolbox:dictionary.estimatedTime', {
                time: errorDetails.estimatedCompletion,
              })
          }
        } else if (errorDetails.code === 'AI_SERVICE_UNAVAILABLE') {
          errorMessage = t('toolbox:dictionary.aiServiceUnavailable')
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          errorDetails,
        }))
      }
    },
    [t, currentLanguage, showLanguageComparison]
  )

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filters: SearchFilters) => {
      setState(prev => ({ ...prev, filters }))
      // Re-search with new filters if there's a query
      if (state.searchQuery) {
        handleSearch(state.searchQuery)
      }
    },
    [state.searchQuery, handleSearch]
  )

  // Handle page change with language support
  const handlePageChange = useCallback(
    async (page: number) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const searchOptions: SearchOptions = {
          query: state.searchQuery,
          lang: currentLanguage,
          searchAllLanguages,
          filters: state.filters,
          page,
          limit: 20,
        }

        const results = await dictionaryAPI.searchTerms(searchOptions)

        setState(prev => ({
          ...prev,
          searchResults: results.entries,
          currentPage: page,
          isLoading: false,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : t('toolbox:dictionary.errors.loadFailed'),
        }))
      }
    },
    [state.searchQuery, state.filters, t, currentLanguage, searchAllLanguages]
  )

  // Handle back to results
  const handleBackToResults = () => {
    setState(prev => ({ ...prev, selectedTerm: null }))
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-stone-800">
          {t('toolbox:dictionary.title')}
        </h2>
        <p className="text-stone-600">{t('toolbox:dictionary.description')}</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <DictionarySearch
          onSearch={handleSearch}
          placeholder={t('toolbox:dictionary.searchPlaceholder')}
        />

        {/* Language options */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={searchAllLanguages}
              onChange={e => setSearchAllLanguages(e.target.checked)}
              className="mr-2"
            />
            {t('toolbox:dictionary.searchAllLanguages')}
          </label>
          <span className="text-stone-500">
            {t('toolbox:dictionary.currentLanguage', {
              lang: currentLanguage.toUpperCase(),
            })}
          </span>
        </div>
      </div>

      {/* Error display */}
      {state.error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="space-y-3">
            <div className="flex items-center text-red-800">
              <span className="text-xl mr-2">
                {state.errorDetails?.code === 'AI_GENERATION_PENDING'
                  ? '⏳'
                  : '⚠️'}
              </span>
              <div className="flex-1">
                <p className="font-medium">{state.error}</p>
                {state.errorDetails?.code === 'TERM_NOT_FOUND' && (
                  <p className="text-sm mt-1">
                    {t('toolbox:dictionary.aiWillGenerate')}
                  </p>
                )}
              </div>
            </div>

            {/* Show suggestions if available */}
            {state.errorDetails?.suggestions &&
              state.errorDetails.suggestions.length > 0 && (
                <div className="pt-3 border-t border-red-200">
                  <p className="text-sm text-red-700 mb-2">
                    {t('toolbox:dictionary.suggestions')}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {state.errorDetails.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTermSelect(suggestion)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Card>
      )}

      {/* Main content area */}
      {state.selectedTerm ? (
        // Show selected term
        <div>
          <button
            onClick={handleBackToResults}
            className="mb-4 text-sage-600 hover:text-sage-700 flex items-center"
          >
            <span className="mr-1">←</span>
            {t('toolbox:dictionary.backToResults')}
          </button>
          <DictionaryTerm entry={state.selectedTerm} />

          {/* Language indicator for the term */}
          {state.selectedTerm.lang &&
            state.selectedTerm.lang !== currentLanguage && (
              <Card className="mt-4 p-3 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-800">
                  {t('toolbox:dictionary.termInLanguage', {
                    lang: state.selectedTerm.lang.toUpperCase(),
                  })}
                  {state.selectedTerm.source_lang && (
                    <span className="ml-2">
                      (
                      {t('toolbox:dictionary.originalLanguage', {
                        lang: state.selectedTerm.source_lang,
                      })}
                      )
                    </span>
                  )}
                </p>
              </Card>
            )}
        </div>
      ) : state.searchResults.length > 0 ? (
        // Show search results
        <DictionaryResults
          results={state.searchResults}
          totalResults={state.totalResults}
          currentPage={state.currentPage}
          totalPages={state.totalPages}
          onTermSelect={handleTermSelect}
          onPageChange={handlePageChange}
          isLoading={state.isLoading}
        />
      ) : state.searchQuery && !state.isLoading ? (
        // No results
        <Card className="text-center py-8">
          <p className="text-stone-600">
            {t('toolbox:dictionary.noResults', { query: state.searchQuery })}
          </p>
          {searchAllLanguages && (
            <p className="text-sm text-stone-500 mt-2">
              {t('toolbox:dictionary.searchedAllLanguages')}
            </p>
          )}
        </Card>
      ) : (
        // Default view - popular terms and categories
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <DictionaryPopular
              terms={state.popularTerms}
              recentSearches={state.recentSearches}
              onTermSelect={handleTermSelect}
            />
          </div>
          <div>
            <DictionaryCategories
              onCategorySelect={category => {
                handleFilterChange({ type: [category] })
              }}
            />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600 mr-3"></div>
              <p>{t('toolbox:dictionary.loading')}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Dictionary
