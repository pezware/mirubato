import { apiClient } from './client'

// Types
export interface RepertoireStatus {
  planned: 'planned'
  learning: 'learning'
  polished: 'polished'
}

export interface RepertoireItem {
  id: string
  scoreId: string
  status: keyof RepertoireStatus
  difficultyRating?: number
  personalNotes?: string
  referenceLinks?: string[]
  practiceCount: number
  totalPracticeTime: number
  lastPracticed?: number
  createdAt: number
  updatedAt: number
}

export interface RepertoireStats {
  repertoire: Omit<
    RepertoireItem,
    'practiceCount' | 'totalPracticeTime' | 'lastPracticed'
  >
  stats: {
    practiceCount: number
    totalPracticeTime: number
    avgSessionDuration: number
    lastPracticed?: number
    firstPracticed?: number
    recentSessions: Array<{
      timestamp: number
      duration: number
      notes?: string
    }>
  }
}

export interface CreateRepertoireInput {
  scoreId: string
  status?: keyof RepertoireStatus
  difficultyRating?: number
  personalNotes?: string
  referenceLinks?: string[]
}

export interface UpdateRepertoireInput {
  status?: keyof RepertoireStatus
  difficultyRating?: number
  personalNotes?: string
  referenceLinks?: string[]
}

// API Client
export const repertoireApi = {
  // List user's repertoire
  list: async (): Promise<{ items: RepertoireItem[] }> => {
    const response = await apiClient.get('/api/repertoire')
    return response.data
  },

  // Get repertoire stats for a specific score
  getStats: async (scoreId: string): Promise<RepertoireStats> => {
    const response = await apiClient.get(`/api/repertoire/${scoreId}/stats`)
    return response.data
  },

  // Add piece to repertoire
  add: async (data: CreateRepertoireInput): Promise<RepertoireItem> => {
    const response = await apiClient.post('/api/repertoire', data)
    return response.data
  },

  // Update repertoire item
  update: async (
    scoreId: string,
    data: UpdateRepertoireInput
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(`/api/repertoire/${scoreId}`, data)
    return response.data
  },

  // Remove from repertoire
  remove: async (scoreId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/repertoire/${scoreId}`)
    return response.data
  },
}
