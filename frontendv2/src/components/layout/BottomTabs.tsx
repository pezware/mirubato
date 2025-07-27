import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

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
      path: isAuthenticated ? '/profile' : null,
      icon: User,
      isProfile: true,
      action: !isAuthenticated ? onSignInClick : undefined,
    },
  ]

  const isActive = (path: string | null) => {
    if (!path) return false
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
      <div className="flex justify-around items-center">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.path)

          if (
            tab.id === 'add' ||
            tab.id === 'timer' ||
            (tab.id === 'profile' && !isAuthenticated)
          ) {
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className="flex flex-col items-center justify-center gap-1 py-2 px-4 min-h-[56px] text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px]">{tab.label}</span>
              </button>
            )
          }

          if (tab.id === 'profile' && isAuthenticated) {
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
                <div className="w-5 h-5 rounded-full bg-morandi-sage-500 text-white flex items-center justify-center text-xs font-semibold">
                  {getUserInitials()}
                </div>
                <span className="text-[11px]">{tab.label}</span>
              </Link>
            )
          }

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
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomTabs
