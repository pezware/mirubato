import { Button, type ButtonProps } from '@mirubato/ui'
import { useClickProtection } from '@/hooks/useSubmissionProtection'

interface ProtectedButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The action to perform when clicked */
  onClick: () => void | Promise<void>
  /** Debounce delay in milliseconds (default: 300 for mobile, 150 for desktop) */
  debounceMs?: number
  /** Loading text to show during submission */
  loadingText?: string
  /** Whether to show loading state (default: true) */
  showLoadingState?: boolean
}

/**
 * Button component with built-in click protection and debouncing
 * Prevents rapid clicking and provides visual feedback during processing
 */
export default function ProtectedButton({
  onClick,
  debounceMs,
  loadingText = 'Processing...',
  showLoadingState = true,
  children,
  disabled,
  ...props
}: ProtectedButtonProps) {
  const { handleClick, isClicking } = useClickProtection(onClick, debounceMs)

  const isDisabled = disabled || isClicking

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={isDisabled}
      className={`${props.className || ''} ${
        isClicking ? 'opacity-75 cursor-not-allowed' : ''
      }`}
    >
      {isClicking && showLoadingState ? loadingText : children}
    </Button>
  )
}
