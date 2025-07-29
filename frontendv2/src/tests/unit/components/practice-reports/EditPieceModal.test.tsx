import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditPieceModal } from '../../../../components/practice-reports/EditPieceModal'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock the logbook store
vi.mock('../../../../stores/logbookStore', () => ({
  useLogbookStore: () => ({
    entries: [
      {
        id: '1',
        pieces: [
          { title: 'Moonlight Sonata', composer: 'Beethoven' },
          { title: 'Für Elise', composer: 'Beethoven' },
          { title: 'Clair de Lune', composer: 'Debussy' },
        ],
      },
    ],
  }),
}))

describe('EditPieceModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not show duplicate error when re-entering same values', async () => {
    const piece = { title: 'Moonlight Sonata', composer: 'Beethoven' }

    render(
      <EditPieceModal
        isOpen={true}
        onClose={mockOnClose}
        piece={piece}
        onSave={mockOnSave}
      />
    )

    // Clear and re-enter the same title
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: '' } })
    fireEvent.change(titleInput, { target: { value: 'Moonlight Sonata' } })

    // Clear and re-enter the same composer
    const composerInput = screen.getByPlaceholderText(
      'reports:pieceEdit.composerPlaceholder'
    ) as HTMLInputElement
    fireEvent.change(composerInput, { target: { value: '' } })
    fireEvent.change(composerInput, { target: { value: 'Beethoven' } })

    // Should not show duplicate error
    expect(
      screen.queryByText('reports:pieceEdit.duplicatePiece')
    ).not.toBeInTheDocument()

    // Save button should be disabled (no actual changes)
    const saveButton = screen.getByText('common:save')
    expect(saveButton).toBeDisabled()
  })

  it('should disable save button when no changes are made', () => {
    const piece = { title: 'Moonlight Sonata', composer: 'Beethoven' }

    render(
      <EditPieceModal
        isOpen={true}
        onClose={mockOnClose}
        piece={piece}
        onSave={mockOnSave}
      />
    )

    // Save button should be disabled when no changes
    const saveButton = screen.getByText('common:save')
    expect(saveButton).toBeDisabled()

    // Make a change
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, {
      target: { value: 'Moonlight Sonata Op. 27' },
    })

    // Now save button should be enabled
    expect(saveButton).not.toBeDisabled()
  })

  it('should show duplicate error when changing to existing piece name', async () => {
    const piece = { title: 'Moonlight Sonata', composer: 'Beethoven' }

    render(
      <EditPieceModal
        isOpen={true}
        onClose={mockOnClose}
        piece={piece}
        onSave={mockOnSave}
      />
    )

    // Change title to an existing piece
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Für Elise' } })

    // Click save
    const saveButton = screen.getByText('common:save')
    fireEvent.click(saveButton)

    // Should show duplicate error
    await waitFor(() => {
      expect(
        screen.getByText('reports:pieceEdit.duplicatePiece')
      ).toBeInTheDocument()
    })

    // Should not save
    expect(mockOnSave).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('should allow changing piece name to non-duplicate', async () => {
    const piece = { title: 'Moonlight Sonata', composer: 'Beethoven' }

    render(
      <EditPieceModal
        isOpen={true}
        onClose={mockOnClose}
        piece={piece}
        onSave={mockOnSave}
      />
    )

    // Change title to a new name
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Sonata No. 14' } })

    // Click save
    const saveButton = screen.getByText('common:save')
    fireEvent.click(saveButton)

    // Should save successfully
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(piece, {
        title: 'Sonata No. 14',
        composer: 'Beethoven',
      })
    })

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should check duplicate across different composers', async () => {
    const piece = { title: 'Clair de Lune', composer: 'Debussy' }

    render(
      <EditPieceModal
        isOpen={true}
        onClose={mockOnClose}
        piece={piece}
        onSave={mockOnSave}
      />
    )

    // Try to change composer to Beethoven while keeping same title
    const composerInput = screen.getByPlaceholderText(
      'reports:pieceEdit.composerPlaceholder'
    ) as HTMLInputElement
    fireEvent.change(composerInput, { target: { value: 'Beethoven' } })

    // This should be allowed since "Clair de Lune - Beethoven" doesn't exist
    const saveButton = screen.getByText('common:save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(piece, {
        title: 'Clair de Lune',
        composer: 'Beethoven',
      })
    })

    expect(mockOnClose).toHaveBeenCalled()
  })
})
