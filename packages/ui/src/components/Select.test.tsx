import { describe, it, expect, vi, beforeEach } from 'vitest'
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with placeholder when nothing selected', () => {
      render(<MultiSelect {...defaultProps} placeholder="Select options" />)
      expect(screen.getByText('Select options')).toBeInTheDocument()
    })

    it('should show count when options are selected', () => {
      render(<MultiSelect {...defaultProps} value={['1', '2']} />)
      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })

    it('should show "1 selected" for single selection', () => {
      render(<MultiSelect {...defaultProps} value={['1']} />)
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('should render with label', () => {
      render(<MultiSelect {...defaultProps} label="Choose options" />)
      expect(screen.getByText('Choose options')).toBeInTheDocument()
    })

    it('should show error message when error prop is provided', () => {
      render(
        <MultiSelect {...defaultProps} error="Please select at least one" />
      )
      expect(screen.getByText('Please select at least one')).toBeInTheDocument()
    })

    it('should show helper text when provided', () => {
      render(<MultiSelect {...defaultProps} helperText="Select multiple" />)
      expect(screen.getByText('Select multiple')).toBeInTheDocument()
    })

    it('should not show helper text when error is present', () => {
      render(
        <MultiSelect {...defaultProps} helperText="Helper" error="Error" />
      )
      expect(screen.queryByText('Helper')).not.toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('should apply fullWidth class', () => {
      const { container } = render(<MultiSelect {...defaultProps} fullWidth />)
      expect(container.firstChild).toHaveClass('w-full')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <MultiSelect {...defaultProps} className="custom-multi" />
      )
      expect(container.firstChild).toHaveClass('custom-multi')
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<MultiSelect {...defaultProps} disabled placeholder="Select" />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup()

      render(<MultiSelect {...defaultProps} disabled placeholder="Select" />)

      // Try to click the disabled button
      const button = screen.getByRole('button')
      await user.click(button)

      // Options should NOT be visible in the listbox
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('selection behavior', () => {
    it('should open dropdown on click', async () => {
      const user = userEvent.setup()

      render(<MultiSelect {...defaultProps} placeholder="Select" />)

      await user.click(screen.getByRole('button'))

      // Options should be visible
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('should add option to selection when clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={[]}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 1'))

      expect(onChange).toHaveBeenCalledWith(['1'])
    })

    it('should remove option from selection when clicked again', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={['1', '2']}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 1'))

      expect(onChange).toHaveBeenCalledWith(['2'])
    })

    it('should allow selecting multiple options', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const { rerender } = render(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={[]}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 1'))

      expect(onChange).toHaveBeenCalledWith(['1'])

      // Simulate state update
      rerender(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={['1']}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 2'))

      expect(onChange).toHaveBeenCalledWith(['1', '2'])
    })

    it('should not select disabled options', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={[]}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 3'))

      // Option 3 is disabled, onChange should not be called
      expect(onChange).not.toHaveBeenCalled()
    })

    it('should show checkmark for selected options', async () => {
      const user = userEvent.setup()

      render(
        <MultiSelect {...defaultProps} value={['1']} placeholder="Select" />
      )

      await user.click(screen.getByRole('button'))

      // Get the option elements (Headless UI uses role="option")
      const options = screen.getAllByRole('option')
      const option1 = options.find(opt => opt.textContent?.includes('Option 1'))
      const option2 = options.find(opt => opt.textContent?.includes('Option 2'))

      // Selected option should have checkmark (svg with aria-hidden)
      expect(option1?.querySelector('svg[aria-hidden="true"]')).toBeTruthy()

      // Non-selected option should NOT have checkmark
      expect(option2?.querySelector('svg[aria-hidden="true"]')).toBeFalsy()
    })
  })

  describe('edge cases', () => {
    it('should handle empty options array', () => {
      render(
        <MultiSelect {...defaultProps} options={[]} placeholder="No options" />
      )
      expect(screen.getByText('No options')).toBeInTheDocument()
    })

    it('should handle numeric values', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const numericOptions = [
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
      ]

      render(
        <MultiSelect
          value={[]}
          onChange={onChange}
          options={numericOptions}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('One'))

      expect(onChange).toHaveBeenCalledWith([1])
    })

    it('should preserve order when adding selections', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <MultiSelect
          {...defaultProps}
          onChange={onChange}
          value={['2']}
          placeholder="Select"
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Option 1'))

      // New selection should be appended to existing
      expect(onChange).toHaveBeenCalledWith(['2', '1'])
    })
  })
})
