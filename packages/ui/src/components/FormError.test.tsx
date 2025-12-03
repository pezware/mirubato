import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormError from './FormError'

describe('FormError', () => {
  it('should render nothing when no error provided', () => {
    const { container } = render(<FormError />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when error is empty string', () => {
    const { container } = render(<FormError error="" />)
    expect(container.firstChild).toBeNull()
  })

  it('should render error message when provided', () => {
    render(<FormError error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('should render with error icon', () => {
    const { container } = render(<FormError error="Error" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should have red text color', () => {
    const { container } = render(<FormError error="Error" />)
    expect(container.firstChild).toHaveClass('text-red-600')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <FormError error="Error" className="custom-error" />
    )
    expect(container.firstChild).toHaveClass('custom-error')
  })
})
