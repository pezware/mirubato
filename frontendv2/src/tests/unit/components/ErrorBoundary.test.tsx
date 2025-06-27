import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../../../components/ErrorBoundary'

// Mock console.error to avoid noise in test output
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('should catch errors and display error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText(/Error: Test error/)).toBeInTheDocument()
  })

  it('should show error details in a details element', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const detailsElement = screen.getByRole('group')
    expect(detailsElement).toBeInTheDocument()
    expect(detailsElement).toHaveStyle({ whiteSpace: 'pre-wrap' })
  })

  it('should render multiple children correctly', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should catch errors from nested components', () => {
    const NestedComponent = () => (
      <div>
        <div>Nested content</div>
        <ThrowError shouldThrow={true} />
      </div>
    )

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.queryByText('Nested content')).not.toBeInTheDocument()
  })

  it('should handle errors without messages', () => {
    const ThrowEmptyError = () => {
      throw new Error()
    }

    render(
      <ErrorBoundary>
        <ThrowEmptyError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText(/Error/)).toBeInTheDocument()
  })

  it('should log error to console', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('should display error stack trace', () => {
    const errorWithStack = new Error('Test error with stack')
    errorWithStack.stack =
      'Error: Test error with stack\n    at TestComponent (<anonymous>:1:1)'

    const ThrowErrorWithStack = () => {
      throw errorWithStack
    }

    render(
      <ErrorBoundary>
        <ThrowErrorWithStack />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Test error with stack/)).toBeInTheDocument()
    expect(screen.getByText(/at TestComponent/)).toBeInTheDocument()
  })

  it('should handle non-Error objects being thrown', () => {
    const ThrowString = () => {
      throw 'String error' // eslint-disable-line no-throw-literal
    }

    render(
      <ErrorBoundary>
        <ThrowString />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText(/String error/)).toBeInTheDocument()
  })

  it('should persist error state across rerenders', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()

    // Rerender with the same error - error boundary doesn't reset automatically
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Error state should persist
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })
})
