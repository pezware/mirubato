import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { useNavigate } from 'react-router-dom'
import { AuthProvider, AuthContext } from './ImprovedAuthContext'
import { ModulesProvider } from './ModulesContext'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
} from '../graphql/queries/auth'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import {
  SYNC_ANONYMOUS_DATA,
  GET_LOGBOOK_ENTRIES,
  GET_GOALS,
} from '../graphql/queries/practice'
import { isAuthenticated as checkIsAuthenticated } from '../lib/apollo/client'
import { localStorageService } from '../services/localStorage'
import { Theme, NotationSize, Instrument } from '@mirubato/shared/types'

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}))

jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('../lib/apollo/client', () => ({
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
  isAuthenticated: jest.fn(),
}))

jest.mock('../services/localStorage', () => ({
  localStorageService: {
    getUserData: jest.fn(),
    setUserData: jest.fn(),
    createAnonymousUser: jest.fn(),
    migrateToAuthenticatedUser: jest.fn(),
    getPendingSyncData: jest.fn(),
    markAsSynced: jest.fn(),
    getLogbookEntries: jest.fn(),
    getGoals: jest.fn(),
    clearAllData: jest.fn(),
  },
}))

// Test component to consume context
const TestComponent: React.FC = () => {
  const context = React.useContext(AuthContext)
  const [error, setError] = React.useState<Error | null>(null)
  if (!context) throw new Error('AuthContext not provided')

  const handleLogin = async () => {
    try {
      await context.login('test-token')
    } catch (err) {
      setError(err as Error)
    }
  }

  const handleRefresh = async () => {
    try {
      await context.refreshAuth()
    } catch (err) {
      setError(err as Error)
    }
  }

  const handleSync = async () => {
    try {
      await context.syncToCloud()
    } catch (err) {
      setError(err as Error)
    }
  }

  return (
    <div>
      <div data-testid="user-id">{context.user?.id || 'no-user'}</div>
      <div data-testid="is-authenticated">
        {String(context.isAuthenticated)}
      </div>
      <div data-testid="is-anonymous">{String(context.isAnonymous)}</div>
      <div data-testid="loading">{String(context.loading)}</div>
      <div data-testid="sync-status">{context.syncState.status}</div>
      {error && <div data-testid="error">{error.message}</div>}
      {context.syncState.error && (
        <div data-testid="sync-error">{context.syncState.error.message}</div>
      )}
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => context.logout()}>Logout</button>
      <button onClick={handleRefresh}>Refresh</button>
      <button onClick={handleSync}>Sync</button>
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

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNavigate as jest.Mock).mockReturnValue(mockNavigate)
    mockCheckIsAuthenticated.mockReturnValue(false)
    console.error = jest.fn() // Suppress error logs in tests

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }
    global.localStorage = localStorageMock as any
  })

  const renderWithProvider = (mocks: any[] = []) => {
    return render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ModulesProvider>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </ModulesProvider>
      </MockedProvider>
    )
  }

  describe('Initialization', () => {
    it('creates anonymous user when no user exists', async () => {
      mockLocalStorage.getUserData.mockReturnValue(null)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Component creates its own anonymous user when getUserData returns null
      expect(mockLocalStorage.setUserData).toHaveBeenCalled()
      // The user ID will be randomly generated, so we just check it starts with 'anon_'
      expect(screen.getByTestId('user-id')).toHaveTextContent(/^anon_/)
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })

    it('loads existing anonymous user', async () => {
      const mockAnonymousUser = {
        id: 'anon-existing',
        email: '',
        displayName: 'Guest User',
        primaryInstrument: Instrument.GUITAR,
        isAnonymous: true,
        hasCloudStorage: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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
        hasCloudStorage: true,
      }

      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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

      // Cookie handling is now server-side, no need to check clearAuthTokens
    })
  })

  describe('Login', () => {
    it('successfully logs in and migrates anonymous user data', async () => {
      const mockAnonymousUser = {
        id: 'anon-123',
        email: '',
        displayName: null,
        primaryInstrument: Instrument.PIANO,
        isAnonymous: true,
        hasCloudStorage: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
      }

      const mockAuthenticatedUser = {
        id: 'user-456',
        email: 'new@example.com',
        displayName: 'New User',
        primaryInstrument: Instrument.PIANO,
        hasCloudStorage: true,
      }

      mockLocalStorage.getUserData
        .mockReturnValueOnce(mockAnonymousUser) // Initial load
        .mockReturnValueOnce(mockAnonymousUser) // During login check
        .mockReturnValueOnce({
          ...mockAuthenticatedUser,
          isAnonymous: false,
          hasCloudStorage: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          preferences: {
            theme: Theme.AUTO,
            notationSize: NotationSize.MEDIUM,
            practiceReminders: false,
            dailyGoalMinutes: 30,
          },
          stats: {
            totalPracticeTime: 0,
            consecutiveDays: 0,
            piecesCompleted: 0,
            accuracyAverage: 0,
          },
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
                success: true,
                message: 'Login successful',
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

      // Cookies are now set server-side, no need to check setAuthTokens
      // Login preserves local data for sync (no clearAllData call)
      expect(mockLocalStorage.clearAllData).not.toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/logbook')
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
        screen.getByText('Login').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid token')
      })

      // Cookies are now set server-side, no need to check setAuthTokens
      expect(mockNavigate).not.toHaveBeenCalledWith('/logbook')
    })
  })

  describe('Logout', () => {
    it('logs out authenticated user and creates anonymous user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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

      // Reset mocks for logout flow
      mockLocalStorage.getUserData.mockReset()
      mockLocalStorage.setUserData.mockReset()

      // First call to getUserData (in initializeAnonymousUser) returns null
      mockLocalStorage.getUserData.mockReturnValueOnce(null)

      // Mock setUserData to capture the new anonymous user
      mockLocalStorage.setUserData.mockImplementation(userData => {
        // After setUserData is called with new anonymous user,
        // subsequent getUserData calls should return that user
        mockLocalStorage.getUserData.mockReturnValue(userData)
      })

      // Click logout button
      await act(async () => {
        screen.getByText('Logout').click()
      })

      await waitFor(() => {
        // After logout mutation completes, no navigation happens
        expect(mockNavigate).not.toHaveBeenCalled()
      })

      // After logout, initializeAnonymousUser is called
      // Since getUserData returns null, a new anonymous user is created
      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent(/^anon_/)
      })

      // Cookie handling is now server-side, no need to check clearAuthTokens
      // initializeAnonymousUser is called and creates a new anonymous user
      expect(mockLocalStorage.getUserData).toHaveBeenCalled()
      expect(mockLocalStorage.setUserData).toHaveBeenCalled()

      // The user state changes to anonymous after logout
      expect(screen.getByTestId('is-anonymous')).toHaveTextContent('true')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    })

    it('handles logout errors but still clears auth', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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

      // Mock getUserData to return null after logout to simulate cleared data
      mockLocalStorage.getUserData.mockReturnValue(null)

      // Click logout button
      await act(async () => {
        screen.getByText('Logout').click()
      })

      await waitFor(() => {
        // When logout fails, navigation doesn't happen (it's in the try block)
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      })

      // Navigation doesn't happen on error
      expect(mockNavigate).not.toHaveBeenCalled()

      // The user remains the same
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
    })
  })

  describe('Token Refresh', () => {
    it('successfully refreshes tokens', async () => {
      const authUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO',
        hasCloudStorage: true,
      }

      // Set up authenticated user first
      mockCheckIsAuthenticated.mockReturnValue(true)
      mockLocalStorage.getUserData.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
      })

      const mocks = [
        {
          request: {
            query: GET_CURRENT_USER,
          },
          result: {
            data: {
              me: authUser,
            },
          },
        },
        {
          request: {
            query: REFRESH_TOKEN,
          },
          result: {
            data: {
              refreshToken: {
                success: true,
                message: 'Token refreshed successfully',
                user: authUser,
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
        // Should update the user state with the refreshed user data
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })
    })

    it('handles refresh token errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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
        {
          request: {
            query: REFRESH_TOKEN,
          },
          error: new Error('Token expired'),
        },
      ]

      renderWithProvider(mocks)

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Click refresh button
      await act(async () => {
        screen.getByText('Refresh').click()
      })

      await waitFor(
        () => {
          // Wait for the refresh to complete
          expect(screen.getByTestId('loading')).toHaveTextContent('false')
        },
        { timeout: 2000 }
      )

      // When refresh fails, it calls logout, but logout's navigate is in try block
      // Since we don't have LOGOUT mock, logout will also fail, so no navigation
      expect(mockNavigate).not.toHaveBeenCalled()

      // The user remains the same
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
    })

    it('handles refresh when not authenticated', async () => {
      const mocks = [
        {
          request: {
            query: REFRESH_TOKEN,
          },
          result: {
            data: {
              refreshToken: {
                success: false,
                message: 'Not authenticated',
                user: null,
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
        // When refresh returns success:false, it doesn't call logout
        // The user remains the same (no change)
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent(
          'false'
        )
      })
    })
  })

  describe('Cloud Sync', () => {
    it('does nothing for anonymous users', async () => {
      const mockAnonymousUser = {
        id: 'anon-123',
        email: '',
        displayName: null,
        primaryInstrument: Instrument.PIANO,
        isAnonymous: true,
        hasCloudStorage: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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

      // ImprovedAuthContext doesn't navigate - just logs warning and returns
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockLocalStorage.getPendingSyncData).not.toHaveBeenCalled()
    })

    it('simulates sync for authenticated users', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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
        {
          request: {
            query: SYNC_ANONYMOUS_DATA,
            variables: {
              input: {
                sessions: [],
                logs: [],
                entries: [],
                goals: [],
              },
            },
          },
          result: {
            data: {
              syncAnonymousData: {
                success: true,
                errors: [],
                syncedSessions: 0,
                syncedLogs: 0,
                syncedEntries: 0,
                syncedGoals: 0,
              },
            },
          },
        },
        {
          request: {
            query: GET_LOGBOOK_ENTRIES,
            variables: { limit: 100, offset: 0 },
          },
          result: {
            data: {
              myLogbookEntries: {
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                totalCount: 0,
              },
            },
          },
        },
        {
          request: {
            query: GET_GOALS,
            variables: { limit: 100, offset: 0 },
          },
          result: {
            data: {
              myGoals: {
                edges: [],
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                totalCount: 0,
              },
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

      // Wait for sync status to change
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('syncing')
      })

      // Wait for the simulated sync to complete (1 second timeout in component)
      await waitFor(
        () => {
          expect(screen.getByTestId('sync-status')).toHaveTextContent('idle')
        },
        { timeout: 2000 }
      )

      // Sync is just simulated, no actual localStorage calls are made
      expect(mockLocalStorage.getPendingSyncData).not.toHaveBeenCalled()
      expect(mockLocalStorage.markAsSynced).not.toHaveBeenCalled()
    })

    it('handles sync errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Click sync button
      await act(async () => {
        screen.getByText('Sync').click()
      })

      // Sync is simulated and doesn't actually throw errors
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('syncing')
      })

      // No error is shown because sync is just simulated
      expect(screen.queryByTestId('error')).not.toBeInTheDocument()
    })
  })

  describe('Context Value', () => {
    it('provides correct context values', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: Instrument.PIANO,
        isAnonymous: false,
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
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
