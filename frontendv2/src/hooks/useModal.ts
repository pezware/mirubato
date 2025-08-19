import { useState, useCallback } from 'react'

/**
 * Custom hook for managing modal state
 * Eliminates repetitive modal state management code across components
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen, // For cases where direct control is needed
  }
}

/**
 * Hook for managing multiple modals in a component
 * @param _modalNames - Array of modal identifiers (unused but kept for API consistency)
 * @returns Object with modal states and controls for each modal
 */
export function useModals<T extends string>(_modalNames: readonly T[]) {
  const [openModals, setOpenModals] = useState<Set<T>>(new Set())

  const isOpen = useCallback(
    (modalName: T) => {
      return openModals.has(modalName)
    },
    [openModals]
  )

  const open = useCallback((modalName: T) => {
    setOpenModals(prev => new Set(prev).add(modalName))
  }, [])

  const close = useCallback((modalName: T) => {
    setOpenModals(prev => {
      const next = new Set(prev)
      next.delete(modalName)
      return next
    })
  }, [])

  const toggle = useCallback((modalName: T) => {
    setOpenModals(prev => {
      const next = new Set(prev)
      if (next.has(modalName)) {
        next.delete(modalName)
      } else {
        next.add(modalName)
      }
      return next
    })
  }, [])

  const closeAll = useCallback(() => {
    setOpenModals(new Set())
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    closeAll,
  }
}
