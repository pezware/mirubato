import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, MultiSelect } from './Select'

const mockOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', disabled: true },
]

describe('Select', () => {
  const defaultProps = {
    value: undefined as string | undefined,
    onChange: vi.fn(),
    options: mockOptions,
  }

  it('should render with placeholder', () => {
    render(<Select {...defaultProps} placeholder="Select an option" />)
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('should render with label', () => {
    render(<Select {...defaultProps} label="Choose option" />)
    expect(screen.getByText('Choose option')).toBeInTheDocument()
  })

  it('should show selected option label', () => {
    render(<Select {...defaultProps} value="1" />)
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('should open dropdown on click', async () => {
    const user = userEvent.setup()

    render(<Select {...defaultProps} placeholder="Select" />)

    await user.click(screen.getByRole('button'))

    // Options should be visible
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('should call onChange when option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Select {...defaultProps} onChange={onChange} placeholder="Select" />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Option 2'))

    expect(onChange).toHaveBeenCalledWith('2')
  })

  it('should show error message when error prop is provided', () => {
    render(<Select {...defaultProps} error="Please select an option" />)
    expect(screen.getByText('Please select an option')).toBeInTheDocument()
  })

  it('should show helper text when provided', () => {
    render(<Select {...defaultProps} helperText="Choose wisely" />)
    expect(screen.getByText('Choose wisely')).toBeInTheDocument()
  })

  it('should not show helper text when error is present', () => {
    render(<Select {...defaultProps} helperText="Helper" error="Error" />)
    expect(screen.queryByText('Helper')).not.toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Select {...defaultProps} disabled placeholder="Select" />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should apply fullWidth class', () => {
    const { container } = render(<Select {...defaultProps} fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Select {...defaultProps} className="custom-select" />
    )
    expect(container.firstChild).toHaveClass('custom-select')
  })
})

describe('MultiSelect', () => {
  const defaultProps = {
    value: [] as string[],
    onChange: vi.fn(),
    options: mockOptions,
  }

  it('should render with placeholder when nothing selected', () => {
    render(<MultiSelect {...defaultProps} placeholder="Select options" />)
    expect(screen.getByText('Select options')).toBeInTheDocument()
  })

  it('should show count when options are selected', () => {
    render(<MultiSelect {...defaultProps} value={['1', '2']} />)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('should render with label', () => {
    render(<MultiSelect {...defaultProps} label="Choose options" />)
    expect(screen.getByText('Choose options')).toBeInTheDocument()
  })

  it('should show error message when error prop is provided', () => {
    render(<MultiSelect {...defaultProps} error="Please select at least one" />)
    expect(screen.getByText('Please select at least one')).toBeInTheDocument()
  })

  it('should show helper text when provided', () => {
    render(<MultiSelect {...defaultProps} helperText="Select multiple" />)
    expect(screen.getByText('Select multiple')).toBeInTheDocument()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<MultiSelect {...defaultProps} disabled placeholder="Select" />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should apply fullWidth class', () => {
    const { container } = render(<MultiSelect {...defaultProps} fullWidth />)
    expect(container.firstChild).toHaveClass('w-full')
  })
})
