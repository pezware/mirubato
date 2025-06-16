import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { endpoints } from '@/config/endpoints'

// Create HTTP link
const httpLink = createHttpLink({
  uri: endpoints.graphql,
  credentials: 'include', // Include cookies in requests
})

// Create auth link to add operation name for CSRF protection
const authLink = setContext((_, { headers, operationName }) => {
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      // Add Apollo operation name to prevent CSRF issues
      'x-apollo-operation-name': operationName || '',
    },
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ extensions }) => {
      // GraphQL error: Extensions logged internally

      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login (cookies will be cleared server-side)
        window.location.href = '/login'
      }
    })
  }

  if (networkError) {
    // Network error occurred

    // Handle network errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Authentication failed, redirect to login
      window.location.href = '/login'
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

// Helper function to set auth tokens (deprecated - using cookies now)
export const setAuthTokens = (
  _authToken: string,
  _refreshToken: string,
  _expiresIn?: number
) => {
  // No-op - tokens are now managed via HTTP-only cookies
  console.warn(
    'setAuthTokens is deprecated - authentication is now handled via HTTP-only cookies'
  )
}

// Helper function to clear auth tokens (deprecated - using cookies now)
export const clearAuthTokens = () => {
  // Reset Apollo Client store
  apolloClient.resetStore()
}

// Helper function to check if user is authenticated
// Note: This can't reliably check HTTP-only cookies, so it should be
// replaced with a server query or removed in favor of auth context
export const isAuthenticated = (): boolean => {
  // This is now unreliable since we use HTTP-only cookies
  // The auth context should be used instead
  return false
}
