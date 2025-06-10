import { render, screen, fireEvent } from '@testing-library/react'
import LogbookEntryList from './LogbookEntryList'
import type { LogbookEntry } from '../modules/logger/types'
import { LogbookEntryType, Mood, Instrument } from '../modules/logger/types'

describe('LogbookEntryList', () => {
  const mockEntries: LogbookEntry[] = [
    {
      id: '1',
      userId: 'user1',
      timestamp: '2024-01-15T10:00:00.000Z',
      duration: 2700, // 45 minutes
      type: LogbookEntryType.PRACTICE,
      instrument: Instrument.PIANO,
      pieces: [
        { id: 'p1', title: 'Moonlight Sonata', composer: 'Beethoven' },
        { id: 'p2', title: 'Clair de Lune', composer: 'Debussy' },
      ],
      techniques: ['Scales', 'Dynamics'],
      goalIds: [],
      notes: 'Focused on dynamics in the opening passages',
      mood: Mood.SATISFIED,
      tags: ['beethoven', 'dynamics'],
      sessionId: null,
      metadata: { source: 'manual' },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: '2',
      userId: 'user1',
      timestamp: '2024-01-15T14:30:00.000Z',
      duration: 3600, // 60 minutes
      type: LogbookEntryType.LESSON,
      instrument: Instrument.PIANO,
      pieces: [{ id: 'p3', title: 'Chopin Etude Op.10 No.3' }],
      techniques: ['Phrasing', 'Pedaling'],
      goalIds: ['g1'],
      notes: 'Teacher suggested new fingering',
      mood: Mood.EXCITED,
      tags: ['lesson', 'chopin'],
      sessionId: null,
      metadata: null,
      createdAt: '2024-01-15T14:30:00.000Z',
      updatedAt: '2024-01-15T14:30:00.000Z',
    },
    {
      id: '3',
      userId: 'user1',
      timestamp: '2024-01-14T18:00:00.000Z',
      duration: 1800, // 30 minutes
      type: LogbookEntryType.PERFORMANCE,
      instrument: Instrument.GUITAR,
      pieces: [{ id: 'p4', title: 'Asturias', composer: 'Albéniz' }],
      techniques: [],
      goalIds: [],
      notes: 'Small venue performance',
      mood: Mood.NEUTRAL,
      tags: ['performance', 'spanish'],
      sessionId: null,
      metadata: { source: 'automatic', accuracy: 0.92 },
      createdAt: '2024-01-14T18:00:00.000Z',
      updatedAt: '2024-01-14T18:00:00.000Z',
    },
  ]

  const mockOnEdit = jest.fn()
  const mockOnDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders entries grouped by date', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    // Check date headers
    expect(screen.getByText(/Monday, January 15, 2024/)).toBeInTheDocument()
    expect(screen.getByText(/Sunday, January 14, 2024/)).toBeInTheDocument()

    // Check session counts
    expect(screen.getByText('2 sessions • 1h 45min')).toBeInTheDocument() // Monday
    expect(screen.getByText('1 session • 30 min')).toBeInTheDocument() // Sunday
  })

  it('displays entry details correctly', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    // First entry - look for text within the capitalize span
    expect(screen.getByText(/practice Session/)).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()
    expect(screen.getByText('Scales, Dynamics')).toBeInTheDocument()
    expect(
      screen.getByText('"Focused on dynamics in the opening passages"')
    ).toBeInTheDocument()
    expect(screen.getByText('#beethoven')).toBeInTheDocument()
    expect(screen.getByText('#dynamics')).toBeInTheDocument()

    // Check mood emoji
    expect(screen.getByText('😊')).toBeInTheDocument()
    expect(screen.getByText('satisfied')).toBeInTheDocument()
  })

  it('shows correct icons for different entry types', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    expect(screen.getByText('🎵')).toBeInTheDocument() // practice
    expect(screen.getByText('📚')).toBeInTheDocument() // lesson
    expect(screen.getByText('🎭')).toBeInTheDocument() // performance
  })

  it('displays auto-logged indicator for automatic entries', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    expect(screen.getByText('Auto-logged')).toBeInTheDocument()
  })

  it('formats duration correctly', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    // Check specific duration formats
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('1h 0min')).toBeInTheDocument() // 60 minutes = 1h 0min
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })

  it('shows linked goals count', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    expect(screen.getByText('1 linked')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    render(<LogbookEntryList entries={mockEntries} onEdit={mockOnEdit} />)

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(mockOnEdit).toHaveBeenCalledWith(mockEntries[0])
  })

  it('calls onDelete when delete button is clicked', () => {
    render(<LogbookEntryList entries={mockEntries} onDelete={mockOnDelete} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('filters entries based on search query', () => {
    render(<LogbookEntryList entries={mockEntries} searchQuery="beethoven" />)

    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Chopin Etude Op.10 No.3')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Asturias')).not.toBeInTheDocument()
  })

  it('filters entries by type', () => {
    render(
      <LogbookEntryList
        entries={mockEntries}
        filters={{ type: LogbookEntryType.PRACTICE }}
      />
    )

    // Check for practice entry
    expect(screen.getByText(/practice Session/)).toBeInTheDocument()
    // Check that lesson and performance are not shown
    expect(screen.queryByText(/lesson Session/)).not.toBeInTheDocument()
    expect(screen.queryByText(/performance Session/)).not.toBeInTheDocument()
  })

  it('filters entries by mood', () => {
    render(
      <LogbookEntryList
        entries={mockEntries}
        filters={{ mood: Mood.EXCITED }}
      />
    )

    expect(screen.getByText('Chopin Etude Op.10 No.3')).toBeInTheDocument()
    expect(
      screen.queryByText('Moonlight Sonata, Clair de Lune')
    ).not.toBeInTheDocument()
  })

  it('filters entries by date range', () => {
    render(
      <LogbookEntryList
        entries={mockEntries}
        filters={{
          dateRange: {
            start: new Date('2024-01-15'),
            end: new Date('2024-01-15T23:59:59'),
          },
        }}
      />
    )

    // Should show entries from Jan 15
    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()
    expect(screen.getByText('Chopin Etude Op.10 No.3')).toBeInTheDocument()

    // Should not show entry from Jan 14
    expect(screen.queryByText('Asturias')).not.toBeInTheDocument()
  })

  it('shows empty state when no entries', () => {
    render(<LogbookEntryList entries={[]} />)

    expect(screen.getByText('No entries to display')).toBeInTheDocument()
  })

  it('shows filtered empty state when no matches', () => {
    render(<LogbookEntryList entries={mockEntries} searchQuery="nonexistent" />)

    expect(
      screen.getByText('No entries match your search criteria')
    ).toBeInTheDocument()
  })

  it('searches across multiple fields', () => {
    render(<LogbookEntryList entries={mockEntries} searchQuery="chopin" />)

    // Should find entry by piece title and tag
    expect(screen.getByText('Chopin Etude Op.10 No.3')).toBeInTheDocument()
  })

  it('searches techniques', () => {
    render(<LogbookEntryList entries={mockEntries} searchQuery="pedaling" />)

    expect(screen.getByText('Chopin Etude Op.10 No.3')).toBeInTheDocument()
  })

  it('does not show edit/delete buttons when handlers not provided', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('formats hours correctly for long sessions', () => {
    const longEntry: LogbookEntry = {
      ...mockEntries[0],
      id: '4',
      duration: 7200, // 2 hours
    }

    render(<LogbookEntryList entries={[longEntry]} />)

    expect(screen.getByText('2h 0min')).toBeInTheDocument()
  })

  it('supports collapsing and expanding date groups', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    // Initially all groups should be expanded
    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()

    // Click on the Monday header to collapse it
    const mondayHeader = screen
      .getByText(/Monday, January 15, 2024/)
      .closest('div')?.parentElement
    fireEvent.click(mondayHeader!)

    // Monday entries should be hidden
    expect(
      screen.queryByText('Moonlight Sonata, Clair de Lune')
    ).not.toBeInTheDocument()

    // But Sunday entries should still be visible
    expect(screen.getByText('Asturias')).toBeInTheDocument()

    // Click again to expand
    fireEvent.click(mondayHeader!)
    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()
  })

  it('shows expand/collapse all buttons when multiple dates exist', () => {
    render(<LogbookEntryList entries={mockEntries} />)

    expect(screen.getByText('Expand All')).toBeInTheDocument()
    expect(screen.getByText('Collapse All')).toBeInTheDocument()

    // Click Collapse All
    fireEvent.click(screen.getByText('Collapse All'))

    // All entries should be hidden
    expect(
      screen.queryByText('Moonlight Sonata, Clair de Lune')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Asturias')).not.toBeInTheDocument()

    // Click Expand All
    fireEvent.click(screen.getByText('Expand All'))

    // All entries should be visible again
    expect(
      screen.getByText('Moonlight Sonata, Clair de Lune')
    ).toBeInTheDocument()
    expect(screen.getByText('Asturias')).toBeInTheDocument()
  })
})
