import React, { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { REQUEST_MAGIC_LINK } from '../graphql/queries/auth'
import { createPortal } from 'react-dom'
import { createLogger } from '../utils/logger'

const logger = createLogger('AuthModal')

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'email' | 'sent'>('email')
  const [error, setError] = useState('')

  const [requestMagicLink] = useMutation(REQUEST_MAGIC_LINK, {
    onError: error => {
      // Handle GraphQL errors more gracefully
      if (error.networkError) {
        setError(
          'Unable to connect to server. Please check your connection and try again.'
        )
      } else if (error.graphQLErrors?.length > 0) {
        setError(error.graphQLErrors[0].message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    },
  })

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setStep('email')
      setError('')
      setIsSubmitting(false)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable body scroll when modal closes
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const result = await requestMagicLink({
        variables: { email: email.trim() },
      })

      if (result.data?.requestMagicLink?.success) {
        setStep('sent')
        onSuccess?.()
      } else {
        setError(
          result.data?.requestMagicLink?.message || 'Failed to send magic link'
        )
      }
    } catch (err) {
      // Error is already handled by onError callback
      logger.error('Magic link request failed', err, { email })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  if (!isOpen) return null

  // Use React Portal to render modal at document root level
  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl"
        style={{
          animation: 'modalSlideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'email' ? 'Sign In' : 'Check Your Email'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {step === 'email' ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter your email to receive a magic link for instant sign-in.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoFocus
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!validateEmail(email) || isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-500 mt-4 text-center">
                No password required. We'll send you a secure link to sign in.
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a magic link to <strong>{email}</strong>
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  Click the link in your email to sign in. The link will expire
                  in 15 minutes.
                </p>
                <button
                  onClick={() => setStep('email')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  )
}
