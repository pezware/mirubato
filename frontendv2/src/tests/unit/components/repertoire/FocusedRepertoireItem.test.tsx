import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { FocusedRepertoireItem } from '@/components/repertoire/FocusedRepertoireItem'
import { useRepertoireStore } from '@/stores/repertoireStore'

// Mock dependencies
vi.mock('@/stores/repertoireStore')
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock date utilities
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 days ago',
  isToday: () => false,
}))

vi.mock('@/utils/dateUtils', () => ({
  formatDuration: (minutes: number) => `${minutes} min`,
  capitalizeTimeString: (str: string) => str,
}))

vi.mock('@/utils/textFormatting', () => ({
  toTitleCase: (str: string) => str,
}))

describe('FocusedRepertoireItem', () => {
  const mockRemoveFromRepertoire = vi.fn()

  const baseItem = {
    id: '1',
    scoreId: 'test-score-id',
    status: 'learning' as const,
    scoreTitle: 'Test Piece',
    scoreComposer: 'Test Composer',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(
      useRepertoireStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      removeFromRepertoire: mockRemoveFromRepertoire,
    })
  })

  describe('Delete functionality', () => {
    it('should show delete button when piece has no practice sessions', () => {
      const item = {
        ...baseItem,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.getByTitle('repertoire:delete')
      expect(deleteButton).toBeInTheDocument()
    })

    it('should not show delete button when piece has practice sessions', () => {
      const item = {
        ...baseItem,
        practiceCount: 5,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.queryByTitle('repertoire:delete')
      expect(deleteButton).not.toBeInTheDocument()
    })

    it('should not show delete button for dropped pieces', () => {
      const item = {
        ...baseItem,
        status: 'dropped' as const,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.queryByTitle('repertoire:delete')
      expect(deleteButton).not.toBeInTheDocument()
    })

    it('should show confirmation when delete button is clicked', () => {
      const item = {
        ...baseItem,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.getByTitle('repertoire:delete')
      fireEvent.click(deleteButton)

      // Confirmation is now compact - just yes/cancel buttons without extra text
      expect(screen.getByText('common:yes')).toBeInTheDocument()
      expect(screen.getByText('common:cancel')).toBeInTheDocument()
    })

    it('should call removeFromRepertoire when confirmed', async () => {
      const item = {
        ...baseItem,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.getByTitle('repertoire:delete')
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByText('common:yes')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockRemoveFromRepertoire).toHaveBeenCalledWith('test-score-id')
      })
    })

    it('should cancel deletion when cancel is clicked', () => {
      const item = {
        ...baseItem,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.getByTitle('repertoire:delete')
      fireEvent.click(deleteButton)

      // Confirm buttons are visible
      expect(screen.getByText('common:yes')).toBeInTheDocument()
      expect(screen.getByText('common:cancel')).toBeInTheDocument()

      const cancelButton = screen.getByText('common:cancel')
      fireEvent.click(cancelButton)

      // Buttons should disappear after cancel
      expect(screen.queryByText('common:yes')).not.toBeInTheDocument()
      expect(screen.queryByText('common:cancel')).not.toBeInTheDocument()
    })

    it('should handle delete errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockRemoveFromRepertoire.mockRejectedValueOnce(new Error('Delete failed'))

      const item = {
        ...baseItem,
        practiceCount: 0,
      }

      render(<FocusedRepertoireItem item={item} />)

      const deleteButton = screen.getByTitle('repertoire:delete')
      fireEvent.click(deleteButton)

      const confirmButton = screen.getByText('common:yes')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to delete repertoire item:',
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Display functionality', () => {
    it('should render basic item information', () => {
      const item = {
        ...baseItem,
        totalPracticeTime: 120,
      }

      render(<FocusedRepertoireItem item={item} />)

      expect(screen.getByText(/Test Composer.*Test Piece/)).toBeInTheDocument()
      expect(screen.getByText('repertoire:status.learning')).toBeInTheDocument()
      expect(screen.getByText('120 min')).toBeInTheDocument()
    })

    it('should show active goal if present', () => {
      const item = {
        ...baseItem,
        activeGoals: [{ id: '1', title: 'Master first movement' }],
      }

      render(<FocusedRepertoireItem item={item} />)

      expect(
        screen.getByText(/common:goal.*Master first movement/)
      ).toBeInTheDocument()
    })
  })
})
