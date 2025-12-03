import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClockTimePicker, { ClockTimePickerLabels } from './ClockTimePicker'

const mockLabels: ClockTimePickerLabels = {
  am: 'AM',
  pm: 'PM',
  title: 'Select Practice Time',
  hint: 'Drag hour hand, click for minutes',
  clickToTypeManually: 'Click to type manually',
  placeholder: 'HH:MM',
  cancel: 'Cancel',
  confirm: 'Set',
}

describe('ClockTimePicker', () => {
  const defaultProps = {
    value: '14:30',
    onChange: vi.fn(),
    labels: mockLabels,
  }

  it('should render time display', () => {
    render(<ClockTimePicker {...defaultProps} />)
    // 14:30 in 12-hour format is 2:30 PM
    expect(screen.getByText('2:30 PM')).toBeInTheDocument()
  })

  it('should render clock icon', () => {
    const { container } = render(<ClockTimePicker {...defaultProps} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  describe('time display', () => {
    it('should show 12 for midnight', () => {
      render(
        <ClockTimePicker value="00:00" onChange={vi.fn()} labels={mockLabels} />
      )
      expect(screen.getByText('12:00 AM')).toBeInTheDocument()
    })

    it('should show 12 for noon', () => {
      render(
        <ClockTimePicker value="12:00" onChange={vi.fn()} labels={mockLabels} />
      )
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    })

    it('should show AM for morning times', () => {
      render(
        <ClockTimePicker value="09:30" onChange={vi.fn()} labels={mockLabels} />
      )
      expect(screen.getByText('9:30 AM')).toBeInTheDocument()
    })

    it('should show PM for afternoon times', () => {
      render(
        <ClockTimePicker value="15:45" onChange={vi.fn()} labels={mockLabels} />
      )
      expect(screen.getByText('3:45 PM')).toBeInTheDocument()
    })
  })

  describe('dropdown', () => {
    it('should open dropdown when clicked', async () => {
      const user = userEvent.setup()
      render(<ClockTimePicker {...defaultProps} />)

      await user.click(screen.getByText('2:30 PM'))

      expect(screen.getByText('Select Practice Time')).toBeInTheDocument()
    })

    it('should show clock face when open', async () => {
      const user = userEvent.setup()
      const { container } = render(<ClockTimePicker {...defaultProps} />)

      await user.click(screen.getByText('2:30 PM'))

      // Clock face SVG with viewBox
      const clockFace = container.querySelector('svg[viewBox="0 0 240 240"]')
      expect(clockFace).toBeInTheDocument()
    })

    it('should show hour numbers 1-12', async () => {
      const user = userEvent.setup()
      render(<ClockTimePicker {...defaultProps} />)

      await user.click(screen.getByText('2:30 PM'))

      // Check for some hour numbers
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('9')).toBeInTheDocument()
    })

    it('should show action buttons', async () => {
      const user = userEvent.setup()
      render(<ClockTimePicker {...defaultProps} />)

      await user.click(screen.getByText('2:30 PM'))

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Set')).toBeInTheDocument()
    })
  })

  describe('AM/PM toggle', () => {
    it('should toggle AM to PM', async () => {
      const user = userEvent.setup()
      render(
        <ClockTimePicker value="09:30" onChange={vi.fn()} labels={mockLabels} />
      )

      await user.click(screen.getByText('9:30 AM'))

      // Find and click the AM/PM toggle button
      const ampmButton = screen.getByText('AM')
      await user.click(ampmButton)

      expect(screen.getByText('PM')).toBeInTheDocument()
    })

    it('should toggle PM to AM', async () => {
      const user = userEvent.setup()
      render(
        <ClockTimePicker value="15:30" onChange={vi.fn()} labels={mockLabels} />
      )

      await user.click(screen.getByText('3:30 PM'))

      const ampmButton = screen.getByText('PM')
      await user.click(ampmButton)

      expect(screen.getByText('AM')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('should call onChange and close on Set', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <ClockTimePicker
          value="14:30"
          onChange={onChange}
          labels={mockLabels}
        />
      )

      await user.click(screen.getByText('2:30 PM'))
      await user.click(screen.getByText('Set'))

      expect(onChange).toHaveBeenCalledWith('14:30')
      expect(screen.queryByText('Select Practice Time')).not.toBeInTheDocument()
    })

    it('should close without calling onChange on Cancel', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <ClockTimePicker
          value="14:30"
          onChange={onChange}
          labels={mockLabels}
        />
      )

      await user.click(screen.getByText('2:30 PM'))
      await user.click(screen.getByText('Cancel'))

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.queryByText('Select Practice Time')).not.toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(
      <ClockTimePicker {...defaultProps} className="custom-picker" />
    )
    // className is applied to the trigger div
    const trigger = container.querySelector('.custom-picker')
    expect(trigger).toBeInTheDocument()
  })
})
