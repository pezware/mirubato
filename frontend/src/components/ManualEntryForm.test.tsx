import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ManualEntryForm from './ManualEntryForm'
import type { LogbookEntry } from '../modules/logger/types'

describe('ManualEntryForm', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    // Entry type buttons
    expect(screen.getByText('practice')).toBeInTheDocument()
    expect(screen.getByText('performance')).toBeInTheDocument()
    expect(screen.getByText('lesson')).toBeInTheDocument()
    expect(screen.getByText('rehearsal')).toBeInTheDocument()

    // Date and time inputs
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Time')).toBeInTheDocument()

    // Duration input
    expect(screen.getByLabelText('Duration (minutes)')).toBeInTheDocument()

    // Practice type options (for practice entries)
    expect(screen.getByText('What did you work on?')).toBeInTheDocument()
    expect(screen.getByText('Repertoire Pieces')).toBeInTheDocument()

    // Other sections
    expect(screen.getByText('Pieces/Exercises')).toBeInTheDocument()
    expect(screen.getByText('Techniques Worked On')).toBeInTheDocument()
    expect(screen.getByText('How did it go?')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()

    // Form buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save Entry')).toBeInTheDocument()
  })

  it('initializes with default values', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const durationInput = screen.getByLabelText(
      'Duration (minutes)'
    ) as HTMLInputElement
    expect(durationInput.value).toBe('30')

    // Check that practice is selected by default
    const practiceButton = screen.getByRole('button', { name: 'practice' })
    expect(practiceButton).toHaveClass('bg-blue-600')
  })

  it('changes entry type when buttons are clicked', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const performanceButton = screen.getByRole('button', {
      name: 'performance',
    })
    fireEvent.click(performanceButton)

    expect(performanceButton).toHaveClass('bg-blue-600')
    // Practice type section should disappear
    expect(screen.queryByText('What did you work on?')).not.toBeInTheDocument()
  })

  it('shows practice type options only for practice entries', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    // Initially visible for practice
    expect(screen.getByText('What did you work on?')).toBeInTheDocument()

    // Switch to lesson
    fireEvent.click(screen.getByRole('button', { name: 'lesson' }))
    expect(screen.queryByText('What did you work on?')).not.toBeInTheDocument()

    // Switch back to practice
    fireEvent.click(screen.getByRole('button', { name: 'practice' }))
    expect(screen.getByText('What did you work on?')).toBeInTheDocument()
  })

  it('adds and removes pieces', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const input = screen.getByPlaceholderText('+ Add piece or exercise...')
    const addButton = screen.getAllByText('Add')[0]

    // Add a piece
    fireEvent.change(input, { target: { value: 'Moonlight Sonata' } })
    fireEvent.click(addButton)

    expect(screen.getByText('Moonlight Sonata')).toBeInTheDocument()
    expect(input).toHaveValue('')

    // Add another piece
    fireEvent.change(input, { target: { value: 'Fur Elise' } })
    fireEvent.click(addButton)

    expect(screen.getByText('Fur Elise')).toBeInTheDocument()

    // Remove first piece
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])

    expect(screen.queryByText('Moonlight Sonata')).not.toBeInTheDocument()
    expect(screen.getByText('Fur Elise')).toBeInTheDocument()
  })

  it('adds piece on Enter key', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const input = screen.getByPlaceholderText('+ Add piece or exercise...')

    fireEvent.change(input, { target: { value: 'Test Piece' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Test Piece')).toBeInTheDocument()
  })

  it('toggles techniques', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const scalesButton = screen.getByRole('button', { name: 'Scales' })
    const arpeggiosButton = screen.getByRole('button', { name: 'Arpeggios' })

    // Initially not selected
    expect(scalesButton).toHaveClass('bg-gray-200')
    expect(arpeggiosButton).toHaveClass('bg-gray-200')

    // Select scales
    fireEvent.click(scalesButton)
    expect(scalesButton).toHaveClass('bg-blue-600')

    // Select arpeggios
    fireEvent.click(arpeggiosButton)
    expect(arpeggiosButton).toHaveClass('bg-blue-600')

    // Deselect scales
    fireEvent.click(scalesButton)
    expect(scalesButton).toHaveClass('bg-gray-200')
    expect(arpeggiosButton).toHaveClass('bg-blue-600')
  })

  it('selects mood', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const excitedButton = screen.getByRole('button', { name: /Excited/i })
    fireEvent.click(excitedButton)

    expect(excitedButton).toHaveClass('bg-blue-50')
  })

  it('adds and removes tags', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    const input = screen.getByPlaceholderText('Add tag...')
    const addButton = screen.getAllByText('Add')[1] // Second Add button is for tags

    // Add a tag
    fireEvent.change(input, { target: { value: 'beethoven' } })
    fireEvent.click(addButton)

    expect(screen.getByText('beethoven')).toBeInTheDocument()

    // Try to add duplicate tag
    fireEvent.change(input, { target: { value: 'beethoven' } })
    fireEvent.click(addButton)

    // Should still only have one
    expect(screen.getAllByText('beethoven')).toHaveLength(1)

    // Remove tag
    const removeButton = screen.getByText('×')
    fireEvent.click(removeButton)

    expect(screen.queryByText('beethoven')).not.toBeInTheDocument()
  })

  it('submits form with all data', async () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    // Set entry type to performance
    fireEvent.click(screen.getByRole('button', { name: 'performance' }))

    // Set duration
    const durationInput = screen.getByLabelText('Duration (minutes)')
    fireEvent.change(durationInput, { target: { value: '45' } })

    // Add pieces
    const pieceInput = screen.getByPlaceholderText('+ Add piece or exercise...')
    fireEvent.change(pieceInput, { target: { value: 'Test Piece' } })
    fireEvent.click(screen.getAllByText('Add')[0])

    // Select techniques
    fireEvent.click(screen.getByRole('button', { name: 'Dynamics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Phrasing' }))

    // Select mood
    fireEvent.click(screen.getByRole('button', { name: /Satisfied/i }))

    // Add notes
    const notesInput = screen.getByLabelText('Notes')
    fireEvent.change(notesInput, {
      target: { value: 'Great practice session!' },
    })

    // Add tags
    const tagInput = screen.getByPlaceholderText('Add tag...')
    fireEvent.change(tagInput, { target: { value: 'concert-prep' } })
    fireEvent.click(screen.getAllByText('Add')[1])

    // Submit form
    fireEvent.click(screen.getByText('Save Entry'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'performance',
          duration: 2700, // 45 minutes in seconds
          pieces: [
            expect.objectContaining({
              title: 'Test Piece',
            }),
          ],
          techniques: ['Dynamics', 'Phrasing'],
          mood: 'satisfied',
          notes: 'Great practice session!',
          tags: ['concert-prep'],
          metadata: {
            source: 'manual',
          },
        })
      )
    })
  })

  it('includes practice type in tags for practice entries', async () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    // Select technical exercises
    const technicalRadio = screen.getByLabelText('Technical Exercises')
    fireEvent.click(technicalRadio)

    // Submit form
    fireEvent.click(screen.getByText('Save Entry'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'practice',
          tags: expect.arrayContaining(['technical']),
          metadata: {
            source: 'manual',
            practiceType: 'technical',
          },
        })
      )
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<ManualEntryForm onSave={mockOnSave} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('loads initial data when provided', () => {
    const initialData: Partial<LogbookEntry> = {
      type: 'lesson',
      timestamp: new Date('2024-01-15T14:30:00').getTime(),
      duration: 3600, // 60 minutes
      pieces: [
        {
          id: '1',
          title: 'Existing Piece',
          composer: 'Bach',
        },
      ],
      techniques: ['Scales', 'Articulation'],
      mood: 'excited',
      notes: 'Initial notes',
      tags: ['initial-tag'],
    }

    render(
      <ManualEntryForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    )

    // Check entry type
    expect(screen.getByRole('button', { name: 'lesson' })).toHaveClass(
      'bg-blue-600'
    )

    // Check duration
    expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60)

    // Check pieces
    expect(screen.getByText('Existing Piece')).toBeInTheDocument()

    // Check techniques
    expect(screen.getByRole('button', { name: 'Scales' })).toHaveClass(
      'bg-blue-600'
    )
    expect(screen.getByRole('button', { name: 'Articulation' })).toHaveClass(
      'bg-blue-600'
    )

    // Check mood
    expect(screen.getByRole('button', { name: /Excited/i })).toHaveClass(
      'bg-blue-50'
    )

    // Check notes
    expect(screen.getByLabelText('Notes')).toHaveValue('Initial notes')

    // Check tags
    expect(screen.getByText('initial-tag')).toBeInTheDocument()
  })
})
