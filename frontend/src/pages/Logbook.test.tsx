import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Logbook from './Logbook'

// Mock the UserStatusIndicator to avoid auth context issues
jest.mock('../components/UserStatusIndicator', () => ({
  UserStatusIndicator: () => <div>User Status</div>,
}))

// Mock the PracticeLoggerModule
const mockPracticeLogger = {
  getLogEntries: jest.fn().mockResolvedValue([]),
  createLogEntry: jest.fn(),
  deleteLogEntry: jest.fn(),
}

// Mock the modules context
jest.mock('../contexts/ModulesContext', () => ({
  useModules: () => ({
    practiceLogger: mockPracticeLogger,
    isInitialized: true,
  }),
}))

// Mock auth context
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Logbook Page', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    // Reset mock return values
    mockPracticeLogger.getLogEntries.mockResolvedValue([])
  })

  it('renders the logbook header and description', async () => {
    renderWithProviders(<Logbook />)

    expect(screen.getByText('📚 Practice Logbook')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Track your practice sessions, monitor progress, and reflect on your musical journey'
      )
    ).toBeInTheDocument()
  })

  it('shows empty state when no entries exist', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      expect(screen.getByText('No practice entries yet')).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'Start logging your practice sessions to track your progress and build a record of your musical journey.'
      )
    ).toBeInTheDocument()
  })

  it('displays the new entry button', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      const newEntryButtons = screen.getAllByText('+ New Entry')
      expect(newEntryButtons).toHaveLength(1)
    })
  })

  it('displays the search input field', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search entries...')
      expect(searchInput).toBeInTheDocument()
    })
  })

  it('updates search query when typing', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(
        'Search entries...'
      ) as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'beethoven' } })

      expect(searchInput.value).toBe('beethoven')
    })
  })

  it('displays filter button', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      expect(screen.getByText('⚙️ Filters')).toBeInTheDocument()
    })
  })

  it('shows stats summary cards', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      expect(screen.getByText('Total Practice Time')).toBeInTheDocument()
      expect(screen.getByText('Sessions This Week')).toBeInTheDocument()
      expect(screen.getByText('Current Streak')).toBeInTheDocument()
    })
  })

  it('opens new entry form modal when new entry button is clicked', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      const newEntryButton = screen.getByText('+ New Entry')
      fireEvent.click(newEntryButton)
    })

    expect(screen.getByText('✏️ New Logbook Entry')).toBeInTheDocument()
    // Check that the form is rendered by looking for form elements
    expect(screen.getByText('Entry Type')).toBeInTheDocument()
  })

  it('closes new entry form modal when close button is clicked', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      // Open modal
      const newEntryButton = screen.getByText('+ New Entry')
      fireEvent.click(newEntryButton)
    })

    // Close modal by clicking Cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(screen.queryByText('✏️ New Logbook Entry')).not.toBeInTheDocument()
  })

  it('opens new entry form from empty state button', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      const createFirstEntryButton = screen.getByText(
        '+ Create Your First Entry'
      )
      fireEvent.click(createFirstEntryButton)
    })

    expect(screen.getByText('✏️ New Logbook Entry')).toBeInTheDocument()
  })
})
