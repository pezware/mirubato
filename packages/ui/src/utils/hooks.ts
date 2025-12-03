import { useEffect, RefObject } from 'react'

/**
 * Hook that handles click-outside detection for dropdown menus, modals, etc.
 *
 * @param refs - Array of refs to elements that should NOT trigger the callback when clicked
 * @param callback - Function to call when click occurs outside all provided refs
 * @param enabled - Whether the hook is active (default: true)
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const menuRef = useRef<HTMLDivElement>(null)
 *
 * useClickOutside([containerRef, menuRef], () => {
 *   setIsOpen(false)
 * }, isOpen)
 * ```
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node

      // Check if click is outside ALL provided refs
      const isOutside = refs.every(ref => {
        return !ref.current || !ref.current.contains(target)
      })

      if (isOutside) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [refs, callback, enabled])
}
