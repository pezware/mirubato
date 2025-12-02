import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../utils/cn'

export interface SegmentOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className,
  size = 'md',
  fullWidth = false,
}) => {
  const { t } = useTranslation('ui')
  const sizeClasses = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5',
  }

  const buttonSizeClasses = {
    sm: 'px-3 sm:px-4 py-1.5 text-xs',
    md: 'px-3 sm:px-5 py-2 text-xs sm:text-sm',
    lg: 'px-5 sm:px-7 py-2.5 text-sm sm:text-base',
  }

  return (
    <div
      className={cn(
        'inline-flex rounded-lg bg-gray-100 dark:bg-gray-800',
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className
      )}
      role="tablist"
      aria-label={t('components.segmentedControl.ariaLabel')}
    >
      {options.map(option => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${option.value}-panel`}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 inline-flex items-center justify-center gap-1 sm:gap-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-morandi-purple-500 min-w-fit',
              buttonSizeClasses[size],
              isActive
                ? 'bg-white dark:bg-gray-900 text-morandi-stone-900 dark:text-white shadow-sm'
                : 'text-morandi-stone-600 dark:text-gray-400 hover:text-morandi-stone-900 dark:hover:text-white'
            )}
          >
            {option.icon && (
              <span className="flex-shrink-0">{option.icon}</span>
            )}
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
