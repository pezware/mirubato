import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthContext } from '../contexts/ImprovedAuthContext'

interface MockUser {
  id: string
  email: string | null
  displayName: string | null
  primaryInstrument: 'PIANO' | 'GUITAR'
  isAnonymous: boolean
}

interface MockAuthContext {
  user: MockUser | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: jest.Mock
  logout: jest.Mock
  clearError: jest.Mock
  refreshAuth: jest.Mock
  isAnonymous?: boolean
  syncToCloud?: jest.Mock
  localUserData?: any
  syncState: {
    status: 'idle' | 'syncing' | 'error' | 'offline'
    lastSync: number | null
    pendingOperations: number
    error: { code: string; message: string } | null
  }
  clearSyncError: jest.Mock
  updateSyncState: jest.Mock
}

// Mock the AuthContext value
const createMockAuthContext = (
  overrides: Partial<MockAuthContext> = {}
): MockAuthContext => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  clearError: jest.fn(),
  refreshAuth: jest.fn(),
  syncState: {
    status: 'idle',
    lastSync: null,
    pendingOperations: 0,
    error: null,
  },
  clearSyncError: jest.fn(),
  updateSyncState: jest.fn(),
  ...overrides,
})

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    const authValue = createMockAuthContext({ isAuthenticated: true })

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    const authValue = createMockAuthContext({ isAuthenticated: false })

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to custom path when specified', () => {
    const authValue = createMockAuthContext({ isAuthenticated: false })

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute redirectTo="/custom-login">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/custom-login" element={<div>Custom Login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Custom Login')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading state when authentication is being checked', () => {
    const authValue = createMockAuthContext({ loading: true })

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    // Check for loading spinner
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('preserves location state when redirecting', () => {
    const authValue = createMockAuthContext({ isAuthenticated: false })
    let capturedLocation: ReturnType<typeof useLocation> | undefined

    const LoginCapture = () => {
      const location = useLocation()
      capturedLocation = location
      return <div>Login Page</div>
    }

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected/resource']}>
          <Routes>
            <Route
              path="/protected/resource"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginCapture />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(capturedLocation?.state?.from?.pathname).toBe('/protected/resource')
  })

  it('renders based on authentication status', () => {
    // Test unauthenticated state
    const unauthValue = createMockAuthContext({ isAuthenticated: false })
    const { unmount } = render(
      <AuthContext.Provider value={unauthValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()

    unmount()

    // Test authenticated state in a new render
    const authValue = createMockAuthContext({ isAuthenticated: true })
    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('handles multiple nested protected routes', () => {
    const authValue = createMockAuthContext({ isAuthenticated: true })

    render(
      <AuthContext.Provider value={authValue as any}>
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route
                      path="dashboard"
                      element={<div>Dashboard Content</div>}
                    />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })
})
