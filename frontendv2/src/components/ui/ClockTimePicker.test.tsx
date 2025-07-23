import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ClockTimePicker from './ClockTimePicker'

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

    // Click on time display to edit
    const timeDisplay = screen.getByText('09:00')
    fireEvent.click(timeDisplay)

    // Should show input field
    const input = screen.getByPlaceholderText('HH:MM')
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

  it('rounds minutes to nearest 5 when opening', () => {
    const onChange = vi.fn()
    render(<ClockTimePicker value="09:17" onChange={onChange} />)

    // Open dropdown
    const trigger = screen.getByText('9:17 AM').parentElement
    fireEvent.click(trigger!)

    // Check that 15 minutes is selected (17 rounded to nearest 5)
    const minute15 = screen.getByText('15')
    const minute15Parent = minute15.parentElement
    const circle = minute15Parent?.querySelector('circle')

    // The selected minute should have a filled background
    expect(circle).toHaveAttribute('fill', '#4A5568')
  })
})
