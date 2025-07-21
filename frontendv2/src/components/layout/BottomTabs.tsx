import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Plus, FileText, Wrench } from 'lucide-react'

interface BottomTabsProps {
  onAddClick?: () => void
}

const BottomTabs: React.FC<BottomTabsProps> = ({ onAddClick }) => {
  const { t } = useTranslation(['common'])
  const location = useLocation()

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
      id: 'scores',
      label: t('common:navigation.scores'),
      path: '/scorebook/browse',
      icon: FileText,
    },
    {
      id: 'add',
      label: '', // No label for the add button
      path: null, // Special case - triggers action instead of navigation
      icon: Plus,
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

          if (tab.id === 'add') {
            return (
              <button
                key={tab.id}
                onClick={onAddClick}
                className="flex flex-col items-center justify-center gap-1 py-2 px-4 min-h-[56px] text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                {tab.label && <span className="text-[11px]">{tab.label}</span>}
              </button>
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
