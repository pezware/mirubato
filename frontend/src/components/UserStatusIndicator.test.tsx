import { render, screen, fireEvent } from '@testing-library/react'
import { UserStatusIndicator } from './UserStatusIndicator'
import { useAuth } from '../hooks/useAuth'
import { AuthModal } from './AuthModal'

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
    expect(screen.getByText('Save Progress to Cloud')).toBeInTheDocument()

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

  it('opens auth modal when save progress is clicked', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'anon-123', email: null },
        isAnonymous: true,
      })
    )

    render(<UserStatusIndicator />)

    const saveButton = screen.getByText('Save Progress to Cloud')
    fireEvent.click(saveButton)

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it('closes auth modal when onClose is called', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'anon-123', email: null },
        isAnonymous: true,
      })
    )

    render(<UserStatusIndicator />)

    // Open modal
    const saveButton = screen.getByText('Save Progress to Cloud')
    fireEvent.click(saveButton)
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()

    // Close modal
    const closeButton = screen.getByText('Close Modal')
    fireEvent.click(closeButton)
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument()
  })

  it('passes correct props to AuthModal', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: { id: 'anon-123', email: null },
        isAnonymous: true,
      })
    )

    render(<UserStatusIndicator />)

    // Initially closed
    expect(AuthModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: false,
        onClose: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
      {}
    )

    // Open modal
    const saveButton = screen.getByText('Save Progress to Cloud')
    fireEvent.click(saveButton)

    // Now open
    expect(AuthModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
      {}
    )
  })
})
