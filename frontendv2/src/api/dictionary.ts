import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  sanitizeSearchInput,
  isValidMusicTerm,
  createRateLimiter,
  isValidApiResponse,
} from '@/utils/dictionarySecurity'
import { z } from 'zod'
import {
  DictionaryEntry,
  SearchResult,
  BatchQueryResponse,
  Feedback,
  EnhancementJob,
  SearchOptions,
  validateApiResponse,
  DictionaryEntrySchema,
  SearchResultSchema,
  BatchQueryResponseSchema,
  EnhancementJobSchema,
  FeedbackSchema,
} from '@/types/dictionary'

/**
 * Dictionary API client with built-in security, validation, and rate limiting
 */
export class DictionaryAPIClient {
  private client: AxiosInstance
  private searchRateLimiter = createRateLimiter('dictionary_search', 10, 60000) // 10 searches per minute
  private batchRateLimiter = createRateLimiter('dictionary_batch', 5, 60000) // 5 batch queries per minute

  constructor(baseURL: string = '/api/v1') {
    // Determine Dictionary API URL based on environment
    const getDictionaryApiUrl = () => {
      const hostname = window.location.hostname

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.localhost')
      ) {
        return (
          import.meta.env.VITE_DICTIONARY_URL ||
          'http://dictionary-mirubato.localhost:9799'
        )
      } else if (hostname.includes('staging')) {
        return 'https://dictionary-staging.mirubato.com'
      } else {
        return 'https://dictionary.mirubato.com'
      }
    }

    this.client = axios.create({
      baseURL: `${getDictionaryApiUrl()}${baseURL}`,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add auth token to requests if available
    this.client.interceptors.request.use(config => {
      const token = localStorage.getItem('auth-token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle errors globally
    this.client.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - could trigger re-auth flow
          console.error('Dictionary API: Unauthorized access')
        } else if (error.response?.status === 429) {
          // Handle rate limiting
          console.error('Dictionary API: Rate limit exceeded')
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Validate and sanitize search input
   */
  private validateAndSanitize(input: string): string {
    const sanitized = sanitizeSearchInput(input)
    if (!sanitized) {
      throw new Error('Please enter a valid search term')
    }
    if (!isValidMusicTerm(sanitized)) {
      throw new Error('Please enter a valid music-related term')
    }
    return sanitized
  }

  /**
   * Search for dictionary terms
   */
  async searchTerms(options: SearchOptions): Promise<SearchResult> {
    // Check rate limit
    if (!this.searchRateLimiter.check()) {
      const timeUntilReset = this.searchRateLimiter.timeUntilReset()
      throw new Error(
        `Too many searches. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds.`
      )
    }

    // Validate and sanitize query
    const safeQuery = this.validateAndSanitize(options.query)

    try {
      const params = new URLSearchParams({
        q: safeQuery,
        ...(options.filters?.type && { type: options.filters.type.join(',') }),
        ...(options.filters?.difficulty_level && {
          difficulty: options.filters.difficulty_level.join(','),
        }),
        ...(options.filters?.instruments && {
          instruments: options.filters.instruments.join(','),
        }),
        ...(options.filters?.min_quality_score && {
          min_quality: options.filters.min_quality_score.toString(),
        }),
        ...(options.filters?.has_references !== undefined && {
          has_references: options.filters.has_references.toString(),
        }),
        ...(options.filters?.has_audio !== undefined && {
          has_audio: options.filters.has_audio.toString(),
        }),
        ...(options.sort_by && { sort_by: options.sort_by }),
        ...(options.sort_order && { sort_order: options.sort_order }),
        ...(options.page && { page: options.page.toString() }),
        ...(options.limit && { limit: options.limit.toString() }),
      })

      const response = await this.client.get(`/search?${params.toString()}`)

      // Dictionary API uses different response format
      if (response.data.success === false && response.data.error) {
        throw new Error(response.data.error)
      }

      // Extract the data from the dictionary API response
      let searchData = response.data
      if (response.data.success && response.data.data) {
        searchData = response.data.data
      }

      // Validate and return search results
      try {
        return SearchResultSchema.parse(searchData)
      } catch (validationError) {
        console.error('Search validation error:', validationError)
        throw new Error('Invalid search results format')
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || 'Failed to search terms')
      }
      throw error
    }
  }

  /**
   * Get a single term by name
   */
  async getTerm(
    term: string,
    generateIfMissing = true
  ): Promise<DictionaryEntry> {
    const safeTerm = this.validateAndSanitize(term)
    const encodedTerm = encodeURIComponent(safeTerm)

    try {
      const response = await this.client.get(
        `/terms/${encodedTerm}${generateIfMissing ? '?generate_if_missing=true' : ''}`
      )

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      const validated = validateApiResponse(
        response.data,
        DictionaryEntrySchema
      )
      if (validated.status === 'error') {
        throw new Error(validated.error)
      }

      return validated.data
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          throw new Error('Term not found')
        }
        throw new Error(error.response?.data?.error || 'Failed to get term')
      }
      throw error
    }
  }

  /**
   * Get term by ID
   */
  async getTermById(id: string): Promise<DictionaryEntry> {
    try {
      const response = await this.client.get(`/terms/id/${id}`)

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      const validated = validateApiResponse(
        response.data,
        DictionaryEntrySchema
      )
      if (validated.status === 'error') {
        throw new Error(validated.error)
      }

      return validated.data
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || 'Failed to get term')
      }
      throw error
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(partial: string): Promise<string[]> {
    const safePartial = this.validateAndSanitize(partial)

    try {
      const response = await this.client.get(
        `/search/suggestions?q=${encodeURIComponent(safePartial)}`
      )

      // Dictionary API returns different format, so skip isValidApiResponse check
      // and handle the specific response format

      // Handle the response based on its structure
      if (response.data.success && response.data.data) {
        // Dictionary API returns {success: true, data: {suggestions: []}}
        if (response.data.data.suggestions !== undefined) {
          return z.array(z.string()).parse(response.data.data.suggestions)
        }
        // Or it might be a direct array in data
        if (Array.isArray(response.data.data)) {
          return z.array(z.string()).parse(response.data.data)
        }
      } else if (response.data.status === 'success' && response.data.data) {
        // Alternative response format
        return z.array(z.string()).parse(response.data.data)
      } else if (Array.isArray(response.data)) {
        // Response is direct array
        return z.array(z.string()).parse(response.data)
      }

      // If no valid format found, return empty array
      return []
    } catch (error) {
      // Don't throw for suggestions - just return empty array
      console.error('Failed to get suggestions:', error)
      return []
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularTerms(limit = 10): Promise<string[]> {
    try {
      const response = await this.client.get(`/search/popular?limit=${limit}`)

      // Dictionary API returns different format, so skip isValidApiResponse check
      // and handle the specific response format

      // Handle the response based on its structure
      if (response.data.success && response.data.data) {
        // Dictionary API returns {success: true, data: {popular: []}} or similar
        if (Array.isArray(response.data.data)) {
          return z.array(z.string()).parse(response.data.data)
        }
        // It might have a nested array
        if (response.data.data.popular !== undefined) {
          return z.array(z.string()).parse(response.data.data.popular)
        }
        if (response.data.data.terms !== undefined) {
          return z.array(z.string()).parse(response.data.data.terms)
        }
      } else if (response.data.status === 'success' && response.data.data) {
        // Alternative response format
        return z.array(z.string()).parse(response.data.data)
      } else if (Array.isArray(response.data)) {
        // Response is direct array
        return z.array(z.string()).parse(response.data)
      }

      // If no valid format found, return empty array
      return []
    } catch (error) {
      console.error('Failed to get popular terms:', error)
      return []
    }
  }

  /**
   * Get related terms
   */
  async getRelatedTerms(term: string): Promise<string[]> {
    const safeTerm = this.validateAndSanitize(term)

    try {
      const response = await this.client.get(
        `/search/related?term=${encodeURIComponent(safeTerm)}`
      )

      // Dictionary API returns different format, so skip isValidApiResponse check
      // and handle the specific response format

      // Handle the response based on its structure
      if (response.data.success && response.data.data) {
        // Dictionary API returns {success: true, data: {related: []}} or similar
        if (Array.isArray(response.data.data)) {
          return z.array(z.string()).parse(response.data.data)
        }
        // It might have a nested array
        if (response.data.data.related !== undefined) {
          return z.array(z.string()).parse(response.data.data.related)
        }
        if (response.data.data.terms !== undefined) {
          return z.array(z.string()).parse(response.data.data.terms)
        }
      } else if (response.data.status === 'success' && response.data.data) {
        // Alternative response format
        return z.array(z.string()).parse(response.data.data)
      } else if (Array.isArray(response.data)) {
        // Response is direct array
        return z.array(z.string()).parse(response.data)
      }

      // If no valid format found, return empty array
      return []
    } catch (error) {
      console.error('Failed to get related terms:', error)
      return []
    }
  }

  /**
   * Submit feedback for a term
   */
  async submitFeedback(termId: string, feedback: Feedback): Promise<void> {
    // Validate feedback
    const validatedFeedback = FeedbackSchema.parse(feedback)

    try {
      const response = await this.client.post(
        `/terms/${termId}/feedback`,
        validatedFeedback
      )

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      if (response.data.status === 'error') {
        throw new Error(response.data.error)
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.error || 'Failed to submit feedback'
        )
      }
      throw error
    }
  }

  /**
   * Report an issue with a term
   */
  async reportIssue(termId: string, issue: string): Promise<void> {
    const sanitizedIssue = sanitizeSearchInput(issue)

    try {
      const response = await this.client.post(`/terms/${termId}/report`, {
        issue: sanitizedIssue,
      })

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      if (response.data.status === 'error') {
        throw new Error(response.data.error)
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.error || 'Failed to report issue')
      }
      throw error
    }
  }

  /**
   * Batch query multiple terms
   */
  async batchQuery(
    terms: string[],
    options?: {
      force_refresh?: boolean
      include_low_quality?: boolean
      min_quality_score?: number
    }
  ): Promise<BatchQueryResponse> {
    // Check rate limit
    if (!this.batchRateLimiter.check()) {
      const timeUntilReset = this.batchRateLimiter.timeUntilReset()
      throw new Error(
        `Too many batch queries. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds.`
      )
    }

    // Validate and sanitize all terms
    const safeTerms = terms.map(term => this.validateAndSanitize(term))

    // Limit batch size to prevent abuse
    if (safeTerms.length > 50) {
      throw new Error('Batch query limited to 50 terms')
    }

    try {
      const response = await this.client.post('/batch/query', {
        terms: safeTerms,
        options,
      })

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      const validated = validateApiResponse(
        response.data,
        BatchQueryResponseSchema
      )
      if (validated.status === 'error') {
        throw new Error(validated.error)
      }

      return validated.data
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.error || 'Failed to batch query terms'
        )
      }
      throw error
    }
  }

  /**
   * Trigger quality enhancement (admin only)
   */
  async triggerEnhancement(
    mode: 'single' | 'batch',
    options: {
      term?: string
      min_age_days?: number
      max_quality_score?: number
      limit?: number
    }
  ): Promise<EnhancementJob> {
    try {
      const payload: {
        mode: string
        term?: string
        criteria?: {
          min_age_days?: number
          max_quality_score?: number
          limit?: number
        }
      } = { mode }

      if (mode === 'single' && options.term) {
        payload.term = this.validateAndSanitize(options.term)
      } else if (mode === 'batch') {
        payload.criteria = {
          min_age_days: options.min_age_days,
          max_quality_score: options.max_quality_score,
          limit: options.limit,
        }
      }

      const response = await this.client.post('/enhance', payload)

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      const validated = validateApiResponse(response.data, EnhancementJobSchema)
      if (validated.status === 'error') {
        throw new Error(validated.error)
      }

      return validated.data
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(
          error.response?.data?.error || 'Failed to trigger enhancement'
        )
      }
      throw error
    }
  }

  /**
   * Get enhancement job status
   */
  async getEnhancementStatus(jobId: string): Promise<EnhancementJob> {
    try {
      const response = await this.client.get(`/enhance/${jobId}`)

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      const validated = validateApiResponse(response.data, EnhancementJobSchema)
      if (validated.status === 'error') {
        throw new Error(validated.error)
      }

      return validated.data
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.error || 'Failed to get enhancement status'
        )
      }
      throw error
    }
  }

  /**
   * Reset rate limiters (useful for testing or special cases)
   */
  resetRateLimits(): void {
    this.searchRateLimiter.reset()
    this.batchRateLimiter.reset()
  }
}

// Export singleton instance
export const dictionaryAPI = new DictionaryAPIClient()
