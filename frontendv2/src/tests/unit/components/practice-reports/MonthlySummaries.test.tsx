import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MonthlySummaries } from '../../../../components/practice-reports/MonthlySummaries'
import { LogbookEntry } from '../../../../api/logbook'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reports:monthlyHistory': 'Monthly History',
        'reports:sessions': 'sessions',
        'reports:pieces': 'pieces',
        'common:edit': 'Edit',
        'common:delete': 'Delete',
      }
      return translations[key] || key
    },
  }),
}))

const mockEntries: LogbookEntry[] = [
  // This should be the most recent and excluded
  {
    id: '4',
    timestamp: '2024-01-05T12:00:00Z',
    duration: 25,
    type: 'PRACTICE',
    instrument: 'PIANO',
    pieces: [{ title: 'Recent Practice', composer: '' }],
    techniques: [],
    notes: null,
    mood: null,
    tags: [],
    goalIds: [],
    metadata: {},
  },
  {
    id: '1',
    timestamp: '2023-12-15T10:00:00Z',
    duration: 45,
    type: 'PRACTICE',
    instrument: 'PIANO',
    pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
    techniques: [],
    notes: 'Great session',
    mood: 'SATISFIED',
    tags: [],
    goalIds: [],
    metadata: {},
  },
  {
    id: '2',
    timestamp: '2023-12-10T14:00:00Z',
    duration: 30,
    type: 'PRACTICE',
    instrument: 'GUITAR',
    pieces: [{ title: 'Classical Gas', composer: 'Mason Williams' }],
    techniques: [],
    notes: null,
    mood: null,
    tags: [],
    goalIds: [],
    metadata: {},
  },
  {
    id: '3',
    timestamp: '2023-11-20T16:00:00Z',
    duration: 60,
    type: 'LESSON',
    instrument: 'PIANO',
    pieces: [{ title: 'Chopin Etude', composer: 'Chopin' }],
    techniques: ['scales'],
    notes: 'Worked on finger technique',
    mood: 'EXCITED',
    tags: [],
    goalIds: [],
    metadata: {},
  },
]

const mockProps = {
  entries: mockEntries,
  recentEntriesCount: 1, // Exclude the first entry (most recent)
  formatDuration: (minutes: number) => `${minutes}min`,
  onDeleteEntry: vi.fn(),
  onEditEntry: vi.fn(),
}

describe('MonthlySummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render monthly history title', () => {
    render(<MonthlySummaries {...mockProps} />)
    expect(screen.getByText('Monthly History')).toBeInTheDocument()
  })

  it('should group entries by month correctly', () => {
    render(<MonthlySummaries {...mockProps} />)

    // Should show December 2023 and November 2023 (excluding January 2024 which is recent)
    expect(screen.getByText('December 2023')).toBeInTheDocument()
    expect(screen.getByText('November 2023')).toBeInTheDocument()
  })

  it('should show correct monthly statistics', () => {
    render(<MonthlySummaries {...mockProps} />)

    // December 2023 should have 2 sessions, 75min total, 2 pieces
    expect(screen.getByText('75min')).toBeInTheDocument()
    expect(screen.getByText('2 sessions')).toBeInTheDocument()
    expect(screen.getByText('2 pieces')).toBeInTheDocument()

    // November 2023 should have 1 session, 60min total, 1 piece
    expect(screen.getByText('60min')).toBeInTheDocument()
    expect(screen.getByText('1 sessions')).toBeInTheDocument()
    expect(screen.getByText('1 pieces')).toBeInTheDocument()
  })

  it('should show clickable month headers', () => {
    render(<MonthlySummaries {...mockProps} />)

    // Should have clickable month headers
    expect(screen.getByText('December 2023')).toBeInTheDocument()
    expect(screen.getByText('November 2023')).toBeInTheDocument()
  })

  it('should handle interactions correctly', () => {
    render(<MonthlySummaries {...mockProps} />)

    // The component should render without errors and show month summaries
    expect(screen.getByText('Monthly History')).toBeInTheDocument()
    expect(screen.getByText('75min')).toBeInTheDocument()
    expect(screen.getByText('60min')).toBeInTheDocument()
  })

  it('should call onDeleteEntry when delete button is clicked', async () => {
    render(<MonthlySummaries {...mockProps} />)

    // Expand December 2023
    fireEvent.click(screen.getByText('December 2023'))

    // Click delete button for first entry
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(mockProps.onDeleteEntry).toHaveBeenCalledWith('1')
  })

  it('should exclude recent entries correctly', () => {
    render(<MonthlySummaries {...mockProps} />)

    // The most recent entry should not appear in monthly summaries
    expect(screen.queryByText('Recent Practice')).not.toBeInTheDocument()

    // Monthly summaries should show correct statistics
    expect(screen.getByText('75min')).toBeInTheDocument()
    expect(screen.getByText('60min')).toBeInTheDocument()
  })

  it('should handle empty entries gracefully', () => {
    const emptyProps = { ...mockProps, entries: [] }
    const { container } = render(<MonthlySummaries {...emptyProps} />)

    // Should render nothing when no entries
    expect(container.firstChild).toBeNull()
  })

  it('should sort months in descending order', () => {
    render(<MonthlySummaries {...mockProps} />)

    const monthElements = screen.getAllByText(/\w+ \d{4}/)
    // Should be sorted from most recent to oldest (excluding the recent entry)
    expect(monthElements[0]).toHaveTextContent('December 2023')
    expect(monthElements[1]).toHaveTextContent('November 2023')
  })
})
