import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Cloud, HardDrive, Eye } from 'lucide-react'
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
  const { t } = useTranslation([
    'common',
    'logbook',
    'toolbox',
    'scorebook',
    'auth',
  ])
  const { user, isAuthenticated } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    const iconClass = 'w-4 h-4 inline-block'
    switch (currentPage) {
      case 'logbook':
      case 'toolbox':
        return isAuthenticated ? (
          <Cloud className={iconClass} />
        ) : (
          <HardDrive className={iconClass} />
        )
      case 'scorebook':
        return isAuthenticated ? (
          <Cloud className={iconClass} />
        ) : (
          <Eye className={iconClass} />
        )
    }
  }

  return (
    <>
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
              <nav className="hidden sm:flex items-center gap-4">
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
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-xs sm:text-sm font-inter text-morandi-stone-600">
                  <span className="flex items-center gap-1">
                    {getAuthIcon()} {getAuthStatus()}
                    {isAuthenticated && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">
                          {user?.email}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                {isAuthenticated ? (
                  <button
                    onClick={async () => {
                      const { logout } = useAuthStore.getState()
                      await logout()
                    }}
                    className="hidden sm:block text-xs sm:text-sm font-inter text-morandi-stone-600 hover:text-morandi-stone-700 px-2 sm:px-3 py-1 rounded-md hover:bg-morandi-stone-100 transition-all"
                  >
                    {t('auth:signOut')}
                  </button>
                ) : onSignInClick ? (
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

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden p-2 rounded-md hover:bg-morandi-stone-100 transition-colors"
                  aria-label={
                    isMobileMenuOpen
                      ? t('common:navigation.closeMenu')
                      : t('common:navigation.menu')
                  }
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-morandi-stone-600" />
                  ) : (
                    <Menu className="w-5 h-5 text-morandi-stone-600" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="fixed inset-0 bg-morandi-stone-900/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-72 bg-white shadow-xl">
            {/* Mobile Menu Header */}
            <div className="p-4 border-b border-morandi-stone-200 flex justify-between items-center">
              <span className="text-lg font-lexend font-light text-mirubato-wood-800">
                {t('common:navigation.menu')}
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-morandi-stone-100 transition-colors"
                aria-label={t('common:navigation.closeMenu')}
              >
                <X className="w-5 h-5 text-morandi-stone-600" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4">
              {pages.map(page => (
                <Link
                  key={page.id}
                  to={page.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-3 px-4 rounded-md mb-2 font-inter transition-all ${
                    currentPage === page.id
                      ? 'text-morandi-stone-800 font-medium bg-morandi-stone-100'
                      : 'text-morandi-stone-600 hover:text-morandi-stone-700 hover:bg-morandi-stone-50'
                  }`}
                >
                  {page.label}
                </Link>
              ))}
            </nav>

            {/* Auth Section */}
            {showAuth && (
              <div className="p-4 border-t border-morandi-stone-200">
                <div className="mb-3 text-sm font-inter text-morandi-stone-600">
                  <div className="flex items-center gap-2 mb-2">
                    {getAuthIcon()}
                    <span>{getAuthStatus()}</span>
                  </div>
                  {isAuthenticated && user?.email && (
                    <div className="text-xs text-morandi-stone-500 truncate">
                      {user.email}
                    </div>
                  )}
                </div>

                {isAuthenticated ? (
                  <button
                    onClick={async () => {
                      const { logout } = useAuthStore.getState()
                      await logout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full text-sm font-inter text-morandi-stone-600 hover:text-morandi-stone-700 px-3 py-2 rounded-md hover:bg-morandi-stone-100 transition-all text-left"
                  >
                    {t('auth:signOut')}
                  </button>
                ) : onSignInClick ? (
                  <button
                    onClick={() => {
                      onSignInClick()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 bg-morandi-sage-500 text-white text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
                  >
                    {t('auth:signIn')}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-2 bg-morandi-sage-500 text-white text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200 text-center"
                  >
                    {t('auth:signIn')}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default UnifiedHeader
