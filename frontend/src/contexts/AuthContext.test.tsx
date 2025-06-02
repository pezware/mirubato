import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { useNavigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './AuthContext'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
} from '../graphql/queries/auth'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import {
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated as checkIsAuthenticated,
} from '../lib/apollo/client'
import { localStorageService } from '../services/localStorage'

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}))

jest.mock('../lib/apollo/client', () => ({
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
  isAuthenticated: jest.fn(),
}))

jest.mock('../services/localStorage', () => ({
  localStorageService: {
    getUserData: jest.fn(),
    createAnonymousUser: jest.fn(),
    migrateToAuthenticatedUser: jest.fn(),
    getPendingSyncData: jest.fn(),
    markAsSynced: jest.fn(),
  },
}))

// Test component to consume context
const TestComponent: React.FC = () => {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('AuthContext not provided')

  return (
    <div>
      <div data-testid="user-id">{context.user?.id || 'no-user'}</div>
      <div data-testid="is-authenticated">
        {String(context.isAuthenticated)}
      </div>
      <div data-testid="is-anonymous">{String(context.isAnonymous)}</div>
      <div data-testid="loading">{String(context.loading)}</div>
      <button onClick={() => context.login('test-token')}>Login</button>
      <button onClick={() => context.logout()}>Logout</button>
      <button onClick={() => context.refreshAuth()}>Refresh</button>
      <button onClick={() => context.syncToCloud()}>Sync</button>
    </div>
  )
}

describe('AuthContext', () => {
  const mockNavigate = jest.fn()
  const mockLocalStorage = localStorageService as jest.Mocked<
    typeof localStorageService
  >
  const mockCheckIsAuthenticated = checkIsAuthenticated as jest.MockedFunction<
    typeof checkIsAuthenticated
  >
  const mockSetAuthTokens = setAuthTokens as jest.MockedFunction<
    typeof setAuthTokens
  >
  const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<
    typeof clearAuthTokens
  >

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)
    mockCheckIsAuthenticated.mockReturnValue(false)
    console.error = jest.fn() // Suppress error logs in tests
  })

  const renderWithProvider = (mocks: any[] = []) => {
    return render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MockedProvider>
    )
  }

  describe('Initialization', () => {
    it('creates anonymous user when no user exists', async () => {
      const mockAnonymousUser = {
        id: 'anon-123',
        displayName: null,
        primaryInstrument: 'PIANO' as const,
        isAnonymous: true,
      }

      mockLocalStorage.getUserData.mockReturnValue(null)
      mockLocalStorage.createAnonymousUser.mockReturnValue(mockAnonymousUser)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(mockLocalStorage.createAnonymousUser).toHaveBeenCalled()
      expect(screen.getByTestId('user-id')).toHaveTextContent('anon-123')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })

    it('loads existing anonymous user', async () => {
      const mockAnonymousUser = {
        id: 'anon-existing',
        displayName: 'Guest User',
        primaryInstrument: 'GUITAR' as const,
        isAnonymous: true,
      }

      mockLocalStorage.getUserData.mockReturnValue(mockAnonymousUser)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(mockLocalStorage.createAnonymousUser).not.toHaveBeenCalled()
      expect(screen.getByTestId('user-id')).toHaveTextContent('anon-existing')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
    })

    it('loads authenticated user on mount', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO',
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      })

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('false')
    })

    it('handles failed user fetch and clears tokens', async () => {
      mockCheckIsAuthenticated.mockReturnValue(true)

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          error: new Error('Network error'),
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      expect(mockClearAuthTokens).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch current user:',
        expect.any(Error)
      )
    })
  })

  describe('Login', () => {
    it('successfully logs in and migrates anonymous user data', async () => {
      const mockAnonymousUser = {
        id: 'anon-123',
        displayName: null,
        primaryInstrument: 'PIANO' as const,
        isAnonymous: true,
      }

      const mockAuthenticatedUser = {
        id: 'user-456',
        email: 'new@example.com',
        displayName: 'New User',
        primaryInstrument: 'PIANO',
      }

      mockLocalStorage.getUserData
        .mockReturnValueOnce(mockAnonymousUser) // Initial load
        .mockReturnValueOnce(mockAnonymousUser) // During login check
        .mockReturnValueOnce({
          ...mockAuthenticatedUser,
          isAnonymous: false,
        }) // After migration

      const mocks = [
        {
          request: {
            query: VERIFY_MAGIC_LINK,
            variables: { token: 'test-token' },
          },
          result: {
            data: {
              verifyMagicLink: {
                accessToken: 'access-123',
                refreshToken: 'refresh-123',
                user: mockAuthenticatedUser,
              },
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Click login button
      await act(async () => {
        screen.getByText('Login').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-456')
      })

      expect(mockSetAuthTokens).toHaveBeenCalledWith(
        'access-123',
        'refresh-123'
      )
      expect(mockLocalStorage.migrateToAuthenticatedUser).toHaveBeenCalledWith(
        'user-456',
        'new@example.com'
      )
      expect(mockNavigate).toHaveBeenCalledWith('/practice')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('false')
    })

    it('handles login errors gracefully', async () => {
      const mocks = [
        {
          request: {
            query: VERIFY_MAGIC_LINK,
            variables: { token: 'test-token' },
          },
          error: new Error('Invalid token'),
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Click login button
      await act(async () => {
        try {
          await screen.getByText('Login').click()
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Login failed:',
          expect.any(Error)
        )
      })

      expect(mockSetAuthTokens).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalledWith('/practice')
    })
  })

  describe('Logout', () => {
    it('logs out authenticated user and creates anonymous user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      }

      const mockNewAnonymousUser = {
        id: 'anon-new',
        displayName: null,
        primaryInstrument: 'PIANO' as const,
        isAnonymous: true,
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue(mockUser)
      mockLocalStorage.createAnonymousUser.mockReturnValue(mockNewAnonymousUser)

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
        {
          request: {
            query: LOGOUT,
          },
          result: {
            data: {
              logout: true,
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      })

      // Click logout button
      await act(async () => {
        screen.getByText('Logout').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('anon-new')
      })

      expect(mockClearAuthTokens).toHaveBeenCalled()
      expect(mockLocalStorage.createAnonymousUser).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })

    it('handles logout errors but still clears auth', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      }

      const mockNewAnonymousUser = {
        id: 'anon-new',
        displayName: null,
        primaryInstrument: 'PIANO' as const,
        isAnonymous: true,
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue(mockUser)
      mockLocalStorage.createAnonymousUser.mockReturnValue(mockNewAnonymousUser)

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
        {
          request: {
            query: LOGOUT,
          },
          error: new Error('Logout failed'),
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      })

      // Click logout button
      await act(async () => {
        screen.getByText('Logout').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('anon-new')
      })

      expect(console.error).toHaveBeenCalledWith(
        'Logout error:',
        expect.any(Error)
      )
      expect(mockClearAuthTokens).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Token Refresh', () => {
    it('successfully refreshes tokens', async () => {
      // Mock localStorage for refresh token
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue('old-refresh-token'),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })

      const mocks = [
        {
          request: {
            query: REFRESH_TOKEN,
            variables: { refreshToken: 'old-refresh-token' },
          },
          result: {
            data: {
              refreshToken: {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
              },
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Click refresh button
      await act(async () => {
        screen.getByText('Refresh').click()
      })

      await waitFor(() => {
        expect(mockSetAuthTokens).toHaveBeenCalledWith(
          'new-access-token',
          'new-refresh-token'
        )
      })
    })

    it('handles refresh token errors', async () => {
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue('old-refresh-token'),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })

      const mocks = [
        {
          request: {
            query: REFRESH_TOKEN,
            variables: { refreshToken: 'old-refresh-token' },
          },
          error: new Error('Token expired'),
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Click refresh button
      await act(async () => {
        try {
          await screen.getByText('Refresh').click()
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Token refresh failed:',
          expect.any(Error)
        )
      })

      expect(mockClearAuthTokens).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('throws error when no refresh token available', async () => {
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue(null),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Click refresh button
      await act(async () => {
        try {
          await screen.getByText('Refresh').click()
        } catch (error) {
          expect(error).toEqual(new Error('No refresh token available'))
        }
      })
    })
  })

  describe('Cloud Sync', () => {
    it('redirects anonymous users to login', async () => {
      const mockAnonymousUser = {
        id: 'anon-123',
        displayName: null,
        primaryInstrument: 'PIANO' as const,
        isAnonymous: true,
      }

      mockLocalStorage.getUserData.mockReturnValue(mockAnonymousUser)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
      })

      // Click sync button
      await act(async () => {
        screen.getByText('Sync').click()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/login')
      expect(mockLocalStorage.getPendingSyncData).not.toHaveBeenCalled()
    })

    it('syncs data for authenticated users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      }

      const mockPendingData = {
        sessions: [{ id: 'session-1' }, { id: 'session-2' }],
        logs: [{ id: 'log-1' }, { id: 'log-2' }],
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue(mockUser)
      mockLocalStorage.getPendingSyncData.mockReturnValue(mockPendingData)

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Click sync button
      await act(async () => {
        screen.getByText('Sync').click()
      })

      await waitFor(() => {
        expect(mockLocalStorage.getPendingSyncData).toHaveBeenCalled()
      })

      expect(mockLocalStorage.markAsSynced).toHaveBeenCalledWith(
        ['session-1', 'session-2'],
        ['log-1', 'log-2']
      )
    })

    it('handles sync errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue(mockUser)
      mockLocalStorage.getPendingSyncData.mockImplementation(() => {
        throw new Error('Sync data error')
      })

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Click sync button
      await act(async () => {
        try {
          await screen.getByText('Sync').click()
        } catch (error) {
          // Expected to throw
        }
      })

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Sync failed:',
          expect.any(Error)
        )
      })
    })
  })

  describe('Context Value', () => {
    it('provides correct context values', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO' as const,
        isAnonymous: false,
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue(mockUser)

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // All context values are accessible through our test component
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('false')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')

      // Functions are callable
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
      expect(screen.getByText('Sync')).toBeInTheDocument()
    })
  })
})
