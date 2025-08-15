import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import GoogleSignInButton from '../GoogleSignInButton'
import { Modal } from '../ui/Modal'
import Button from '../ui/Button'
import { Input } from '../ui/Input'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('auth:signIn')}
      size="md"
    >
      {/* Google Sign In */}
      <div className="mb-6">
        <GoogleSignInButton
          onSuccess={() => {
            setLoginSuccess(false)
            onClose()
            navigate('/logbook')
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
          <span className="px-4 bg-white text-morandi-stone-500">
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
          <Input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('auth:email')}
            fullWidth
            required
          />
        </div>

        <Button
          type="submit"
          disabled={authLoading}
          loading={authLoading}
          fullWidth
        >
          {authLoading ? t('auth:sendingMagicLink') : t('auth:sendMagicLink')}
        </Button>
      </form>

      {/* Success Message */}
      {loginSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            {t('auth:magicLinkSent', { email: email.toLowerCase().trim() })}
          </p>
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
    </Modal>
  )
}

export default SignInModal
