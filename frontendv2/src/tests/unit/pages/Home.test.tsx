import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import HomePage from '../../../pages/Home'
import { useAuthStore } from '../../../stores/authStore'
import type { User } from '../../../api/auth'

// Mock the auth store
vi.mock('../../../stores/authStore')

// Mock components
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

vi.mock('../../../components/InteractivePiano', () => ({
  default: () => (
    <div data-testid="interactive-piano">Interactive Piano Component</div>
  ),
}))

vi.mock('../../../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Language Switcher</div>,
}))

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:appName': 'Mirubato',
        'common:tagline': 'Improve your sight-reading skills',
        'common:navigation.logbook': 'Logbook',
        'auth:signIn': 'Sign in',
        'auth:signOut': 'Sign out',
        'logbook:openLogbook': 'Get Started',
        'logbook:continueToLogbook': 'Go to Logbook',
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

describe('HomePage', () => {
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()

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

  it('should render the home page with key elements', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Mirubato')).toBeInTheDocument()
    expect(
      screen.getByText('Improve your sight-reading skills')
    ).toBeInTheDocument()

    // Wait for lazy-loaded piano component
    await waitFor(() => {
      expect(screen.getByTestId('interactive-piano')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated state', () => {
    it('should show get started button', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      expect(screen.getByText(/Get Started/)).toBeInTheDocument()
    })

    it('should link to logbook when get started clicked', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      const getStartedLink = screen.getByText(/Get Started/)
      expect(getStartedLink.closest('a')).toHaveAttribute('href', '/logbook')
    })

    it('should open login form when sign in clicked', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      expect(screen.getByTestId('google-signin')).toBeInTheDocument()
    })

    it('should handle email login', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))

      const emailInput = screen.getByPlaceholderText('Enter your email')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const submitButton = screen.getByText('Send Magic Link')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com')
      })

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      })
    })

    it('should handle login errors', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'))
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: 'Invalid email address',
      })

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))

      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })

    it('should close login form with cancel button', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))
      expect(screen.getByTestId('google-signin')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument()
    })

    it('should handle Google sign in success', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))
      fireEvent.click(screen.getByText('Sign in with Google'))

      expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument()
    })

    it('should handle Google sign in error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))
      fireEvent.click(screen.getByText('Trigger Error'))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Google Sign-In error:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should dismiss success message', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))

      const emailInput = screen.getByPlaceholderText('Enter your email')
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(screen.getByText('Send Magic Link'))

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Got it'))
      expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument()
    })
  })

  describe('Authenticated state', () => {
    beforeEach(() => {
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: null,
      })
    })

    it('should show user initials and sign out button', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      // Should show "T" for test@example.com (single part email)
      expect(screen.getByText('T')).toBeInTheDocument()
      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    it('should show go to logbook button instead of get started', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      expect(screen.getByText(/Go to Logbook/)).toBeInTheDocument()
      expect(screen.queryByText(/Get Started/)).not.toBeInTheDocument()
    })

    it('should handle logout', async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      const signOutButton = screen.getByText('Sign out')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
      })
    })

    it('should disable logout button when loading', () => {
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: true,
        error: null,
      })

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      const signOutButton = screen.getByText('Sign out')
      expect(signOutButton).toBeDisabled()
    })

    it('should display user initials when authenticated', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      // Should show user initials "T" for test@example.com (single part email)
      const userInitials = screen.getByText('T')
      expect(userInitials).toBeInTheDocument()
    })

    it('should navigate to logbook when button clicked', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      const logbookButton = screen.getByText(/Go to Logbook/)
      expect(logbookButton.closest('a')).toHaveAttribute('href', '/logbook')
    })

    it('should show correct initials for different email formats', () => {
      // Test john.doe@example.com -> JD
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { ...mockUser, email: 'john.doe@example.com' },
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: null,
      })

      const { rerender } = render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )
      expect(screen.getByText('JD')).toBeInTheDocument()

      // Test admin@example.com -> A
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { ...mockUser, email: 'admin@example.com' },
        isAuthenticated: true,
        login: mockLogin,
        logout: mockLogout,
        isLoading: false,
        error: null,
      })

      rerender(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )
      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  describe('Loading states', () => {
    it('should show loading state on login button', () => {
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        isAuthenticated: false,
        login: mockLogin,
        logout: mockLogout,
        isLoading: true,
        error: null,
      })

      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('Sign in'))

      const submitButton = screen.getByText('Loading...')
      expect(submitButton).toBeDisabled()
    })
  })

  it('should have proper background styling', () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const backgroundDiv = container.querySelector('[style*="background-image"]')
    expect(backgroundDiv).toHaveStyle({
      backgroundImage: 'url(/mirubato-cover.jpeg)',
    })
  })

  it('should render overlay for text readability', () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const overlay = container.querySelector('.bg-gradient-to-b')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveClass(
      'from-black/20',
      'via-transparent',
      'to-black/30'
    )
  })
})
