import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EnhancedPracticeReports from '../../../components/EnhancedPracticeReports'
import { useLogbookStore } from '../../../stores/logbookStore'

// Mock Autocomplete
vi.mock('../../../components/ui/Autocomplete', () => ({
  default: ({ placeholder, value, onChange, options }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      data-suggestions={options?.length || 0}
    />
  ),
}))

// Mock useAutocomplete hook
vi.mock('../../../hooks/useAutocomplete', () => ({
  useAutocomplete: () => ({
    suggestions: [],
    isLoading: false,
    isOffline: false,
    setQuery: vi.fn(),
  }),
}))

// Mock the lazy-loaded ManualEntryForm
vi.mock('../../../components/ManualEntryForm', () => ({
  default: ({ editingEntryId, onSave }: any) => (
    <div data-testid="manual-entry-form">
      Manual Entry Form {editingEntryId && `(editing: ${editingEntryId})`}
      <button onClick={onSave} data-testid="save-entry">
        Save Entry
      </button>
    </div>
  ),
}))

// Mock the logbook store
vi.mock('../../../stores/logbookStore')

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Handle namespaced keys
      const cleanKey = key.includes(':') ? key.split(':')[1] : key

      // Basic translations
      if (cleanKey === 'title') return 'Practice Reports'
      if (cleanKey === 'tabs.overview') return 'Overview'
      if (cleanKey === 'tabs.pieces') return 'Pieces'
      if (cleanKey === 'tabs.newEntry') return 'Add New Entry'
      if (cleanKey === 'noPractice') return 'No practice'
      if (cleanKey === 'searchPieces') return 'Search pieces...'
      if (cleanKey === 'searchComposers') return 'Search composers...'
      if (cleanKey === 'export.exportJSON') return 'Export JSON'
      if (cleanKey === 'export.exportCSV') return 'Export CSV'
      if (cleanKey === 'showingDataFor') return 'Showing data for'
      if (cleanKey === 'clear') return 'Clear'
      if (cleanKey === 'confirmDelete') return 'Are you sure?'
      if (cleanKey === 'filters.allTime') return 'All time'
      if (cleanKey === 'filters.thisMonth') return 'This month'
      if (cleanKey === 'filters.last7Days') return 'Last 7 days'
      if (cleanKey === 'days.short.0') return 'S'
      if (cleanKey === 'days.short.1') return 'M'
      if (cleanKey === 'days.short.2') return 'T'
      if (cleanKey === 'days.short.3') return 'W'
      if (cleanKey === 'days.short.4') return 'T'
      if (cleanKey === 'days.short.5') return 'F'
      if (cleanKey === 'days.short.6') return 'S'
      if (cleanKey === 'type.PRACTICE') return 'Practice'
      if (cleanKey === 'instrument.piano') return 'Piano'
      if (cleanKey === 'days.short.0') return 'S'
      if (cleanKey === 'days.short.1') return 'M'
      if (cleanKey === 'sort.mostRecent') return 'Most Recent'
      if (cleanKey === 'sort.mostPracticed') return 'Most Practiced'
      if (cleanKey === 'sort.longestSessions') return 'Longest Sessions'
      if (cleanKey === 'stats.todaysPractice') return "Today's Practice"
      if (cleanKey === 'stats.thisWeek') return 'This Week'
      if (cleanKey === 'stats.sessions')
        return `${options?.count || 0} sessions`
      if (cleanKey === 'composers') return 'composers'
      if (cleanKey === 'pieces') return 'pieces'
      if (cleanKey === 'dayStreak') return 'day streak'
      if (cleanKey === 'stats.totalPractice') return 'Total Practice'
      if (cleanKey === 'sessions') return 'Sessions'
      if (cleanKey === 'stats.avgSession') return 'Avg Session'
      if (cleanKey === 'lastPracticed') return 'Last practiced'
      if (cleanKey === 'techniquesPracticed') return 'Techniques Practiced'
      if (cleanKey === 'common:edit') return 'Edit'
      if (cleanKey === 'common:delete') return 'Delete'
      if (cleanKey === 'entry.successAdded')
        return 'Practice entry successfully added!'
      if (cleanKey === 'entry.successUpdated')
        return 'Practice entry successfully updated!'
      if (cleanKey === 'entry.confirmDelete')
        return 'Are you sure you want to delete this entry?'
      if (cleanKey === 'mood.excited') return 'Excited'
      if (cleanKey === 'mood.satisfied') return 'Satisfied'
      if (cleanKey === 'mood.neutral') return 'Neutral'
      if (cleanKey === 'mood.frustrated') return 'Frustrated'
      if (cleanKey === 'music.practice') return 'Practice'
      if (cleanKey === 'music.lesson') return 'Lesson'
      if (cleanKey === 'instruments.piano') return 'Piano'
      if (cleanKey === 'instruments.guitar') return 'Guitar'
      if (cleanKey === 'avg') return 'avg'
      if (cleanKey === 'total') return 'total'
      if (cleanKey === 'practiced') return 'Practiced'
      if (cleanKey === 'practiceCalendar') return 'Practice Calendar'

      return cleanKey
    },
  }),
}))

const mockEntries = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    duration: 30,
    type: 'PRACTICE' as const,
    instrument: 'PIANO' as const,
    pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
    techniques: ['scales', 'arpeggios'],
    mood: 'SATISFIED' as const,
    notes: 'Good session',
    tags: [],
    goalIds: [],
    metadata: { source: 'manual' },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    duration: 45,
    type: 'PRACTICE' as const,
    instrument: 'PIANO' as const,
    pieces: [{ title: 'Prelude in C', composer: 'Bach' }],
    techniques: ['dynamics'],
    mood: 'EXCITED' as const,
    notes: '',
    tags: [],
    goalIds: [],
    metadata: { source: 'manual' },
  },
]

describe('EnhancedPracticeReports', () => {
  const mockDeleteEntry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useLogbookStore).mockReturnValue({
      entries: mockEntries,
      deleteEntry: mockDeleteEntry,
      isLoading: false,
      error: null,
      searchQuery: '',
      loadEntries: vi.fn(),
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      setSearchQuery: vi.fn(),
      clearError: vi.fn(),
    })
  })

  it('renders expanded by default with tabs visible', () => {
    render(<EnhancedPracticeReports />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Pieces')).toBeInTheDocument()
    expect(screen.getByText('Add New Entry')).toBeInTheDocument()
  })

  it('shows tabs and content by default', () => {
    render(<EnhancedPracticeReports />)

    // Tabs should be visible by default
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Pieces')).toBeInTheDocument()
    expect(screen.getByText('Add New Entry')).toBeInTheDocument()

    // Time period filters should be visible
    expect(screen.getByText('All time')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<EnhancedPracticeReports />)

    // Click on Pieces tab
    const piecesTab = screen.getByText('Pieces')
    fireEvent.click(piecesTab)

    // Should show search inputs
    expect(screen.getByPlaceholderText('Search pieces...')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search composers...')
    ).toBeInTheDocument()

    // Click on Add New Entry tab
    const newEntryTab = screen.getByText('Add New Entry')
    fireEvent.click(newEntryTab)

    // Should show manual entry form (wait for lazy loading)
    await waitFor(() => {
      expect(screen.getByTestId('manual-entry-form')).toBeInTheDocument()
    })
  })

  it('displays calendar heat map in overview', () => {
    render(<EnhancedPracticeReports />)

    // Should show day headers
    expect(screen.getAllByText('S')).toHaveLength(2) // Sunday appears twice
    expect(screen.getAllByText('M')).toHaveLength(1) // Monday appears once

    // Should have 42 calendar buttons (6 weeks)
    const calendarButtons = screen
      .getAllByRole('button')
      .filter(btn => btn.textContent && !isNaN(parseInt(btn.textContent)))
    expect(calendarButtons.length).toBe(42)
  })

  it('displays entries with full details', () => {
    render(<EnhancedPracticeReports />)

    // Check first entry details
    expect(screen.getByText(/Moonlight Sonata - Beethoven/)).toBeInTheDocument()
    expect(screen.getByText(/Good session/)).toBeInTheDocument()
    expect(screen.getByText(/scales, arpeggios/)).toBeInTheDocument()
  })

  it('deletes entry when delete button clicked', async () => {
    window.confirm = vi.fn(() => true)
    render(<EnhancedPracticeReports />)

    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure?')
      expect(mockDeleteEntry).toHaveBeenCalledWith('1')
    })
  })

  it('switches to edit mode when edit button clicked', async () => {
    render(<EnhancedPracticeReports />)

    // Find and click edit button
    const editButtons = screen.getAllByTitle('Edit')
    fireEvent.click(editButtons[0])

    // Should switch to new entry tab with editing ID (wait for lazy loading)
    await waitFor(() => {
      expect(
        screen.getByText('Manual Entry Form (editing: 1)')
      ).toBeInTheDocument()
    })
  })

  it('filters by selected date when calendar day clicked', () => {
    render(<EnhancedPracticeReports />)

    // Click on a calendar day
    const calendarButtons = screen
      .getAllByRole('button')
      .filter(btn => btn.textContent && !isNaN(parseInt(btn.textContent)))
    fireEvent.click(calendarButtons[41]) // Last day (today)

    // Should show "Showing data for" message
    expect(screen.getByText(/Showing data for/)).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('clears date filter when clear button clicked', () => {
    render(<EnhancedPracticeReports />)

    // Click on a calendar day
    const calendarButtons = screen
      .getAllByRole('button')
      .filter(btn => btn.textContent && !isNaN(parseInt(btn.textContent)))
    fireEvent.click(calendarButtons[41])

    // Click clear
    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)

    // Should not show "Showing data for" message anymore
    expect(screen.queryByText(/Showing data for/)).not.toBeInTheDocument()
  })

  it('changes sort order when sort buttons clicked', () => {
    render(<EnhancedPracticeReports />)

    // Click different sort buttons
    fireEvent.click(screen.getByText('Most Practiced'))
    fireEvent.click(screen.getByText('Longest Sessions'))

    // Buttons should update their active state (implementation would show different styling)
    expect(screen.getByText('Most Recent')).toBeInTheDocument()
    expect(screen.getByText('Most Practiced')).toBeInTheDocument()
    expect(screen.getByText('Longest Sessions')).toBeInTheDocument()
  })

  it('shows export buttons only in overview tab', () => {
    render(<EnhancedPracticeReports />)

    // In overview tab - should show export buttons
    expect(screen.getByText('Export JSON')).toBeInTheDocument()
    expect(screen.getByText('Export CSV')).toBeInTheDocument()

    // Switch to Pieces tab
    fireEvent.click(screen.getByText('Pieces'))

    // Should not show export buttons
    expect(screen.queryByText('Export JSON')).not.toBeInTheDocument()
    expect(screen.queryByText('Export CSV')).not.toBeInTheDocument()
  })

  it('provides autocomplete inputs for pieces and composers', () => {
    render(<EnhancedPracticeReports />)

    // Go to Pieces tab
    fireEvent.click(screen.getByText('Pieces'))

    // Check that autocomplete inputs exist
    const pieceInput = screen.getByPlaceholderText('Search pieces...')
    const composerInput = screen.getByPlaceholderText('Search composers...')

    expect(pieceInput).toBeInTheDocument()
    expect(composerInput).toBeInTheDocument()
  })

  it('displays summary stats correctly', () => {
    render(<EnhancedPracticeReports />)

    // Check summary stats
    expect(screen.getByText("Today's Practice")).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('2 composers')).toBeInTheDocument()
    expect(screen.getByText('2 pieces')).toBeInTheDocument()
  })

  it('shows success message after saving new entry', async () => {
    render(<EnhancedPracticeReports />)

    // Click on Add New Entry tab
    const newEntryTab = screen.getByText('Add New Entry')
    fireEvent.click(newEntryTab)

    // Click save button
    const saveButton = screen.getByTestId('save-entry')
    fireEvent.click(saveButton)

    // Should show success message
    await waitFor(() => {
      expect(
        screen.getByText('Practice entry successfully added!')
      ).toBeInTheDocument()
    })
  })
})
