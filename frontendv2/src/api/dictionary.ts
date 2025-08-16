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
  MultiLanguageTermResponse,
  DictionaryEntrySchema,
  SearchResultSchema,
  BatchQueryResponseSchema,
  EnhancementJobSchema,
  FeedbackSchema,
  MultiLanguageTermResponseSchema,
} from '@/types/dictionary'

// Custom error types for dictionary API
interface DictionaryError extends Error {
  code?: string
  suggestions?: string[]
  jobId?: string
  estimatedCompletion?: string
}

// Circuit breaker for preventing endless retries
class DictionaryCircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private readonly threshold = 5 // Max failures before opening
  private readonly timeout = 30000 // 30 seconds before retry

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error(
          'Dictionary service temporarily unavailable. Please try again later.'
        )
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return this.state
  }
}

/**
 * Dictionary API client with built-in security, validation, and rate limiting
 */
export class DictionaryAPIClient {
  private client: AxiosInstance
  private searchRateLimiter = createRateLimiter('dictionary_search', 10, 60000) // 10 searches per minute
  private batchRateLimiter = createRateLimiter('dictionary_batch', 5, 60000) // 5 batch queries per minute
  private circuitBreaker = new DictionaryCircuitBreaker()

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
        // Check if it's a network error (service unavailable)
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          !error.response
        ) {
          console.warn(
            'Dictionary API: Service unavailable, circuit breaker may activate'
          )
          return Promise.reject(
            new Error(
              'Dictionary service is currently unavailable. Please try again later.'
            )
          )
        }

        if (error.response?.status === 401) {
          // Handle unauthorized - could trigger re-auth flow
          console.error('Dictionary API: Unauthorized access')
        } else if (error.response?.status === 429) {
          // Handle rate limiting
          const retryAfter = error.response.headers['retry-after']
          const message = retryAfter
            ? `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
            : 'Too many requests. Please wait before trying again.'
          return Promise.reject(new Error(message))
        } else if (error.response?.status === 503) {
          return Promise.reject(
            new Error('Dictionary service is temporarily unavailable.')
          )
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

    // Validate and sanitize query - allow empty query for category browsing
    const safeQuery = options.query
      ? this.validateAndSanitize(options.query)
      : ''

    return this.circuitBreaker.execute(async () => {
      const params = new URLSearchParams({
        q: safeQuery,
        ...(options.lang && { lang: options.lang }),
        ...(options.searchAllLanguages !== undefined && {
          searchAllLanguages: options.searchAllLanguages.toString(),
        }),
        ...(options.preferredLangs && {
          preferredLangs: options.preferredLangs.join(','),
        }),
        ...(options.includeTranslations !== undefined && {
          includeTranslations: options.includeTranslations.toString(),
        }),
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
        ...(options.filters?.languages && {
          languages: options.filters.languages.join(','),
        }),
        ...(options.sort_by && { sort_by: options.sort_by }),
        ...(options.sort_order && { sort_order: options.sort_order }),
        ...(options.page && {
          offset: ((options.page - 1) * (options.limit || 20)).toString(),
        }),
        ...(options.limit && { limit: options.limit.toString() }),
      })

      try {
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

        // Map dictionary API response format to expected format
        // Dictionary API returns 'results' but frontend expects 'entries'
        const transformedData: Partial<SearchResult> = {
          entries: searchData.results || [],
          total: searchData.total || 0,
        }

        // Extract pagination from query object if present
        if (searchData.query) {
          const limit = searchData.query.limit || options.limit || 20
          const offset = searchData.query.offset || 0
          transformedData.limit = limit
          transformedData.page = Math.floor(offset / limit) + 1
        } else {
          // Fallback to options
          transformedData.limit = options.limit || 20
          transformedData.page = options.page || 1
        }

        // Validate and return search results
        try {
          return SearchResultSchema.parse(transformedData)
        } catch (validationError) {
          console.error('Search validation error:', validationError)
          throw new Error('Invalid search results format')
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          // Handle rate limiting specifically
          if (error.response?.status === 429) {
            const rateLimitInfo = error.response.headers
            const retryAfter =
              rateLimitInfo?.['retry-after'] ||
              rateLimitInfo?.['x-ratelimit-reset']

            // Create a specific error for rate limiting
            const rateLimitError = new Error(
              'RATE_LIMIT_EXCEEDED'
            ) as DictionaryError
            rateLimitError.code = 'RATE_LIMIT_EXCEEDED'

            // Add retry information if available
            if (retryAfter) {
              const waitTime = parseInt(retryAfter) || 60
              rateLimitError.estimatedCompletion = `${waitTime} seconds`
            }

            throw rateLimitError
          }

          // Extract error message from the API response
          const errorData = error.response?.data
          let errorMessage = 'Failed to search terms'

          if (errorData) {
            if (typeof errorData === 'string') {
              errorMessage = errorData
            } else if (errorData.error) {
              errorMessage = errorData.error
            } else if (errorData.message) {
              errorMessage = errorData.message
            }
          }

          throw new Error(errorMessage)
        }
        throw error
      }
    })
  }

  /**
   * Get a single term by name
   */
  async getTerm(
    term: string,
    options?: {
      generateIfMissing?: boolean
      lang?: string
      searchAllLanguages?: boolean
    }
  ): Promise<DictionaryEntry> {
    const safeTerm = this.validateAndSanitize(term)
    const encodedTerm = encodeURIComponent(safeTerm)

    return this.circuitBreaker.execute(async () => {
      const params = new URLSearchParams()
      if (options?.generateIfMissing ?? true) {
        params.append('generate_if_missing', 'true')
      }
      if (options?.lang) {
        params.append('lang', options.lang)
      }
      if (options?.searchAllLanguages) {
        params.append('searchAllLanguages', 'true')
      }

      const queryString = params.toString()
      const url = `/terms/${encodedTerm}${queryString ? `?${queryString}` : ''}`

      try {
        const response = await this.client.get(url)

        // Check if term was not found (404)
        if (response.status === 404 && response.data) {
          const notFoundData = response.data as {
            success: boolean
            error: string
            data?: {
              term: string
              normalized_term: string
              suggestions?: string[]
            }
          }

          // Create a custom error with more information
          const error = new Error(
            notFoundData.error || 'Term not found'
          ) as DictionaryError
          error.code = 'TERM_NOT_FOUND'
          error.suggestions = notFoundData.data?.suggestions || []
          throw error
        }

        // Check if AI generation is in progress (202 Accepted)
        if (response.status === 202 && response.data) {
          const pendingData = response.data as {
            success: boolean
            message: string
            data?: {
              job_id?: string
              estimated_completion?: string
            }
          }

          const error = new Error(
            pendingData.message || 'AI generation in progress'
          ) as DictionaryError
          error.code = 'AI_GENERATION_PENDING'
          error.jobId = pendingData.data?.job_id
          error.estimatedCompletion = pendingData.data?.estimated_completion
          throw error
        }

        // Check for valid success response
        if (!isValidApiResponse(response.data)) {
          throw new Error('Invalid response from server')
        }

        // Check if this was AI-generated (look for header)
        const wasGenerated = response.headers?.['x-generated'] === 'true'

        // Dictionary API returns data in a different format
        // Extract the entry from the nested response
        let entryData = response.data
        if (response.data.success && response.data.data?.entry) {
          entryData = response.data.data.entry
        } else if (response.data.data?.entry) {
          entryData = response.data.data.entry
        }

        // Validate the dictionary entry directly
        const result = DictionaryEntrySchema.parse(entryData)

        // Add generation info to the result
        if (wasGenerated) {
          ;(
            result as DictionaryEntry & { wasAIGenerated?: boolean }
          ).wasAIGenerated = true
        }

        return result
      } catch (error) {
        if (error instanceof AxiosError) {
          // Handle 404 specifically
          if (error.response?.status === 404) {
            const notFoundError = new Error(
              'Term not found in dictionary'
            ) as DictionaryError
            notFoundError.code = 'TERM_NOT_FOUND'

            // Extract suggestions if available
            if (error.response.data?.data?.suggestions) {
              notFoundError.suggestions = error.response.data.data.suggestions
            }
            throw notFoundError
          }

          // Handle 503 (AI service unavailable)
          if (error.response?.status === 503) {
            const serviceError = new Error(
              'AI service temporarily unavailable'
            ) as DictionaryError
            serviceError.code = 'AI_SERVICE_UNAVAILABLE'
            throw serviceError
          }

          throw new Error(error.response?.data?.error || 'Failed to get term')
        }
        throw error
      }
    })
  }

  /**
   * Get a term in multiple languages
   */
  async getTermInLanguages(
    term: string,
    languages?: string[]
  ): Promise<MultiLanguageTermResponse> {
    const safeTerm = this.validateAndSanitize(term)
    const encodedTerm = encodeURIComponent(safeTerm)

    return this.circuitBreaker.execute(async () => {
      const params = new URLSearchParams()
      if (languages && languages.length > 0) {
        params.append('languages', languages.join(','))
      }

      const queryString = params.toString()
      const url = `/terms/${encodedTerm}/languages${queryString ? `?${queryString}` : ''}`

      try {
        const response = await this.client.get(url)

        if (!isValidApiResponse(response.data)) {
          throw new Error('Invalid response from server')
        }

        // Extract data from dictionary API response
        let termData = response.data

        // Handle wrapped API response
        if (typeof response.data === 'object' && 'success' in response.data) {
          if (response.data.success && response.data.data) {
            termData = response.data.data
          } else if (!response.data.success) {
            throw new Error(
              response.data.error || 'Failed to get term in multiple languages'
            )
          }
        }

        // Add better error handling before Zod parsing
        try {
          return MultiLanguageTermResponseSchema.parse(termData)
        } catch (zodError) {
          console.error(
            'Schema validation failed for multi-language response:',
            {
              termData,
              zodError,
            }
          )
          const errorMessage =
            zodError instanceof Error
              ? zodError.message
              : 'Schema validation failed'
          throw new Error(
            `Invalid multi-language response format: ${errorMessage}`
          )
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          throw new Error(
            error.response?.data?.error ||
              'Failed to get term in multiple languages'
          )
        }
        throw error
      }
    })
  }

  /**
   * Get term by ID
   */
  async getTermById(id: string): Promise<DictionaryEntry> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get(`/terms/id/${id}`)

        if (!isValidApiResponse(response.data)) {
          throw new Error('Invalid response from server')
        }

        // Dictionary API returns data in a different format
        let entryData = response.data
        if (response.data.success && response.data.data?.entry) {
          entryData = response.data.data.entry
        } else if (response.data.data?.entry) {
          entryData = response.data.data.entry
        } else if (response.data.data) {
          entryData = response.data.data
        }

        return DictionaryEntrySchema.parse(entryData)
      } catch (error) {
        if (error instanceof AxiosError) {
          throw new Error(error.response?.data?.error || 'Failed to get term')
        }
        throw error
      }
    })
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
          const suggestions = response.data.data.suggestions
          if (Array.isArray(suggestions)) {
            // If suggestions are objects with term property, extract just the terms
            if (
              suggestions.length > 0 &&
              typeof suggestions[0] === 'object' &&
              'term' in suggestions[0]
            ) {
              return suggestions.map((s: { term: string }) => s.term)
            }
            // Otherwise, assume they're already strings
            return z.array(z.string()).parse(suggestions)
          }
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
   * Check if dictionary service is available
   */
  isServiceAvailable(): boolean {
    return this.circuitBreaker.getState() !== 'OPEN'
  }

  /**
   * Get circuit breaker state for debugging
   */
  getServiceState(): string {
    return this.circuitBreaker.getState()
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
      lang?: string
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
        lang: options?.lang,
        ...options,
      })

      if (!isValidApiResponse(response.data)) {
        throw new Error('Invalid response from server')
      }

      // Dictionary API returns data in a different format
      let batchData = response.data
      if (response.data.success && response.data.data) {
        batchData = response.data.data
      } else if (response.data.data) {
        batchData = response.data.data
      }

      return BatchQueryResponseSchema.parse(batchData)
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

      // Dictionary API returns data in a different format
      let jobData = response.data
      if (response.data.success && response.data.data) {
        jobData = response.data.data
      } else if (response.data.data) {
        jobData = response.data.data
      }

      return EnhancementJobSchema.parse(jobData)
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

      // Dictionary API returns data in a different format
      let jobData = response.data
      if (response.data.success && response.data.data) {
        jobData = response.data.data
      } else if (response.data.data) {
        jobData = response.data.data
      }

      return EnhancementJobSchema.parse(jobData)
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
