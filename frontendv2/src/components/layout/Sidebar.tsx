import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Music,
  FileText,
  Wrench,
  ChevronLeft,
  Plus,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import Button from '../ui/Button'
import { SyncIndicator } from '../SyncIndicator'

interface SidebarProps {
  className?: string
  isCollapsed: boolean
  onToggle: () => void
  onNewEntry?: () => void
  onTimerClick?: () => void
  onSignInClick?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  isCollapsed,
  onToggle,
  onNewEntry,
  onTimerClick,
  onSignInClick,
}) => {
  const { t } = useTranslation([
    'common',
    'logbook',
    'toolbox',
    'scorebook',
    'auth',
  ])
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    {
      id: 'logbook',
      label: t('logbook:title'),
      path: '/logbook',
      icon: BookOpen,
    },
    {
      id: 'pieces',
      label: t('common:navigation.pieces'),
      path: '/logbook?tab=repertoire',
      icon: Music,
    },
    {
      id: 'scores',
      label: t('scorebook:title'),
      path: '/scorebook/browse',
      icon: FileText,
    },
    {
      id: 'tools',
      label: t('toolbox:title'),
      path: '/toolbox',
      icon: Wrench,
    },
  ]

  const getUserInitials = () => {
    if (!user) return '?'
    const firstNameOrEmail = user.displayName || user.email || ''
    const firstName = firstNameOrEmail.split(' ')[0]
    return firstName[0]?.toUpperCase() || '?'
  }

  const isActive = (path: string) => {
    // For paths with query params, check exact match including query
    if (path.includes('?')) {
      return location.pathname + location.search === path
    }
    // For /logbook without query params, only match if there's no tab param
    if (path === '/logbook') {
      const params = new URLSearchParams(location.search)
      return location.pathname === '/logbook' && !params.has('tab')
    }
    // For other paths, match the pathname
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col z-50 ${
        isCollapsed ? 'w-16' : 'w-56'
      } ${className}`}
    >
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} relative`}>
        {!isCollapsed ? (
          <Link
            to="/"
            className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          >
            {t('common:appName')}
          </Link>
        ) : (
          <Link
            to="/"
            className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors flex justify-center"
          >
            M
          </Link>
        )}

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-3 h-3 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <nav
        className={`flex-1 flex flex-col ${isCollapsed ? 'px-2' : 'px-4'} overflow-y-auto`}
      >
        {/* Main Navigation */}
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => {
                  // No special handling needed - URL navigation will handle piece selection
                  // The Link component will update the URL and RepertoireView will sync its state
                }}
                className={`
                  flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                    isCollapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'
                  } rounded-lg text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!isCollapsed && item.label}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Action Buttons */}
        <div className="space-y-1">
          {onNewEntry && (
            <button
              onClick={onNewEntry}
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isCollapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'
                } rounded-lg text-sm font-medium transition-all
                text-gray-600 hover:bg-gray-100 hover:text-gray-900
              `}
              title={isCollapsed ? t('common:actions.addEntry') : undefined}
            >
              <Plus className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!isCollapsed && t('common:actions.addEntry')}
            </button>
          )}
          {onTimerClick && (
            <button
              onClick={onTimerClick}
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isCollapsed ? 'px-2 py-2.5' : 'px-3 py-2.5'
                } rounded-lg text-sm font-medium transition-all
                text-gray-600 hover:bg-gray-100 hover:text-gray-900
              `}
              title={isCollapsed ? t('common:actions.timer') : undefined}
            >
              <Clock className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!isCollapsed && t('common:actions.timer')}
            </button>
          )}
        </div>

        {/* Spacer to push user section to bottom */}
        <div className="flex-1 min-h-[60px]" />
      </nav>

      {/* User Section - Outside nav, at the very bottom */}
      <div
        className={`${isCollapsed ? 'px-2' : 'px-4'} pb-4 pt-4 border-t border-gray-200`}
      >
        {isAuthenticated ? (
          <>
            {/* Sync Indicator */}
            <div className={`mb-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
              <SyncIndicator showText={!isCollapsed} />
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isCollapsed ? 'p-2' : 'p-2'
                } rounded-lg hover:bg-gray-100 transition-colors`}
              >
                <div className="w-8 h-8 rounded-full bg-morandi-sage-500 text-white flex items-center justify-center text-sm font-semibold">
                  {getUserInitials()}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.displayName || user?.email?.split('@')[0]}
                    </div>
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div
                  className={`absolute ${isCollapsed ? 'left-full ml-2' : 'left-0'} bottom-full mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]`}
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="font-medium text-gray-900">
                      {user?.displayName || user?.email}
                    </div>
                    {user?.email && (
                      <div className="text-sm text-gray-500 mt-1">
                        {user.email}
                      </div>
                    )}
                  </div>
                  <div className="p-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                      {t('common:navigation.profileSettings')}
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                      {t('common:navigation.preferences')}
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={async () => {
                        await logout()
                        setShowUserDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      {t('auth:signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Button
            onClick={onSignInClick}
            variant="primary"
            size="sm"
            className={`w-full ${isCollapsed ? 'px-2' : ''}`}
          >
            {isCollapsed ? (
              <span className="text-xs">IN</span>
            ) : (
              t('auth:signIn')
            )}
          </Button>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
