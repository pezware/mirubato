import { ReactNode } from 'react'
import { useSyncTriggers } from '../hooks'

interface SyncProviderProps {
  children: ReactNode
}

/**
 * Provider component that initializes sync triggers.
 * Must be used inside Router context since useSyncTriggers uses useLocation.
 */
export function SyncProvider({ children }: SyncProviderProps) {
  // Enable automatic sync triggers
  useSyncTriggers({
    enableVisibility: true,
    enableRouteChange: true,
    enablePeriodic: true,
    periodicInterval: 30000, // 30 seconds
  })

  return <>{children}</>
}
