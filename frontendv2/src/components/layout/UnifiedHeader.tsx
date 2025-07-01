import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'

interface UnifiedHeaderProps {
  currentPage: 'logbook' | 'toolbox' | 'scorebook'
  showAuth?: boolean
  onSignInClick?: () => void
}

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  currentPage,
  showAuth = true,
  onSignInClick,
}) => {
  const { t } = useTranslation(['common', 'logbook', 'toolbox', 'scorebook', 'auth'])
  const { user, isAuthenticated } = useAuthStore()

  const pages = [
    { id: 'logbook', label: t('logbook:title'), path: '/logbook' },
    { id: 'toolbox', label: t('toolbox:title'), path: '/toolbox' },
    { id: 'scorebook', label: t('scorebook:title'), path: '/scorebook/browse' },
  ]

  const getAuthStatus = () => {
    switch (currentPage) {
      case 'logbook':
        return isAuthenticated
          ? t('logbook:syncStatus.synced')
          : t('logbook:syncStatus.localOnly')
      case 'scorebook':
        return isAuthenticated
          ? t('scorebook:fullAccess')
          : t('scorebook:readOnly')
      case 'toolbox':
        return isAuthenticated
          ? t('toolbox:syncStatus.synced')
          : t('toolbox:syncStatus.localOnly')
    }
  }

  const getAuthIcon = () => {
    switch (currentPage) {
      case 'logbook':
      case 'toolbox':
        return isAuthenticated ? '☁️' : '💾'
      case 'scorebook':
        return isAuthenticated ? '☁️' : '👁️'
    }
  }

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-morandi-stone-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-lexend font-light text-mirubato-wood-800 hover:text-mirubato-wood-600 transition-colors"
            >
              {t('common:appName')}
            </Link>
            <nav className="flex items-center gap-4">
              {pages.map(page => (
                <Link
                  key={page.id}
                  to={page.path}
                  className={`text-sm font-inter transition-all px-2 py-1 rounded-md ${
                    currentPage === page.id
                      ? 'text-morandi-stone-800 font-medium bg-morandi-stone-100'
                      : 'text-morandi-stone-600 hover:text-morandi-stone-700 hover:bg-morandi-stone-50'
                  }`}
                >
                  {page.label}
                </Link>
              ))}
            </nav>
          </div>
          {showAuth && (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm font-inter text-morandi-stone-600">
                <span className="flex items-center gap-1">
                  <span className="hidden sm:inline">
                    {getAuthIcon()} {getAuthStatus()}{' '}
                    {isAuthenticated && '•'}
                  </span>
                  {isAuthenticated && (
                    <span className="text-xs sm:text-sm">{user?.email}</span>
                  )}
                </span>
              </div>
              {isAuthenticated ? (
                <button
                  onClick={async () => {
                    const { logout } = useAuthStore.getState()
                    await logout()
                  }}
                  className="text-xs sm:text-sm font-inter text-morandi-stone-600 hover:text-morandi-stone-700 px-2 sm:px-3 py-1 rounded-md hover:bg-morandi-stone-100 transition-all"
                >
                  {t('auth:signOut')}
                </button>
              ) : currentPage === 'logbook' && onSignInClick ? (
                <button
                  onClick={onSignInClick}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-morandi-sage-500 text-white text-xs sm:text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
                >
                  {t('auth:signIn')}
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-morandi-sage-500 text-white text-xs sm:text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
                >
                  {t('auth:signIn')}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default UnifiedHeader