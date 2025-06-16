import { useEffect } from 'react'
import { useSync } from '../hooks/useSync'

/**
 * Component that initializes sync at app level
 * Should be placed inside AuthProvider and ModulesProvider
 */
export const SyncInitializer: React.FC = () => {
  const { syncState } = useSync()

  useEffect(() => {
    // Log sync state changes for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Sync state changed:', syncState)
    }
  }, [syncState])

  // This component doesn't render anything
  return null
}
