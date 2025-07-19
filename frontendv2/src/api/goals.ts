import { apiClient } from './client'

// Types
export type GoalType = 'practice_time' | 'accuracy' | 'repertoire' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'abandoned'

export interface Goal {
  id: string
  title: string
  description?: string
  type: GoalType
  targetValue?: number
  currentValue?: number
  targetDate?: string
  status: GoalStatus
  scoreId?: string
  measures?: string[]
  practicePlan?: {
    dailyMinutes?: number
    focusAreas?: string[]
    techniques?: string[]
  }
  milestones?: Milestone[]
  relatedSessions?: number
  createdAt: number
  updatedAt: number
}

export interface Milestone {
  id: string
  title: string
  targetDate?: string
  completed: boolean
  completedAt?: string
}

export interface GoalStats {
  goal: Goal
  stats: {
    relatedSessions: number
    totalPracticeTime: number
    recentSessions: Array<{
      id: string
      timestamp: number
      duration: number
      notes?: string
    }>
  }
}

export interface CreateGoalInput {
  title: string
  description?: string
  type: GoalType
  targetValue?: number
  targetDate?: string
  scoreId?: string
  measures?: string[]
  practicePlan?: {
    dailyMinutes?: number
    focusAreas?: string[]
    techniques?: string[]
  }
  milestones?: Milestone[]
}

export interface UpdateGoalInput {
  title?: string
  description?: string
  targetValue?: number
  currentValue?: number
  targetDate?: string
  status?: GoalStatus
  measures?: string[]
  practicePlan?: {
    dailyMinutes?: number
    focusAreas?: string[]
    techniques?: string[]
  }
  milestones?: Milestone[]
}

export interface TrackProgressInput {
  value: number
  notes?: string
  sessionId?: string
}

export interface ListGoalsParams {
  status?: GoalStatus
  type?: GoalType
  scoreId?: string
}

// API Client
export const goalsApi = {
  // List user's goals with optional filters
  list: async (params?: ListGoalsParams): Promise<{ goals: Goal[] }> => {
    const response = await apiClient.get('/api/goals', { params })
    return response.data
  },

  // Get specific goal with stats
  get: async (id: string): Promise<GoalStats> => {
    const response = await apiClient.get(`/api/goals/${id}`)
    return response.data
  },

  // Create new goal
  create: async (data: CreateGoalInput): Promise<Goal> => {
    const response = await apiClient.post('/api/goals', data)
    return response.data
  },

  // Update goal
  update: async (
    id: string,
    data: UpdateGoalInput
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(`/api/goals/${id}`, data)
    return response.data
  },

  // Track progress on a goal
  trackProgress: async (
    id: string,
    data: TrackProgressInput
  ): Promise<{
    message: string
    currentValue: number
    targetValue?: number
    status: GoalStatus
    completed: boolean
  }> => {
    const response = await apiClient.post(`/api/goals/${id}/progress`, data)
    return response.data
  },

  // Delete goal
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/goals/${id}`)
    return response.data
  },
}
