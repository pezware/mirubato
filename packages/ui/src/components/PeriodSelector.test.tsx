import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PeriodSelector, PeriodDate, PeriodStats } from './PeriodSelector'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:time.week': 'Week',
        'common:time.month': 'Month',
        'common:time.year': 'Year',
        'common:months.january': 'January',
        'common:months.february': 'February',
        'common:months.march': 'March',
        'common:months.april': 'April',
        'common:months.may': 'May',
        'common:months.june': 'June',
        'common:months.july': 'July',
        'common:months.august': 'August',
        'common:months.september': 'September',
        'common:months.october': 'October',
        'common:months.november': 'November',
        'common:months.december': 'December',
        'logbook:periodSelector.viewBy': 'View by',
        'logbook:periodSelector.prevWeek': 'Previous week',
        'logbook:periodSelector.nextWeek': 'Next week',
        'logbook:periodSelector.prevMonth': 'Previous month',
        'logbook:periodSelector.nextMonth': 'Next month',
        'logbook:periodSelector.prevYear': 'Previous year',
        'logbook:periodSelector.nextYear': 'Next year',
        'logbook:periodSelector.sessions': 'sessions',
        'logbook:periodSelector.totalTime': 'total time',
        'logbook:periodSelector.pieces': 'pieces',
      }
      return translations[key] || key
    },
    i18n: {
      language: 'en',
    },
  }),
}))

// Mock SegmentedControl since it's already tested
vi.mock('./SegmentedControl', () => ({
  SegmentedControl: ({
    value,
    onChange,
    options,
  }: {
    value: string
    onChange: (v: string) => void
    options: Array<{ value: string; label: string }>
  }) => (
    <div data-testid="segmented-control">
      {options.map(opt => (
        <button
          key={opt.value}
          data-value={opt.value}
          onClick={() => onChange(opt.value)}
          aria-selected={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}))

describe('PeriodSelector', () => {
  const mockDate: PeriodDate = {
    year: 2024,
    month: 0, // January
    week: 1,
  }

  const mockStats: PeriodStats = {
    entries: 15,
    totalDuration: 120, // 2 hours in minutes (formatDuration expects minutes)
    uniquePieces: 5,
  }

  const defaultProps = {
    selectedLevel: 'month' as const,
    selectedDate: mockDate,
    stats: mockStats,
    onLevelChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  }

  it('should render period level selector', () => {
    render(<PeriodSelector {...defaultProps} />)
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument()
  })

  it('should render level options', () => {
    render(<PeriodSelector {...defaultProps} />)

    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
  })

  it('should call onLevelChange when level is selected', async () => {
    const user = userEvent.setup()
    const onLevelChange = vi.fn()

    render(<PeriodSelector {...defaultProps} onLevelChange={onLevelChange} />)

    await user.click(screen.getByText('Year'))
    expect(onLevelChange).toHaveBeenCalledWith('year')
  })

  describe('period label', () => {
    it('should show year for year level', () => {
      render(<PeriodSelector {...defaultProps} selectedLevel="year" />)
      expect(screen.getByText('2024')).toBeInTheDocument()
    })

    it('should show month and year for month level', () => {
      render(<PeriodSelector {...defaultProps} selectedLevel="month" />)
      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('should call onPrevious when prev button is clicked', async () => {
      const user = userEvent.setup()
      const onPrevious = vi.fn()

      render(<PeriodSelector {...defaultProps} onPrevious={onPrevious} />)

      const prevButton = screen.getByLabelText('Previous month')
      await user.click(prevButton)

      expect(onPrevious).toHaveBeenCalled()
    })

    it('should call onNext when next button is clicked', async () => {
      const user = userEvent.setup()
      const onNext = vi.fn()

      render(<PeriodSelector {...defaultProps} onNext={onNext} />)

      const nextButton = screen.getByLabelText('Next month')
      await user.click(nextButton)

      expect(onNext).toHaveBeenCalled()
    })

    it('should update navigation labels based on level', () => {
      const { rerender } = render(
        <PeriodSelector {...defaultProps} selectedLevel="week" />
      )
      expect(screen.getByLabelText('Previous week')).toBeInTheDocument()

      rerender(<PeriodSelector {...defaultProps} selectedLevel="year" />)
      expect(screen.getByLabelText('Previous year')).toBeInTheDocument()
    })
  })

  describe('stats display', () => {
    it('should show sessions count', () => {
      render(<PeriodSelector {...defaultProps} />)
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('sessions')).toBeInTheDocument()
    })

    it('should show formatted duration', () => {
      render(<PeriodSelector {...defaultProps} />)
      expect(screen.getByText('2h')).toBeInTheDocument() // formatDuration(7200)
      expect(screen.getByText('total time')).toBeInTheDocument()
    })

    it('should show unique pieces count', () => {
      render(<PeriodSelector {...defaultProps} />)
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('pieces')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PeriodSelector {...defaultProps} className="custom-period" />
    )
    expect(container.firstChild).toHaveClass('custom-period')
  })

  it('should have rounded corners and border', () => {
    const { container } = render(<PeriodSelector {...defaultProps} />)
    expect(container.firstChild).toHaveClass('rounded-lg', 'border')
  })
})
