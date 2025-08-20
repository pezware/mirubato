import { apiClient } from './client'

export interface LogbookEntry {
  id: string
  timestamp: string
  duration: number
  type:
    | 'practice'
    | 'performance'
    | 'lesson'
    | 'rehearsal'
    | 'technique'
    | 'status_change'
  instrument?: string
  pieces: Array<{
    id?: string
    title: string
    composer?: string | null
    measures?: string | null
    tempo?: number | null
  }>
  techniques: string[]
  goalIds: string[]
  notes?: string | null
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited' | null
  tags: string[]
  metadata?: {
    source: string
    accuracy?: number
    notesPlayed?: number
    mistakeCount?: number
  }
  // Score integration fields
  scoreId?: string // Link to score in scorebook
  scoreTitle?: string // Cached score title for display
  scoreComposer?: string // Cached composer for display
  autoTracked?: boolean // Flag for automatically tracked sessions
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
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  linkedEntries: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

// Helper types for function parameters that accept null values
type CreateEntryData = Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'> & {
  notes?: string | null
  mood?: LogbookEntry['mood'] | null
  scoreId?: string | null
  scoreTitle?: string | null
  scoreComposer?: string | null
  autoTracked?: boolean | null
}

type UpdateEntryData = Partial<LogbookEntry> & {
  notes?: string | null | undefined
  mood?: LogbookEntry['mood'] | null | undefined
  scoreId?: string | null | undefined
  scoreTitle?: string | null | undefined
  scoreComposer?: string | null | undefined
  autoTracked?: boolean | null | undefined
}

// Temporary compatibility layer during migration
const normalizeEntry = (
  entry: LogbookEntry & {
    type?: string
    instrument?: string
    mood?: string | null
  }
): LogbookEntry => ({
  ...entry,
  type: (entry.type?.toLowerCase() || 'practice') as LogbookEntry['type'],
  instrument: entry.instrument?.toLowerCase(),
  mood: entry.mood ? (entry.mood.toLowerCase() as LogbookEntry['mood']) : null,
})

const normalizeGoal = (goal: Goal & { status?: string }): Goal => ({
  ...goal,
  status: (goal.status?.toLowerCase() || 'active') as Goal['status'],
})

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
    return (response.data.entries || []).map(normalizeEntry)
  },

  createEntry: async (entry: CreateEntryData) => {
    const newEntry: LogbookEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Ensure fields are properly typed for D1
      notes: entry.notes || null,
      mood: entry.mood || null,
      scoreId: entry.scoreId || undefined,
      scoreTitle: entry.scoreTitle || undefined,
      scoreComposer: entry.scoreComposer || undefined,
      autoTracked: entry.autoTracked || undefined,
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

  updateEntry: async (id: string, updates: UpdateEntryData) => {
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

    // Ensure all fields are properly sanitized for D1
    const sanitizedEntry = {
      ...updatedEntry,
      notes: updatedEntry.notes || null,
      mood: updatedEntry.mood || null,
      scoreId: updatedEntry.scoreId || undefined,
      scoreTitle: updatedEntry.scoreTitle || undefined,
      scoreComposer: updatedEntry.scoreComposer || undefined,
      autoTracked: updatedEntry.autoTracked || undefined,
      pieces:
        updatedEntry.pieces?.map(p => ({
          ...p,
          composer: p.composer || null,
          measures: p.measures || null,
          tempo: p.tempo || null,
        })) || [],
      techniques: updatedEntry.techniques || [],
      goalIds: updatedEntry.goalIds || [],
      tags: updatedEntry.tags || [],
      metadata: updatedEntry.metadata || { source: 'manual' },
    }

    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/api/sync/push',
        {
          changes: {
            entries: [sanitizedEntry],
          },
        }
      )

      if (response.data.success) {
        return sanitizedEntry
      }
    } catch (error) {
      // If sync fails, still update locally and return the entry
      console.warn(
        'Failed to sync entry to server, keeping local changes:',
        error
      )

      // Update local storage with the new entry
      const localEntries = localStorage.getItem('mirubato:logbook:entries')
      if (localEntries) {
        const entries: LogbookEntry[] = JSON.parse(localEntries)
        const index = entries.findIndex(e => e.id === sanitizedEntry.id)
        if (index !== -1) {
          entries[index] = sanitizedEntry
          localStorage.setItem(
            'mirubato:logbook:entries',
            JSON.stringify(entries)
          )
        }
      }

      // Return the entry even if sync failed
      return sanitizedEntry
    }

    // Only throw if we couldn't even update locally
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
    return response.data.goals.map(normalizeGoal)
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

  // Piece Management
  updatePieceName: async (
    oldPiece: { title: string; composer?: string },
    newPiece: { title: string; composer?: string }
  ) => {
    const response = await apiClient.put<{ updatedCount: number }>(
      '/api/pieces/update-name',
      {
        oldPiece,
        newPiece,
      }
    )
    return response.data.updatedCount
  },
}
