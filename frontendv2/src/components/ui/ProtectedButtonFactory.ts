import { createProtectedButton } from '@mirubato/ui'

/**
 * Pre-configured protected button for "Log Practice" actions
 */
export const LogPracticeButton = createProtectedButton({
  variant: 'primary',
  debounceMs: 300,
  loadingText: 'Opening form...',
  showLoadingState: true,
})

/**
 * Pre-configured protected button for form submissions
 */
export const SubmitButton = createProtectedButton({
  variant: 'primary',
  debounceMs: 500,
  loadingText: 'Submitting...',
  showLoadingState: true,
})
