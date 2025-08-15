import { useContext } from 'react'
import { TimerContext } from '@/contexts/TimerContextType'

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider')
  }
  return context
}
