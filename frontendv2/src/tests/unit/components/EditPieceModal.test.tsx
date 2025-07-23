import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditPieceModal } from '../../../components/practice-reports/EditPieceModal'
import { useLogbookStore } from '../../../stores/logbookStore'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return key + ' ' + JSON.stringify(params)
      }
      return key
    },
  }),
}))

// Mock logbook store
vi.mock('../../../stores/logbookStore', () => ({
  useLogbookStore: vi.fn(),
}))

describe('EditPieceModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    piece: {
      title: 'Moonlight Sonata',
      composer: 'Beethoven',
    },
    onSave: mockOnSave,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useLogbookStore as any).mockReturnValue({
      entries: [
        {
          id: '1',
          pieces: [
            { title: 'Moonlight Sonata', composer: 'Beethoven' },
            { title: 'Fur Elise', composer: 'Beethoven' },
          ],
        },
        {
          id: '2',
          pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
        },
      ],
    })
  })

  it('renders with piece information', () => {
    render(<EditPieceModal {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    )
    const composerInput = screen.getByPlaceholderText(
      'reports:pieceEdit.composerPlaceholder'
    )

    expect(titleInput).toHaveValue('Moonlight Sonata')
    expect(composerInput).toHaveValue('Beethoven')
  })

  it('shows warning about affected entries', () => {
    render(<EditPieceModal {...defaultProps} />)

    expect(
      screen.getByText('reports:pieceEdit.warningTitle')
    ).toBeInTheDocument()
    expect(
      screen.getByText('reports:pieceEdit.warningMessage {"count":2}')
    ).toBeInTheDocument()
  })

  it('validates required title', async () => {
    render(<EditPieceModal {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    )
    const saveButton = screen.getByText('common:save')

    // Clear the title and add some spaces
    fireEvent.change(titleInput, { target: { value: '   ' } })

    // The save button should be disabled when title is empty
    expect(saveButton).toBeDisabled()

    // Try clicking anyway to test validation
    fireEvent.click(saveButton)

    // Since button is disabled, onSave should not be called
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('detects duplicate pieces', async () => {
    ;(useLogbookStore as any).mockReturnValue({
      entries: [
        {
          id: '1',
          pieces: [
            { title: 'Moonlight Sonata', composer: 'Beethoven' },
            { title: 'Fur Elise', composer: 'Beethoven' },
          ],
        },
      ],
    })

    render(<EditPieceModal {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    )
    const saveButton = screen.getByText('common:save')

    fireEvent.change(titleInput, { target: { value: 'Fur Elise' } })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('reports:pieceEdit.duplicatePiece')
      ).toBeInTheDocument()
    })

    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('calls onSave with correct data', async () => {
    render(<EditPieceModal {...defaultProps} />)

    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    )
    const composerInput = screen.getByPlaceholderText(
      'reports:pieceEdit.composerPlaceholder'
    )
    const saveButton = screen.getByText('common:save')

    fireEvent.change(titleInput, {
      target: { value: 'Moonlight Sonata Op. 27 No. 2' },
    })
    fireEvent.change(composerInput, {
      target: { value: 'Ludwig van Beethoven' },
    })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        { title: 'Moonlight Sonata', composer: 'Beethoven' },
        {
          title: 'Moonlight Sonata Op. 27 No. 2',
          composer: 'Ludwig van Beethoven',
        }
      )
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('disables save button when no changes made', () => {
    render(<EditPieceModal {...defaultProps} />)

    const saveButton = screen.getByText('common:save')
    expect(saveButton).toBeDisabled()
  })

  it('handles pieces without composer', () => {
    const propsWithoutComposer = {
      ...defaultProps,
      piece: {
        title: 'Anonymous Piece',
      },
    }

    render(<EditPieceModal {...propsWithoutComposer} />)

    const composerInput = screen.getByPlaceholderText(
      'reports:pieceEdit.composerPlaceholder'
    )
    expect(composerInput).toHaveValue('')
  })
})
