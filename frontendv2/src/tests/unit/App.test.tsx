import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from '../../App'
import { useAuthStore } from '../../stores/authStore'

// Mock the stores
vi.mock('../../stores/authStore')

// Mock hooks
vi.mock('../../hooks', () => ({
  useSyncTriggers: vi.fn(() => ({
    lastSync: null,
    isSyncing: false,
    triggerSync: vi.fn(),
  })),
}))

// Mock utils
vi.mock('../../utils/migrations/lowercaseMigration', () => ({
  runLowercaseMigration: vi.fn(),
}))

vi.mock('../../utils/pdfWorkerSetup', () => ({
  setupPdfWorker: vi.fn(),
}))

vi.mock('../../modules/auto-logging', () => ({
  AutoLoggingProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

// Import pages for test components
import HomePage from '../../pages/Home'
import LogbookPage from '../../pages/Logbook'
import AuthVerifyPage from '../../pages/AuthVerify'

// Mock pages
vi.mock('../../pages/Home', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}))

vi.mock('../../pages/Logbook', () => ({
  default: () => <div data-testid="logbook-page">Logbook Page</div>,
}))

vi.mock('../../pages/AuthVerify', () => ({
  default: () => <div data-testid="auth-verify-page">Auth Verify Page</div>,
}))

// Mock ProtectedRoute to just render children
vi.mock('../../components/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('App', () => {
  const mockRefreshAuth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      refreshAuth: mockRefreshAuth,
      user: null,
      isAuthenticated: false,
      isAuthInitialized: true, // Set to true to avoid loading screen
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the app with router', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
  })

  it('should call initialization functions on mount', async () => {
    render(<App />)

    await waitFor(() => {
      expect(mockRefreshAuth).toHaveBeenCalledTimes(1)
    })
  })

  it('should render home page at root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('should render auth verify page at /auth/verify', () => {
    render(
      <MemoryRouter initialEntries={['/auth/verify']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('auth-verify-page')).toBeInTheDocument()
  })

  it('should render logbook page at /logbook', () => {
    render(
      <MemoryRouter initialEntries={['/logbook']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('logbook-page')).toBeInTheDocument()
  })

  it('should redirect unknown routes to home', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('should call initialization in correct order', async () => {
    const { runLowercaseMigration } = await import(
      '../../utils/migrations/lowercaseMigration'
    )

    const callOrder: string[] = []

    ;(runLowercaseMigration as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        callOrder.push('runLowercaseMigration')
      }
    )

    mockRefreshAuth.mockImplementation(() => {
      callOrder.push('refreshAuth')
    })

    render(<App />)

    await waitFor(() => {
      expect(callOrder).toEqual(['runLowercaseMigration', 'refreshAuth'])
    })
  })
})
