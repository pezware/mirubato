import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { GET_CURRENT_USER } from '../../graphql/queries/user'

// Default mocks for common queries to prevent warnings
const defaultMocks: MockedResponse[] = [
  {
    request: {
      query: GET_CURRENT_USER,
      variables: {},
    },
    result: {
      data: {
        me: null, // Default to no user
      },
    },
  },
]

// Add providers as needed (Context, Theme, etc.)
interface AllTheProvidersProps {
  children: React.ReactNode
  mocks?: MockedResponse[]
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  mocks = [],
}) => {
  // Combine default mocks with any additional mocks provided
  const allMocks = [...defaultMocks, ...mocks]

  return (
    <BrowserRouter>
      <MockedProvider mocks={allMocks} addTypename={false}>
        {children}
      </MockedProvider>
    </BrowserRouter>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[]
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { mocks, ...renderOptions } = options || {}
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders mocks={mocks}>{children}</AllTheProviders>
  )
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
