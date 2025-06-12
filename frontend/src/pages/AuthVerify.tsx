import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApolloError } from '@apollo/client'

export default function AuthVerify() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('No verification token provided')
        setIsVerifying(false)
        return
      }

      try {
        await login(token)
        // Navigation is handled by the login function in AuthContext
      } catch (error) {
        console.error('Verification error:', error)

        // Check for specific error messages
        let errorMessage = 'Failed to verify magic link'

        if (error instanceof ApolloError) {
          if (error.graphQLErrors?.length > 0) {
            const gqlError = error.graphQLErrors[0]
            if (gqlError.message.includes('Invalid or expired')) {
              errorMessage =
                'This magic link has expired or is invalid. Please request a new one.'
            } else {
              errorMessage = gqlError.message
            }
          } else if (error.networkError) {
            errorMessage =
              'Unable to connect to server. Please check your connection and try again.'
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        setError(errorMessage)
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [searchParams, login])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your magic link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Verification Failed
            </h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-6 space-y-3">
              {error?.includes('expired') && (
                <button
                  onClick={() => navigate('/?auth=login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Request New Magic Link
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
