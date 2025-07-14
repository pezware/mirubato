import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { dictionaryAPI } from '@/api/dictionary'
import {
  DictionaryEntry,
  SearchOptions,
  SearchFilters,
  DictionaryState,
} from '@/types/dictionary'
import { Card } from '@/components/ui'
import DictionarySearch from './DictionarySearch'
import DictionaryResults from './DictionaryResults'
import DictionaryTerm from './DictionaryTerm'
import DictionaryPopular from './DictionaryPopular'
import DictionaryCategories from './DictionaryCategories'

/**
 * Main Dictionary component container
 * Manages state and orchestrates dictionary functionality
 */
const Dictionary: React.FC = () => {
  const { t } = useTranslation(['toolbox'])

  // Component state
  const [state, setState] = useState<DictionaryState>({
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

  // Handle search
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
          filters: state.filters,
          page: 1,
          limit: 20,
        }

        const results = await dictionaryAPI.searchTerms(searchOptions)

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
        setState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : t('toolbox:dictionary.errors.searchFailed'),
          searchResults: [],
        }))
      }
    },
    [state.filters, t, saveToRecentSearches]
  )

  // Handle term selection
  const handleTermSelect = useCallback(
    async (term: string | DictionaryEntry) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        let entry: DictionaryEntry

        if (typeof term === 'string') {
          // Fetch the term
          entry = await dictionaryAPI.getTerm(term)
        } else {
          entry = term
        }

        setState(prev => ({
          ...prev,
          selectedTerm: entry,
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
    [t]
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

  // Handle page change
  const handlePageChange = useCallback(
    async (page: number) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const searchOptions: SearchOptions = {
          query: state.searchQuery,
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
    [state.searchQuery, state.filters, t]
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
      </div>

      {/* Error display */}
      {state.error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-center text-red-800">
            <span className="text-xl mr-2">⚠️</span>
            <p>{state.error}</p>
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
