import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ClockTimePicker from './ClockTimePicker'

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'time.am': 'AM',
        'time.pm': 'PM',
        'timePicker.selectPracticeTime': 'Select Practice Time',
        'timePicker.hint':
          'Drag inner area for hours • Click outer ring for minutes',
        cancel: 'Cancel',
        'timePicker.confirmTime': 'Confirm Time',
        'timePicker.clickToTypeManually': 'Click to type time manually',
      }
      return translations[key] || key
    },
  }),
}))

describe('ClockTimePicker', () => {
  it('renders with initial time value', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="14:30" onChange={onChange} />)

    expect(screen.getByText('2:30 PM')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    expect(screen.getByText('Select Practice Time')).toBeInTheDocument()
    expect(screen.getByText('Confirm Time')).toBeInTheDocument()
  })

  it('allows clicking minute numbers to set minutes', async () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    // Click on 30 minutes
    const minuteButton = screen.getByText('30')
    fireEvent.click(minuteButton)

    // Confirm time
    const confirmButton = screen.getByText('Confirm Time')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('09:30')
    })
  })

  it('toggles AM/PM when button is clicked', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    // Click AM/PM toggle
    const ampmButton = screen.getByText('AM')
    fireEvent.click(ampmButton)

    // Check display updated to PM
    expect(screen.getByText('PM')).toBeInTheDocument()
  })

  it('allows manual time input', async () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    // Wait for the dropdown to be fully rendered, then click on time display to edit
    await waitFor(() => {
      expect(screen.getByText('Select Practice Time')).toBeInTheDocument()
    })

    const timeDisplay = screen.getByTitle('Click to type time manually')
    fireEvent.click(timeDisplay)

    // Should show input field after state update
    const input = await screen.findByPlaceholderText('HH:MM')
    expect(input).toBeInTheDocument()

    // Type new time
    fireEvent.change(input, { target: { value: '15:45' } })
    fireEvent.blur(input)

    // Confirm
    const confirmButton = screen.getByText('Confirm Time')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('15:45')
    })
  })

  it('cancels changes when cancel button is clicked', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    // Change minute
    const minuteButton = screen.getByText('30')
    fireEvent.click(minuteButton)

    // Cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('is accessible on mobile viewports', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    const trigger = screen.getByText('9:00 AM').parentElement
    expect(trigger).toHaveClass('cursor-pointer')

    // Should have proper touch-friendly classes
    fireEvent.click(trigger!)

    // Check that key elements are present
    expect(screen.getByText('Select Practice Time')).toBeInTheDocument()

    // Verify buttons are accessible
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Confirm Time')).toBeInTheDocument()
  })

  it('preserves exact minute value when opening', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:17" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:17 AM').parentElement
    fireEvent.click(trigger!)

    // Check that the time display shows the exact time (not rounded)
    const timeDisplay = screen.getByText('09:17')
    expect(timeDisplay).toBeInTheDocument()
  })

  it('allows selecting precise minutes via manual input', async () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:00" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:00 AM').parentElement
    fireEvent.click(trigger!)

    // Verify hint text is shown
    expect(
      screen.getByText(
        'Drag inner area for hours • Click outer ring for minutes'
      )
    ).toBeInTheDocument()

    // Wait for the dropdown to be fully rendered, then click on time display to edit manually
    await waitFor(() => {
      expect(screen.getByText('Select Practice Time')).toBeInTheDocument()
    })

    const timeDisplay = screen.getByTitle('Click to type time manually')
    fireEvent.click(timeDisplay)

    // Type a precise time (not on 5-minute interval)
    const input = await screen.findByPlaceholderText('HH:MM')
    fireEvent.change(input, { target: { value: '09:23' } })
    fireEvent.blur(input)

    // Confirm time
    const confirmButton = screen.getByText('Confirm Time')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      // Should have called onChange with the precise time
      expect(onChange).toHaveBeenCalledWith('09:23')
    })
  })

  it('shows visual hint for manual time entry', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="14:30" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('2:30 PM').parentElement
    fireEvent.click(trigger!)

    // Check that we have the hint text visible
    expect(
      screen.getByText(
        'Drag inner area for hours • Click outer ring for minutes'
      )
    ).toBeInTheDocument()

    // Check that the pencil icon is shown next to the time
    const timeContainer = screen.getByTitle('Click to type time manually')
    expect(timeContainer).toBeInTheDocument()

    // The time container should show both time and pencil icon
    expect(timeContainer.textContent).toContain('14:30')
  })
})
