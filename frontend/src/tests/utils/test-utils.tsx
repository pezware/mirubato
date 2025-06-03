import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { InMemoryCache } from '@apollo/client'
import { GET_CURRENT_USER } from '../../graphql/queries/user'

// Create a new cache instance for each test to avoid cross-test pollution
const createCache = () =>
  new InMemoryCache({
    addTypename: false,
  })

// Default mock that handles repeated queries
const createDefaultMocks = (): MockedResponse[] => [
  {
    request: {
      query: GET_CURRENT_USER,
    },
    result: {
      data: {
        me: null, // Default to no user
      },
    },
    // Allow this mock to be used multiple times
    newData: () => ({
      data: {
        me: null,
      },
    }),
  },
]

// Suppress Apollo warnings during tests
if (typeof jest !== 'undefined') {
  const originalWarn = console.warn
  global.console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('No more mocked responses') ||
        args[0].includes('Missing field'))
    ) {
      return
    }
    originalWarn(...args)
  }
}

// Add providers as needed (Context, Theme, etc.)
interface AllTheProvidersProps {
  children: React.ReactNode
  mocks?: MockedResponse[]
  cache?: InMemoryCache
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  mocks = [],
  cache,
}) => {
  // Create default mocks fresh for each test
  const defaultMocks = createDefaultMocks()

  // Combine default mocks with any additional mocks provided
  // Put custom mocks first so they take precedence
  const allMocks = [...mocks, ...defaultMocks]

  return (
    <BrowserRouter>
      <MockedProvider
        mocks={allMocks}
        addTypename={false}
        cache={cache || createCache()}
        defaultOptions={{
          query: {
            errorPolicy: 'all',
          },
          watchQuery: {
            errorPolicy: 'all',
          },
        }}
      >
        {children}
      </MockedProvider>
    </BrowserRouter>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[]
  cache?: InMemoryCache
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { mocks, cache, ...renderOptions } = options || {}
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders mocks={mocks} cache={cache}>
      {children}
    </AllTheProviders>
  )
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// Helper to create a mock that can be used multiple times
export const createReusableMock = (
  request: MockedResponse['request'],
  data: any,
  error?: Error
): MockedResponse => {
  if (error) {
    return {
      request,
      error,
    }
  }
  return {
    request,
    result: { data },
    newData: () => ({ data }),
  }
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, createCache }
