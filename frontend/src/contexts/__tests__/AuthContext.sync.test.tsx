import React, { useContext } from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, AuthContext } from '../ImprovedAuthContext'
import { SYNC_ANONYMOUS_DATA } from '../../graphql/queries/practice'
import { localStorageService } from '../../services/localStorage'
import { ModulesProvider } from '../ModulesContext'

// Mock localStorage service
jest.mock('../../services/localStorage')

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}))

describe('AuthContext - syncToCloud type safety', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it.skip('should not include undefined values in sync mutation input', async () => {
    // Mock user data
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      primaryInstrument: 'PIANO' as const,
      isAnonymous: false,
      hasCloudStorage: true,
    }

    // Mock pending sync data with some undefined fields
    const mockPendingData = {
      sessions: [
        {
          id: 'session-1',
          userId: 'user-123',
          instrument: 'PIANO' as const,
          sessionType: 'PRACTICE' as const,
          startedAt: '2024-01-01T10:00:00Z',
          completedAt: '2024-01-01T10:30:00Z',
          pausedDuration: 0,
          notesAttempted: 100,
          notesCorrect: 85,
          accuracyPercentage: 85,
          sheetMusicId: undefined, // This should be omitted
          isSynced: false,
        },
      ],
      logs: [
        {
          id: 'log-1',
          sessionId: 'session-1',
          timestamp: '2024-01-01T10:15:00Z',
          tempoPracticed: undefined, // This should be omitted
          notes: 'Good practice',
          synced: false,
        },
      ],
    }

    ;(localStorageService.getPendingSyncData as jest.Mock).mockReturnValue(
      mockPendingData
    )
    ;(localStorageService.getUserData as jest.Mock).mockReturnValue({
      id: mockUser.id,
      email: mockUser.email,
      isAnonymous: false,
      preferences: {
        theme: 'light',
        primaryInstrument: 'PIANO',
        notationSize: 'MEDIUM',
        soundEnabled: true,
        metronomeBPM: 120,
        autoSave: true,
      },
      stats: {
        totalPracticeTime: 0,
        sessionsCount: 0,
        longestStreak: 0,
        currentStreak: 0,
        lastPracticeDate: null,
      },
    })

    // Capture the mutation variables
    let capturedVariables: any = null

    // Create a custom mock that captures variables
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>
        <MockedProvider
          mocks={[
            {
              request: {
                query: SYNC_ANONYMOUS_DATA,
              },
              variableMatcher: (variables: any) => {
                capturedVariables = variables
                return true
              },
              result: {
                data: {
                  syncAnonymousData: {
                    success: true,
                    syncedSessions: 1,
                    syncedLogs: 1,
                    syncedEntries: 0,
                    syncedGoals: 0,
                    errors: [],
                  },
                },
              },
            },
          ]}
          addTypename={false}
        >
          <ModulesProvider>
            <AuthProvider>{children}</AuthProvider>
          </ModulesProvider>
        </MockedProvider>
      </BrowserRouter>
    )

    const { result } = renderHook(() => useContext(AuthContext), {
      wrapper: customWrapper,
    })

    // Set authenticated user
    await act(async () => {
      localStorage.setItem('mirubato_auth_user', JSON.stringify(mockUser))
    })

    // Call syncToCloud
    await act(async () => {
      await result.current?.syncToCloud()
    })

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(capturedVariables).toBeTruthy()
    })

    // Verify that undefined fields are NOT included in the mutation input
    const sessionInput = capturedVariables.input.sessions[0]
    expect(sessionInput).not.toHaveProperty('sheetMusicId')
    expect(sessionInput).toHaveProperty('accuracy', 85)
    expect(sessionInput).toHaveProperty('notes', 'Attempted: 100, Correct: 85')

    const logInput = capturedVariables.input.logs[0]
    expect(logInput).not.toHaveProperty('tempoPracticed')
    expect(logInput).toHaveProperty('notes', 'Good practice')

    // Verify localStorage was updated
    expect(localStorageService.markAsSynced).toHaveBeenCalledWith(
      ['session-1'],
      ['log-1']
    )
  })
})
