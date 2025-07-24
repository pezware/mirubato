// Simple toast wrapper for notification
// This is a temporary implementation until a proper toast system is integrated

export const toast = {
  success: (message: string) => {
    console.log('[SUCCESS]', message)
    // TODO: Integrate with actual toast notification system
  },
  error: (message: string) => {
    console.error('[ERROR]', message)
    // TODO: Integrate with actual toast notification system
  },
  warning: (message: string) => {
    console.warn('[WARNING]', message)
    // TODO: Integrate with actual toast notification system
  },
  info: (message: string) => {
    console.info('[INFO]', message)
    // TODO: Integrate with actual toast notification system
  },
}
