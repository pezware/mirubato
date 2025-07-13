/**
 * Generate a unique ID for database records
 * Format: type_timestamp_random
 */
export function generateId(prefix: string = 'dict'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${random}`
}
