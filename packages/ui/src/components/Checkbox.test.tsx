import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
  }

  it('should render unchecked by default', () => {
    render(<Checkbox {...defaultProps} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('should render checked when checked prop is true', () => {
    render(<Checkbox {...defaultProps} checked={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('should call onChange when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Checkbox {...defaultProps} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('should call onChange with false when unchecking', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Checkbox {...defaultProps} checked={true} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('should render with label', () => {
    render(<Checkbox {...defaultProps} label="Accept terms" />)
    expect(screen.getByText('Accept terms')).toBeInTheDocument()
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument()
  })

  it('should render with description', () => {
    render(
      <Checkbox
        {...defaultProps}
        label="Newsletter"
        description="Receive weekly updates"
      />
    )
    expect(screen.getByText('Receive weekly updates')).toBeInTheDocument()
  })

  it('should be clickable via label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Checkbox {...defaultProps} onChange={onChange} label="Click me" />)

    await user.click(screen.getByText('Click me'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Checkbox {...defaultProps} disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('should not call onChange when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Checkbox {...defaultProps} onChange={onChange} disabled />)

    await user.click(screen.getByRole('checkbox'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    render(<Checkbox {...defaultProps} className="custom-class" />)
    expect(screen.getByRole('checkbox')).toHaveClass('custom-class')
  })

  describe('sizes', () => {
    it('should render medium size by default', () => {
      render(<Checkbox {...defaultProps} />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox.className).toContain('h-4')
      expect(checkbox.className).toContain('w-4')
    })

    it('should render small size', () => {
      render(<Checkbox {...defaultProps} size="sm" />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox.className).toContain('h-3.5')
      expect(checkbox.className).toContain('w-3.5')
    })

    it('should render large size', () => {
      render(<Checkbox {...defaultProps} size="lg" />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox.className).toContain('h-5')
      expect(checkbox.className).toContain('w-5')
    })
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Checkbox {...defaultProps} ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('should use provided id', () => {
    render(<Checkbox {...defaultProps} id="custom-id" label="Test" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id')
  })
})
