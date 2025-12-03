import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl, SegmentOption } from './SegmentedControl'

const mockOptions: SegmentOption[] = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'calendar', label: 'Calendar' },
]

describe('SegmentedControl', () => {
  const defaultProps = {
    options: mockOptions,
    value: 'list',
    onChange: vi.fn(),
    ariaLabel: 'View mode selection',
  }

  it('should render all options', () => {
    render(<SegmentedControl {...defaultProps} />)

    expect(screen.getByText('List')).toBeInTheDocument()
    expect(screen.getByText('Grid')).toBeInTheDocument()
    expect(screen.getByText('Calendar')).toBeInTheDocument()
  })

  it('should mark active option with aria-selected', () => {
    render(<SegmentedControl {...defaultProps} value="grid" />)

    const gridTab = screen.getByRole('tab', { name: 'Grid' })
    const listTab = screen.getByRole('tab', { name: 'List' })

    expect(gridTab).toHaveAttribute('aria-selected', 'true')
    expect(listTab).toHaveAttribute('aria-selected', 'false')
  })

  it('should call onChange when option is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SegmentedControl {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: 'Grid' }))
    expect(onChange).toHaveBeenCalledWith('grid')
  })

  it('should have tablist role', () => {
    render(<SegmentedControl {...defaultProps} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(
        <SegmentedControl {...defaultProps} size="sm" />
      )
      expect(container.firstChild).toHaveClass('p-0.5')
    })

    it('should render medium size (default)', () => {
      const { container } = render(<SegmentedControl {...defaultProps} />)
      expect(container.firstChild).toHaveClass('p-1')
    })

    it('should render large size', () => {
      const { container } = render(
        <SegmentedControl {...defaultProps} size="lg" />
      )
      expect(container.firstChild).toHaveClass('p-1.5')
    })
  })

  describe('fullWidth', () => {
    it('should not be full width by default', () => {
      const { container } = render(<SegmentedControl {...defaultProps} />)
      expect(container.firstChild).not.toHaveClass('w-full')
    })

    it('should be full width when prop is true', () => {
      const { container } = render(
        <SegmentedControl {...defaultProps} fullWidth />
      )
      expect(container.firstChild).toHaveClass('w-full')
    })
  })

  describe('with icons', () => {
    it('should render icon with option', () => {
      const optionsWithIcon: SegmentOption[] = [
        {
          value: 'home',
          label: 'Home',
          icon: <span data-testid="home-icon">🏠</span>,
        },
      ]

      render(
        <SegmentedControl
          options={optionsWithIcon}
          value="home"
          onChange={vi.fn()}
          ariaLabel="Navigation"
        />
      )

      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <SegmentedControl {...defaultProps} className="custom-control" />
    )
    expect(container.firstChild).toHaveClass('custom-control')
  })

  it('should have rounded corners', () => {
    const { container } = render(<SegmentedControl {...defaultProps} />)
    expect(container.firstChild).toHaveClass('rounded-lg')
  })

  it('should have gray background', () => {
    const { container } = render(<SegmentedControl {...defaultProps} />)
    expect(container.firstChild).toHaveClass('bg-gray-100')
  })

  it('should highlight active option with white background', () => {
    render(<SegmentedControl {...defaultProps} value="list" />)

    const activeTab = screen.getByRole('tab', { name: 'List' })
    expect(activeTab).toHaveClass('bg-white')
  })
})
