/**
 * Utility functions for GraphQL operations
 */

/**
 * Removes undefined values from an object to prevent GraphQL errors.
 * GraphQL doesn't accept undefined values, only null or omitted fields.
 *
 * @param obj - The object to clean
 * @returns A new object with undefined values removed
 */
export function removeUndefinedValues<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        // Recursively clean nested objects
        cleaned[key] = removeUndefinedValues(value as Record<string, unknown>)
      } else {
        cleaned[key] = value
      }
    }
  }

  return cleaned as Partial<T>
}

/**
 * Validates and cleans GraphQL input objects by removing undefined values
 * and ensuring required fields are present.
 *
 * @param input - The input object to validate
 * @param requiredFields - Array of required field names
 * @returns The cleaned input object
 * @throws Error if required fields are missing
 */
export function validateGraphQLInput<T extends Record<string, unknown>>(
  input: T,
  requiredFields: (keyof T)[]
): Partial<T> {
  const cleaned = removeUndefinedValues(input)

  // Check required fields
  for (const field of requiredFields) {
    if (
      !(field in cleaned) ||
      cleaned[field] === null ||
      cleaned[field] === ''
    ) {
      throw new Error(`Required field '${String(field)}' is missing or empty`)
    }
  }

  return cleaned
}
