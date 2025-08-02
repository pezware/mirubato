import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Plus, Wrench, Clock, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface BottomTabsProps {
  onAddClick?: () => void
  onTimerClick?: () => void
  onSignInClick?: () => void
}

const BottomTabs: React.FC<BottomTabsProps> = ({
  onAddClick,
  onTimerClick,
  onSignInClick,
}) => {
  const { t } = useTranslation(['common', 'auth'])
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getUserInitials = () => {
    if (!user) return '?'
    const firstNameOrEmail = user.displayName || user.email || ''
    const firstName = firstNameOrEmail.split(' ')[0]
    return firstName[0]?.toUpperCase() || '?'
  }

  const tabs = [
    {
      id: 'logbook',
      label: t('common:navigation.logbook'),
      path: '/logbook',
      icon: BookOpen,
    },
    {
      id: 'toolbox',
      label: t('common:navigation.toolbox'),
      path: '/toolbox',
      icon: Wrench,
    },
    {
      id: 'timer',
      label: t('common:navigation.timer'),
      path: null, // Special case - triggers action instead of navigation
      icon: Clock,
      action: onTimerClick,
    },
    {
      id: 'add',
      label: t('common:navigation.add'),
      path: null, // Special case - triggers action instead of navigation
      icon: Plus,
      action: onAddClick,
    },
    {
      id: 'profile',
      label: isAuthenticated
        ? user?.displayName?.split(' ')[0] ||
          user?.email?.split('@')[0] ||
          'Profile'
        : t('auth:signIn'),
      path: null, // Changed to null - will show dropdown instead
      icon: User,
      isProfile: true,
      action: !isAuthenticated
        ? onSignInClick
        : () => setShowUserDropdown(!showUserDropdown),
    },
  ]

  const isActive = (path: string | null) => {
    if (!path) return false
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false)
      }
    }

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
      <div className="flex justify-around items-center">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.path)

          if (
            tab.id === 'add' ||
            tab.id === 'timer' ||
            tab.id === 'profile' // Include profile for both auth states
          ) {
            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={tab.action}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-4 min-h-[56px] text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {tab.id === 'profile' && isAuthenticated ? (
                    <div className="w-5 h-5 rounded-full bg-morandi-sage-500 text-white flex items-center justify-center text-xs font-semibold">
                      {getUserInitials()}
                    </div>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="text-xs">{tab.label}</span>
                </button>

                {/* User Dropdown for mobile */}
                {tab.id === 'profile' &&
                  isAuthenticated &&
                  showUserDropdown && (
                    <div
                      ref={dropdownRef}
                      className="absolute right-0 bottom-full mb-2 w-48 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-[100]"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <div className="font-medium text-gray-900 text-sm">
                          {user?.displayName || user?.email?.split('@')[0]}
                        </div>
                        {user?.email && (
                          <div className="text-xs text-gray-500 mt-1">
                            {user.email}
                          </div>
                        )}
                      </div>
                      <div className="p-1">
                        <button
                          onClick={async () => {
                            await logout()
                            setShowUserDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          {t('auth:signOut')}
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            )
          }

          // This block is now handled in the previous condition

          return (
            <Link
              key={tab.id}
              to={tab.path!}
              className={`
                flex flex-col items-center justify-center gap-1 py-2 px-4 min-h-[56px] transition-colors
                ${
                  active
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomTabs
