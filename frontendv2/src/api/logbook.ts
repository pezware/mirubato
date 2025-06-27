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
  deletedAt?: string
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
  // Logbook entries via sync API
  getEntries: async () => {
    const response = await apiClient.post<{
      entries: LogbookEntry[]
      goals: Goal[]
      lastSync: string
    }>('/api/sync/pull', {
      types: ['logbook_entry'],
      since: null, // Get all entries
    })
    return response.data.entries || []
  },

  createEntry: async (
    entry: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newEntry: LogbookEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          entries: [newEntry],
        },
      }
    )

    if (response.data.success) {
      return newEntry
    }
    throw new Error('Failed to create entry')
  },

  updateEntry: async (id: string, updates: Partial<LogbookEntry>) => {
    // Get the entry from localStorage first for efficiency
    const localEntries = localStorage.getItem('mirubato:logbook:entries')
    if (!localEntries) throw new Error('No entries found')

    const entries: LogbookEntry[] = JSON.parse(localEntries)
    const entry = entries.find(e => e.id === id)
    if (!entry) throw new Error('Entry not found')

    // Filter out undefined values to prevent D1 database errors
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )

    const updatedEntry = {
      ...entry,
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    }

    const response = await apiClient.post<{ success: boolean }>(
      '/api/sync/push',
      {
        changes: {
          entries: [updatedEntry],
        },
      }
    )

    if (response.data.success) {
      return updatedEntry
    }
    throw new Error('Failed to update entry')
  },

  deleteEntry: async (id: string) => {
    // The sync API doesn't have delete, so we'll mark it as deleted
    const updates = {
      deletedAt: new Date().toISOString(),
    }
    await logbookApi.updateEntry(id, updates)
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
