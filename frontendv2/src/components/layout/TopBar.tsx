import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import Button from '../ui/Button'

interface TopBarProps {
  onSearchChange?: (query: string) => void
  onNewEntry?: () => void
  onTimerClick?: () => void
  onSignInClick?: () => void
}

const TopBar: React.FC<TopBarProps> = ({
  onSearchChange,
  onNewEntry,
  onTimerClick,
  onSignInClick,
}) => {
  const { t } = useTranslation(['common', 'auth'])
  const { user, isAuthenticated, logout } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearchChange?.(query)
  }

  const getUserInitials = () => {
    if (!user) return '?'
    const names = (user.displayName || user.email || '').split(' ')
    return names
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-6">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t('common:search.placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Quick Actions - Desktop Only */}
        <div className="hidden sm:flex items-center gap-2">
          {onNewEntry && (
            <Button
              onClick={onNewEntry}
              variant="ghost"
              size="icon-md"
              title={t('common:actions.addEntry')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          {onTimerClick && (
            <Button
              onClick={onTimerClick}
              variant="ghost"
              size="icon-md"
              title={t('common:actions.timer')}
            >
              <Clock className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* User Section */}
        <div className="ml-auto relative" ref={dropdownRef}>
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                {getUserInitials()}
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
            </>
          ) : (
            <Button onClick={onSignInClick} variant="primary" size="sm">
              {t('auth:signIn')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TopBar
