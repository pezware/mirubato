import { render, screen, fireEvent } from '@testing-library/react'
import { UserStatusIndicator } from './UserStatusIndicator'
import { useAuth } from '../hooks/useAuth'

// Mock dependencies
jest.mock('../hooks/useAuth')
jest.mock('./AuthModal', () => ({
  AuthModal: jest.fn(({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('UserStatusIndicator', () => {
  const mockSyncToCloud = jest.fn()

  const createMockAuth = (overrides: any): ReturnType<typeof useAuth> => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    isAnonymous: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearError: jest.fn(),
    syncToCloud: mockSyncToCloud,
    localUserData: null,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when no user', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: null,
        isAnonymous: false,
      })
    )

    const { container } = render(<UserStatusIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('displays guest mode for anonymous users', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'anon-123', email: null },
        isAnonymous: true,
      })
    )

    render(<UserStatusIndicator />)

    expect(screen.getByText('Guest Mode')).toBeInTheDocument()
    // Note: "Save Progress to Cloud" only shows in production environment

    // Check for pulsing indicator
    const indicator = screen.getByText('Guest Mode').previousElementSibling
    expect(indicator).toHaveClass('bg-amber-500', 'animate-pulse')
  })

  it('displays email for authenticated users', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'user-123', email: 'test@example.com' },
        isAnonymous: false,
        isAuthenticated: true,
      })
    )

    render(<UserStatusIndicator />)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Guest Mode')).not.toBeInTheDocument()

    // Check for green indicator
    const indicator =
      screen.getByText('test@example.com').previousElementSibling
    expect(indicator).toHaveClass('bg-emerald-500')
    expect(indicator).not.toHaveClass('animate-pulse')
  })

  it('shows sync button for authenticated users', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'user-123', email: 'test@example.com' },
        isAnonymous: false,
        isAuthenticated: true,
      })
    )

    render(<UserStatusIndicator />)

    const syncButton = screen.getByTitle('Sync to cloud')
    expect(syncButton).toBeInTheDocument()

    // Check for SVG icon
    const svg = syncButton.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('calls syncToCloud when sync button is clicked', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'user-123', email: 'test@example.com' },
        isAnonymous: false,
        isAuthenticated: true,
      })
    )

    render(<UserStatusIndicator />)

    const syncButton = screen.getByTitle('Sync to cloud')
    fireEvent.click(syncButton)

    expect(mockSyncToCloud).toHaveBeenCalledTimes(1)
  })

  it('does not show save to cloud button in development', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'anon-123', email: null },
        isAnonymous: true,
      })
    )

    render(<UserStatusIndicator />)

    expect(screen.getByText('Guest Mode')).toBeInTheDocument()
    expect(screen.queryByText('Save Progress to Cloud')).not.toBeInTheDocument()
  })
})
