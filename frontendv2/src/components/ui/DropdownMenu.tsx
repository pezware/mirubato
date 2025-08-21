import React, { useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DropdownMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  icon?: React.ReactNode
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  className?: string
  buttonClassName?: string
  menuClassName?: string
  icon?: React.ReactNode
  ariaLabel?: string
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  isOpen,
  onToggle,
  onClose,
  className,
  buttonClassName,
  menuClassName,
  icon = <MoreVertical className="w-4 h-4" />,
  ariaLabel = 'More options',
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        onClick={e => {
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          'p-1.5 text-morandi-stone-600 hover:text-morandi-stone-800 hover:bg-morandi-stone-100 rounded-md transition-colors',
          buttonClassName
        )}
        aria-label={ariaLabel}
      >
        {icon}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-8 min-w-[160px] bg-white border border-morandi-stone-200 rounded-lg shadow-lg py-1 z-50',
            'animate-in fade-in slide-in-from-top-1 duration-200',
            menuClassName
          )}
        >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && items[index - 1].variant !== item.variant && (
                <hr className="my-1 border-morandi-stone-200" />
              )}
              <button
                onClick={e => {
                  e.stopPropagation()
                  item.onClick()
                  onClose()
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2',
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-morandi-stone-700 hover:bg-morandi-stone-50'
                )}
              >
                {item.icon && (
                  <span className="flex-shrink-0">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

export default DropdownMenu
