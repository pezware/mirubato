import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../utils/cn'

export interface ResizableSplitViewProps {
  children: [React.ReactNode, React.ReactNode] // Exactly 2 children
  defaultRatio?: number // Default split ratio (0-1)
  minSizes?: [number, number] // Min width in pixels for [left, right]
  maxSizes?: [number, number] // Max width in pixels for [left, right]
  onRatioChange?: (ratio: number) => void
  storageKey?: string // Key for localStorage persistence
  className?: string
  disabled?: boolean // Disable resizing on mobile
}

export const ResizableSplitView: React.FC<ResizableSplitViewProps> = ({
  children,
  defaultRatio = 0.66,
  minSizes = [400, 300],
  maxSizes = [Infinity, 600],
  onRatioChange,
  storageKey,
  className,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(defaultRatio)
  const [isDragging, setIsDragging] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const dragStartX = useRef(0)
  const dragStartRatio = useRef(0)

  // Load saved ratio from localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`splitView-${storageKey}`)
      if (saved) {
        const savedRatio = parseFloat(saved)
        if (!isNaN(savedRatio) && savedRatio >= 0 && savedRatio <= 1) {
          setRatio(savedRatio)
        }
      }
    }
  }, [storageKey])

  // Save ratio to localStorage
  const saveRatio = useCallback(
    (newRatio: number) => {
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(`splitView-${storageKey}`, newRatio.toString())
      }
      onRatioChange?.(newRatio)
    },
    [storageKey, onRatioChange]
  )

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Calculate actual widths based on ratio and constraints
  const calculateWidths = useCallback(() => {
    const leftWidth = containerWidth * ratio
    const rightWidth = containerWidth * (1 - ratio)

    // Apply min/max constraints
    let constrainedLeftWidth = Math.max(
      minSizes[0],
      Math.min(leftWidth, maxSizes[0])
    )
    let constrainedRightWidth = Math.max(
      minSizes[1],
      Math.min(rightWidth, maxSizes[1])
    )

    // Adjust if total exceeds container width
    const total = constrainedLeftWidth + constrainedRightWidth
    if (total > containerWidth && containerWidth > 0) {
      const scale = containerWidth / total
      constrainedLeftWidth *= scale
      constrainedRightWidth *= scale
    }

    return {
      left: constrainedLeftWidth,
      right: constrainedRightWidth,
      actualRatio:
        containerWidth > 0 ? constrainedLeftWidth / containerWidth : ratio,
    }
  }, [containerWidth, ratio, minSizes, maxSizes])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartRatio.current = ratio
    },
    [disabled, ratio]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const deltaX = e.clientX - dragStartX.current
      const deltaRatio = deltaX / containerWidth
      let newRatio = dragStartRatio.current + deltaRatio

      // Clamp to valid range
      newRatio = Math.max(0.2, Math.min(0.8, newRatio))

      // Apply constraints
      const leftWidth = containerWidth * newRatio
      const rightWidth = containerWidth * (1 - newRatio)

      if (leftWidth < minSizes[0]) {
        newRatio = minSizes[0] / containerWidth
      } else if (leftWidth > maxSizes[0]) {
        newRatio = maxSizes[0] / containerWidth
      }

      if (rightWidth < minSizes[1]) {
        newRatio = 1 - minSizes[1] / containerWidth
      } else if (rightWidth > maxSizes[1]) {
        newRatio = 1 - maxSizes[1] / containerWidth
      }

      setRatio(newRatio)
    },
    [isDragging, containerWidth, minSizes, maxSizes]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      saveRatio(ratio)
    }
  }, [isDragging, ratio, saveRatio])

  // Handle double-click to reset
  const handleDoubleClick = useCallback(() => {
    if (disabled) return
    setRatio(defaultRatio)
    saveRatio(defaultRatio)
  }, [disabled, defaultRatio, saveRatio])

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const { actualRatio } = calculateWidths()

  // Don't render split view on mobile (< 1024px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  if (isMobile || disabled) {
    return (
      <div className={className}>
        {children[0]}
        {/* On mobile, second panel could be shown as modal or separate route */}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full relative', className)}
      style={{ minHeight: '100%' }}
    >
      {/* Left Panel - scrollable independently */}
      <div
        className="overflow-y-auto overflow-x-hidden"
        style={{
          width: `${actualRatio * 100}%`,
          minWidth: `${minSizes[0]}px`,
          maxWidth: `${maxSizes[0]}px`,
          height: '100vh',
        }}
      >
        {children[0]}
      </div>

      {/* Splitter */}
      <div
        className={cn(
          'relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors cursor-col-resize select-none',
          'hover:w-1.5',
          isDragging && 'bg-blue-400 w-1.5'
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: 'col-resize',
        }}
      >
        {/* Visual indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-0.5 h-8 bg-gray-400 rounded-full" />
        </div>
      </div>

      {/* Right Panel - no overflow to allow sticky positioning */}
      <div
        className="relative"
        style={{
          width: `${(1 - actualRatio) * 100}%`,
          minWidth: `${minSizes[1]}px`,
          maxWidth: `${maxSizes[1]}px`,
        }}
      >
        {children[1]}
      </div>
    </div>
  )
}

export default ResizableSplitView
