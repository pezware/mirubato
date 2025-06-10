import { render, screen, fireEvent } from '@testing-library/react'
import Logbook from './Logbook'

describe('Logbook Page', () => {
  it('renders the logbook header and description', () => {
    render(<Logbook />)

    expect(screen.getByText('📚 Practice Logbook')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Track your practice sessions, monitor progress, and reflect on your musical journey'
      )
    ).toBeInTheDocument()
  })

  it('shows empty state when no entries exist', () => {
    render(<Logbook />)

    expect(screen.getByText('No practice entries yet')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Start logging your practice sessions to track your progress and build a record of your musical journey.'
      )
    ).toBeInTheDocument()
  })

  it('displays the new entry button', () => {
    render(<Logbook />)

    const newEntryButtons = screen.getAllByText('+ New Entry')
    expect(newEntryButtons).toHaveLength(1)
  })

  it('displays the search input field', () => {
    render(<Logbook />)

    const searchInput = screen.getByPlaceholderText('Search entries...')
    expect(searchInput).toBeInTheDocument()
  })

  it('updates search query when typing', () => {
    render(<Logbook />)

    const searchInput = screen.getByPlaceholderText(
      'Search entries...'
    ) as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: 'beethoven' } })

    expect(searchInput.value).toBe('beethoven')
  })

  it('displays filter button', () => {
    render(<Logbook />)

    expect(screen.getByText('⚙️ Filters')).toBeInTheDocument()
  })

  it('shows stats summary cards', () => {
    render(<Logbook />)

    expect(screen.getByText('Total Practice Time')).toBeInTheDocument()
    expect(screen.getByText('Sessions This Week')).toBeInTheDocument()
    expect(screen.getByText('Current Streak')).toBeInTheDocument()
  })

  it('opens new entry form modal when new entry button is clicked', () => {
    render(<Logbook />)

    const newEntryButton = screen.getByText('+ New Entry')
    fireEvent.click(newEntryButton)

    expect(screen.getByText('✏️ New Logbook Entry')).toBeInTheDocument()
    // Check that the form is rendered by looking for form elements
    expect(screen.getByText('Entry Type')).toBeInTheDocument()
  })

  it('closes new entry form modal when close button is clicked', () => {
    render(<Logbook />)

    // Open modal
    const newEntryButton = screen.getByText('+ New Entry')
    fireEvent.click(newEntryButton)

    // Close modal by clicking Cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(screen.queryByText('✏️ New Logbook Entry')).not.toBeInTheDocument()
  })

  it('opens new entry form from empty state button', () => {
    render(<Logbook />)

    const createFirstEntryButton = screen.getByText('+ Create Your First Entry')
    fireEvent.click(createFirstEntryButton)

    expect(screen.getByText('✏️ New Logbook Entry')).toBeInTheDocument()
  })
})
