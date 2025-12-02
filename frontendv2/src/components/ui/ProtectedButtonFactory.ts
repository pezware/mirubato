import React from 'react'
import ProtectedButton, { type ProtectedButtonProps } from './ProtectedButton'

/**
 * Quick factory function for creating protected buttons with common patterns
 */
export function createProtectedButton(
  defaultProps: Partial<ProtectedButtonProps> = {}
) {
  return function CustomProtectedButton(props: ProtectedButtonProps) {
    return React.createElement(ProtectedButton, { ...defaultProps, ...props })
  }
}

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
