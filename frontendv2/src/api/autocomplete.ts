import { apiClient } from './client'
import {
  searchLocalComposers,
  searchLocalPieces,
  isOnline,
} from '../utils/offlineAutocomplete'

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

export const autocompleteApi = {
  getComposerSuggestions: async (
    query: string,
    limit = 10
  ): Promise<AutocompleteResponse> => {
    // Check if we're offline
    if (!isOnline()) {
      console.log('Offline mode: searching local composers')
      return searchLocalComposers(query, limit)
    }

    try {
      const response = await apiClient.get<AutocompleteResponse>(
        '/api/autocomplete/composers',
        {
          params: { q: query, limit },
        }
      )
      return response.data
    } catch (error) {
      // Fallback to local search if API fails
      console.error(
        'Failed to fetch composer suggestions, falling back to local search:',
        error
      )
      return searchLocalComposers(query, limit)
    }
  },

  getPieceSuggestions: async (
    query: string,
    composer?: string,
    limit = 10
  ): Promise<AutocompleteResponse> => {
    // Check if we're offline
    if (!isOnline()) {
      console.log('Offline mode: searching local pieces')
      return searchLocalPieces(query, composer, limit)
    }

    try {
      const response = await apiClient.get<AutocompleteResponse>(
        '/api/autocomplete/pieces',
        {
          params: { q: query, composer, limit },
        }
      )
      return response.data
    } catch (error) {
      // Fallback to local search if API fails
      console.error(
        'Failed to fetch piece suggestions, falling back to local search:',
        error
      )
      return searchLocalPieces(query, composer, limit)
    }
  },
}
