import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import AuthVerifyPage from '../../../pages/AuthVerify'
import { useAuthStore } from '../../../stores/authStore'

// Mock the auth store
vi.mock('../../../stores/authStore')

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('AuthVerifyPage', () => {
  const mockVerifyMagicLink = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      verifyMagicLink: mockVerifyMagicLink,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  const renderWithRouter = (initialEntries: string[] = ['/auth/verify']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/logbook" element={<div>Logbook Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('should render loading state initially', async () => {
    // Mock to delay the verification to see loading state
    mockVerifyMagicLink.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    await act(async () => {
      renderWithRouter(['/auth/verify?token=valid-token'])
    })

    expect(screen.getByText('Verifying your magic link...')).toBeInTheDocument()
    expect(
      screen.getByText('Please wait while we sign you in.')
    ).toBeInTheDocument()

    // Check for spinner by class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('border-b-2', 'border-blue-600')
  })

  it('should show error when no token is provided', async () => {
    await act(async () => {
      renderWithRouter(['/auth/verify'])
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
      expect(
        screen.getByText('No verification token provided')
      ).toBeInTheDocument()
    })

    expect(mockVerifyMagicLink).not.toHaveBeenCalled()
  })

  it('should verify token and redirect on success', async () => {
    mockVerifyMagicLink.mockResolvedValue(undefined)

    await act(async () => {
      renderWithRouter(['/auth/verify?token=valid-token'])
    })

    // Should call verify with the token
    await waitFor(() => {
      expect(mockVerifyMagicLink).toHaveBeenCalledWith('valid-token')
    })

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Successfully Signed In!')).toBeInTheDocument()
      expect(
        screen.getByText('Redirecting you to your logbook...')
      ).toBeInTheDocument()
    })

    // Check for success icon by SVG
    const successIcon = document.querySelector('.text-green-500 svg')
    expect(successIcon).toBeInTheDocument()

    // Should redirect after 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/logbook')
    })
  })

  it('should show error message on verification failure', async () => {
    const error = new Error('Invalid token') as Error & {
      response?: { data?: { error?: string } }
    }
    error.response = { data: { error: 'Token has expired' } }
    mockVerifyMagicLink.mockRejectedValue(error)

    await act(async () => {
      renderWithRouter(['/auth/verify?token=expired-token'])
    })

    await waitFor(() => {
      expect(mockVerifyMagicLink).toHaveBeenCalledWith('expired-token')
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
      expect(screen.getByText('Token has expired')).toBeInTheDocument()
    })

    // Check for error icon by SVG
    const errorIcon = document.querySelector('.text-red-500 svg')
    expect(errorIcon).toBeInTheDocument()

    // Should not redirect on error
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should show generic error message when no specific error provided', async () => {
    mockVerifyMagicLink.mockRejectedValue(new Error('Network error'))

    await act(async () => {
      renderWithRouter(['/auth/verify?token=bad-token'])
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
      expect(
        screen.getByText('Failed to verify magic link')
      ).toBeInTheDocument()
    })
  })

  it('should navigate back to home when button is clicked after error', async () => {
    mockVerifyMagicLink.mockRejectedValue(new Error('Invalid token'))

    await act(async () => {
      renderWithRouter(['/auth/verify?token=bad-token'])
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: 'Back to Home' })
    await userEvent.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('should only verify once even if effect runs multiple times', async () => {
    mockVerifyMagicLink.mockResolvedValue(undefined)

    let rerenderFn: ReturnType<typeof render>['rerender']
    await act(async () => {
      const { rerender } = renderWithRouter(['/auth/verify?token=valid-token'])
      rerenderFn = rerender
    })

    await waitFor(() => {
      expect(mockVerifyMagicLink).toHaveBeenCalledTimes(1)
    })

    // Force re-render
    await act(async () => {
      rerenderFn(
        <MemoryRouter initialEntries={['/auth/verify?token=valid-token']}>
          <Routes>
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
          </Routes>
        </MemoryRouter>
      )
    })

    // Should not call verify again
    expect(mockVerifyMagicLink).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple token values in URL', async () => {
    mockVerifyMagicLink.mockResolvedValue(undefined)

    // Multiple tokens in URL - should use the first one
    await act(async () => {
      renderWithRouter(['/auth/verify?token=first-token&token=second-token'])
    })

    await waitFor(() => {
      expect(mockVerifyMagicLink).toHaveBeenCalledWith('first-token')
    })
  })

  it('should have proper accessibility attributes', async () => {
    // Mock to delay the verification to see loading state
    mockVerifyMagicLink.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    await act(async () => {
      renderWithRouter(['/auth/verify?token=valid-token'])
    })

    // Check that spinner exists
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()

    // Check proper heading structure
    expect(
      screen.getByRole('heading', { name: 'Verifying your magic link...' })
    ).toBeInTheDocument()
  })

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network error') as Error & {
      response?: { data?: { error?: string } }
    }
    // No response property for network errors
    mockVerifyMagicLink.mockRejectedValue(networkError)

    await act(async () => {
      renderWithRouter(['/auth/verify?token=network-fail'])
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
      expect(
        screen.getByText('Failed to verify magic link')
      ).toBeInTheDocument()
    })
  })

  it('should clean up timeout on unmount', async () => {
    mockVerifyMagicLink.mockResolvedValue(undefined)

    let unmountFn: ReturnType<typeof render>['unmount']
    await act(async () => {
      const { unmount } = renderWithRouter(['/auth/verify?token=valid-token'])
      unmountFn = unmount
    })

    await waitFor(() => {
      expect(screen.getByText('Successfully Signed In!')).toBeInTheDocument()
    })

    // Unmount before redirect timeout completes
    await act(async () => {
      unmountFn()
    })

    // Since we unmounted before the redirect timeout, navigate should not be called
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should handle empty token parameter', async () => {
    await act(async () => {
      renderWithRouter(['/auth/verify?token='])
    })

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument()
      expect(
        screen.getByText('No verification token provided')
      ).toBeInTheDocument()
    })

    expect(mockVerifyMagicLink).not.toHaveBeenCalled()
  })

  it('should properly display all UI states', async () => {
    mockVerifyMagicLink.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    await act(async () => {
      renderWithRouter(['/auth/verify?token=slow-token'])
    })

    // Loading state
    expect(screen.getByText('Verifying your magic link...')).toBeInTheDocument()

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Successfully Signed In!')).toBeInTheDocument()
    })

    // All states should have proper styling
    const container = screen.getByText('Successfully Signed In!').closest('div')
    expect(container).toHaveClass('bg-white', 'dark:bg-gray-800')
  })
})
