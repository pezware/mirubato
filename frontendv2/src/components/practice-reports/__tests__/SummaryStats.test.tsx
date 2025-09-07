import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SummaryStats } from '../SummaryStats'
import { LogbookEntry } from '../../../api/logbook'
import { EnhancedAnalyticsData } from '../../../types/reporting'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'reports:stats.todaysPractice': "Today's Practice",
        'reports:stats.thisWeek': 'This Week',
        'reports:totalPractice': 'Total Practice',
      }
      return translations[key] || key
    },
  }),
}))

describe('SummaryStats', () => {
  const mockFormatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const createMockEntry = (duration: number): LogbookEntry => ({
    id: `entry-${Math.random()}`,
    timestamp: new Date().toISOString(),
    duration,
    notes: '',
    pieceId: undefined,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const createMockAnalytics = (
    todayTotal: number,
    weekTotal: number
  ): EnhancedAnalyticsData => ({
    totalPracticeTime: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    activeDays: 0,
    totalDays: 0,
    longestStreak: 0,
    currentStreak: 0,
    todayTotal,
    weekTotal,
    monthTotal: 0,
    yearTotal: 0,
    practiceHistory: [],
    instrumentBreakdown: [],
    categoryBreakdown: [],
    piecesBreakdown: [],
  })

  it('renders summary stats with correct values', () => {
    const entries = [
      createMockEntry(30),
      createMockEntry(45),
      createMockEntry(60),
    ]
    const analytics = createMockAnalytics(30, 135)

    render(
      <SummaryStats
        filteredAndSortedEntries={entries}
        formatDuration={mockFormatDuration}
        analytics={analytics}
      />
    )

    // Check that all stats are rendered
    expect(screen.getByTestId('summary-stats')).toBeInTheDocument()
    expect(screen.getByTestId('today-practice-time')).toHaveTextContent('30m')
    expect(screen.getByTestId('week-practice-time')).toHaveTextContent('2h 15m')
    expect(screen.getByTestId('total-practice-time')).toHaveTextContent(
      '2h 15m'
    )
  })

  it('renders correct labels', () => {
    render(
      <SummaryStats
        filteredAndSortedEntries={[]}
        formatDuration={mockFormatDuration}
        analytics={createMockAnalytics(0, 0)}
      />
    )

    expect(screen.getByText("Today's Practice")).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Total Practice')).toBeInTheDocument()
  })

  it('handles empty entries', () => {
    render(
      <SummaryStats
        filteredAndSortedEntries={[]}
        formatDuration={mockFormatDuration}
        analytics={createMockAnalytics(0, 0)}
      />
    )

    expect(screen.getByTestId('today-practice-time')).toHaveTextContent('0m')
    expect(screen.getByTestId('week-practice-time')).toHaveTextContent('0m')
    expect(screen.getByTestId('total-practice-time')).toHaveTextContent('0m')
  })

  it('calculates total from filtered entries correctly', () => {
    const entries = [
      createMockEntry(15),
      createMockEntry(20),
      createMockEntry(25),
    ]
    const analytics = createMockAnalytics(15, 60)

    render(
      <SummaryStats
        filteredAndSortedEntries={entries}
        formatDuration={mockFormatDuration}
        analytics={analytics}
      />
    )

    // Total should be sum of all filtered entries (15 + 20 + 25 = 60)
    expect(screen.getByTestId('total-practice-time')).toHaveTextContent('1h 0m')
  })

  it('handles large durations correctly', () => {
    const entries = [createMockEntry(500), createMockEntry(300)]
    const analytics = createMockAnalytics(500, 800)

    render(
      <SummaryStats
        filteredAndSortedEntries={entries}
        formatDuration={mockFormatDuration}
        analytics={analytics}
      />
    )

    expect(screen.getByTestId('today-practice-time')).toHaveTextContent(
      '8h 20m'
    )
    expect(screen.getByTestId('week-practice-time')).toHaveTextContent(
      '13h 20m'
    )
    expect(screen.getByTestId('total-practice-time')).toHaveTextContent(
      '13h 20m'
    )
  })

  it('uses custom formatDuration function', () => {
    const customFormat = (minutes: number) => `${minutes} minutes`
    const entries = [createMockEntry(45)]
    const analytics = createMockAnalytics(45, 45)

    render(
      <SummaryStats
        filteredAndSortedEntries={entries}
        formatDuration={customFormat}
        analytics={analytics}
      />
    )

    expect(screen.getByTestId('today-practice-time')).toHaveTextContent(
      '45 minutes'
    )
    expect(screen.getByTestId('week-practice-time')).toHaveTextContent(
      '45 minutes'
    )
    expect(screen.getByTestId('total-practice-time')).toHaveTextContent(
      '45 minutes'
    )
  })
})
