import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimelineNav, { TimelineLevel } from './TimelineNav'

const mockLevels: TimelineLevel[] = [
  { label: '2024', value: '2024', level: 'year' },
  { label: 'January', value: '2024-01', level: 'month' },
  { label: 'Week 1', value: '2024-W01', level: 'week' },
]

describe('TimelineNav', () => {
  const defaultProps = {
    levels: mockLevels,
    selectedLevel: '2024',
    onLevelChange: vi.fn(),
  }

  it('should render all levels', () => {
    render(<TimelineNav {...defaultProps} />)

    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('January')).toBeInTheDocument()
    expect(screen.getByText('Week 1')).toBeInTheDocument()
  })

  it('should call onLevelChange when level is clicked', async () => {
    const user = userEvent.setup()
    const onLevelChange = vi.fn()

    render(<TimelineNav {...defaultProps} onLevelChange={onLevelChange} />)

    await user.click(screen.getByText('January'))
    expect(onLevelChange).toHaveBeenCalledWith(mockLevels[1])
  })

  it('should highlight active level and all previous levels', () => {
    render(<TimelineNav {...defaultProps} selectedLevel="2024-01" />)

    // When January is selected (index 1), both 2024 and January should be active
    const yearButton = screen.getByText('2024').closest('button')
    const monthButton = screen.getByText('January').closest('button')
    const weekButton = screen.getByText('Week 1').closest('button')

    expect(yearButton).toHaveClass('bg-morandi-stone-100')
    expect(monthButton).toHaveClass('bg-morandi-stone-100')
    expect(weekButton).not.toHaveClass('bg-morandi-stone-100')
  })

  describe('summary', () => {
    it('should render summary when provided', () => {
      render(<TimelineNav {...defaultProps} summary="Total: 10h 30m" />)
      expect(screen.getByText('Total: 10h 30m')).toBeInTheDocument()
    })

    it('should not render summary when not provided', () => {
      const { container } = render(<TimelineNav {...defaultProps} />)
      expect(container.querySelector('.sm\\:ml-6')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should return null when levels is empty', () => {
      const { container } = render(
        <TimelineNav levels={[]} selectedLevel="" onLevelChange={vi.fn()} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should return null when levels is undefined', () => {
      const { container } = render(
        <TimelineNav
          levels={undefined as unknown as TimelineLevel[]}
          selectedLevel=""
          onLevelChange={vi.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <TimelineNav {...defaultProps} className="custom-timeline" />
    )
    expect(container.firstChild).toHaveClass('custom-timeline')
  })

  it('should have border on non-first items', () => {
    render(<TimelineNav {...defaultProps} />)

    const monthButton = screen.getByText('January').closest('button')
    expect(monthButton).toHaveClass('border-l')
  })

  it('should default to first level if selectedLevel not found', () => {
    render(
      <TimelineNav
        levels={mockLevels}
        selectedLevel="invalid"
        onLevelChange={vi.fn()}
      />
    )

    // First level should be active
    const yearButton = screen.getByText('2024').closest('button')
    expect(yearButton).toHaveClass('bg-morandi-stone-100')
  })
})
