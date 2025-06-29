import { apiClient } from '../api/client'

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
  metadata?: Record<string, any>
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
const SCORES_API_URL =
  import.meta.env.VITE_SCORES_API_URL || 'http://localhost:8787'

class ScoreService {
  private scoresApiUrl: string

  constructor() {
    this.scoresApiUrl = SCORES_API_URL
  }

  // Get all scores with optional filtering
  async getScores(params?: ScoreSearchParams): Promise<ScoreListResponse> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v))
          } else {
            queryParams.append(key, String(value))
          }
        }
      })
    }

    const response = await fetch(
      `${this.scoresApiUrl}/api/scores?${queryParams}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch scores: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Get a single score by ID
  async getScore(id: string): Promise<Score> {
    const response = await fetch(`${this.scoresApiUrl}/api/scores/${id}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Score not found')
      }
      throw new Error(`Failed to fetch score: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Search scores
  async searchScores(params: ScoreSearchParams): Promise<ScoreListResponse> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v))
        } else {
          queryParams.append(key, String(value))
        }
      }
    })

    const response = await fetch(
      `${this.scoresApiUrl}/api/search?${queryParams}`
    )
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Get all collections
  async getCollections(): Promise<Collection[]> {
    const response = await fetch(`${this.scoresApiUrl}/api/collections`)
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Get featured collections
  async getFeaturedCollections(): Promise<Collection[]> {
    const response = await fetch(
      `${this.scoresApiUrl}/api/collections?featured=true`
    )
    if (!response.ok) {
      throw new Error(
        `Failed to fetch featured collections: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data.data
  }

  // Get a collection by slug
  async getCollection(slug: string): Promise<Collection> {
    const response = await fetch(`${this.scoresApiUrl}/api/collections/${slug}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Collection not found')
      }
      throw new Error(`Failed to fetch collection: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
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
    const queryParams = new URLSearchParams()
    if (options.format) queryParams.append('format', options.format)
    if (options.page !== undefined)
      queryParams.append('page', String(options.page))
    if (options.zoom !== undefined)
      queryParams.append('zoom', String(options.zoom))

    const response = await fetch(
      `${this.scoresApiUrl}/api/scores/${id}/render?${queryParams}`
    )
    if (!response.ok) {
      throw new Error(`Failed to render score: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  // Upload a PDF score (authenticated users only)
  async uploadScore(file: File, metadata: Partial<Score>): Promise<Score> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    const response = await fetch(`${this.scoresApiUrl}/api/import/pdf`, {
      method: 'POST',
      headers: {
        // Auth header will be added by interceptor if using apiClient
        Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
      },
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required')
      }
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }
}

// Export a singleton instance
export const scoreService = new ScoreService()

// Export default for backwards compatibility
export default scoreService
