import { useTimer } from '@/hooks/useTimer'
import { formatTimerDisplay, formatTimerCompact } from '@mirubato/ui'

// Export the hook from the context for convenience
export function useGlobalTimer() {
  return useTimer()
}

// Re-export timer utilities with legacy names for backward compatibility
// New code should use formatTimerDisplay and formatTimerCompact directly from @mirubato/ui
export const formatTime = formatTimerDisplay
export const formatCompactTime = formatTimerCompact
