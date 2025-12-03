// Re-export all date utilities from @mirubato/ui
// This file maintains backward compatibility for existing imports
export {
  formatDuration,
  formatDurationLong,
  formatDate,
  formatTime,
  formatDateTime,
  formatDateForInput,
  formatDateSeparator,
  formatFullDate,
  getDayOfWeek,
  getMonthYear,
  formatMonthGroup,
  formatRelativeTime,
  capitalizeTimeString,
  checkIsToday,
  checkIsYesterday,
  formatTimeOnly,
  getDateLocale,
  // Timer utilities (for raw seconds)
  formatTimerDisplay,
  formatTimerCompact,
} from '@mirubato/ui'
