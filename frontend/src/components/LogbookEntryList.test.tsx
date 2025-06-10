import { render, screen, fireEvent } from '@testing-library/react'
import LogbookEntryList from './LogbookEntryList'
import type { LogbookEntry } from '../modules/logger/types'

describe('LogbookEntryList', () => {
  const mockEntries: LogbookEntry[] = [
    {
      id: '1',
      userId: 'user1',
      timestamp: new Date('2024-01-15T10:00:00').getTime(),
      duration: 2700, // 45 minutes
      type: 'practice',
      pieces: [
        { id: 'p1', title: 'Moonlight Sonata', composer: 'Beethoven' },
        { id: 'p2', title: 'Clair de Lune', composer: 'Debussy' },
      ],
      techniques: ['Scales', 'Dynamics'],
      goals: [],
      notes: 'Focused on dynamics in the opening passages',
      mood: 'satisfied',
      tags: ['beethoven', 'dynamics'],
      metadata: { source: 'manual' },
    },
    {
      id: '2',
      userId: 'user1',
      timestamp: new Date('2024-01-15T14:30:00').getTime(),
      duration: 3600, // 60 minutes
      type: 'lesson',
      pieces: [{ id: 'p3', title: 'Chopin Etude Op.10 No.3' }],
      techniques: ['Phrasing', 'Pedaling'],
      goals: ['g1'],
      notes: 'Teacher suggested new fingering',
      mood: 'excited',
      tags: ['lesson', 'chopin'],
    },
    {
      id: '3',
      userId: 'user1',
      timestamp: new Date('2024-01-14T18:00:00').getTime(),
      duration: 1800, // 30 minutes
      type: 'performance',
      pieces: [{ id: 'p4', title: 'Asturias', composer: 'Albéniz' }],
      techniques: [],
      goals: [],
      notes: 'Small venue performance',
      mood: 'neutral',
      tags: ['performance', 'spanish'],
      metadata: { source: 'automatic', accuracy: 0.92 },
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

    expect(screen.getByText('🎹')).toBeInTheDocument() // practice
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
      <LogbookEntryList entries={mockEntries} filters={{ type: 'practice' }} />
    )

    // Check for practice entry
    expect(screen.getByText(/practice Session/)).toBeInTheDocument()
    // Check that lesson and performance are not shown
    expect(screen.queryByText(/lesson Session/)).not.toBeInTheDocument()
    expect(screen.queryByText(/performance Session/)).not.toBeInTheDocument()
  })

  it('filters entries by mood', () => {
    render(
      <LogbookEntryList entries={mockEntries} filters={{ mood: 'excited' }} />
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
})
