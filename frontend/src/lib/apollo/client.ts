import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { endpoints } from '@/config/endpoints'
import { tokenStorage } from '@/utils/secureStorage'

// Create HTTP link
const httpLink = createHttpLink({
  uri: endpoints.graphql,
  // Don't include credentials since we're using JWT in headers
})

// Create auth link to add JWT token to requests
const authLink = setContext((_, { headers, operationName }) => {
  // Get the authentication token from secure storage
  const token = tokenStorage.getAccessToken()

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      // Add Apollo operation name to prevent CSRF issues
      'x-apollo-operation-name': operationName || '',
    },
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )

      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear tokens and redirect to login
        tokenStorage.clearTokens()
        window.location.href = '/login'
      }
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)

    // Handle network errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Token might be expired, try to refresh
      const refreshToken = tokenStorage.getRefreshToken()
      if (refreshToken) {
        // TODO: Implement token refresh logic
        console.log('Token refresh needed')
      }
    }
  }
})

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: {
        keyFields: ['id'],
      },
      SheetMusic: {
        keyFields: ['id'],
      },
      PracticeSession: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

// Helper function to set auth tokens
export const setAuthTokens = (
  authToken: string,
  refreshToken: string,
  expiresIn?: number
) => {
  tokenStorage.setAccessToken(authToken, expiresIn)
  tokenStorage.setRefreshToken(refreshToken)
}

// Helper function to clear auth tokens
export const clearAuthTokens = () => {
  tokenStorage.clearTokens()
  // Reset Apollo Client store
  apolloClient.resetStore()
}

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!tokenStorage.getAccessToken()
}
