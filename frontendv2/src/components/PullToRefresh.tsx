import { useState, useRef, useEffect, ReactNode } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { useAuthStore } from '@/stores/authStore'
import { useLogbookStore } from '@/stores/logbookStore'
import { useSyncTriggers } from '@/hooks'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh?: () => Promise<void>
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  className = '',
}: PullToRefreshProps) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLocalMode = useLogbookStore(state => state.isLocalMode)
  const { triggerSync } = useSyncTriggers()

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)

  const PULL_THRESHOLD = 80
  const MAX_PULL = 120

  useEffect(() => {
    if (!isAuthenticated || isLocalMode) return

    const container = containerRef.current
    if (!container) return

    let isTouching = false

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY
        isTouching = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!startY.current || !isTouching || isRefreshing) return

      const currentY = e.touches[0].clientY
      const distance = Math.min(
        MAX_PULL,
        Math.max(0, currentY - startY.current)
      )

      if (distance > 0 && container.scrollTop === 0) {
        e.preventDefault()
        setPullDistance(distance)
      }
    }

    const handleTouchEnd = async () => {
      if (!isTouching) return

      isTouching = false
      startY.current = null

      if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true)

        try {
          if (onRefresh) {
            await onRefresh()
          } else {
            await triggerSync()
          }
        } catch (error) {
          console.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
        }
      }

      setPullDistance(0)
    }

    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [
    isAuthenticated,
    isLocalMode,
    isRefreshing,
    pullDistance,
    onRefresh,
    triggerSync,
  ])

  // Don't enable pull-to-refresh if not authenticated or in local mode
  if (!isAuthenticated || isLocalMode) {
    return <div className={className}>{children}</div>
  }

  const pullProgress = Math.min(1, pullDistance / PULL_THRESHOLD)
  const opacity = pullProgress
  const scale = 0.8 + pullProgress * 0.2
  const rotation = pullProgress * 180

  return (
    <div className={`relative ${className}`}>
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none transition-transform"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity,
        }}
      >
        <div
          className={`p-2 bg-white rounded-full shadow-lg ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <IconRefresh
            className={`h-6 w-6 ${
              pullDistance > PULL_THRESHOLD ? 'text-blue-500' : 'text-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{
          transform: isRefreshing
            ? 'translateY(60px)'
            : `translateY(${pullDistance * 0.5}px)`,
          transition:
            isRefreshing || pullDistance === 0 ? 'transform 0.2s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
