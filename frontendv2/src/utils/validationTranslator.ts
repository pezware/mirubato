import type { z } from 'zod'
import i18n from '@/i18n/config'

/**
 * Translates validation error messages from Zod schemas
 * Handles i18n keys and provides parameter substitution
 */
export function translateValidationError(
  message: string | undefined
): string | undefined {
  if (!message) return undefined

  // Check if the message is an i18n key (format: namespace:key)
  if (message.includes(':')) {
    const translated = i18n.t(message)

    // If translation not found, return the original message
    if (translated === message) {
      // Try to extract a default message from the key
      const parts = message.split(':')
      const key = parts[parts.length - 1]

      // Convert camelCase to sentence case for fallback
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
    }

    // Apply parameter substitutions based on common patterns
    if (message.includes('maxLength')) {
      return translated.replace('{{max}}', '255') // Default max for most fields
    }
    if (message.includes('pieces.max')) {
      return translated.replace('{{max}}', '10')
    }
    if (message.includes('techniques.max')) {
      return translated.replace('{{max}}', '20')
    }
    if (message.includes('notes.maxLength')) {
      return translated.replace('{{max}}', '5000')
    }
    if (message.includes('tags.max')) {
      return translated.replace('{{max}}', '10')
    }
    if (message.includes('description.maxLength')) {
      return translated.replace('{{max}}', '1000')
    }
    if (message.includes('duration.min')) {
      return translated.replace('{{min}}', '1')
    }
    if (message.includes('duration.max')) {
      return translated.replace('{{max}}', '10')
    }
    if (message.includes('goal.targetMin')) {
      return translated.replace('{{min}}', '1')
    }

    return translated
  }

  // Return the original message if it's not an i18n key
  return message
}

/**
 * Translates all errors in a ZodError object
 */
export function translateZodErrors(error: z.ZodError): z.ZodError {
  const translatedIssues = error.issues.map(issue => ({
    ...issue,
    message: translateValidationError(issue.message) ?? issue.message,
  }))

  return {
    ...error,
    issues: translatedIssues,
  }
}

/**
 * Gets a translated field error from a ZodError
 */
export function getTranslatedFieldError(
  errors: z.ZodError | undefined,
  field: string
): string | undefined {
  if (!errors) return undefined

  const fieldError = errors.issues.find(err => err.path.join('.') === field)
  if (!fieldError) return undefined

  return translateValidationError(fieldError.message)
}

/**
 * Gets all translated errors from a ZodError
 */
export function getAllTranslatedErrors(
  errors: z.ZodError | undefined
): string[] {
  if (!errors) return []

  return errors.issues.map(err => {
    const path = err.path.join('.')
    const translatedMessage =
      translateValidationError(err.message) ?? err.message
    return path ? `${path}: ${translatedMessage}` : translatedMessage
  })
}
