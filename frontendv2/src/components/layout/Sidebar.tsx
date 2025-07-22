import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Music, FileText, Wrench, ChevronLeft } from 'lucide-react'

interface SidebarProps {
  className?: string
  isCollapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  isCollapsed,
  onToggle,
}) => {
  const { t } = useTranslation(['common', 'logbook', 'toolbox', 'scorebook'])
  const location = useLocation()

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
      className={`fixed left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-60'
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

      <nav className={`${isCollapsed ? 'px-2' : 'px-4'}`}>
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.id}
                to={item.path}
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
      </nav>
    </aside>
  )
}

export default Sidebar
