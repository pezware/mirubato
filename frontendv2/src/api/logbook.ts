import { apiClient } from './client'

export interface LogbookEntry {
  id: string
  timestamp: string
  duration: number
  type: 'PRACTICE' | 'PERFORMANCE' | 'LESSON' | 'REHEARSAL'
  instrument: 'PIANO' | 'GUITAR'
  pieces: Array<{
    id?: string
    title: string
    composer?: string
    measures?: string
    tempo?: number
  }>
  techniques: string[]
  goalIds: string[]
  notes?: string
  mood?: 'FRUSTRATED' | 'NEUTRAL' | 'SATISFIED' | 'EXCITED'
  tags: string[]
  metadata?: {
    source: string
    accuracy?: number
    notesPlayed?: number
    mistakeCount?: number
  }
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  targetDate?: string
  progress: number
  milestones: Array<{
    id: string
    title: string
    completed: boolean
    completedAt?: string
  }>
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  linkedEntries: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export const logbookApi = {
  // Logbook entries
  getEntries: async (limit = 1000, offset = 0) => {
    const response = await apiClient.get<{ entries: LogbookEntry[] }>(
      '/api/logbook/entries',
      {
        params: { limit, offset },
      }
    )
    return response.data.entries
  },

  createEntry: async (
    entry: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const response = await apiClient.post<LogbookEntry>(
      '/api/logbook/entries',
      entry
    )
    return response.data
  },

  updateEntry: async (id: string, updates: Partial<LogbookEntry>) => {
    const response = await apiClient.put<LogbookEntry>(
      `/api/logbook/entries/${id}`,
      updates
    )
    return response.data
  },

  deleteEntry: async (id: string) => {
    await apiClient.delete(`/api/logbook/entries/${id}`)
  },

  // Goals
  getGoals: async (status?: Goal['status']) => {
    const response = await apiClient.get<{ goals: Goal[] }>('/api/goals', {
      params: status ? { status } : undefined,
    })
    return response.data.goals
  },

  createGoal: async (
    goal: Omit<
      Goal,
      'id' | 'createdAt' | 'updatedAt' | 'progress' | 'linkedEntries'
    >
  ) => {
    const response = await apiClient.post<Goal>('/api/goals', goal)
    return response.data
  },

  updateGoal: async (id: string, updates: Partial<Goal>) => {
    const response = await apiClient.put<Goal>(`/api/goals/${id}`, updates)
    return response.data
  },

  deleteGoal: async (id: string) => {
    await apiClient.delete(`/api/goals/${id}`)
  },

  linkEntryToGoal: async (entryId: string, goalId: string) => {
    const response = await apiClient.post<Goal>(`/api/goals/${goalId}/link`, {
      entryId,
    })
    return response.data
  },
}
