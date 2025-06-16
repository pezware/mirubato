import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Logbook from './Logbook'
import { AuthContext } from '../contexts/ImprovedAuthContext'
import type { AuthContextType } from '../contexts/ImprovedAuthContext'

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

// Mock the reporting module
const mockReportingModule = {
  generateReport: jest.fn().mockResolvedValue({
    overallStats: {
      totalPracticeTime: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      practiceStreak: 0,
      goalsCompleted: 0,
      totalGoals: 0,
      piecesMastered: 0,
      consistencyScore: 0,
    },
    timeBasedStats: {
      daily: {},
      weekly: {},
      monthly: {},
    },
    pieceStats: [],
    categoryStats: {},
  }),
}

// Mock the modules context
jest.mock('../contexts/ModulesContext', () => ({
  useModules: () => ({
    practiceLogger: mockPracticeLogger,
    reportingModule: mockReportingModule,
    eventBus: {
      subscribe: jest.fn().mockReturnValue(() => {}),
    },
    isInitialized: true,
  }),
}))

// Mock Apollo Client
const mockRefetch = jest.fn()
const mockCreateLogbookEntry = jest.fn()
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useMutation: jest.fn(() => [mockCreateLogbookEntry]),
  gql: jest.fn(strings => strings.join('')),
}))

// Create mock auth context value
const createMockAuthContext = (): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isAnonymous: false,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  refreshAuth: jest.fn(),
  syncToCloud: jest.fn(),
  localUserData: null,
  syncState: {
    status: 'idle',
    lastSync: null,
    pendingOperations: 0,
    error: null,
  },
  clearSyncError: jest.fn(),
  updateSyncState: jest.fn(),
})

const renderWithProviders = (component: React.ReactElement) => {
  const mockAuthContext = createMockAuthContext()
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <BrowserRouter>{component}</BrowserRouter>
    </AuthContext.Provider>
  )
}

describe('Logbook Page', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    // Reset mock return values
    mockPracticeLogger.getLogEntries.mockResolvedValue([])
    mockRefetch.mockClear()
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

  it('does not show reports section when no entries exist', async () => {
    renderWithProviders(<Logbook />)

    await waitFor(() => {
      // Reports & Analytics section should not be visible when there are no entries
      expect(screen.queryByText('Reports & Analytics')).not.toBeInTheDocument()
    })
  })

  it('shows reports section when entries exist', async () => {
    // Mock entries
    mockPracticeLogger.getLogEntries.mockResolvedValue([
      {
        id: '1',
        userId: 'user1',
        timestamp: Date.now(),
        duration: 1800,
        type: 'practice',
        instrument: 'PIANO',
        pieces: [{ id: 'p1', title: 'Test Piece' }],
        techniques: [],
        goalIds: [],
        notes: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    renderWithProviders(<Logbook />)

    await waitFor(() => {
      expect(screen.getByText('Reports & Analytics')).toBeInTheDocument()
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
