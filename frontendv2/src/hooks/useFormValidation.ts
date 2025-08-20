import { useState, useCallback } from 'react'
import type { z } from 'zod'

interface ValidationState {
  errors: Record<string, string>
  isValid: boolean
}

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>
  onValidationError?: (errors: z.ZodError) => void
}

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
        const path = err.path.join('.')
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
        let fieldSchema: z.ZodTypeAny = schema

        // Navigate to the specific field schema
        for (const segment of fieldPath) {
          if ('shape' in fieldSchema) {
            // Type assertion for ZodObject
            const objectSchema = fieldSchema as z.ZodObject<
              Record<string, z.ZodTypeAny>
            >
            fieldSchema = objectSchema.shape[segment]
          } else if ('element' in fieldSchema) {
            // Type assertion for ZodArray
            const arraySchema = fieldSchema as z.ZodArray<z.ZodTypeAny>
            fieldSchema = arraySchema.element
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
