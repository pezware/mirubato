import { useEffect, useState, useCallback, RefObject } from 'react'

// =============================================================================
// Zod 4 Compatible Types
// =============================================================================

/**
 * Zod 4 changed its internal type system significantly.
 * This interface provides a duck-typed approach that works with both Zod 3 and 4
 * by only requiring the methods we actually use.
 */
interface ZodSafeParseable<T = unknown> {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: ZodErrorLike }
}

interface ZodErrorLike {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
}

/** Type for navigating nested Zod schemas (works with Zod 4) */
interface ZodSchemaWithShape {
  shape?: Record<string, ZodSafeParseable>
}

interface ZodSchemaWithElement {
  element?: ZodSafeParseable
}

/**
 * Custom hook for managing modal state
 * Eliminates repetitive modal state management code across components
 *
 * @param initialState - Initial open state (default: false)
 * @returns Object with isOpen state and open/close/toggle functions
 *
 * @example
 * ```tsx
 * const modal = useModal()
 *
 * return (
 *   <>
 *     <button onClick={modal.open}>Open Modal</button>
 *     <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *       Content
 *     </Modal>
 *   </>
 * )
 * ```
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

/** Return type for useModal hook */
export type UseModalReturn = ReturnType<typeof useModal>

/**
 * Hook for managing multiple modals in a component
 *
 * @param _modalNames - Array of modal identifiers (unused but kept for API consistency)
 * @returns Object with modal states and controls for each modal
 *
 * @example
 * ```tsx
 * const modals = useModals(['edit', 'delete', 'confirm'] as const)
 *
 * return (
 *   <>
 *     <button onClick={() => modals.open('edit')}>Edit</button>
 *     <Modal isOpen={modals.isOpen('edit')} onClose={() => modals.close('edit')}>
 *       Edit content
 *     </Modal>
 *   </>
 * )
 * ```
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

/** Return type for useModals hook */
export type UseModalsReturn<T extends string> = ReturnType<typeof useModals<T>>

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

// =============================================================================
// Form Validation Hook (requires Zod peer dependency)
// =============================================================================

interface ValidationState {
  errors: Record<string, string>
  isValid: boolean
}

/** Options for useFormValidation hook */
export interface UseFormValidationOptions<T> {
  /** Zod schema to validate against (works with Zod 3 and 4) */
  schema: ZodSafeParseable<T>
  /** Optional callback when validation fails */
  onValidationError?: (errors: ZodErrorLike) => void
}

/**
 * Hook for form validation using Zod schemas
 *
 * @param options - Validation options including schema and error callback
 * @returns Object with validation functions and state
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * })
 *
 * const { validate, errors, getFieldError } = useFormValidation({ schema })
 *
 * const handleSubmit = () => {
 *   const result = validate(formData)
 *   if (result.isValid) {
 *     // Submit form
 *   }
 * }
 *
 * return (
 *   <Input
 *     error={getFieldError('email')}
 *     ...
 *   />
 * )
 * ```
 */
export function useFormValidation<T>({
  schema,
  onValidationError,
}: UseFormValidationOptions<T>) {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: true,
  })

  const validate = useCallback(
    (data: unknown): { isValid: boolean; data?: T } => {
      const result = schema.safeParse(data)

      if (result.success) {
        setValidationState({ errors: {}, isValid: true })
        return { isValid: true, data: result.data }
      }

      // Convert Zod errors to field-based error map
      const errors: Record<string, string> = {}
      result.error.issues.forEach(err => {
        // Convert PropertyKey[] to string path (filter out symbols)
        const path = err.path
          .filter((p): p is string | number => typeof p !== 'symbol')
          .join('.')
        if (!errors[path]) {
          errors[path] = err.message
        }
      })

      setValidationState({ errors, isValid: false })
      onValidationError?.(result.error)

      return { isValid: false }
    },
    [schema, onValidationError]
  )

  const validateField = useCallback(
    (fieldName: string, value: unknown): string | undefined => {
      // Create a partial schema for single field validation
      try {
        const fieldPath = fieldName.split('.')
        let fieldSchema: ZodSafeParseable = schema as ZodSafeParseable

        // Navigate to the specific field schema (duck-typed for Zod 3/4 compat)
        for (const segment of fieldPath) {
          const schemaWithShape = fieldSchema as unknown as ZodSchemaWithShape
          const schemaWithElement =
            fieldSchema as unknown as ZodSchemaWithElement

          if (schemaWithShape.shape) {
            // Navigate into object schema
            fieldSchema = schemaWithShape.shape[segment]
          } else if (schemaWithElement.element) {
            // Navigate into array schema
            fieldSchema = schemaWithElement.element
          }
        }

        const result = fieldSchema.safeParse(value)

        if (result.success) {
          // Clear error for this field
          setValidationState(prev => {
            const newErrors = { ...prev.errors }
            delete newErrors[fieldName]
            return {
              errors: newErrors,
              isValid: Object.keys(newErrors).length === 0,
            }
          })
          return undefined
        }

        const error = result.error.issues[0]?.message || 'Invalid value'

        // Set error for this field
        setValidationState(prev => ({
          errors: { ...prev.errors, [fieldName]: error },
          isValid: false,
        }))

        return error
      } catch {
        // If we can't validate the specific field, skip validation
        return undefined
      }
    },
    [schema]
  )

  const clearErrors = useCallback(() => {
    setValidationState({ errors: {}, isValid: true })
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newErrors = { ...prev.errors }
      delete newErrors[fieldName]
      return {
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      }
    })
  }, [])

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return validationState.errors[fieldName]
    },
    [validationState.errors]
  )

  const hasErrors = useCallback((): boolean => {
    return Object.keys(validationState.errors).length > 0
  }, [validationState.errors])

  return {
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasErrors,
    errors: validationState.errors,
    isValid: validationState.isValid,
  }
}

/** Return type for useFormValidation hook */
export type UseFormValidationReturn<T> = ReturnType<typeof useFormValidation<T>>
