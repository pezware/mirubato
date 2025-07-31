/**
 * New simplified LogbookStore using delta-based sync
 * Replaces the complex, error-prone state-based sync with lightweight change tracking
 */

import { create } from 'zustand'
import { syncV2Api } from '../api/sync-v2'
import { migrateFromLocalStorage } from '../utils/changeQueue'
import { nanoid } from 'nanoid'

export interface LogbookEntry {
  id: string
  timestamp: string // ISO string
  duration: number // minutes
  type: 'practice' | 'performance' | 'lesson' | 'rehearsal' | 'technique'
  instrument: 'piano' | 'guitar'
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
  scoreId?: string
  scoreTitle?: string
  scoreComposer?: string
  autoTracked?: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  targetDate?: string
  instrument?: 'PIANO' | 'GUITAR' | 'VIOLIN' | 'VOICE' | 'OTHER'
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED'
  progress: number // 0-100
  linkedEntries: string[]
  createdAt: string
  updatedAt: string
}

interface LogbookState {
  // Core data - simplified to just arrays (no Maps needed)
  entries: LogbookEntry[]
  goals: Goal[]

  // UI state
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  searchQuery: string

  // Migration state
  isMigrated: boolean
  isLocalMode: boolean

  // Legacy compatibility - computed properties for backward compatibility
  entriesMap: Map<string, LogbookEntry>
  goalsMap: Map<string, Goal>
  scoreMetadata: Map<string, unknown>

  // Actions - Core operations
  loadData: () => Promise<void>
  loadEntries: () => Promise<void> // Legacy alias for loadData
  createEntry: (
    entry: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>
  updateEntry: (id: string, updates: Partial<LogbookEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  updatePieceName: (oldName: string, newName: string) => Promise<number>

  // Actions - Goals
  createGoal: (
    goal: Omit<
      Goal,
      'id' | 'createdAt' | 'updatedAt' | 'progress' | 'linkedEntries'
    >
  ) => Promise<string>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Actions - Sync
  sync: () => Promise<void>
  setLocalMode: (isLocal: boolean) => void
  syncWithServer: () => Promise<void>

  // Actions - UI
  setSearchQuery: (query: string) => void
  clearError: () => void

  // Actions - Migration
  migrateToNewSync: () => Promise<void>
}

// Helper to sort entries by timestamp (most recent first)
const sortEntriesByTimestamp = (entries: LogbookEntry[]): LogbookEntry[] => {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// Helper to sort goals by created date (most recent first)
const sortGoalsByCreated = (goals: Goal[]): Goal[] => {
  return [...goals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const useLogbookStore = create<LogbookState>((set, get) => ({
  // Initial state
  entries: [],
  goals: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  searchQuery: '',
  isMigrated: false,
  isLocalMode: false,

  // Legacy compatibility - computed properties
  get entriesMap() {
    return new Map(get().entries.map(e => [e.id, e]))
  },
  get goalsMap() {
    return new Map(get().goals.map(g => [g.id, g]))
  },
  get scoreMetadata() {
    return new Map()
  },

  loadData: async () => {
    set({ isLoading: true, error: null })

    try {
      console.log('[LogbookStore V2] Loading data...')

      // Check if user is migrated to new sync system
      const syncStats = await syncV2Api.getLocalStats()
      const hasSyncData =
        syncStats.pendingChanges > 0 || syncStats.lastSyncTime !== null

      if (!hasSyncData) {
        console.log(
          '[LogbookStore V2] No sync data found, checking for migration...'
        )

        // Try to migrate from localStorage first
        const migrationStats = await migrateFromLocalStorage()
        if (
          migrationStats.entriesMigrated > 0 ||
          migrationStats.goalsMigrated > 0
        ) {
          console.log(
            '[LogbookStore V2] Migrated from localStorage:',
            migrationStats
          )
        }

        // Try to migrate from server
        try {
          const serverMigration = await syncV2Api.migrate()
          if (serverMigration.migrated && serverMigration.entriesConverted) {
            console.log(
              '[LogbookStore V2] Migrated from server:',
              serverMigration.entriesConverted,
              'entries'
            )
          }
        } catch (migrationError) {
          console.warn(
            '[LogbookStore V2] Server migration failed:',
            migrationError
          )
          // Continue - might be a new user
        }
      }

      // Load current state from change queue
      await get().sync()

      set({ isMigrated: true, isLoading: false })
      console.log('[LogbookStore V2] Data loaded successfully')
    } catch (error) {
      console.error('[LogbookStore V2] Failed to load data:', error)
      set({
        error: 'Failed to load data. Please try again.',
        isLoading: false,
      })
    }
  },

  createEntry: async entryData => {
    const entry: LogbookEntry = {
      ...entryData,
      id: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log('[LogbookStore V2] Creating entry:', entry.id)

    // Immediately update UI (optimistic update)
    set(state => ({
      entries: sortEntriesByTimestamp([entry, ...state.entries]),
    }))

    try {
      // Queue the change for sync
      await syncV2Api.queueChange({
        type: 'CREATED',
        entityType: 'logbook_entry',
        entityId: entry.id,
        data: entry,
      })

      console.log('[LogbookStore V2] Entry created and queued for sync')
      return entry.id
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue entry creation:', error)

      // Remove from UI on error
      set(state => ({
        entries: state.entries.filter(e => e.id !== entry.id),
        error: 'Failed to create entry. Please try again.',
      }))

      throw error
    }
  },

  updateEntry: async (id, updates) => {
    const currentEntry = get().entries.find(e => e.id === id)
    if (!currentEntry) {
      throw new Error('Entry not found')
    }

    const updatedEntry: LogbookEntry = {
      ...currentEntry,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    console.log('[LogbookStore V2] Updating entry:', id)

    // Immediately update UI (optimistic update)
    set(state => ({
      entries: sortEntriesByTimestamp(
        state.entries.map(e => (e.id === id ? updatedEntry : e))
      ),
    }))

    try {
      // Queue the change for sync (only send the changed fields)
      await syncV2Api.queueChange({
        type: 'UPDATED',
        entityType: 'logbook_entry',
        entityId: id,
        data: updates, // Only the delta, not the full object
      })

      console.log('[LogbookStore V2] Entry updated and queued for sync')
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue entry update:', error)

      // Revert UI on error
      set(state => ({
        entries: sortEntriesByTimestamp(
          state.entries.map(e => (e.id === id ? currentEntry : e))
        ),
        error: 'Failed to update entry. Please try again.',
      }))

      throw error
    }
  },

  deleteEntry: async id => {
    const currentEntry = get().entries.find(e => e.id === id)
    if (!currentEntry) return

    console.log('[LogbookStore V2] Deleting entry:', id)

    // Immediately update UI (optimistic update)
    set(state => ({
      entries: state.entries.filter(e => e.id !== id),
    }))

    try {
      // Queue the deletion for sync
      await syncV2Api.queueChange({
        type: 'DELETED',
        entityType: 'logbook_entry',
        entityId: id,
        // No data needed for deletion
      })

      console.log('[LogbookStore V2] Entry deleted and queued for sync')
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue entry deletion:', error)

      // Restore UI on error
      set(state => ({
        entries: sortEntriesByTimestamp([currentEntry, ...state.entries]),
        error: 'Failed to delete entry. Please try again.',
      }))

      throw error
    }
  },

  createGoal: async goalData => {
    const goal: Goal = {
      ...goalData,
      id: nanoid(),
      progress: 0,
      linkedEntries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log('[LogbookStore V2] Creating goal:', goal.id)

    // Immediately update UI
    set(state => ({
      goals: sortGoalsByCreated([goal, ...state.goals]),
    }))

    try {
      // Queue the change for sync
      await syncV2Api.queueChange({
        type: 'CREATED',
        entityType: 'goal',
        entityId: goal.id,
        data: goal,
      })

      return goal.id
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue goal creation:', error)

      // Remove from UI on error
      set(state => ({
        goals: state.goals.filter(g => g.id !== goal.id),
        error: 'Failed to create goal. Please try again.',
      }))

      throw error
    }
  },

  updateGoal: async (id, updates) => {
    const currentGoal = get().goals.find(g => g.id === id)
    if (!currentGoal) {
      throw new Error('Goal not found')
    }

    const updatedGoal: Goal = {
      ...currentGoal,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Immediately update UI
    set(state => ({
      goals: sortGoalsByCreated(
        state.goals.map(g => (g.id === id ? updatedGoal : g))
      ),
    }))

    try {
      // Queue the change for sync
      await syncV2Api.queueChange({
        type: 'UPDATED',
        entityType: 'goal',
        entityId: id,
        data: updates,
      })
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue goal update:', error)

      // Revert UI on error
      set(state => ({
        goals: sortGoalsByCreated(
          state.goals.map(g => (g.id === id ? currentGoal : g))
        ),
        error: 'Failed to update goal. Please try again.',
      }))

      throw error
    }
  },

  deleteGoal: async id => {
    const currentGoal = get().goals.find(g => g.id === id)
    if (!currentGoal) return

    // Immediately update UI
    set(state => ({
      goals: state.goals.filter(g => g.id !== id),
    }))

    try {
      // Queue the deletion for sync
      await syncV2Api.queueChange({
        type: 'DELETED',
        entityType: 'goal',
        entityId: id,
      })
    } catch (error) {
      console.error('[LogbookStore V2] Failed to queue goal deletion:', error)

      // Restore UI on error
      set(state => ({
        goals: sortGoalsByCreated([currentGoal, ...state.goals]),
        error: 'Failed to delete goal. Please try again.',
      }))

      throw error
    }
  },

  sync: async () => {
    if (get().isSyncing) {
      console.log('[LogbookStore V2] Sync already in progress')
      return
    }

    set({ isSyncing: true, error: null })

    try {
      console.log('[LogbookStore V2] Starting sync...')

      const result = await syncV2Api.sync()

      if (result.success) {
        // After successful sync, we rely on optimistic updates
        // In a full implementation, this would rebuild from server changes
        console.log(
          `[LogbookStore V2] Sync completed: ${result.changesPushed} pushed, ${result.changesApplied} applied`
        )

        if (result.conflicts > 0) {
          set({
            error: `Sync completed with ${result.conflicts} conflicts. Some changes may need manual resolution.`,
          })
        }
      } else {
        console.warn('[LogbookStore V2] Sync failed:', result.error)
        set({ error: result.error || 'Sync failed. Will retry automatically.' })
      }
    } catch (error) {
      console.error('[LogbookStore V2] Sync error:', error)
      set({ error: 'Sync failed. Check your connection and try again.' })
    } finally {
      set({ isSyncing: false })
    }
  },

  setSearchQuery: query => set({ searchQuery: query }),

  clearError: () => set({ error: null }),

  migrateToNewSync: async () => {
    set({ isLoading: true, error: null })

    try {
      console.log('[LogbookStore V2] Starting migration to new sync system...')

      // Migrate localStorage data
      const localMigration = await migrateFromLocalStorage()
      console.log('[LogbookStore V2] Local migration result:', localMigration)

      // Migrate server data
      const serverMigration = await syncV2Api.migrate()
      console.log('[LogbookStore V2] Server migration result:', serverMigration)

      // Perform initial sync
      await get().sync()

      set({ isMigrated: true, isLoading: false })
      console.log('[LogbookStore V2] Migration completed successfully')
    } catch (error) {
      console.error('[LogbookStore V2] Migration failed:', error)
      set({
        error: 'Migration failed. Please try again or contact support.',
        isLoading: false,
      })
      throw error
    }
  },

  // Legacy method aliases and compatibility methods
  loadEntries: async () => {
    return get().loadData()
  },

  updatePieceName: async (oldName: string, newName: string) => {
    console.log('[LogbookStore V2] Updating piece name:', { oldName, newName })

    const entriesToUpdate = get().entries.filter(entry =>
      entry.pieces.some(piece => piece.title === oldName)
    )

    for (const entry of entriesToUpdate) {
      const updatedPieces = entry.pieces.map(piece =>
        piece.title === oldName ? { ...piece, title: newName } : piece
      )

      await get().updateEntry(entry.id, { pieces: updatedPieces })
    }

    return entriesToUpdate.length // Return the count of updated entries
  },

  setLocalMode: (isLocal: boolean) => {
    console.log('[LogbookStore V2] Setting local mode:', isLocal)
    set({ isLocalMode: isLocal })
  },

  syncWithServer: async () => {
    // Legacy alias for sync method
    return get().sync()
  },
}))

// Computed selectors for filtered data
export const useLogbookSelectors = () => {
  const { entries, goals, searchQuery } = useLogbookStore()

  const filteredEntries = searchQuery
    ? entries.filter(
        entry =>
          entry.pieces.some(
            piece =>
              piece.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              piece.composer?.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          entry.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.tags.some(tag =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : entries

  const activeGoals = goals.filter(goal => goal.status === 'ACTIVE')
  const completedGoals = goals.filter(goal => goal.status === 'COMPLETED')

  return {
    filteredEntries,
    activeGoals,
    completedGoals,
    totalEntries: entries.length,
    totalGoals: goals.length,
  }
}
