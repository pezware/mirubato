import { MockedResponse } from '@apollo/client/testing'
import { GET_CURRENT_USER } from '../../graphql/queries/user'

/**
 * Creates a mock that can be reused multiple times for GET_CURRENT_USER queries
 * This helps prevent "No more mocked responses" warnings in tests
 */
export const createInfiniteGetCurrentUserMock = (
  user: any = null
): MockedResponse => ({
  request: {
    query: GET_CURRENT_USER,
  },
  result: {
    data: {
      me: user,
    },
  },
  // This allows the mock to be used multiple times
  newData: () => ({
    data: {
      me: user,
    },
  }),
})

/**
 * Adds a default GET_CURRENT_USER mock to the provided mocks array
 * This prevents warnings when components make unexpected queries
 */
export const withDefaultUserMock = (
  mocks: MockedResponse[],
  defaultUser: any = null
): MockedResponse[] => {
  // Check if there's already a GET_CURRENT_USER mock
  const hasUserMock = mocks.some(
    mock => mock.request.query === GET_CURRENT_USER
  )

  if (!hasUserMock) {
    return [...mocks, createInfiniteGetCurrentUserMock(defaultUser)]
  }

  return mocks
}
