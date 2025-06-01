import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { AuthModal } from './AuthModal'
import { REQUEST_MAGIC_LINK } from '../graphql/queries/auth'

const mocks = [
  {
    request: {
      query: REQUEST_MAGIC_LINK,
      variables: {
        email: 'test@example.com',
      },
    },
    result: {
      data: {
        requestMagicLink: {
          success: true,
          message: 'Magic link sent successfully',
        },
      },
    },
  },
]

const errorMocks = [
  {
    request: {
      query: REQUEST_MAGIC_LINK,
      variables: {
        email: 'test@example.com',
      },
    },
    error: new Error('Failed to send magic link'),
  },
]

describe('AuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} isOpen={false} />
      </MockedProvider>
    )

    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  it('renders email form when open', () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByText('Send Magic Link')).toBeInTheDocument()
  })

  it('validates email input', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    const submitButton = screen.getByText('Send Magic Link')

    // Button should be disabled initially
    expect(submitButton).toBeDisabled()

    // Type invalid email
    const emailInput = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    expect(submitButton).toBeDisabled()

    // Type valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    expect(submitButton).not.toBeDisabled()
  })

  it('submits email and shows success state', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const submitButton = screen.getByText('Send Magic Link')

    // Enter email and submit
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    // Should show loading state
    expect(screen.getByText('Sending...')).toBeInTheDocument()

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
      expect(screen.getByText(/We've sent a magic link to/)).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).toHaveBeenCalled()
  })

  it('handles errors gracefully', async () => {
    render(
      <MockedProvider mocks={errorMocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const submitButton = screen.getByText('Send Magic Link')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to send magic link')).toBeInTheDocument()
    })
  })

  it('closes on escape key', () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('closes when clicking backdrop', () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    // Find the backdrop (the div with bg-black/50)
    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(defaultProps.onClose).toHaveBeenCalled()
    }
  })

  it('allows switching back to email form from success state', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <AuthModal {...defaultProps} />
      </MockedProvider>
    )

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const submitButton = screen.getByText('Send Magic Link')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
    })

    // Click "Use a different email"
    fireEvent.click(screen.getByText('Use a different email'))

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
  })
})
