import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Music, FileText, Wrench } from 'lucide-react'

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
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
      className={`fixed left-0 top-0 bottom-0 w-60 bg-gray-50 border-r border-gray-200 ${className}`}
    >
      <div className="p-6">
        <Link
          to="/"
          className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          {t('common:appName')}
        </Link>
      </div>

      <nav className="px-4">
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
