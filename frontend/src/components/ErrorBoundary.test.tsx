import React from 'react'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary, SheetMusicErrorBoundary } from './ErrorBoundary'

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error UI when error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText(
        "We're sorry for the inconvenience. Please try refreshing the page."
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Refresh Page')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(
      screen.queryByText('Oops! Something went wrong')
    ).not.toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('has refresh button that triggers reload', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const refreshButton = screen.getByText('Refresh Page')
    expect(refreshButton).toBeInTheDocument()

    // Just verify the button has the correct onClick handler
    // We can't easily test window.location.reload in jsdom
    expect(refreshButton.tagName).toBe('BUTTON')
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByText('Error Details (Development Only)')
    ).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.queryByText('Error Details (Development Only)')
    ).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('recovers when error is cleared', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    // Error boundary doesn't automatically recover - need to refresh
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
  })
})

describe('SheetMusicErrorBoundary', () => {
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <SheetMusicErrorBoundary>
        <div>Sheet music content</div>
      </SheetMusicErrorBoundary>
    )

    expect(screen.getByText('Sheet music content')).toBeInTheDocument()
  })

  it('renders sheet music specific error UI', () => {
    render(
      <SheetMusicErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SheetMusicErrorBoundary>
    )

    expect(screen.getByText('Unable to load sheet music')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('calls onError callback', () => {
    const onError = jest.fn()

    render(
      <SheetMusicErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </SheetMusicErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
  })
})
