import React, { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { cn } from '../utils/cn'

export interface DropdownMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  icon?: React.ReactNode
}

export interface DropdownMenuProps {
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
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [usePortal, setUsePortal] = useState(false)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check both container and menu for portal mode
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(event.target as Node))
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Helper to find scrollable parent
  const getScrollableParent = useCallback(
    (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null
      const parent = element.parentElement
      if (!parent) return null

      const overflowY = window.getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent
      }
      // Recursive call inside callback
      return getScrollableParent(parent)
    },
    []
  )

  // Helper to detect if device is iPad/tablet
  const isTablet = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIPad =
      /ipad/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroidTablet =
      /android/.test(userAgent) && !/mobile/.test(userAgent)
    const screenWidth = window.innerWidth
    // Consider devices between 600px and 1024px as tablets
    const isTabletSize = screenWidth >= 600 && screenWidth <= 1024
    return isIPad || isAndroidTablet || isTabletSize
  }, [])

  // Decide position and whether to use portal
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return

    const calculatePosition = () => {
      const btn = buttonRef.current
      if (!btn) return

      const rect = btn.getBoundingClientRect()
      const scrollableParent = getScrollableParent(btn)
      const isOnTablet = isTablet()

      // Use visual viewport if available (important for mobile/tablet)
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const viewportWidth = window.visualViewport?.width || window.innerWidth

      // Add extra margin for touch devices
      const safeMargin = isOnTablet ? 30 : 20

      // Estimate menu dimensions
      const estimatedHeight =
        menuRef.current?.offsetHeight || Math.max(40, items.length * 36 + 12)
      const estimatedWidth = 180 // Approximate width

      // Check space in viewport
      let spaceBelow = viewportHeight - rect.bottom - safeMargin
      const spaceAbove = rect.top - safeMargin

      // Check if we're in a scrollable container that might clip the menu
      let shouldUsePortal = false
      if (scrollableParent) {
        const containerRect = scrollableParent.getBoundingClientRect()
        const containerSpaceBelow = containerRect.bottom - rect.bottom

        // Use portal if container doesn't have enough space
        if (containerSpaceBelow < estimatedHeight + safeMargin || isOnTablet) {
          shouldUsePortal = true
        }

        // Adjust available space if not using portal
        if (!shouldUsePortal) {
          spaceBelow = Math.min(spaceBelow, containerSpaceBelow)
        }
      }

      // Determine vertical direction
      const openUp = estimatedHeight > spaceBelow && spaceAbove > spaceBelow
      setOpenDirection(openUp ? 'up' : 'down')

      // Calculate absolute position for portal
      if (shouldUsePortal) {
        let top = openUp ? rect.top - estimatedHeight - 8 : rect.bottom + 8
        let left = rect.right - estimatedWidth

        // Ensure menu stays within viewport
        if (left < safeMargin) {
          left = safeMargin
        }
        if (left + estimatedWidth > viewportWidth - safeMargin) {
          left = viewportWidth - estimatedWidth - safeMargin
        }
        if (top < safeMargin) {
          top = safeMargin
        }
        if (top + estimatedHeight > viewportHeight - safeMargin) {
          top = viewportHeight - estimatedHeight - safeMargin
        }

        setMenuPosition({ top, left })
      }

      setUsePortal(shouldUsePortal)
    }

    // Calculate on next frame to ensure DOM is ready
    const id = requestAnimationFrame(calculatePosition)

    // Recalculate on viewport changes
    const handleResize = () => calculatePosition()
    const handleScroll = () => {
      // Close menu on scroll for better UX on tablets
      if (isTablet()) {
        onClose()
      } else {
        calculatePosition()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    window.visualViewport?.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [isOpen, items.length, onClose, getScrollableParent, isTablet])

  // Render menu content
  const menuContent = (
    <div
      ref={menuRef}
      className={cn(
        'min-w-[160px] bg-white border border-morandi-stone-200 rounded-lg shadow-lg py-1',
        usePortal ? 'fixed z-[9999]' : 'absolute right-0 z-50',
        !usePortal &&
          openDirection === 'down' &&
          'top-8 animate-in fade-in slide-in-from-top-1 duration-200',
        !usePortal &&
          openDirection === 'up' &&
          'bottom-8 animate-in fade-in slide-in-from-bottom-1 duration-200',
        usePortal && 'animate-in fade-in duration-200',
        menuClassName
      )}
      style={usePortal ? menuPosition : undefined}
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
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <div className={cn('relative', className)} ref={containerRef}>
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
        ref={buttonRef}
      >
        {icon}
      </button>

      {isOpen && !usePortal && menuContent}
      {isOpen && usePortal && createPortal(menuContent, document.body)}
    </div>
  )
}

export default DropdownMenu
