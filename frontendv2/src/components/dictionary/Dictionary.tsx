import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { dictionaryAPI } from '@/api/dictionary'
import {
  DictionaryEntry,
  SearchOptions,
  DictionaryState,
  SupportedLanguage,
} from '@/types/dictionary'
import { Button, Card, CardContent } from '@/components/ui'
import DictionarySearch from './DictionarySearch'
import DictionaryResults from './DictionaryResults'
import DictionaryTerm from './DictionaryTerm'
import DictionaryPopular from './DictionaryPopular'
import DictionaryCategories from './DictionaryCategories'
import {
  Clock,
  AlertCircle,
  Globe,
  Languages,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'

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
  const { lang, term } = useParams<{ lang?: string; term?: string }>()
  const navigate = useNavigate()

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

  // Auto-load term from URL parameters (SEO support)
  useEffect(() => {
    if (term && lang) {
      // Decode the term from URL
      const decodedTerm = decodeURIComponent(term)

      // Validate that this is a supported language
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW']
      if (!supportedLanguages.includes(lang)) {
        // Redirect to default language
        navigate(`/dictionary/en/${term}`, { replace: true })
        return
      }

      // Set the search query and trigger term load
      setState(prev => ({ ...prev, searchQuery: decodedTerm }))

      // Load the term directly here to avoid dependency issues
      const loadTermFromUrl = async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        try {
          const entry = await dictionaryAPI.getTerm(decodedTerm, {
            generateIfMissing: true,
            lang: lang,
            searchAllLanguages: true,
          })

          setState(prev => ({
            ...prev,
            selectedTerm: entry,
            isLoading: false,
          }))

          // Add to recent searches
          const recent = JSON.parse(
            localStorage.getItem('recentSearches') || '[]'
          )
          const updatedRecent = [
            decodedTerm,
            ...recent.filter((r: string) => r !== decodedTerm),
          ].slice(0, 5)
          localStorage.setItem('recentSearches', JSON.stringify(updatedRecent))
          setState(prev => ({ ...prev, recentSearches: updatedRecent }))
        } catch (error) {
          console.error('Failed to load term from URL:', error)
          setState(prev => ({
            ...prev,
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to load term',
          }))
        }
      }

      loadTermFromUrl()
    }
  }, [lang, term, navigate])

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

      // Check if dictionary service is available
      if (!dictionaryAPI.isServiceAvailable()) {
        setState(prev => ({
          ...prev,
          error: t('toolbox:dictionary.errors.serviceUnavailable'),
          errorDetails: { code: 'SERVICE_UNAVAILABLE' },
          isLoading: false,
        }))
        return
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        searchQuery: query,
        // Clear filters when performing a new search
        filters: {},
      }))

      try {
        const searchOptions: SearchOptions = {
          query,
          lang: currentLanguage,
          searchAllLanguages: searchAllLanguages,
          // Don't use state.filters here since we just cleared them
          filters: {},
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
        let errorDetails: {
          code?: string
          suggestions?: string[]
          estimatedCompletion?: string
        } = {}

        if (error instanceof Error) {
          const dictError = error as DictionaryError
          errorDetails = {
            code: dictError.code,
            suggestions: dictError.suggestions,
            estimatedCompletion: dictError.estimatedCompletion,
          }

          // Check for specific error codes
          if (dictError.code === 'RATE_LIMIT_EXCEEDED') {
            errorMessage = t('toolbox:dictionary.errors.rateLimitExceeded')
            if (dictError.estimatedCompletion) {
              errorMessage +=
                ' ' +
                t('toolbox:dictionary.errors.tryAgainIn', {
                  time: dictError.estimatedCompletion,
                })
            }
          } else {
            errorMessage = error.message
          }
        } else if (typeof error === 'object' && error !== null) {
          // Handle non-Error objects
          errorMessage =
            ((error as Record<string, unknown>).message as string) ||
            ((error as Record<string, unknown>).error as string) ||
            String(error)
        } else {
          // Handle other types
          errorMessage = String(error)
        }

        console.error('Dictionary search error:', error)

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          errorDetails,
          searchResults: [],
        }))
      }
    },
    [t, saveToRecentSearches, currentLanguage, searchAllLanguages]
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

        // Update URL to SEO-friendly format when term is selected
        if (entry && !lang) {
          // Only update if not already on a SEO URL
          const termLang = entry.lang || currentLanguage
          const encodedTerm = encodeURIComponent(entry.normalized_term)
          navigate(`/dictionary/${termLang}/${encodedTerm}`, { replace: true })
        }

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
        } else if (errorDetails.code === 'RATE_LIMIT_EXCEEDED') {
          errorMessage = t('toolbox:dictionary.errors.rateLimitExceeded')
          if (errorDetails.estimatedCompletion) {
            errorMessage +=
              ' ' +
              t('toolbox:dictionary.errors.tryAgainIn', {
                time: errorDetails.estimatedCompletion,
              })
          }
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          errorDetails,
        }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, currentLanguage, showLanguageComparison]
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

  // Handle back to dictionary (clear filters and search)
  const handleBackToDictionary = () => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      searchResults: [],
      selectedTerm: null,
      filters: {},
      currentPage: 1,
      totalPages: 1,
      totalResults: 0,
      error: null,
    }))

    // Clear URL parameters if coming from SEO route
    if (lang || term) {
      // Navigate to clean toolbox URL but stay on dictionary tab
      navigate('/toolbox', { replace: true })
      // The parent Toolbox component should handle switching to dictionary tab
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-stone-800">
          {t('toolbox:dictionary.title')}
        </h2>
        <p className="text-stone-600">{t('toolbox:dictionary.description')}</p>
      </div>

      {/* Search Controls Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <DictionarySearch
            onSearch={handleSearch}
            placeholder={t('toolbox:dictionary.searchPlaceholder')}
          />

          {/* Language options */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer hover:text-stone-900 transition-colors">
                <input
                  type="checkbox"
                  checked={searchAllLanguages}
                  onChange={e => setSearchAllLanguages(e.target.checked)}
                  className="rounded border-gray-300 text-morandi-sage-600 focus:ring-morandi-sage-500 focus:ring-offset-0"
                />
                <Globe className="w-4 h-4 text-morandi-sage-500" />
                <span>{t('toolbox:dictionary.searchAllLanguages')}</span>
              </label>

              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Languages className="w-4 h-4 text-morandi-sage-500" />
                <span>
                  {t('toolbox:dictionary.currentLanguage', {
                    lang: currentLanguage.toUpperCase(),
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {state.error && (
        <div className="mb-6 bg-white rounded-lg p-4 border-l-4 border-red-300">
          <div className="space-y-3">
            <div className="flex items-center text-red-800">
              <div className="mr-3">
                {state.errorDetails?.code === 'AI_GENERATION_PENDING' ||
                state.errorDetails?.code === 'RATE_LIMIT_EXCEEDED' ? (
                  <Clock className="w-5 h-5 text-red-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{state.error}</p>
                {state.errorDetails?.code === 'TERM_NOT_FOUND' && (
                  <p className="text-sm mt-1">
                    {t('toolbox:dictionary.aiWillGenerate')}
                  </p>
                )}
                {state.errorDetails?.code === 'SERVICE_UNAVAILABLE' && (
                  <p className="text-sm mt-1 text-amber-600">
                    {t('toolbox:dictionary.errors.serviceUnavailableDetail')}
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
        </div>
      )}

      {/* Navigation Breadcrumbs */}
      {state.selectedTerm && (
        <nav className="mb-6" aria-label="Dictionary navigation">
          {/* Desktop Breadcrumbs */}
          <div className="hidden sm:flex items-center text-sm">
            {/* Dictionary Home */}
            <button
              onClick={handleBackToDictionary}
              className="flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('toolbox:dictionary.title')}
            </button>

            {/* Language Level */}
            <ChevronRight className="w-4 h-4 mx-2 text-stone-400" />
            <span className="text-stone-600">
              {state.selectedTerm.lang === 'en' &&
                t('toolbox:dictionary.languages.english')}
              {state.selectedTerm.lang === 'es' &&
                t('toolbox:dictionary.languages.spanish')}
              {state.selectedTerm.lang === 'fr' &&
                t('toolbox:dictionary.languages.french')}
              {state.selectedTerm.lang === 'de' &&
                t('toolbox:dictionary.languages.german')}
              {state.selectedTerm.lang === 'zh-CN' &&
                t('toolbox:dictionary.languages.chineseSimplified')}
              {state.selectedTerm.lang === 'zh-TW' &&
                t('toolbox:dictionary.languages.chineseTraditional')}
              {!['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'].includes(
                state.selectedTerm.lang
              ) && state.selectedTerm.lang.toUpperCase()}{' '}
              {t('toolbox:dictionary.terms')}
            </span>

            {/* Current Term */}
            <ChevronRight className="w-4 h-4 mx-2 text-stone-400" />
            <span className="text-stone-900 font-semibold font-serif">
              {state.selectedTerm.term}
            </span>
          </div>

          {/* Mobile Breadcrumbs - Simplified */}
          <div className="sm:hidden">
            <button
              onClick={handleBackToDictionary}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors font-medium py-2 px-1 -mx-1 rounded-md min-h-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
              <div className="flex flex-col items-start">
                <span className="text-xs text-stone-500">
                  {state.selectedTerm.lang === 'en' &&
                    t('toolbox:dictionary.languages.english')}
                  {state.selectedTerm.lang === 'es' &&
                    t('toolbox:dictionary.languages.spanish')}
                  {state.selectedTerm.lang === 'fr' &&
                    t('toolbox:dictionary.languages.french')}
                  {state.selectedTerm.lang === 'de' &&
                    t('toolbox:dictionary.languages.german')}
                  {state.selectedTerm.lang === 'zh-CN' &&
                    t('toolbox:dictionary.languages.chineseSimplified')}
                  {state.selectedTerm.lang === 'zh-TW' &&
                    t('toolbox:dictionary.languages.chineseTraditional')}
                  {!['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'].includes(
                    state.selectedTerm.lang
                  ) && state.selectedTerm.lang.toUpperCase()}{' '}
                  {t('toolbox:dictionary.title')}
                </span>
                <span className="text-base font-serif text-stone-900">
                  {state.selectedTerm.term}
                </span>
              </div>
            </button>
          </div>

          {/* Secondary navigation for search results */}
          {state.searchResults.length > 0 && (
            <div className="mt-2">
              <button
                onClick={handleBackToResults}
                className="text-xs text-stone-500 hover:text-stone-700 transition-colors flex items-center gap-1 py-1 px-1 -mx-1 rounded min-h-[32px]"
              >
                ←{' '}
                {t('toolbox:dictionary.backToSearchResults', {
                  query: state.searchQuery,
                  count: state.searchResults.length,
                })}
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Main content area */}
      {state.selectedTerm ? (
        // Show selected term
        <div>
          <DictionaryTerm
            entry={state.selectedTerm}
            onBack={
              state.searchResults.length > 0
                ? handleBackToResults
                : handleBackToDictionary
            }
          />

          {/* Language indicator for the term */}
          {state.selectedTerm.lang &&
            state.selectedTerm.lang !== currentLanguage && (
              <div className="mt-4 bg-white rounded-lg p-3 border-l-4 border-morandi-sky-300">
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
              </div>
            )}
        </div>
      ) : state.searchResults.length > 0 ? (
        // Show search results
        <div>
          {/* Show back button when browsing by category */}
          {state.filters.type && state.filters.type.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDictionary}
              className="mb-4 text-morandi-stone-600 hover:text-morandi-stone-800 hover:bg-morandi-stone-50 transition-colors flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('toolbox:dictionary.backToDictionary')}
            </Button>
          )}
          <DictionaryResults
            results={state.searchResults}
            totalResults={state.totalResults}
            currentPage={state.currentPage}
            totalPages={state.totalPages}
            onTermSelect={handleTermSelect}
            onPageChange={handlePageChange}
            isLoading={state.isLoading}
          />
        </div>
      ) : state.searchQuery && !state.isLoading ? (
        // No results
        <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-stone-300 text-center">
          <p className="text-stone-600">
            {t('toolbox:dictionary.noResults', { query: state.searchQuery })}
          </p>
          {searchAllLanguages && (
            <p className="text-sm text-stone-500 mt-2">
              {t('toolbox:dictionary.searchedAllLanguages')}
            </p>
          )}
        </div>
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
              onCategorySelect={async category => {
                // Clear current search and apply category filter
                setState(prev => ({
                  ...prev,
                  searchQuery: '',
                  selectedTerm: null,
                  filters: { type: [category] },
                  isLoading: true,
                  error: null,
                }))

                // Search for all terms in the selected category
                try {
                  const searchOptions: SearchOptions = {
                    query: '', // Empty query to get all terms
                    filters: { type: [category] },
                    lang: currentLanguage,
                    searchAllLanguages: false, // Category browsing is language-specific
                    page: 1,
                    limit: 20,
                  }

                  const results = await dictionaryAPI.searchTerms(searchOptions)

                  setState(prev => ({
                    ...prev,
                    searchResults: results.entries,
                    totalResults: results.total,
                    totalPages: Math.ceil(results.total / results.limit),
                    currentPage: 1,
                    isLoading: false,
                  }))
                } catch (error) {
                  console.error('Failed to browse category:', error)

                  let errorMessage = t('toolbox:dictionary.errors.searchFailed')
                  let errorDetails: {
                    code?: string
                    estimatedCompletion?: string
                  } = {}

                  if (error instanceof Error) {
                    const dictError = error as DictionaryError
                    errorDetails = {
                      code: dictError.code,
                      estimatedCompletion: dictError.estimatedCompletion,
                    }

                    // Check for rate limit error
                    if (dictError.code === 'RATE_LIMIT_EXCEEDED') {
                      errorMessage = t(
                        'toolbox:dictionary.errors.rateLimitExceeded'
                      )
                      if (dictError.estimatedCompletion) {
                        errorMessage +=
                          ' ' +
                          t('toolbox:dictionary.errors.tryAgainIn', {
                            time: dictError.estimatedCompletion,
                          })
                      }
                    }
                  }

                  setState(prev => ({
                    ...prev,
                    error: errorMessage,
                    errorDetails,
                    isLoading: false,
                  }))
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600 mr-3"></div>
              <p>{t('toolbox:dictionary.loading')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dictionary
