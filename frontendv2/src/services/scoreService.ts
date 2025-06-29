import axios from 'axios'

// Types for the scores service
export interface Score {
  id: string
  title: string
  composer: string
  opus?: string | null
  movement?: string | null
  instrument: 'PIANO' | 'GUITAR' | 'BOTH'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  difficulty_level?: number | null
  grade_level?: string | null
  duration_seconds?: number | null
  time_signature?: string | null
  key_signature?: string | null
  tempo_marking?: string | null
  suggested_tempo?: number | null
  style_period?:
    | 'BAROQUE'
    | 'CLASSICAL'
    | 'ROMANTIC'
    | 'MODERN'
    | 'CONTEMPORARY'
    | null
  source?: string | null
  imslp_url?: string | null
  tags: string[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Collection {
  id: string
  name: string
  slug: string
  description?: string | null
  instrument?: 'PIANO' | 'GUITAR' | 'BOTH' | null
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
  scoreIds: string[]
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

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

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_SCORES_API_URL || 'http://localhost:8787'
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
      const response = await scoresApiClient.get('/api/search', { params })
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
}

// Export a singleton instance
export const scoreService = new ScoreService()

// Export default for backwards compatibility
export default scoreService
