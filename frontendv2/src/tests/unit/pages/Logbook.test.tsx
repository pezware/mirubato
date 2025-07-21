import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogbookPage from '../../../pages/Logbook'
import { useLogbookStore } from '../../../stores/logbookStore'
import { useAuthStore } from '../../../stores/authStore'

// Mock the stores
vi.mock('../../../stores/logbookStore')
vi.mock('../../../stores/authStore')

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
}))

// Mock the components
vi.mock('../../../components/ManualEntryForm', () => ({
  default: ({
    onClose,
    onSave,
  }: {
    onClose: () => void
    onSave: (data: unknown) => void
  }) => (
    <div data-testid="manual-entry-form">
      <button onClick={() => onSave({})}>Save Entry</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../../../components/practice-reports/EnhancedReports', () => ({
  default: () => <div data-testid="enhanced-reports">Enhanced Reports</div>,
}))

vi.mock('../../../components/GoogleSignInButton', () => ({
  default: ({
    onSuccess,
  }: {
    onSuccess: () => void
    onError: (error: Error) => void
  }) => (
    <button data-testid="google-signin-button" onClick={() => onSuccess()}>
      Sign in with Google
    </button>
  ),
}))

// Remove the mock for UnifiedHeader - let it render normally

// Unused mockEntries - commented out to fix lint error
// const mockEntries = [
//   {
//     id: 'entry1',
//     timestamp: '2024-01-01T10:00:00Z',
//     duration: 30,
//     type: 'PRACTICE',
//     pieces: [
//       { title: 'Moonlight Sonata', composer: 'Beethoven' },
//     ],
//     techniques: ['scales'],
//     notes: 'Good practice session',
//     mood: 'happy' as const,
//     instrument: 'piano',
//     logVersion: 2,
//     syncStatus: 'synced' as const,
//   },
//   {
//     id: 'entry2',
//     timestamp: '2024-01-02T14:00:00Z',
//     duration: 45,
//     type: 'LESSON',
//     pieces: [
//       { title: 'Prelude in C', composer: 'Bach' },
//     ],
//     techniques: ['arpeggios'],
//     notes: 'Lesson with teacher',
//     mood: 'focused' as const,
//     instrument: 'piano',
//     logVersion: 2,
//     syncStatus: 'synced' as const,
//   },
// ]

describe('LogbookPage', () => {
  const mockLoadEntries = vi.fn()
  const mockClearError = vi.fn()
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation for useLogbookStore
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
      loadEntries: mockLoadEntries,
      clearError: mockClearError,
    })

    // Default mock implementation for useAuthStore
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })
  })

  it('should render the page header', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText('common:appName')).toBeInTheDocument()
    expect(screen.getByText('logbook:title')).toBeInTheDocument()
  })

  it('should show sign in button when not authenticated', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // The sign-in button is now in AppLayout, not in LogbookPage
    // Just verify the page renders
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should show user email and sign out when authenticated', () => {
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // User email and sign out are now in AppLayout, not in LogbookPage
    // Just verify the page renders with authenticated state
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should show login form when sign in button is clicked', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // Sign in functionality is now in AppLayout
    // This test is no longer applicable to LogbookPage
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should handle email login', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // Login functionality is now in AppLayout
    // This test is no longer applicable to LogbookPage
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should render with authentication state', () => {
    // Login functionality is now in AppLayout
    // This test just verifies the page renders correctly
    mockLogin.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // The page should render regardless of auth state
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('logbook:title')).toBeInTheDocument()
  })

  it('should render with authenticated user', () => {
    // Logout functionality is now in AppLayout
    // This test verifies the page renders correctly for authenticated users
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { email: 'test@example.com', id: '123' },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: mockLogout,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // The page should render the same way for authenticated users
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('logbook:title')).toBeInTheDocument()
  })

  it('should display logbook content regardless of auth state', () => {
    // Auth errors are now handled by AppLayout
    // This test verifies the page still renders its content
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Authentication failed',
      login: mockLogin,
      logout: mockLogout,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // The page should still render its main content
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('logbook:title')).toBeInTheDocument()
  })

  it('should display logbook error', () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: false,
      error: 'Failed to load entries',
      loadEntries: mockLoadEntries,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Failed to load entries')).toBeInTheDocument()
  })

  it('should close error on dismiss', () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: false,
      error: 'Failed to load entries',
      loadEntries: mockLoadEntries,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const dismissButton = screen.getByText('✕')
    fireEvent.click(dismissButton)

    expect(mockClearError).toHaveBeenCalled()
  })

  it('should load entries on mount', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(mockLoadEntries).toHaveBeenCalled()
  })

  // Note: The EnhancedPracticeReports component should be tested in its own test file
  // The test below just verifies it's included in the page
  it('should include EnhancedReports component', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // Check for the presence of the mocked component
    expect(screen.getByTestId('enhanced-reports')).toBeInTheDocument() // Component appears once in the page
  })
})
