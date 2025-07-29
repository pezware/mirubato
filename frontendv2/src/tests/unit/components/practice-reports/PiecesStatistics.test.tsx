import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PiecesStatistics } from '../../../../components/practice-reports/PiecesStatistics'
import { EnhancedAnalyticsData } from '../../../../types/reporting'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`
      }
      return key
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}))

// Create a mock function that we can access in tests
const mockUpdatePieceName = vi.fn().mockResolvedValue(5)

vi.mock('../../../../stores/logbookStore', () => ({
  useLogbookStore: () => ({
    updatePieceName: mockUpdatePieceName,
    entries: [
      {
        id: '1',
        pieces: [
          { title: 'Moonlight Sonata', composer: 'Beethoven' },
          { title: 'Sonata No. 11', composer: 'Mozart' },
        ],
      },
      {
        id: '2',
        pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
      },
    ],
  }),
}))

vi.mock('../../../../utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../../utils/reportsCacheManager', () => ({
  reportsCache: {
    clear: vi.fn(),
  },
}))

describe('PiecesStatistics', () => {
  const mockSetSelectedPiece = vi.fn()
  const mockFormatDuration = (minutes: number) => `${minutes} min`

  const mockAnalytics: EnhancedAnalyticsData = {
    pieceStats: new Map([
      [
        'Beethoven - Moonlight Sonata',
        { totalDuration: 120, count: 5, lastPlayed: new Date('2024-01-01') },
      ],
      [
        'Mozart - Sonata No. 11',
        { totalDuration: 90, count: 3, lastPlayed: new Date('2024-01-02') },
      ],
    ]),
    composerStats: new Map(),
    practicePatterns: {
      avgDuration: 30,
      totalDuration: 210,
      totalSessions: 8,
      avgSessionsPerWeek: 2,
      dayOfWeekDistribution: new Map(),
      hourOfDayDistribution: new Map(),
      streakInfo: { currentStreak: 0, longestStreak: 0 },
      practiceFrequency: new Map(),
    },
    techniqueStats: new Map(),
    goalStats: {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      goalsWithProgress: [],
    },
    moodStats: new Map(),
    instrumentStats: new Map(),
    typeStats: new Map(),
    filteredEntries: [
      {
        id: '1',
        timestamp: '2024-01-01T10:00:00Z',
        duration: 30,
        pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
        techniques: [],
        instrument: 'piano',
        type: 'repertoire',
        tags: [],
        userId: 'user-1',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        timestamp: '2024-01-02T10:00:00Z',
        duration: 30,
        pieces: [{ title: 'Sonata No. 11', composer: 'Mozart' }],
        techniques: [],
        instrument: 'piano',
        type: 'repertoire',
        tags: [],
        userId: 'user-1',
        createdAt: '2024-01-02T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdatePieceName.mockClear()
  })

  it('updates selectedPiece after piece name is edited', async () => {
    render(
      <PiecesStatistics
        analytics={mockAnalytics}
        selectedPiece="Beethoven - Moonlight Sonata"
        selectedComposer={null}
        formatDuration={mockFormatDuration}
        setSelectedPiece={mockSetSelectedPiece}
      />
    )

    // Click edit button for the first piece
    const editButtons = screen.getAllByTitle('Edit piece name')
    fireEvent.click(editButtons[0])

    // Wait for modal to appear
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('reports:pieceEdit.pieceTitlePlaceholder')
      ).toBeInTheDocument()
    })

    // Change the title
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, {
      target: { value: 'Moonlight Sonata Op. 27' },
    })

    // Save the changes
    const saveButton = screen.getByText('common:save')
    fireEvent.click(saveButton)

    // Wait for the save to complete
    await waitFor(() => {
      expect(mockUpdatePieceName).toHaveBeenCalledWith(
        { title: 'Moonlight Sonata', composer: 'Beethoven' },
        { title: 'Moonlight Sonata Op. 27', composer: 'Beethoven' }
      )
    })

    // Verify that setSelectedPiece was called with the new key
    expect(mockSetSelectedPiece).toHaveBeenCalledWith(
      'Beethoven - Moonlight Sonata Op. 27'
    )
  })

  it('does not update selectedPiece if a different piece is edited', async () => {
    // Set selectedPiece to Beethoven but we'll edit Mozart
    // const selectedPiece = 'Beethoven - Moonlight Sonata'

    render(
      <PiecesStatistics
        analytics={mockAnalytics}
        selectedPiece={null} // Show all pieces so we can click on the second one
        selectedComposer={null}
        formatDuration={mockFormatDuration}
        setSelectedPiece={mockSetSelectedPiece}
      />
    )

    // Click edit button for the second piece (Mozart)
    const editButtons = screen.getAllByTitle('Edit piece name')
    fireEvent.click(editButtons[1])

    // Wait for modal to appear
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('reports:pieceEdit.pieceTitlePlaceholder')
      ).toBeInTheDocument()
    })

    // Change the title
    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'Sonata No. 11 K. 331' } })

    // Save the changes
    const saveButton = screen.getByText('common:save')
    fireEvent.click(saveButton)

    // Wait for updatePieceName to be called
    await waitFor(() => {
      expect(mockUpdatePieceName).toHaveBeenCalledWith(
        { title: 'Sonata No. 11', composer: 'Mozart' },
        { title: 'Sonata No. 11 K. 331', composer: 'Mozart' }
      )
    })

    // Verify that setSelectedPiece was NOT called since we edited a different piece
    expect(mockSetSelectedPiece).not.toHaveBeenCalled()
  })

  it('handles pieces without composer correctly', async () => {
    const analyticsWithoutComposer: EnhancedAnalyticsData = {
      ...mockAnalytics,
      pieceStats: new Map([
        [
          'Unknown Piece',
          { totalDuration: 60, count: 2, lastPlayed: new Date('2024-01-03') },
        ],
      ]),
      filteredEntries: [
        {
          id: '3',
          timestamp: '2024-01-03T10:00:00Z',
          duration: 30,
          pieces: [{ title: 'Unknown Piece' }],
          techniques: [],
          instrument: 'piano',
          type: 'repertoire',
          tags: [],
          userId: 'user-1',
          createdAt: '2024-01-03T10:00:00Z',
          updatedAt: '2024-01-03T10:00:00Z',
        },
      ],
    }

    render(
      <PiecesStatistics
        analytics={analyticsWithoutComposer}
        selectedPiece="Unknown Piece"
        selectedComposer={null}
        formatDuration={mockFormatDuration}
        setSelectedPiece={mockSetSelectedPiece}
      />
    )

    // Click edit button
    const editButton = screen.getByTitle('Edit piece name')
    fireEvent.click(editButton)

    // Wait for modal and change title
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('reports:pieceEdit.pieceTitlePlaceholder')
      ).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText(
      'reports:pieceEdit.pieceTitlePlaceholder'
    ) as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: 'New Unknown Piece' } })

    // Save
    fireEvent.click(screen.getByText('common:save'))

    // Verify selectedPiece was updated
    await waitFor(() => {
      expect(mockSetSelectedPiece).toHaveBeenCalledWith('New Unknown Piece')
    })
  })
})
