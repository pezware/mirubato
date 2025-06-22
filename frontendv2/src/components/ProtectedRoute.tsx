import { ReactNode } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useLogbookStore } from '../stores/logbookStore'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const { setLocalMode } = useLogbookStore()

  // This component allows both authenticated and anonymous users
  // It just sets the mode for data storage
  if (!isAuthenticated) {
    setLocalMode(true)
  } else {
    setLocalMode(false)
  }

  // Always render children - no actual protection
  return <>{children}</>
}
