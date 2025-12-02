import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input, Textarea } from './Input'

describe('Input', () => {
  it('should render with default props', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render with label', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('should show required indicator when required', () => {
    render(<Input label="Email" id="email" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('should handle user input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Input onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('should show error message when error prop is provided', () => {
    render(<Input error="This field is required" id="field" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('should have aria-invalid when error exists', () => {
    render(<Input error="Error" id="field" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('should show helper text when provided', () => {
    render(<Input helperText="Enter your email address" id="email" />)
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
  })

  it('should not show helper text when error is present', () => {
    render(<Input helperText="Helper" error="Error" id="field" />)
    expect(screen.queryByText('Helper')).not.toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should render left icon', () => {
    render(<Input leftIcon={<span data-testid="left-icon">@</span>} />)
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
  })

  it('should render right icon', () => {
    render(<Input rightIcon={<span data-testid="right-icon">X</span>} />)
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('should apply fullWidth class', () => {
    const { container } = render(<Input fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })

  it('should apply custom className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('should set input type', () => {
    render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
  })
})

describe('Textarea', () => {
  it('should render with default props', () => {
    render(<Textarea />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render with label', () => {
    render(<Textarea label="Description" id="desc" />)
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('should handle user input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Textarea onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('should show error message when error prop is provided', () => {
    render(<Textarea error="This field is required" id="field" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('should have aria-invalid when error exists', () => {
    render(<Textarea error="Error" id="field" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('should show helper text when provided', () => {
    render(<Textarea helperText="Enter description" id="desc" />)
    expect(screen.getByText('Enter description')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    render(<Textarea ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })
})
