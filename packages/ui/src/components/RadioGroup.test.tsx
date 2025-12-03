import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup, Radio } from './RadioGroup'

describe('RadioGroup', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  it('should render radio options', () => {
    render(
      <RadioGroup {...defaultProps}>
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    )

    expect(screen.getByLabelText('Option A')).toBeInTheDocument()
    expect(screen.getByLabelText('Option B')).toBeInTheDocument()
  })

  it('should have correct radio selected based on value', () => {
    render(
      <RadioGroup {...defaultProps} value="b">
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    )

    expect(screen.getByLabelText('Option A')).not.toBeChecked()
    expect(screen.getByLabelText('Option B')).toBeChecked()
  })

  it('should call onChange when clicking a radio', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RadioGroup {...defaultProps} onChange={onChange}>
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    )

    await user.click(screen.getByLabelText('Option B'))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('should render with group label', () => {
    render(
      <RadioGroup {...defaultProps} label="Choose an option">
        <Radio value="a" label="Option A" />
      </RadioGroup>
    )

    expect(screen.getByText('Choose an option')).toBeInTheDocument()
  })

  it('should have radiogroup role', () => {
    render(
      <RadioGroup {...defaultProps} label="Options">
        <Radio value="a" label="Option A" />
      </RadioGroup>
    )

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('should disable all radios when group is disabled', () => {
    render(
      <RadioGroup {...defaultProps} disabled>
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    )

    expect(screen.getByLabelText('Option A')).toBeDisabled()
    expect(screen.getByLabelText('Option B')).toBeDisabled()
  })

  it('should not call onChange when group is disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RadioGroup {...defaultProps} onChange={onChange} disabled>
        <Radio value="a" label="Option A" />
      </RadioGroup>
    )

    await user.click(screen.getByLabelText('Option A'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should apply custom className to group', () => {
    const { container } = render(
      <RadioGroup {...defaultProps} className="custom-group">
        <Radio value="a" label="Option A" />
      </RadioGroup>
    )

    expect(container.querySelector('.custom-group')).toBeInTheDocument()
  })

  describe('orientation', () => {
    it('should render vertically by default', () => {
      render(
        <RadioGroup {...defaultProps}>
          <Radio value="a" label="Option A" />
        </RadioGroup>
      )

      const group = screen.getByRole('radiogroup')
      expect(group.className).toContain('flex-col')
    })

    it('should render horizontally when orientation is horizontal', () => {
      render(
        <RadioGroup {...defaultProps} orientation="horizontal">
          <Radio value="a" label="Option A" />
        </RadioGroup>
      )

      const group = screen.getByRole('radiogroup')
      expect(group.className).toContain('flex-row')
    })
  })
})

describe('Radio', () => {
  const renderWithGroup = (radioProps: React.ComponentProps<typeof Radio>) => {
    return render(
      <RadioGroup value="" onChange={vi.fn()}>
        <Radio {...radioProps} />
      </RadioGroup>
    )
  }

  it('should render with label', () => {
    renderWithGroup({ value: 'a', label: 'Option A' })
    expect(screen.getByText('Option A')).toBeInTheDocument()
  })

  it('should render with description', () => {
    renderWithGroup({
      value: 'a',
      label: 'Option A',
      description: 'This is option A',
    })
    expect(screen.getByText('This is option A')).toBeInTheDocument()
  })

  it('should be disabled individually', () => {
    render(
      <RadioGroup value="" onChange={vi.fn()}>
        <Radio value="a" label="Option A" disabled />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    )

    expect(screen.getByLabelText('Option A')).toBeDisabled()
    expect(screen.getByLabelText('Option B')).not.toBeDisabled()
  })

  it('should apply custom className', () => {
    const { container } = renderWithGroup({
      value: 'a',
      label: 'Option A',
      className: 'custom-radio',
    })

    expect(container.querySelector('.custom-radio')).toBeInTheDocument()
  })

  it('should throw error when used outside RadioGroup', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<Radio value="a" label="Option A" />)
    }).toThrow('Radio must be used within a RadioGroup')

    consoleSpy.mockRestore()
  })
})
