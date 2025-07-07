import { createContext, useContext } from 'react'
import type { AutoLoggingContextValue } from './types'

export const AutoLoggingContext = createContext<AutoLoggingContextValue | null>(
  null
)

export const useAutoLogging = () => {
  const context = useContext(AutoLoggingContext)
  if (!context) {
    throw new Error('useAutoLogging must be used within AutoLoggingProvider')
  }
  return context
}
