import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DateSeparator } from './DateSeparator'

describe('DateSeparator', () => {
  const defaultProps = {
    date: 'January 5, 2024',
    totalDuration: '2h 30m',
  }

  it('should render date', () => {
    render(<DateSeparator {...defaultProps} />)
    expect(screen.getByText('January 5, 2024')).toBeInTheDocument()
  })

  it('should render total duration', () => {
    render(<DateSeparator {...defaultProps} />)
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
  })

  it('should have gray background', () => {
    const { container } = render(<DateSeparator {...defaultProps} />)
    expect(container.firstChild).toHaveClass('bg-gray-100')
  })

  it('should have border-bottom', () => {
    const { container } = render(<DateSeparator {...defaultProps} />)
    expect(container.firstChild).toHaveClass('border-b')
  })

  it('should render separator line', () => {
    const { container } = render(<DateSeparator {...defaultProps} />)
    const line = container.querySelector('.h-px')
    expect(line).toBeInTheDocument()
    expect(line).toHaveClass('bg-gray-300')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <DateSeparator {...defaultProps} className="custom-separator" />
    )
    expect(container.firstChild).toHaveClass('custom-separator')
  })
})
