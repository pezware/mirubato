import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { useLogbookStore } from '../../../stores/logbookStore'
import type { LogbookEntry } from '../../../api/logbook'

// Mock localStorage
const localStorageData: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
  }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('logbookStore sorting', () => {
  beforeEach(() => {
    // Reset the store
    useLogbookStore.setState({
      entriesMap: new Map(),
      entries: [],
      isLoading: false,
      error: null,
    })
    // Clear localStorage data
    Object.keys(localStorageData).forEach(key => delete localStorageData[key])
    vi.clearAllMocks()
  })

  it('should sort entries by timestamp in descending order', async () => {
    // Create entries with different timestamps
    const entries: LogbookEntry[] = [
      {
        id: 'entry-1',
        timestamp: '2025-06-25T14:34:00Z', // 2:34 PM
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
        createdAt: '2025-06-25T14:35:00Z', // Created later
        updatedAt: '2025-06-25T14:35:00Z',
      },
      {
        id: 'entry-2',
        timestamp: '2025-06-25T10:42:00Z', // 10:42 AM (earlier)
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
        createdAt: '2025-06-25T14:00:00Z', // Created earlier
        updatedAt: '2025-06-25T14:00:00Z',
      },
      {
        id: 'entry-3',
        timestamp: '2025-06-24T22:48:00Z', // Previous day
        duration: 30,
        type: 'LESSON',
        instrument: 'GUITAR',
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
        createdAt: '2025-06-25T14:30:00Z', // Created recently
        updatedAt: '2025-06-25T14:30:00Z',
      },
    ]

    // Store entries in localStorage
    localStorageData['mirubato:logbook:entries'] = JSON.stringify(entries)

    // Load entries
    await act(async () => {
      await useLogbookStore.getState().loadEntries()
    })

    const state = useLogbookStore.getState()

    // Verify entries are sorted by timestamp (most recent first)
    expect(state.entries).toHaveLength(3)
    expect(state.entries[0].id).toBe('entry-1') // 2:34 PM today
    expect(state.entries[1].id).toBe('entry-2') // 10:42 AM today
    expect(state.entries[2].id).toBe('entry-3') // Previous day

    // Verify the timestamps are in descending order
    const timestamps = state.entries.map(e => new Date(e.timestamp).getTime())
    expect(timestamps[0]).toBeGreaterThan(timestamps[1])
    expect(timestamps[1]).toBeGreaterThan(timestamps[2])
  })
})
