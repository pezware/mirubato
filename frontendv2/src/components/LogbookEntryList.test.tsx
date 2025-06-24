import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogbookEntryList from './LogbookEntryList'
import type { LogbookEntry } from '../api/logbook'

// Mock the stores
vi.mock('../stores/logbookStore', () => ({
  useLogbookStore: vi.fn(() => ({
    deleteEntry: vi.fn(),
    updateEntry: vi.fn(),
  })),
}))

// Mock ManualEntryForm component
vi.mock('./ManualEntryForm', () => ({
  default: ({ onClose }: { entry?: any; onClose: () => void }) => (
    <div>
      <h2>Edit Practice Session</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

const mockEntries: LogbookEntry[] = [
  {
    id: 'entry-1',
    timestamp: '2025-01-15T10:00:00Z',
    duration: 30,
    type: 'PRACTICE',
    instrument: 'PIANO',
    pieces: [{ title: 'Piece 1' }, { title: 'Piece 2' }],
    techniques: ['Scales', 'Arpeggios'],
    goalIds: [],
    notes: 'Great practice session',
    tags: ['morning', 'productive'],
    metadata: { source: 'manual' },
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'entry-2',
    timestamp: '2025-01-16T14:00:00Z',
    duration: 45,
    type: 'SIGHT_READING',
    instrument: 'GUITAR',
    pieces: [{ title: 'Bach Prelude', composer: 'Bach' }],
    techniques: ['Sight reading'],
    goalIds: ['goal-1'],
    notes: 'Challenging session',
    tags: ['afternoon'],
    metadata: { source: 'manual' },
    createdAt: '2025-01-16T14:00:00Z',
    updatedAt: '2025-01-16T14:00:00Z',
  },
]

describe('LogbookEntryList', () => {
  const mockOnUpdate = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty list when no entries', () => {
    const { container } = render(
      <LogbookEntryList entries={[]} onUpdate={mockOnUpdate} />
    )

    expect(container.querySelector('.space-y-4')).toBeInTheDocument()
    expect(container.querySelector('.space-y-4')?.children).toHaveLength(0)
  })

  it('renders entries correctly', () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    // Check first entry
    expect(screen.getByText('PRACTICE')).toBeInTheDocument()
    expect(screen.getByText('⏱️ 30 minutes')).toBeInTheDocument()
    expect(screen.getByText(/PIANO/)).toBeInTheDocument()
    expect(screen.getByText('Great practice session')).toBeInTheDocument()

    // Check second entry
    expect(screen.getByText('SIGHT_READING')).toBeInTheDocument()
    expect(screen.getByText('⏱️ 45 minutes')).toBeInTheDocument()
    expect(screen.getByText(/GUITAR/)).toBeInTheDocument()
    expect(screen.getByText('Challenging session')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    // Should show formatted dates
    expect(screen.getByText(/Wed, Jan 15, 2025/)).toBeInTheDocument()
    expect(screen.getByText(/Thu, Jan 16, 2025/)).toBeInTheDocument()
  })

  it('handles edit button click', async () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    const editButtons = screen.getAllByLabelText('Edit entry')
    await user.click(editButtons[0])

    // Should show the edit form (ManualEntryForm)
    await waitFor(() => {
      expect(screen.getByText(/Edit Practice Session/i)).toBeInTheDocument()
    })
  })

  it('handles delete button click with confirmation', async () => {
    const { useLogbookStore } = await import('../stores/logbookStore')
    const mockDeleteEntry = vi.fn()
    ;(useLogbookStore as ReturnType<typeof vi.fn>).mockReturnValue({
      deleteEntry: mockDeleteEntry,
      updateEntry: vi.fn(),
    })

    // Mock window.confirm
    window.confirm = vi.fn(() => true)

    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    const deleteButtons = screen.getAllByLabelText('Delete entry')
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this entry?'
    )

    await waitFor(() => {
      expect(mockDeleteEntry).toHaveBeenCalledWith('entry-1')
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })

  it('cancels delete when user declines confirmation', async () => {
    const { useLogbookStore } = await import('../stores/logbookStore')
    const mockDeleteEntry = vi.fn()
    ;(useLogbookStore as ReturnType<typeof vi.fn>).mockReturnValue({
      deleteEntry: mockDeleteEntry,
      updateEntry: vi.fn(),
    })

    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false)

    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    const deleteButtons = screen.getAllByLabelText('Delete entry')
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(mockDeleteEntry).not.toHaveBeenCalled()
  })

  it('displays tags correctly', () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('#morning')).toBeInTheDocument()
    expect(screen.getByText('#productive')).toBeInTheDocument()
    expect(screen.getByText('#afternoon')).toBeInTheDocument()
  })

  it('handles entries with missing data gracefully', () => {
    const minimalEntry: LogbookEntry = {
      id: 'entry-minimal',
      timestamp: new Date().toISOString(),
      duration: 15,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [],
      techniques: [],
      goalIds: [],
      notes: '',
      tags: [],
      metadata: { source: 'manual' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    render(
      <LogbookEntryList entries={[minimalEntry]} onUpdate={mockOnUpdate} />
    )

    expect(screen.getByText('PRACTICE')).toBeInTheDocument()
    expect(screen.getByText('⏱️ 15 minutes')).toBeInTheDocument()
    expect(screen.getByText(/PIANO/)).toBeInTheDocument()
    // Should not crash with empty arrays
  })

  it('shows pieces and techniques when available', () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    // Should show pieces section for both entries (use getAllByText)
    const pieceHeaders = screen.getAllByText('🎵 Pieces:')
    expect(pieceHeaders).toHaveLength(2)

    // Should show techniques section
    const techniqueHeaders = screen.getAllByText('🎯 Techniques:')
    expect(techniqueHeaders).toHaveLength(2)

    // Check individual techniques (they are rendered as separate spans)
    expect(screen.getByText('Scales')).toBeInTheDocument()
    expect(screen.getByText('Arpeggios')).toBeInTheDocument()
    expect(screen.getByText('Sight reading')).toBeInTheDocument()
  })

  it('displays instrument icons correctly', () => {
    render(<LogbookEntryList entries={mockEntries} onUpdate={mockOnUpdate} />)

    // Piano icon
    expect(screen.getByText(/🎹/)).toBeInTheDocument()
    // Guitar icon
    expect(screen.getByText(/🎸/)).toBeInTheDocument()
  })
})
