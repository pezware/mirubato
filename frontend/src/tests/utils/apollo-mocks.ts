import { MockedResponse } from '@apollo/client/testing'
import { GET_CURRENT_USER } from '../../graphql/queries/user'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
  REQUEST_MAGIC_LINK,
} from '../../graphql/queries/auth'
import { Instrument, Theme, NotationSize, User } from '@mirubato/shared/types'

// Common user data for tests
export const mockAnonymousUser = {
  id: 'anon-test-123',
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

export const mockAuthenticatedUser = {
  id: 'user-test-456',
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
    totalPracticeTime: 100,
    consecutiveDays: 5,
    piecesCompleted: 10,
    accuracyAverage: 85,
  },
}

// Factory functions for creating mocks
export const createGetCurrentUserMock = (
  user: User | null = null,
  options: { delay?: number; error?: Error } = {}
): MockedResponse => {
  const base = {
    request: {
      query: GET_CURRENT_USER,
    },
  }

  if (options.error) {
    return {
      ...base,
      error: options.error,
      delay: options.delay,
    }
  }

  return {
    ...base,
    result: {
      data: {
        me: user,
      },
    },
    delay: options.delay,
    // Allow reuse
    newData: () => ({
      data: {
        me: user,
      },
    }),
  }
}

export const createVerifyMagicLinkMock = (
  token: string,
  response: {
    accessToken: string
    refreshToken: string
    user: User
  },
  options: { delay?: number; error?: Error } = {}
): MockedResponse => {
  const base = {
    request: {
      query: VERIFY_MAGIC_LINK,
      variables: { token },
    },
  }

  if (options.error) {
    return {
      ...base,
      error: options.error,
      delay: options.delay,
    }
  }

  return {
    ...base,
    result: {
      data: {
        verifyMagicLink: response,
      },
    },
    delay: options.delay,
  }
}

export const createRequestMagicLinkMock = (
  email: string,
  success = true,
  options: { delay?: number; error?: Error } = {}
): MockedResponse => {
  const base = {
    request: {
      query: REQUEST_MAGIC_LINK,
      variables: { email },
    },
  }

  if (options.error) {
    return {
      ...base,
      error: options.error,
      delay: options.delay,
    }
  }

  return {
    ...base,
    result: {
      data: {
        requestMagicLink: {
          success,
          message: success
            ? 'Magic link sent successfully'
            : 'Failed to send magic link',
        },
      },
    },
    delay: options.delay,
  }
}

export const createRefreshTokenMock = (
  refreshToken: string,
  response: {
    accessToken: string
    refreshToken: string
  },
  options: { delay?: number; error?: Error } = {}
): MockedResponse => {
  const base = {
    request: {
      query: REFRESH_TOKEN,
      variables: { refreshToken },
    },
  }

  if (options.error) {
    return {
      ...base,
      error: options.error,
      delay: options.delay,
    }
  }

  return {
    ...base,
    result: {
      data: {
        refreshToken: response,
      },
    },
    delay: options.delay,
  }
}

export const createLogoutMock = (
  success = true,
  options: { delay?: number; error?: Error } = {}
): MockedResponse => {
  const base = {
    request: {
      query: LOGOUT,
    },
  }

  if (options.error) {
    return {
      ...base,
      error: options.error,
      delay: options.delay,
    }
  }

  return {
    ...base,
    result: {
      data: {
        logout: success,
      },
    },
    delay: options.delay,
  }
}

// Pre-configured mock sets for common scenarios
export const defaultAuthMocks: MockedResponse[] = [
  createGetCurrentUserMock(null), // Not logged in by default
]

export const anonymousUserMocks: MockedResponse[] = [
  createGetCurrentUserMock(null),
]

export const authenticatedUserMocks: MockedResponse[] = [
  createGetCurrentUserMock(mockAuthenticatedUser),
]

// Mock set for full auth flow testing
export const authFlowMocks: MockedResponse[] = [
  createGetCurrentUserMock(null),
  createRequestMagicLinkMock('test@example.com'),
  createVerifyMagicLinkMock('test-token', {
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
    user: mockAuthenticatedUser,
  }),
  createGetCurrentUserMock(mockAuthenticatedUser),
  createLogoutMock(),
]
