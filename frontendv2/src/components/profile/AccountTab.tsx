import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  LogIn,
  LogOut,
  Mail,
  Shield,
  Trash2,
  AlertTriangle,
  Clock,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Modal, ModalBody, ModalFooter } from '../ui/Modal'
import { Input } from '../ui'
import Button from '../ui/Button'
import GoogleSignInButton from '../GoogleSignInButton'
import { useAuthStore } from '../../stores/authStore'
import { showToast } from '../../utils/toastManager'

export function AccountTab() {
  const { t } = useTranslation(['profile', 'auth', 'common', 'privacy'])
  const navigate = useNavigate()
  const { user, isAuthenticated, login, logout, isLoading, error, clearError } =
    useAuthStore()

  const [email, setEmail] = useState('')
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const normalizedEmail = email.toLowerCase().trim()
      await login(normalizedEmail)
      setLoginSuccess(true)
    } catch {
      // Error is handled in the store
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast(t('profile:signedOut', 'You have been signed out'), 'success')
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
      showToast(t('profile:signOutError', 'Failed to sign out'), 'error')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      showToast(
        t(
          'privacy:deleteConfirmationRequired',
          'Please type DELETE to confirm'
        ),
        'error'
      )
      return
    }

    setIsDeleting(true)
    try {
      // Clear local storage
      const keysToKeep = ['i18nextLng']
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key)
        }
      })

      showToast(
        t(
          'privacy:dataDeleted',
          'Your account deletion request has been submitted.'
        ),
        'success'
      )

      setShowDeleteModal(false)
      setDeleteConfirmation('')

      // Logout and redirect
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Account deletion failed:', error)
      showToast(
        t(
          'privacy:deleteFailed',
          'Failed to process deletion request. Please try again.'
        ),
        'error'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Signed In View
  if (isAuthenticated && user) {
    return (
      <div className="space-y-6">
        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
              <Shield className="h-5 w-5" />
              {t('profile:sections.account', 'Account')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-morandi-stone-100">
              <div>
                <p className="text-sm font-medium text-morandi-stone-700">
                  {t('profile:email', 'Email')}
                </p>
                <p className="text-sm text-morandi-stone-500">{user.email}</p>
              </div>
              <Check className="h-5 w-5 text-morandi-sage-500" />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-morandi-stone-100">
              <div>
                <p className="text-sm font-medium text-morandi-stone-700">
                  {t('profile:authProvider', 'Sign-in method')}
                </p>
                <p className="text-sm text-morandi-stone-500 capitalize">
                  {user.authProvider === 'magic_link'
                    ? t('profile:magicLink', 'Magic Link')
                    : 'Google'}
                </p>
              </div>
            </div>

            {user.createdAt && (
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-morandi-stone-700">
                    {t('profile:memberSince', 'Member since')}
                  </p>
                  <p className="text-sm text-morandi-stone-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
              <LogOut className="h-5 w-5" />
              {t('profile:sections.signOut', 'Sign Out')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-morandi-stone-600">
              {t(
                'profile:signOutDescription',
                'Sign out of your account. Your data will remain synced and available when you sign back in.'
              )}
            </p>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth:signOut', 'Sign Out')}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-lexend text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {t('profile:sections.dangerZone', 'Danger Zone')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-morandi-stone-600">
              {t(
                'profile:deleteAccountDescription',
                'Permanently delete your account and all associated data. This action cannot be undone.'
              )}
            </p>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('profile:deleteAccount', 'Delete Account')}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteConfirmation('')
          }}
          title={t('privacy:deleteAccount.title', 'Delete Account')}
          size="md"
        >
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 text-sm mb-1">
                    {t(
                      'privacy:deleteAccount.warning',
                      'Permanent Account Deletion'
                    )}
                  </h4>
                  <p className="text-xs text-red-700">
                    {t(
                      'privacy:deleteAccount.description',
                      'This action cannot be undone. All your data will be permanently deleted.'
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-morandi-stone-700 mb-2">
                  {t(
                    'privacy:deleteAccount.confirmLabel',
                    'Type "DELETE" to confirm:'
                  )}
                </label>
                <Input
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  placeholder={t(
                    'privacy:deleteAccount.placeholder',
                    'Type DELETE to confirm'
                  )}
                  className="w-full"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteConfirmation('')
              }}
              disabled={isDeleting}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
            >
              {isDeleting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  {t('common:processing', 'Processing...')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('profile:deleteAccount', 'Delete Account')}
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    )
  }

  // Not Signed In View
  return (
    <div className="space-y-6">
      {/* Sign In Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <LogIn className="h-5 w-5" />
            {t('profile:sections.signIn', 'Sign In')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-morandi-stone-600">
            {t(
              'profile:signInDescription',
              'Sign in to sync your data across devices and access your practice history from anywhere.'
            )}
          </p>

          {/* Benefits */}
          <div className="p-4 bg-morandi-sage-50 rounded-lg border border-morandi-sage-200">
            <h4 className="font-medium text-morandi-stone-700 text-sm mb-2">
              {t('profile:signInBenefits.title', 'Benefits of signing in:')}
            </h4>
            <ul className="space-y-1 text-xs text-morandi-stone-600">
              <li>
                {t(
                  'profile:signInBenefits.sync',
                  '• Sync data across all your devices'
                )}
              </li>
              <li>
                {t('profile:signInBenefits.backup', '• Automatic cloud backup')}
              </li>
              <li>
                {t(
                  'profile:signInBenefits.access',
                  '• Access your data from any browser'
                )}
              </li>
            </ul>
          </div>

          {/* Google Sign In */}
          <div>
            <GoogleSignInButton
              onSuccess={() => {
                setLoginSuccess(false)
                clearError()
                navigate('/logbook?tab=repertoire')
              }}
              onError={err => {
                console.error('Google Sign-In error:', err)
              }}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-morandi-stone-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-morandi-stone-500">
                {t('auth:orContinueWithEmail', 'or continue with email')}
              </span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth:email', 'Email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-morandi-stone-400" />
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth:email', 'Email')}
                  className="pl-10 w-full"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              className="w-full"
            >
              {isLoading
                ? t('auth:sendingMagicLink', 'Sending...')
                : t('auth:sendMagicLink', 'Send Magic Link')}
            </Button>
          </form>

          {/* Success Message */}
          {loginSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                {t('auth:magicLinkSent', {
                  email: email.toLowerCase().trim(),
                  defaultValue: `Check your email (${email.toLowerCase().trim()}) for a sign-in link.`,
                })}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <p className="text-xs text-morandi-stone-500 text-center">
            {t(
              'auth:magicLinkDescription',
              "We'll send you a magic link to sign in without a password."
            )}
          </p>
        </CardContent>
      </Card>

      {/* Anonymous Usage Note */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-morandi-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-morandi-stone-700 text-sm mb-1">
                {t('profile:anonymousUsage.title', 'Using without an account')}
              </h4>
              <p className="text-xs text-morandi-stone-600">
                {t(
                  'profile:anonymousUsage.description',
                  'You can continue using Mirubato without signing in. Your data will be stored locally in this browser. Note that you may lose your data if you clear browser storage or switch devices.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
