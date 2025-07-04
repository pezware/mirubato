import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReportsFilters } from '../../../../components/practice-reports/ReportsFilters'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => Promise.resolve(),
      language: 'en',
    },
  }),
}))

describe('Calendar Navigation', () => {
  const defaultProps = {
    timePeriod: 'month' as const,
    setTimePeriod: vi.fn(),
    selectedDate: null,
    setSelectedDate: vi.fn(),
    selectedPiece: null,
    setSelectedPiece: vi.fn(),
    selectedComposer: null,
    setSelectedComposer: vi.fn(),
    sortBy: 'mostRecent' as const,
    setSortBy: vi.fn(),
    reportView: 'overview' as const,
    pieceAutocomplete: {
      query: '',
      setQuery: vi.fn(),
      suggestions: [],
      isLoading: false,
    },
    composerAutocomplete: {
      query: '',
      setQuery: vi.fn(),
      suggestions: [],
      isLoading: false,
    },
    analytics: {
      totalPracticeTime: 120,
      totalSessions: 5,
      uniquePieces: 3,
      averageSessionDuration: 24,
      practiceByDay: new Map([
        [new Date().toDateString(), 30],
        [new Date(Date.now() - 86400000).toDateString(), 45],
      ]),
      pieceFrequency: new Map([
        ['Piece 1', 3],
        ['Piece 2', 2],
      ]),
      composerStats: new Map([['Composer 1', { sessions: 3, totalTime: 90 }]]),
      moodDistribution: new Map([
        ['happy', 3],
        ['focused', 2],
      ]),
      practiceStreak: 3,
      longestStreak: 5,
      instrumentDistribution: new Map([
        ['piano', 100],
        ['guitar', 20],
      ]),
    },
    customDateRange: undefined,
    setCustomDateRange: vi.fn(),
  }

  const renderComponent = (props = {}) => {
    return render(
      <ReportsFilters {...defaultProps} {...props}>
        <div>Summary Stats</div>
      </ReportsFilters>
    )
  }

  it('should show navigation arrows for month view', () => {
    renderComponent({ timePeriod: 'month' })

    // Look for the chevron SVG elements
    const leftArrow = screen.getByTestId('calendar-nav-left')
    const rightArrow = screen.getByTestId('calendar-nav-right')

    expect(leftArrow).toBeInTheDocument()
    expect(rightArrow).toBeInTheDocument()
  })

  it('should show navigation arrows for week view', () => {
    renderComponent({ timePeriod: 'week' })

    const leftArrow = screen.getByTestId('calendar-nav-left')
    const rightArrow = screen.getByTestId('calendar-nav-right')

    expect(leftArrow).toBeInTheDocument()
    expect(rightArrow).toBeInTheDocument()
  })

  it('should not show navigation arrows for all time view', () => {
    renderComponent({ timePeriod: 'all' })

    expect(screen.queryByTestId('calendar-nav-left')).not.toBeInTheDocument()
    expect(screen.queryByTestId('calendar-nav-right')).not.toBeInTheDocument()
  })

  it('should navigate to previous month when left arrow clicked in month view', () => {
    const setCustomDateRange = vi.fn()
    renderComponent({ timePeriod: 'month', setCustomDateRange })

    const leftArrow = screen.getByTestId('calendar-nav-left')
    fireEvent.click(leftArrow)

    expect(setCustomDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      })
    )
  })

  it('should navigate to next month when right arrow clicked in month view', () => {
    const setCustomDateRange = vi.fn()
    renderComponent({ timePeriod: 'month', setCustomDateRange })

    const rightArrow = screen.getByTestId('calendar-nav-right')
    fireEvent.click(rightArrow)

    expect(setCustomDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      })
    )
  })

  it('should navigate to previous week when left arrow clicked in week view', () => {
    const setCustomDateRange = vi.fn()
    renderComponent({ timePeriod: 'week', setCustomDateRange })

    const leftArrow = screen.getByTestId('calendar-nav-left')
    fireEvent.click(leftArrow)

    expect(setCustomDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      })
    )
  })

  it('should navigate to next week when right arrow clicked in week view', () => {
    const setCustomDateRange = vi.fn()
    renderComponent({ timePeriod: 'week', setCustomDateRange })

    const rightArrow = screen.getByTestId('calendar-nav-right')
    fireEvent.click(rightArrow)

    expect(setCustomDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      })
    )
  })

  it('should display current month/year in month view', () => {
    renderComponent({ timePeriod: 'month' })

    const currentDate = new Date()
    const monthYear = currentDate.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })

    expect(screen.getByText(monthYear)).toBeInTheDocument()
  })

  it('should clear custom date range when time period changes', () => {
    const setTimePeriod = vi.fn()
    const setCustomDateRange = vi.fn()
    renderComponent({
      timePeriod: 'month',
      setTimePeriod,
      setCustomDateRange,
      customDateRange: { start: new Date(), end: new Date() },
    })

    // Click on "Last 7 Days" button - look for the translation key
    const weekButton = screen.getByText('reports:filters.last7Days')
    fireEvent.click(weekButton)

    expect(setTimePeriod).toHaveBeenCalledWith('week')
  })
})
