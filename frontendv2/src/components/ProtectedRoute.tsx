import { type ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // This component allows both authenticated and anonymous users
  // The logbook store now handles local/remote mode automatically
  return <>{children}</>
}
