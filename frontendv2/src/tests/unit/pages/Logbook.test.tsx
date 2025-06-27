import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import LogbookPage from '../../../pages/Logbook'
import { useLogbookStore } from '../../../stores/logbookStore'
import { useAuthStore } from '../../../stores/authStore'
import type { LogbookEntry } from '../../../api/logbook'
import type { User } from '../../../api/auth'

// Mock the stores
vi.mock('../../../stores/logbookStore')
vi.mock('../../../stores/authStore')

// Mock components
vi.mock('../../../components/ManualEntryForm', () => ({
  default: ({
    onClose,
    onSave,
  }: {
    onClose: () => void
    onSave: () => void
  }) => (
    <div data-testid="manual-entry-form">
      <button onClick={onClose}>Close Form</button>
      <button onClick={onSave}>Save Entry</button>
    </div>
  ),
}))

vi.mock('../../../components/LogbookEntryList', () => ({
  default: ({
    entries,
    onUpdate,
  }: {
    entries: LogbookEntry[]
    onUpdate: () => void
  }) => (
    <div data-testid="logbook-entry-list">
      {entries.map(entry => (
        <div key={entry.id} data-testid={`entry-${entry.id}`}>
          {entry.duration} minutes
        </div>
      ))}
      <button onClick={onUpdate}>Update Entries</button>
    </div>
  ),
}))

vi.mock('../../../components/LogbookReports', () => ({
  default: () => <div data-testid="logbook-reports">Reports Component</div>,
}))

vi.mock('../../../components/GoogleSignInButton', () => ({
  default: ({
    onSuccess,
    onError,
  }: {
    onSuccess: () => void
    onError: (error: Error) => void
  }) => (
    <div data-testid="google-signin">
      <button onClick={onSuccess}>Sign in with Google</button>
      <button onClick={() => onError(new Error('Google auth failed'))}>
        Trigger Error
      </button>
    </div>
  ),
}))

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:appName': 'Mirubato',
        'logbook:title': 'Logbook',
        'logbook:syncStatus.synced': 'Synced',
        'logbook:syncStatus.localOnly': 'Local storage',
        'auth:signOut': 'Logout',
        'auth:signIn': 'Sign in',
        'logbook:entry.addEntry': 'Add Entry',
        'logbook:searchPlaceholder': 'Search entries...',
        'logbook:loading': 'Loading...',
        'logbook:noResults': 'No results found',
        'logbook:empty': 'No entries yet',
        'logbook:entry.addFirstEntry': 'Add Your First Entry',
        'logbook:entry.entry': '1 entry',
        'auth:orContinueWithEmail': 'Or continue with email',
        'auth:emailPlaceholder': 'Enter your email',
        'auth:sendMagicLink': 'Send Magic Link',
        'common:cancel': 'Cancel',
        'common:loading': 'Loading...',
        'auth:checkYourEmail': 'Check Your Email',
        'auth:magicLinkSent': 'We sent a magic link to {{email}}',
        'auth:gotIt': 'Got it',
      }
      return translations[key] || key
    },
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

describe('LogbookPage', () => {
  const mockLoadEntries = vi.fn()
  const mockSetSearchQuery = vi.fn()
  const mockClearError = vi.fn()
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

  const mockEntries: LogbookEntry[] = [
    {
      id: 'entry1',
      timestamp: '2025-06-26T10:00:00Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
      techniques: ['scales'],
      goalIds: [],
      mood: 'SATISFIED',
      tags: ['morning'],
      notes: 'Good practice session',
      createdAt: '2025-06-26T10:00:00Z',
      updatedAt: '2025-06-26T10:00:00Z',
    },
    {
      id: 'entry2',
      timestamp: '2025-06-26T14:00:00Z',
      duration: 45,
      type: 'PRACTICE',
      instrument: 'GUITAR',
      pieces: [{ title: 'Stairway to Heaven', composer: 'Led Zeppelin' }],
      techniques: ['fingerpicking'],
      goalIds: [],
      tags: ['evening'],
      createdAt: '2025-06-26T14:00:00Z',
      updatedAt: '2025-06-26T14:00:00Z',
    },
  ]

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
    primaryInstrument: 'PIANO',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      loadEntries: mockLoadEntries,
      setSearchQuery: mockSetSearchQuery,
      clearError: mockClearError,
    })
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: mockLogin,
      logout: mockLogout,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the page with header and main sections', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Mirubato')).toBeInTheDocument()
    expect(screen.getByText('Logbook')).toBeInTheDocument()
    expect(screen.getByText('Local storage')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('should load entries on mount', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(mockLoadEntries).toHaveBeenCalledTimes(1)
  })

  it('should display loading state', () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: true,
      error: null,
      searchQuery: '',
      loadEntries: mockLoadEntries,
      setSearchQuery: mockSetSearchQuery,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText('⏳ Loading...')).toBeInTheDocument()
  })

  it('should display error state with clear button', () => {
    const testError = 'Failed to load entries'
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: [],
      isLoading: false,
      error: testError,
      searchQuery: '',
      loadEntries: mockLoadEntries,
      setSearchQuery: mockSetSearchQuery,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText(testError)).toBeInTheDocument()

    const clearButton = screen.getByRole('button', { name: '✕' })
    fireEvent.click(clearButton)

    expect(mockClearError).toHaveBeenCalledTimes(1)
  })

  it('should display empty state when no entries', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByText('🎵')).toBeInTheDocument()
    expect(screen.getByText('No entries yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Entry')).toBeInTheDocument()
  })

  it('should display entries when available', () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      error: null,
      searchQuery: '',
      loadEntries: mockLoadEntries,
      setSearchQuery: mockSetSearchQuery,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('logbook-entry-list')).toBeInTheDocument()
    expect(screen.getByText('30 minutes')).toBeInTheDocument()
    expect(screen.getByText('45 minutes')).toBeInTheDocument()
  })

  it('should filter entries based on search query', () => {
    ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      error: null,
      searchQuery: 'moonlight',
      loadEntries: mockLoadEntries,
      setSearchQuery: mockSetSearchQuery,
      clearError: mockClearError,
    })

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('entry-entry1')).toBeInTheDocument()
    expect(screen.queryByTestId('entry-entry2')).not.toBeInTheDocument()
  })

  it('should handle search input changes', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText('Search entries...')
    fireEvent.change(searchInput, { target: { value: 'beethoven' } })

    expect(mockSetSearchQuery).toHaveBeenCalledWith('beethoven')
  })

  it('should open and close new entry form', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const addButton = screen.getByText('Add Entry')
    fireEvent.click(addButton)

    expect(screen.getByTestId('manual-entry-form')).toBeInTheDocument()

    const closeButton = screen.getByText('Close Form')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('manual-entry-form')).not.toBeInTheDocument()
  })

  it('should handle entry save and reload entries', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const addButton = screen.getByText('Add Entry')
    fireEvent.click(addButton)

    const saveButton = screen.getByText('Save Entry')
    fireEvent.click(saveButton)

    expect(screen.queryByTestId('manual-entry-form')).not.toBeInTheDocument()
    expect(mockLoadEntries).toHaveBeenCalledTimes(2) // Once on mount, once after save
  })

  describe('Authentication', () => {
    it('should display authenticated state', () => {
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: null,
      })

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.getByText('☁️ Synced •')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should handle logout', async () => {
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: null,
      })

      // Mock getState for the logout button's direct store access
      ;(
        useAuthStore as unknown as ReturnType<typeof vi.fn> & {
          getState: () => { logout: typeof mockLogout }
        }
      ).getState = () => ({
        logout: mockLogout,
      })

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
        expect(mockClearError).toHaveBeenCalledTimes(1)
      })
    })

    it('should open login form when sign in button clicked', () => {
      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      expect(screen.getByTestId('google-signin')).toBeInTheDocument()
      expect(screen.getByText('Or continue with email')).toBeInTheDocument()
    })

    it('should handle email login form submission', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const submitButton = screen.getByText('Send Magic Link')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com')
      })

      // Should show success message
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      expect(
        screen.getByText('We sent a magic link to {{email}}')
      ).toBeInTheDocument()
    })

    it('should handle login errors', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'))
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: 'Invalid email',
      })

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })

    it('should close login form with cancel button', () => {
      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument()
    })

    it('should handle Google sign in success', () => {
      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      const googleButton = screen.getByText('Sign in with Google')
      fireEvent.click(googleButton)

      expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument()
    })

    it('should handle Google sign in error', () => {
      // Mock console.error to prevent test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      const errorButton = screen.getByText('Trigger Error')
      fireEvent.click(errorButton)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Google Sign-In error:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Search functionality', () => {
    it('should filter by notes', () => {
      ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        {
          entries: mockEntries,
          isLoading: false,
          error: null,
          searchQuery: 'good practice',
          loadEntries: mockLoadEntries,
          setSearchQuery: mockSetSearchQuery,
          clearError: mockClearError,
        }
      )

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.getByTestId('entry-entry1')).toBeInTheDocument()
      expect(screen.queryByTestId('entry-entry2')).not.toBeInTheDocument()
    })

    it('should filter by composer', () => {
      ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        {
          entries: mockEntries,
          isLoading: false,
          error: null,
          searchQuery: 'zeppelin',
          loadEntries: mockLoadEntries,
          setSearchQuery: mockSetSearchQuery,
          clearError: mockClearError,
        }
      )

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('entry-entry1')).not.toBeInTheDocument()
      expect(screen.getByTestId('entry-entry2')).toBeInTheDocument()
    })

    it('should filter by techniques', () => {
      ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        {
          entries: mockEntries,
          isLoading: false,
          error: null,
          searchQuery: 'fingerpicking',
          loadEntries: mockLoadEntries,
          setSearchQuery: mockSetSearchQuery,
          clearError: mockClearError,
        }
      )

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.queryByTestId('entry-entry1')).not.toBeInTheDocument()
      expect(screen.getByTestId('entry-entry2')).toBeInTheDocument()
    })

    it('should filter by tags', () => {
      ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        {
          entries: mockEntries,
          isLoading: false,
          error: null,
          searchQuery: 'morning',
          loadEntries: mockLoadEntries,
          setSearchQuery: mockSetSearchQuery,
          clearError: mockClearError,
        }
      )

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.getByTestId('entry-entry1')).toBeInTheDocument()
      expect(screen.queryByTestId('entry-entry2')).not.toBeInTheDocument()
    })

    it('should show no results message when search returns empty', () => {
      ;(useLogbookStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        {
          entries: mockEntries,
          isLoading: false,
          error: null,
          searchQuery: 'nonexistent',
          loadEntries: mockLoadEntries,
          setSearchQuery: mockSetSearchQuery,
          clearError: mockClearError,
        }
      )

      render(
        <MemoryRouter>
          <LogbookPage />
        </MemoryRouter>
      )

      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('should display reports component', () => {
    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('logbook-reports')).toBeInTheDocument()
  })

  it('should handle login success message dismissal', async () => {
    mockLogin.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <LogbookPage />
      </MemoryRouter>
    )

    const signInButton = screen.getByText('Sign in')
    fireEvent.click(signInButton)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const submitButton = screen.getByText('Send Magic Link')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
    })

    const gotItButton = screen.getByText('Got it')
    fireEvent.click(gotItButton)

    expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument()
  })
})
