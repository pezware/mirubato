import Button, { type ButtonProps } from './Button'
import { useClickProtection } from '@/hooks/useSubmissionProtection'
import { forwardRef, useImperativeHandle } from 'react'

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

export interface ProtectedButtonRef {
  /** Reset the button's internal loading state */
  resetState: () => void
}

/**
 * Button component with built-in click protection and debouncing
 * Prevents rapid clicking and provides visual feedback during processing
 */
const ProtectedButton = forwardRef<ProtectedButtonRef, ProtectedButtonProps>(
  function ProtectedButton(
    {
      onClick,
      debounceMs,
      loadingText = 'Processing...',
      showLoadingState = true,
      externalLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    const { handleClick, isClicking, reset } = useClickProtection(
      onClick,
      debounceMs
    )

    // Expose reset function through ref
    useImperativeHandle(ref, () => ({
      resetState: reset,
    }))

    // Use external loading state if provided, otherwise use internal state
    const isLoading = externalLoading || isClicking
    const isDisabled = disabled || isLoading

    return (
      <Button
        {...props}
        onClick={handleClick}
        disabled={isDisabled}
        className={`${props.className || ''} ${
          isLoading ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isLoading && showLoadingState ? loadingText : children}
      </Button>
    )
  }
)

export default ProtectedButton
