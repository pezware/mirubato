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

vi.mock('../../../components/EnhancedPracticeReports', () => ({
  default: () => (
    <div data-testid="enhanced-practice-reports">Enhanced Practice Reports</div>
  ),
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

    expect(screen.getByText('auth:signIn')).toBeInTheDocument()
    // The sync status is hidden on mobile but still in the DOM
    // We need to use a query that finds hidden elements
    const hiddenSpan = document.querySelector('.hidden.sm\\:inline')
    expect(hiddenSpan).toBeInTheDocument()
    expect(hiddenSpan?.textContent).toContain('logbook:syncStatus.localOnly')
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

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('auth:signOut')).toBeInTheDocument()
    expect(screen.queryByText('auth:signIn')).not.toBeInTheDocument()
  })

  it('should show login form when sign in button is clicked', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const signInButton = screen.getByText('auth:signIn')
    fireEvent.click(signInButton)

    expect(screen.getByTestId('google-signin-button')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('auth:emailPlaceholder')
    ).toBeInTheDocument()
    expect(screen.getByText('auth:sendMagicLink')).toBeInTheDocument()
  })

  it('should handle email login', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('auth:signIn'))

    const emailInput = screen.getByPlaceholderText('auth:emailPlaceholder')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const submitButton = screen.getByText('auth:sendMagicLink')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com')
    })
  })

  it('should show success message after login', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('auth:signIn'))

    const emailInput = screen.getByPlaceholderText('auth:emailPlaceholder')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const submitButton = screen.getByText('auth:sendMagicLink')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('auth:checkYourEmail')).toBeInTheDocument()
      expect(screen.getByText('auth:magicLinkSent')).toBeInTheDocument()
    })
  })

  it('should handle logout', async () => {
    // Mock the store's getState method for logout
    const mockGetState = vi.fn(() => ({
      logout: mockLogout,
    }))

    ;(useAuthStore as unknown as { getState: typeof mockGetState }).getState =
      mockGetState
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

    const signOutButton = screen.getByText('auth:signOut')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  it('should display auth error', () => {
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

    fireEvent.click(screen.getByText('auth:signIn'))

    expect(screen.getByText('Authentication failed')).toBeInTheDocument()
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
  it('should include EnhancedPracticeReports component', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    // Check for the presence of the mocked component
    expect(screen.getByTestId('enhanced-practice-reports')).toBeInTheDocument() // Component appears once in the page
  })
})
