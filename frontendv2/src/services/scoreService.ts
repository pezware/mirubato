import axios from 'axios'

// Types for the scores service
export interface Score {
  id: string
  title: string
  composer: string
  opus?: string | null
  movement?: string | null
  instrument: 'piano' | 'guitar' | 'both'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  difficulty_level?: number | null
  grade_level?: string | null
  duration_seconds?: number | null
  time_signature?: string | null
  key_signature?: string | null
  tempo_marking?: string | null
  suggested_tempo?: number | null
  style_period?:
    | 'baroque'
    | 'classical'
    | 'romantic'
    | 'modern'
    | 'contemporary'
    | null
  source?: string | null
  source_type?: 'pdf' | 'image' | 'multi-image' | 'external' | 'manual' | null
  page_count?: number | null
  imslp_url?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Import Collection type
import type { Collection } from '../types/collections'

export interface ScoreSearchParams {
  query?: string
  instrument?: string
  difficulty?: string
  composer?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface ScoreListResponse {
  items: Score[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Get the scores API URL from environment or use local development
const getScoresApiUrl = () => {
  const hostname = window.location.hostname

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  ) {
    return (
      import.meta.env.VITE_SCORES_API_URL ||
      'http://scores-mirubato.localhost:9788'
    )
  } else if (hostname.includes('staging')) {
    return 'https://scores-staging.mirubato.com'
  } else {
    return 'https://scores.mirubato.com'
  }
}

// Create axios instance for scores API
const scoresApiClient = axios.create({
  baseURL: getScoresApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
scoresApiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth-token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
scoresApiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')

      // Redirect to login if not on public pages
      const publicPaths = ['/', '/auth/verify', '/scorebook']
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

class ScoreService {
  private scoresApiUrl: string

  constructor() {
    this.scoresApiUrl = getScoresApiUrl()
  }

  // Get all scores with optional filtering
  async getScores(params?: ScoreSearchParams): Promise<ScoreListResponse> {
    try {
      const response = await scoresApiClient.get('/api/scores', { params })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch scores: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get a single score by ID
  async getScore(id: string): Promise<Score> {
    try {
      const response = await scoresApiClient.get(`/api/scores/${id}`)
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Score not found')
        }
        throw new Error(
          `Failed to fetch score: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Search scores
  async searchScores(params: ScoreSearchParams): Promise<ScoreListResponse> {
    try {
      // Use the same endpoint as getScores, which supports query parameters
      const response = await scoresApiClient.get('/api/scores', { params })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Search failed: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get all collections
  async getCollections(): Promise<Collection[]> {
    try {
      const response = await scoresApiClient.get('/api/collections')
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch collections: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get featured collections
  async getFeaturedCollections(): Promise<Collection[]> {
    try {
      const response = await scoresApiClient.get('/api/collections', {
        params: { featured: true },
      })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch featured collections: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get a collection by slug
  async getCollection(slug: string): Promise<Collection> {
    try {
      const response = await scoresApiClient.get(`/api/collections/${slug}`)
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Collection not found')
        }
        throw new Error(
          `Failed to fetch collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get the PDF URL for a score
  getScorePdfUrl(scoreId: string): string {
    // For test scores, use the test data endpoint
    if (scoreId === 'test_aire_sureno') {
      return `${this.scoresApiUrl}/api/test-data/score_01.pdf`
    } else if (scoreId === 'test_romance_anonimo') {
      return `${this.scoresApiUrl}/api/test-data/score_02.pdf`
    }
    // Default pattern for other scores
    return `${this.scoresApiUrl}/api/scores/${scoreId}/download/pdf`
  }

  // Get the URL for a pre-rendered page image
  getScorePageUrl(scoreId: string, page: number): string {
    // Use v2 renderer for better performance and reliability
    return `${this.scoresApiUrl}/api/pdf/v2/render/${scoreId}/page/${page}`
  }

  // Get the URL for an image-based score page
  getImagePageUrl(scoreId: string, pageNumber: number): string {
    return `${this.scoresApiUrl}/api/scores/${scoreId}/pages/${pageNumber}`
  }

  // Get user's own scores
  async getUserScores(params?: ScoreSearchParams): Promise<ScoreListResponse> {
    try {
      const response = await scoresApiClient.get('/api/scores/user/library', {
        params,
      })
      return {
        items: response.data.data,
        total: response.data.pagination?.total || response.data.data.length,
        limit: response.data.pagination?.limit || 50,
        offset: response.data.pagination?.offset || 0,
        hasMore: response.data.pagination?.hasMore || false,
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(
          `Failed to fetch user scores: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get user's collections
  async getUserCollections(): Promise<Collection[]> {
    try {
      const response = await scoresApiClient.get('/api/user/collections')
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(
          `Failed to fetch user collections: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get a single user collection
  async getUserCollection(id: string): Promise<Collection> {
    try {
      const response = await scoresApiClient.get(`/api/user/collections/${id}`)
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 404) {
          throw new Error('Collection not found')
        }
        throw new Error(
          `Failed to fetch user collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Create a new collection
  async createCollection(data: {
    name: string
    description?: string
    visibility?: 'private' | 'public' | 'unlisted'
    tags?: string[]
  }): Promise<Collection> {
    try {
      const response = await scoresApiClient.post('/api/user/collections', data)
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(
          `Failed to create collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Update a collection
  async updateCollection(
    id: string,
    data: {
      name?: string
      description?: string
      visibility?: 'private' | 'public' | 'unlisted'
      tags?: string[]
    }
  ): Promise<Collection> {
    try {
      const response = await scoresApiClient.put(
        `/api/user/collections/${id}`,
        data
      )
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 404) {
          throw new Error('Collection not found')
        }
        throw new Error(
          `Failed to update collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Delete a collection
  async deleteCollection(id: string): Promise<void> {
    try {
      await scoresApiClient.delete(`/api/user/collections/${id}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 404) {
          throw new Error('Collection not found')
        }
        throw new Error(
          `Failed to delete collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Add a score to a collection
  async addScoreToCollection(
    collectionId: string,
    scoreId: string
  ): Promise<void> {
    try {
      await scoresApiClient.post(
        `/api/user/collections/${collectionId}/scores`,
        { scoreId }
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 404) {
          throw new Error('Collection or score not found')
        }
        throw new Error(
          `Failed to add score to collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Remove a score from a collection
  async removeScoreFromCollection(
    collectionId: string,
    scoreId: string
  ): Promise<void> {
    try {
      await scoresApiClient.delete(
        `/api/user/collections/${collectionId}/scores/${scoreId}`
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 404) {
          throw new Error('Collection or score not found')
        }
        throw new Error(
          `Failed to remove score from collection: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get collections shared with the user
  async getSharedCollections(): Promise<Collection[]> {
    try {
      const response = await scoresApiClient.get(
        '/api/collections/shared/with-me'
      )
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(
          `Failed to fetch shared collections: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get collections that contain a specific score
  async getScoreCollections(scoreId: string): Promise<string[]> {
    try {
      const response = await scoresApiClient.get(
        `/api/user/collections/score/${scoreId}`
      )
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // User not authenticated, return empty array
          return []
        }
        throw new Error(
          `Failed to fetch score collections: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Get score metadata including number of pages
  async getScoreMetadata(scoreId: string): Promise<{ numPages: number }> {
    try {
      const response = await scoresApiClient.get(
        `/api/scores/${scoreId}/metadata`
      )
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch score metadata: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Render a score (returns URL or base64 data)
  async renderScore(
    id: string,
    options: { format?: 'svg' | 'png'; page?: number; zoom?: number } = {}
  ): Promise<string> {
    try {
      const response = await scoresApiClient.get(`/api/scores/${id}/render`, {
        params: options,
      })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to render score: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Upload a PDF score (authenticated users only)
  async uploadScore(file: File, metadata: Partial<Score>): Promise<Score> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('metadata', JSON.stringify(metadata))

      const response = await scoresApiClient.post('/api/import/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        throw new Error(
          `Upload failed: ${error.response?.statusText || error.message}`
        )
      }
      throw error
    }
  }

  // Import a score from URL or base64 data
  async importScore(params: { url: string; filename?: string }): Promise<{
    success: boolean
    data: Score
    warning?: string
    error?: string
  }> {
    try {
      const response = await scoresApiClient.post('/api/import', params)
      // Ensure the response has the expected structure
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response from server')
      }
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error(
            error.response.data?.message ||
              'Rate limit exceeded. Please wait a few minutes and try again.'
          )
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication required')
        }
        if (error.response?.status === 413) {
          throw new Error('File size too large. Maximum size is 10MB.')
        }
        if (error.response?.status === 415) {
          throw new Error('Invalid file type. Please upload a PDF file.')
        }
        // Try to get a meaningful error message from the response
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Import failed'
        throw new Error(errorMessage)
      }
      throw error
    }
  }

  // Import multiple images as a score
  async importImages(params: {
    images: Array<{ filename: string; data: string }>
    title?: string
    composer?: string
    instrument?: string
    difficulty?: string
    tags?: string[]
  }): Promise<{
    success: boolean
    data: Score
    error?: string
  }> {
    try {
      const response = await scoresApiClient.post('/api/import/images', params)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error(error.response.data.message || 'Rate limit exceeded')
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication required for image uploads')
        }
        throw new Error(
          error.response?.data?.error ||
            error.response?.data?.message ||
            'Image upload failed'
        )
      }
      throw error
    }
  }
}

// Export a singleton instance
export const scoreService = new ScoreService()

// Export default for backwards compatibility
export default scoreService
