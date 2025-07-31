import React from 'react'
import type { ButtonProps } from './Button'
import ProtectedButton, { type ProtectedButtonRef } from './ProtectedButton'

interface ProtectedButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The action to perform when clicked */
  onClick: () => void | Promise<void>
  /** Debounce delay in milliseconds (default: 300 for mobile, 150 for desktop) */
  debounceMs?: number
  /** Loading text to show during submission */
  loadingText?: string
  /** Whether to show loading state (default: true) */
  showLoadingState?: boolean
  /** External loading state that overrides internal state */
  externalLoading?: boolean
}

/**
 * Quick factory function for creating protected buttons with common patterns
 */
export function createProtectedButton(
  defaultProps: Partial<ProtectedButtonProps> = {}
) {
  return React.forwardRef<ProtectedButtonRef, ProtectedButtonProps>(
    function CustomProtectedButton(props, ref) {
      return React.createElement(ProtectedButton, {
        ...defaultProps,
        ...props,
        ref,
      })
    }
  )
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
