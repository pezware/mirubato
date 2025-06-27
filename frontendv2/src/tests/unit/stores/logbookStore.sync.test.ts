import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLogbookStore } from '../../../stores/logbookStore'
import type { LogbookEntry } from '../../../api/logbook'

describe('logbookStore - Additional Operations', () => {
  const mockEntry: LogbookEntry = {
    id: 'test-id',
    timestamp: '2025-01-01T00:00:00Z',
    duration: 30,
    type: 'PRACTICE',
    instrument: 'PIANO',
    pieces: [{ title: 'Test Piece', composer: 'Test Composer' }],
    techniques: ['scales'],
    goalIds: [],
    tags: ['morning'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset store by creating new state
    useLogbookStore.setState({
      entriesMap: new Map(),
      goalsMap: new Map(),
      isLoading: false,
      error: null,
      searchQuery: '',
      isLocalMode: true,
    })
  })

  describe('Error handling', () => {
    it('should clear error when adding new entry', async () => {
      const { createEntry } = useLogbookStore.getState()

      // Set error state
      useLogbookStore.setState({ error: 'Previous error' })
      expect(useLogbookStore.getState().error).toBe('Previous error')

      await createEntry(mockEntry)

      // Error should be cleared when creating new entry
      expect(useLogbookStore.getState().error).toBeNull()
    })

    it('should set error state', () => {
      useLogbookStore.setState({ error: 'Test error message' })
      expect(useLogbookStore.getState().error).toBe('Test error message')
    })

    it('should clear error using clearError', () => {
      const { clearError } = useLogbookStore.getState()

      // Set error
      useLogbookStore.setState({ error: 'Some error' })
      expect(useLogbookStore.getState().error).toBe('Some error')

      // Clear error
      clearError()
      expect(useLogbookStore.getState().error).toBeNull()
    })
  })

  describe('Search functionality', () => {
    it('should update search query', () => {
      const { setSearchQuery } = useLogbookStore.getState()

      setSearchQuery('test query')
      expect(useLogbookStore.getState().searchQuery).toBe('test query')

      setSearchQuery('')
      expect(useLogbookStore.getState().searchQuery).toBe('')
    })
  })

  describe('Local mode', () => {
    it('should toggle local mode', () => {
      const { setLocalMode } = useLogbookStore.getState()

      // Start in local mode
      expect(useLogbookStore.getState().isLocalMode).toBe(true)

      // Toggle off
      setLocalMode(false)
      expect(useLogbookStore.getState().isLocalMode).toBe(false)

      // Toggle back on
      setLocalMode(true)
      expect(useLogbookStore.getState().isLocalMode).toBe(true)
    })
  })

  describe('Loading state', () => {
    it('should manage loading state', () => {
      // Set loading
      useLogbookStore.setState({ isLoading: true })
      expect(useLogbookStore.getState().isLoading).toBe(true)

      // Clear loading
      useLogbookStore.setState({ isLoading: false })
      expect(useLogbookStore.getState().isLoading).toBe(false)
    })
  })

  describe('Entries computed property', () => {
    it('should convert entriesMap to array', async () => {
      const { createEntry } = useLogbookStore.getState()

      const entry1 = { ...mockEntry, id: 'entry-1' }
      const entry2 = { ...mockEntry, id: 'entry-2' }

      await createEntry(entry1)
      await createEntry(entry2)

      const { entries, entriesMap } = useLogbookStore.getState()

      // Should have 2 entries in map
      expect(entriesMap.size).toBe(2)

      // Entries array should have same entries
      expect(entries).toHaveLength(2)
      // Check that both entries exist (createEntry may generate new IDs)
      const entryIds = entries.map(e => e.id)
      expect(entryIds.length).toBe(2)
      expect(entryIds[0]).not.toBe(entryIds[1]) // IDs should be unique
    })
  })
})
