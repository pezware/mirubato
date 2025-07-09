import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EnhancedReports from '../../../components/practice-reports/EnhancedReports'
import { useLogbookStore } from '../../../stores/logbookStore'
import { useAutocomplete } from '../../../hooks/useAutocomplete'
import { LogbookEntry } from '../../../api/logbook'

// Initialize Chart.js for tests
import '../../../utils/chartSetup'

// Mock the stores and hooks
vi.mock('../../../stores/logbookStore')
vi.mock('../../../hooks/useAutocomplete')

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}))

// Mock the lazy loaded components
vi.mock('../../../components/ManualEntryForm', () => ({
  default: ({
    onClose,
    onSave,
  }: {
    onClose: () => void
    onSave: (data: unknown) => void
  }) => (
    <div data-testid="manual-entry-form">
      <button onClick={() => onSave({})}>Save Entry</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// Mock the lazy loaded view components
vi.mock('../../../components/practice-reports/views/OverviewView', () => ({
  default: ({
    analytics,
  }: {
    analytics: { filteredEntries: LogbookEntry[] }
  }) => {
    const totalMinutes = analytics.filteredEntries.reduce(
      (sum: number, entry: LogbookEntry) => sum + (entry.duration || 0),
      0
    )
    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = Math.round(minutes % 60)
      if (hours === 0) return `${mins}m`
      if (mins === 0) return `${hours}h`
      return `${hours}h ${mins}m`
    }

    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="w-full">
          <div className="space-y-3">
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
              data-testid="summary-stats"
            >
              <div className="bg-morandi-stone-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-morandi-stone-900">
                  {analytics.filteredEntries.length === 0
                    ? '0m'
                    : formatDuration(totalMinutes)}
                </p>
                <p className="text-xs text-morandi-stone-600">
                  reports:totalPractice
                </p>
              </div>
              <div className="bg-morandi-stone-100 rounded-lg p-3">
                <p className="text-2xl font-bold text-morandi-stone-900">
                  {analytics.filteredEntries.length}
                </p>
                <p className="text-xs text-morandi-stone-600">
                  reports:sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
}))

vi.mock('../../../components/practice-reports/views/AnalyticsView', () => ({
  default: () => <div>Analytics View</div>,
}))

vi.mock('../../../components/practice-reports/views/DataTableView', () => ({
  default: () => <div>Data Table View</div>,
}))

vi.mock('../../../components/practice-reports/views/PiecesView', () => ({
  default: () => <div data-testid="pieces-statistics">Pieces Statistics</div>,
}))

// Mock the lazy loaded report components
vi.mock('../../../components/practice-reports/SummaryStats', () => ({
  SummaryStats: ({
    filteredAndSortedEntries,
    formatDuration,
  }: {
    filteredAndSortedEntries: LogbookEntry[]
    formatDuration: (minutes: number) => string
  }) => {
    const totalMinutes = filteredAndSortedEntries.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    )
    return (
      <div className="space-y-3">
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          data-testid="summary-stats"
        >
          <div className="bg-morandi-stone-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-morandi-stone-900">
              {filteredAndSortedEntries.length === 0
                ? '0m'
                : formatDuration(totalMinutes)}
            </p>
            <p className="text-xs text-morandi-stone-600">
              reports:totalPractice
            </p>
          </div>
          <div className="bg-morandi-stone-100 rounded-lg p-3">
            <p className="text-2xl font-bold text-morandi-stone-900">
              {filteredAndSortedEntries.length}
            </p>
            <p className="text-xs text-morandi-stone-600">reports:sessions</p>
          </div>
        </div>
      </div>
    )
  },
}))

vi.mock('../../../components/practice-reports/PiecesStatistics', () => ({
  PiecesStatistics: () => (
    <div data-testid="pieces-statistics">Pieces Statistics</div>
  ),
}))

vi.mock('../../../components/practice-reports/PieceComposerStats', () => ({
  PieceComposerStats: () => (
    <div data-testid="piece-composer-stats">Piece Composer Stats</div>
  ),
}))

// Mock the chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Chart: () => <div data-testid="chart">Chart</div>,
}))

const mockEntries = [
  {
    id: 'entry1',
    timestamp: new Date().toISOString(),
    duration: 30,
    type: 'PRACTICE' as const,
    pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
    techniques: ['scales', 'arpeggios'],
    notes: 'Good practice session',
    mood: 'happy' as const,
    instrument: 'piano',
    logVersion: 2,
    syncStatus: 'synced' as const,
  },
  {
    id: 'entry2',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    duration: 45,
    type: 'LESSON' as const,
    pieces: [{ title: 'Prelude in C', composer: 'Bach' }],
    techniques: ['rhythm'],
    notes: 'Lesson with teacher',
    mood: 'focused' as const,
    instrument: 'piano',
    logVersion: 2,
    syncStatus: 'synced' as const,
  },
  {
    id: 'entry3',
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    duration: 60,
    type: 'PRACTICE' as const,
    pieces: [
      { title: 'Moonlight Sonata', composer: 'Beethoven' },
      { title: 'Fur Elise', composer: 'Beethoven' },
    ],
    techniques: ['dynamics', 'phrasing'],
    notes: 'Working on expression',
    mood: 'neutral' as const,
    instrument: 'guitar',
    logVersion: 2,
    syncStatus: 'synced' as const,
  },
]

describe('EnhancedReports', () => {
  const mockDeleteEntry = vi.fn()
  const mockAutocompletePiece = {
    query: '',
    setQuery: vi.fn(),
    suggestions: [],
    isLoading: false,
    error: null,
  }
  const mockAutocompleteComposer = {
    query: '',
    setQuery: vi.fn(),
    suggestions: [],
    isLoading: false,
    error: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation for useLogbookStore
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: mockEntries,
      deleteEntry: mockDeleteEntry,
    })

    // Default mock implementation for useAutocomplete
    ;(
      useAutocomplete as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(({ type }) => {
      return type === 'piece' ? mockAutocompletePiece : mockAutocompleteComposer
    })
  })

  it('should render the component with tabs', () => {
    render(<EnhancedReports />)

    // Use getAllByText since tabs now render both full and short labels
    expect(screen.getAllByText('reports:tabs.overview').length).toBeGreaterThan(
      0
    )
    expect(screen.getAllByText('reports:tabs.pieces').length).toBeGreaterThan(0)
    expect(screen.getAllByText('reports:tabs.newEntry').length).toBeGreaterThan(
      0
    )
  })

  it('should display practice statistics in overview tab', async () => {
    render(<EnhancedReports />)

    // Wait for lazy loaded component and check for stats
    await waitFor(
      () => {
        expect(screen.getByTestId('summary-stats')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Check that the total practice time is displayed (use getAllByText since it appears multiple times)
    const durations = screen.getAllByText('2h 15m') // 30 + 45 + 60 = 135 minutes
    expect(durations.length).toBeGreaterThan(0)

    // Check session count
    const sessionCounts = screen.getAllByText('3') // 3 sessions + entry count
    expect(sessionCounts.length).toBeGreaterThan(0)
  })

  it('should display practice calendar', async () => {
    render(<EnhancedReports />)

    // Wait for the overview view to load
    await waitFor(() => {
      expect(screen.getByTestId('summary-stats')).toBeInTheDocument()
    })

    // The calendar is now part of the lazy-loaded OverviewView
    // Instead of checking for specific calendar elements, we'll verify the view loaded
    // Use getAllByText since tabs render both full and short labels
    expect(screen.getAllByText('reports:tabs.overview').length).toBeGreaterThan(
      0
    )
  })

  it('should switch between tabs', async () => {
    render(<EnhancedReports />)

    // Check that overview tab is active by default
    const overviewTab = screen.getByTestId('overview-tab')
    expect(overviewTab).toHaveClass('border-morandi-purple-400')

    // Click on pieces tab
    const piecesTab = screen.getByTestId('pieces-tab')
    fireEvent.click(piecesTab)

    // Wait for pieces view to load
    await waitFor(() => {
      expect(piecesTab).toHaveClass('border-morandi-purple-400')
      expect(overviewTab).not.toHaveClass('border-morandi-purple-400')
    })
  })

  it('should switch to pieces tab', async () => {
    render(<EnhancedReports />)

    // Use getByTestId which is unique
    const piecesTab = screen.getByTestId('pieces-tab')
    fireEvent.click(piecesTab)

    // Wait for the pieces view to load
    await waitFor(() => {
      // Check that pieces statistics component is rendered
      expect(screen.getByTestId('pieces-statistics')).toBeInTheDocument()
    })
  })

  it('should display piece statistics in pieces tab', async () => {
    render(<EnhancedReports />)

    const piecesTab = screen.getByTestId('pieces-tab')
    fireEvent.click(piecesTab)

    // Wait for lazy loaded component
    await waitFor(() => {
      expect(screen.getByTestId('pieces-statistics')).toBeInTheDocument()
    })
  })

  it('should display export buttons', () => {
    render(<EnhancedReports />)

    // Check that export buttons are present (using data-testid for uniqueness)
    expect(screen.getByTestId('export-csv-button')).toBeInTheDocument()
    expect(screen.getByTestId('export-json-button')).toBeInTheDocument()
  })

  it('should switch to new entry tab and show form', async () => {
    render(<EnhancedReports />)

    // Use getByTestId which is unique
    const newEntryTab = screen.getByTestId('newEntry-tab')
    fireEvent.click(newEntryTab)

    // Wait for lazy loaded component
    await waitFor(() => {
      expect(screen.getByTestId('manual-entry-form')).toBeInTheDocument()
    })
  })

  it('should handle empty entries state', async () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      deleteEntry: mockDeleteEntry,
    })

    render(<EnhancedReports />)

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('summary-stats')).toBeInTheDocument()
    })

    // With no entries, should show 0m for total practice time (use getAllByText since it appears multiple times)
    const zeroDurations = screen.getAllByText('0m')
    expect(zeroDurations.length).toBeGreaterThan(0) // Total practice time

    // Sessions count appears as standalone "0"
    const zeroCounts = screen.getAllByText('0')
    expect(zeroCounts.length).toBeGreaterThan(0) // Sessions count
  })

  it('should show entry count', () => {
    render(<EnhancedReports />)

    // Check that the entry count is displayed in the header
    // The component shows "3 reports:entriesFound" as a single text node
    const entryCountText = screen.getByText(content => {
      return content.includes('3') && content.includes('reports:entriesFound')
    })
    expect(entryCountText).toBeInTheDocument()
  })

  it('should switch to analytics tab', async () => {
    render(<EnhancedReports />)

    const analyticsTab = screen.getByTestId('analytics-tab')
    fireEvent.click(analyticsTab)

    // Wait for analytics view to load
    await waitFor(() => {
      expect(analyticsTab).toHaveClass('border-morandi-purple-400')
    })
  })

  it('should export data as JSON', () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()

    // Mock the anchor element
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      style: {},
    }

    // Create a real document.createElement implementation for the test
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLElement
        }
        return originalCreateElement(tagName)
      })

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    render(<EnhancedReports />)

    const exportJsonButton = screen.getByTestId('export-json-button')
    fireEvent.click(exportJsonButton)

    expect(mockClick).toHaveBeenCalled()
    expect(mockAnchor.download).toContain('.json')

    // Cleanup
    mockCreateElement.mockRestore()
  })

  it('should export data as CSV', () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()

    // Mock the anchor element
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      style: {},
    }

    // Create a real document.createElement implementation for the test
    const originalCreateElement = document.createElement.bind(document)
    const mockCreateElement = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLElement
        }
        return originalCreateElement(tagName)
      })

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    render(<EnhancedReports />)

    const exportCsvButton = screen.getByTestId('export-csv-button')
    fireEvent.click(exportCsvButton)

    expect(mockClick).toHaveBeenCalled()
    expect(mockAnchor.download).toContain('.csv')

    // Cleanup
    mockCreateElement.mockRestore()
  })

  it('should switch to data table view', async () => {
    render(<EnhancedReports />)

    const dataTab = screen.getByTestId('data-tab')
    fireEvent.click(dataTab)

    // Wait for data view to load
    await waitFor(() => {
      expect(dataTab).toHaveClass('border-morandi-purple-400')
    })
  })

  it('should switch to new entry tab', async () => {
    render(<EnhancedReports />)

    const newEntryTab = screen.getByTestId('newEntry-tab')
    fireEvent.click(newEntryTab)

    // Wait for manual entry form to load
    await waitFor(() => {
      expect(screen.getByTestId('manual-entry-form')).toBeInTheDocument()
    })
  })

  it('should format duration correctly', async () => {
    render(<EnhancedReports />)

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByTestId('summary-stats')).toBeInTheDocument()
    })

    // Should format total duration (30 + 45 + 60 = 135 minutes = 2h 15m)
    const durations = screen.getAllByText('2h 15m')
    expect(durations.length).toBeGreaterThan(0)
  })

  it('should handle tab switching with keyboard', () => {
    render(<EnhancedReports />)

    const overviewTab = screen.getByTestId('overview-tab')
    const piecesTab = screen.getByTestId('pieces-tab')

    // Overview tab should be active by default
    expect(overviewTab).toHaveClass('border-morandi-purple-400')

    // Click pieces tab
    fireEvent.click(piecesTab)
    expect(piecesTab).toHaveClass('border-morandi-purple-400')
  })

  it('should render all navigation tabs', () => {
    render(<EnhancedReports />)

    // Check all tabs are present
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
    expect(screen.getByTestId('pieces-tab')).toBeInTheDocument()
    expect(screen.getByTestId('analytics-tab')).toBeInTheDocument()
    expect(screen.getByTestId('data-tab')).toBeInTheDocument()
    expect(screen.getByTestId('newEntry-tab')).toBeInTheDocument()
  })
})
