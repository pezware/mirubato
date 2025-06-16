import { useContext } from 'react'
import { AuthContext } from '../contexts/ImprovedAuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  // Map syncState to syncError for backward compatibility
  const { syncState, ...rest } = context
  return {
    ...rest,
    syncError: syncState.error?.message || null,
    syncState, // Also provide the full syncState for new code
  }
}
