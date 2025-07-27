import React from 'react'
import { cn } from '../../utils/cn'

export interface SegmentOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps {
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
  const sizeClasses = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5',
  }

  const buttonSizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
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
      aria-label="View selector"
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
              'relative flex-1 inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-morandi-purple-500',
              buttonSizeClasses[size],
              isActive
                ? 'bg-white dark:bg-gray-900 text-morandi-stone-900 dark:text-white shadow-sm'
                : 'text-morandi-stone-600 dark:text-gray-400 hover:text-morandi-stone-900 dark:hover:text-white'
            )}
          >
            {option.icon && (
              <span className="flex-shrink-0">{option.icon}</span>
            )}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
