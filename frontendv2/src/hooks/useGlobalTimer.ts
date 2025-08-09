import { useTimer } from '@/hooks/useTimer'

// Export the hook from the context for convenience
export function useGlobalTimer() {
  return useTimer()
}

// Utility function to format time
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Utility function to format compact time (for badges)
export function formatCompactTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${totalSeconds}s`
}
