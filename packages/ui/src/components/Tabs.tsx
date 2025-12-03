import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../utils/cn'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  shortLabel?: string
  mobileIconOnly?: boolean
}

export interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const { t } = useTranslation('ui')
  return (
    <div className={cn('border-b border-morandi-stone-200', className)}>
      <nav
        className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide"
        aria-label={t('components.tabs.ariaLabel')}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            data-testid={`${tab.id}-tab`}
            className={cn(
              'group inline-flex items-center py-2 sm:py-3 md:py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex-shrink-0',
              activeTab === tab.id
                ? 'border-morandi-purple-400 text-morandi-purple-600'
                : 'border-transparent text-morandi-stone-500 hover:text-morandi-stone-700 hover:border-morandi-stone-300'
            )}
          >
            {tab.mobileIconOnly ? (
              <>
                <span className="sm:hidden">{tab.icon}</span>
                <span className="hidden sm:flex sm:items-center sm:gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </>
            ) : (
              <>
                {tab.icon && (
                  <span className="mr-1 sm:mr-2 flex-shrink-0">{tab.icon}</span>
                )}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.shortLabel || tab.label.split(' ')[0]}
                </span>
              </>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default Tabs
