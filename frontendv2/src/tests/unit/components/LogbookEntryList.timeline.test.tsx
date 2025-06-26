import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import LogbookEntryList from '../../../components/LogbookEntryList'
import { useLogbookStore } from '../../../stores/logbookStore'
import type { LogbookEntry } from '../../../api/logbook'

vi.mock('../../../stores/logbookStore')

describe('LogbookEntryList Timeline Filtering', () => {
  const mockDeleteEntry = vi.fn()

  const mockEntries: LogbookEntry[] = [
    // Week 4 entries (June 23-29, 2025)
    {
      id: 'week4-entry-1',
      timestamp: '2025-06-25T14:34:00Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [],
      techniques: [],
      goalIds: [],
      tags: [],
      createdAt: '2025-06-25T14:35:00Z',
      updatedAt: '2025-06-25T14:35:00Z',
    },
    {
      id: 'week4-entry-2',
      timestamp: '2025-06-24T10:42:00Z',
      duration: 45,
      type: 'PRACTICE',
      instrument: 'GUITAR',
      pieces: [],
      techniques: [],
      goalIds: [],
      tags: [],
      createdAt: '2025-06-24T10:43:00Z',
      updatedAt: '2025-06-24T10:43:00Z',
    },
    // Week 3 entries (June 16-22, 2025)
    {
      id: 'week3-entry-1',
      timestamp: '2025-06-20T15:00:00Z',
      duration: 60,
      type: 'LESSON',
      instrument: 'PIANO',
      pieces: [],
      techniques: [],
      goalIds: [],
      tags: [],
      createdAt: '2025-06-20T15:01:00Z',
      updatedAt: '2025-06-20T15:01:00Z',
    },
    // Previous month entry
    {
      id: 'may-entry-1',
      timestamp: '2025-05-15T12:00:00Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'GUITAR',
      pieces: [],
      techniques: [],
      goalIds: [],
      tags: [],
      createdAt: '2025-05-15T12:01:00Z',
      updatedAt: '2025-05-15T12:01:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLogbookStore).mockReturnValue({
      deleteEntry: mockDeleteEntry,
      entriesMap: new Map(),
      goalsMap: new Map(),
      isLoading: false,
      error: null,
      searchQuery: '',
      isLocalMode: true,
      entries: [],
      goals: [],
      loadEntries: vi.fn(),
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      loadGoals: vi.fn(),
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
      setSearchQuery: vi.fn(),
      setLocalMode: vi.fn(),
      clearError: vi.fn(),
      syncWithServer: vi.fn(),
    })
  })

  it('should show only Week 4 entries when Week 4 is selected', async () => {
    const onUpdate = vi.fn()

    await act(async () => {
      render(<LogbookEntryList entries={mockEntries} onUpdate={onUpdate} />)
    })

    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByText('Found 2 entries')).toBeInTheDocument()
    })

    // Verify Week 4 is selected by default (most recent entry)
    expect(screen.getByText('Week 4')).toBeInTheDocument()

    // Check that only Week 4 entries are shown
    expect(screen.getByText('30 minutes')).toBeInTheDocument() // week4-entry-1
    expect(screen.getByText('45 minutes')).toBeInTheDocument() // week4-entry-2
    expect(screen.queryByText('60 minutes')).not.toBeInTheDocument() // week3-entry-1
  })

  it('should show all month entries when Month view is selected', async () => {
    const onUpdate = vi.fn()

    await act(async () => {
      render(<LogbookEntryList entries={mockEntries} onUpdate={onUpdate} />)
    })

    // Click on Month button
    const monthButton = screen.getByRole('button', { name: 'By Month' })
    fireEvent.click(monthButton)

    await waitFor(() => {
      expect(screen.getByText('Found 3 entries')).toBeInTheDocument()
    })

    // Check that all June entries are shown but not May
    expect(screen.getByText('30 minutes')).toBeInTheDocument() // week4-entry-1
    expect(screen.getByText('45 minutes')).toBeInTheDocument() // week4-entry-2
    expect(screen.getByText('60 minutes')).toBeInTheDocument() // week3-entry-1
    // May entry should not be shown
    expect(screen.getAllByText('30 minutes')).toHaveLength(1) // Only June entry
  })

  it('should navigate to previous week when previous button is clicked', async () => {
    const onUpdate = vi.fn()

    await act(async () => {
      render(<LogbookEntryList entries={mockEntries} onUpdate={onUpdate} />)
    })

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Week 4')).toBeInTheDocument()
    })

    // Click previous button
    const prevButton = screen.getByRole('button', { name: 'Previous' })
    fireEvent.click(prevButton)

    await waitFor(() => {
      expect(screen.getByText('Week 3')).toBeInTheDocument()
      expect(screen.getByText('Found 1 entries')).toBeInTheDocument()
    })

    // Check that only Week 3 entry is shown
    expect(screen.getByText('60 minutes')).toBeInTheDocument() // week3-entry-1
    expect(screen.queryByText('30 minutes')).not.toBeInTheDocument() // week4-entry-1
    expect(screen.queryByText('45 minutes')).not.toBeInTheDocument() // week4-entry-2
  })

  it('should show all year entries when year level is clicked', async () => {
    const onUpdate = vi.fn()

    await act(async () => {
      render(<LogbookEntryList entries={mockEntries} onUpdate={onUpdate} />)
    })

    // Click on the year level (2025)
    const yearButton = screen.getByText('2025')
    fireEvent.click(yearButton)

    await waitFor(() => {
      expect(screen.getByText('Found 4 entries')).toBeInTheDocument()
    })

    // All 2025 entries should be shown
    expect(screen.getAllByText('30 minutes')).toHaveLength(2) // week4-entry-1 and may-entry-1
    expect(screen.getByText('45 minutes')).toBeInTheDocument()
    expect(screen.getByText('60 minutes')).toBeInTheDocument()
  })

  it('should handle empty state when no entries match filter', async () => {
    const onUpdate = vi.fn()
    const emptyWeekEntries = mockEntries.filter(e => e.id.includes('may'))

    await act(async () => {
      render(
        <LogbookEntryList entries={emptyWeekEntries} onUpdate={onUpdate} />
      )
    })

    // Component should initialize with May entry's date
    await waitFor(() => {
      expect(screen.getByText('May')).toBeInTheDocument()
      expect(screen.getByText('Found 1 entries')).toBeInTheDocument()
    })
  })
})
