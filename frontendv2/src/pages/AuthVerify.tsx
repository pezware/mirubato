import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AuthVerifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { verifyMagicLink } = useAuthStore()
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  )
  const [hasVerified, setHasVerified] = useState(false)

  useEffect(() => {
    // Only run once per token
    if (hasVerified) return

    const token = searchParams.get('token')

    if (!token) {
      setVerificationError('No verification token provided')
      setIsVerifying(false)
      return
    }

    const verify = async () => {
      setHasVerified(true) // Mark as attempted
      try {
        await verifyMagicLink(token)
        // Success - redirect to logbook after a short delay
        setTimeout(() => {
          navigate('/logbook')
        }, 2000)
      } catch (err: any) {
        setVerificationError(
          err.response?.data?.error || 'Failed to verify magic link'
        )
      } finally {
        setIsVerifying(false)
      }
    }

    verify()
  }, [searchParams, verifyMagicLink, navigate, hasVerified])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verifying your magic link...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we sign you in.
              </p>
            </>
          ) : verificationError ? (
            <>
              <div className="text-red-500 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {verificationError}
              </p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Back to Home
              </button>
            </>
          ) : (
            <>
              <div className="text-green-500 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Successfully Signed In!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting you to your logbook...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
