import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'
import { SaveProgressPrompt } from './SaveProgressPrompt'
import { useAuth } from '../hooks/useAuth'

// Mock dependencies
jest.mock('../hooks/useAuth')
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>

describe('SaveProgressPrompt', () => {
  const mockNavigate = jest.fn()

  const createMockAuth = (overrides: any): ReturnType<typeof useAuth> => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    isAnonymous: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearError: jest.fn(),
    syncToCloud: jest.fn(),
    localUserData: null,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseNavigate.mockReturnValue(mockNavigate)

    // Clear sessionStorage
    sessionStorage.clear()
  })

  it('does not show when user is authenticated', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: false,
        isAuthenticated: true,
        localUserData: null,
      })
    )

    const { container } = render(<SaveProgressPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('does not show when user has not met practice time threshold', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 600, // 10 minutes
          },
        },
      })
    )

    const { container } = render(
      <SaveProgressPrompt triggerAfterMinutes={30} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows prompt when anonymous user meets practice time threshold', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400, // 40 minutes
          },
        },
      })
    )

    render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    expect(screen.getByText('Save Your Progress')).toBeInTheDocument()
    expect(
      screen.getByText(/You've been practicing as a guest/)
    ).toBeInTheDocument()
  })

  it('navigates to login when save to cloud is clicked', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400,
          },
        },
      })
    )

    render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    const saveButton = screen.getByText('Save to Cloud')
    fireEvent.click(saveButton)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('dismisses prompt when maybe later is clicked', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400,
          },
        },
      })
    )

    render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    const dismissButton = screen.getByText('Maybe Later')
    fireEvent.click(dismissButton)

    expect(screen.queryByText('Save Your Progress')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('mirubato_save_prompt_dismissed')).toBe(
      'true'
    )
  })

  it('dismisses prompt when close button is clicked', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400,
          },
        },
      })
    )

    render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)

    expect(screen.queryByText('Save Your Progress')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('mirubato_save_prompt_dismissed')).toBe(
      'true'
    )
  })

  it('does not show if previously dismissed in session', () => {
    // Set the sessionStorage before rendering
    sessionStorage.setItem('mirubato_save_prompt_dismissed', 'true')

    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400,
          },
        },
      })
    )

    const { container } = render(
      <SaveProgressPrompt triggerAfterMinutes={30} />
    )

    // The component should not render anything because dismissed is true
    expect(container.firstChild).toBeNull()
  })

  it('does not show when localUserData is null', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: null,
      })
    )

    const { container } = render(
      <SaveProgressPrompt triggerAfterMinutes={30} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('uses custom trigger time when provided', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 300, // 5 minutes
          },
        },
      })
    )

    // Should not show with default 30 minutes
    const { rerender } = render(<SaveProgressPrompt />)
    expect(screen.queryByText('Save Your Progress')).not.toBeInTheDocument()

    // Should show with 5 minute trigger
    rerender(<SaveProgressPrompt triggerAfterMinutes={5} />)
    expect(screen.getByText('Save Your Progress')).toBeInTheDocument()
  })

  it('updates when practice time changes', async () => {
    const { rerender } = render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    // Initially below threshold
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 1200, // 20 minutes
          },
        },
      })
    )

    rerender(<SaveProgressPrompt triggerAfterMinutes={30} />)
    expect(screen.queryByText('Save Your Progress')).not.toBeInTheDocument()

    // Update to above threshold
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400, // 40 minutes
          },
        },
      })
    )

    rerender(<SaveProgressPrompt triggerAfterMinutes={30} />)
    await waitFor(() => {
      expect(screen.getByText('Save Your Progress')).toBeInTheDocument()
    })
  })

  it('has correct styling and icons', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAnonymous: true,
        localUserData: {
          stats: {
            totalPracticeTime: 2400,
          },
        },
      })
    )

    render(<SaveProgressPrompt triggerAfterMinutes={30} />)

    // Check for slide-up animation
    const prompt = screen.getByText('Save Your Progress').closest('div.fixed')
    expect(prompt).toHaveClass('animate-slide-up')

    // Check for warning icon
    const warningIcon = prompt?.querySelector('svg.text-amber-500')
    expect(warningIcon).toBeInTheDocument()

    // Check for close icon
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const closeIcon = closeButton.querySelector('svg')
    expect(closeIcon).toBeInTheDocument()
  })
})
