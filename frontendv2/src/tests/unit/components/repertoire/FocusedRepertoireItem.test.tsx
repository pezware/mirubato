import { render, screen } from '@testing-library/react'
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
    ).mockReturnValue({})
  })

  describe('Display functionality', () => {
    it('should render basic item information', () => {
      const item = {
        ...baseItem,
        totalPracticeTime: 120,
      }

      render(<FocusedRepertoireItem item={item} />)

      expect(screen.getByText('Test Piece')).toBeInTheDocument()
      expect(screen.getByText('Test Composer')).toBeInTheDocument()
      expect(screen.getByText('repertoire:status.learning')).toBeInTheDocument()
      expect(screen.getByText('120 min')).toBeInTheDocument()
    })

    it('should not show delete button regardless of practice count', () => {
      const itemWithNoPractice = {
        ...baseItem,
        practiceCount: 0,
      }

      const itemWithPractice = {
        ...baseItem,
        practiceCount: 5,
      }

      // Test item with no practice sessions
      const { rerender } = render(
        <FocusedRepertoireItem item={itemWithNoPractice} />
      )
      expect(screen.queryByTitle('repertoire:delete')).not.toBeInTheDocument()

      // Test item with practice sessions
      rerender(<FocusedRepertoireItem item={itemWithPractice} />)
      expect(screen.queryByTitle('repertoire:delete')).not.toBeInTheDocument()
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
