import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import GoogleSignInButton from '../GoogleSignInButton'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['auth', 'common'])
  const { login, isLoading: authLoading, error: authError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [loginSuccess, setLoginSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim()
      await login(normalizedEmail)
      setLoginSuccess(true)
      onClose()
    } catch {
      // Error is handled in the store
    }
  }

  const handleClose = () => {
    setEmail('')
    setLoginSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="glass-panel p-8 w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-morandi-stone-700">
            {t('auth:signIn')}
          </h2>
          <button
            onClick={handleClose}
            className="text-morandi-stone-400 hover:text-morandi-stone-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Google Sign In */}
        <div className="mb-6">
          <GoogleSignInButton
            onSuccess={() => {
              setLoginSuccess(false)
              onClose()
            }}
            onError={error => {
              console.error('Google Sign-In error:', error)
            }}
          />
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-morandi-stone-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/90 text-morandi-stone-500">
              {t('auth:orContinueWithEmail')}
            </span>
          </div>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              {t('auth:email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth:email')}
              className="w-full px-4 py-3 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-morandi-sage-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-morandi-sage-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? t('auth:sendingMagicLink') : t('auth:sendMagicLink')}
          </button>
        </form>

        {/* Success Message */}
        {loginSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{t('auth:magicLinkSent')}</p>
          </div>
        )}

        {/* Error Message */}
        {authError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{authError}</p>
          </div>
        )}

        <p className="text-xs text-morandi-stone-500 mt-6 text-center">
          {t('auth:magicLinkDescription')}
        </p>
      </div>
    </div>
  )
}

export default SignInModal
