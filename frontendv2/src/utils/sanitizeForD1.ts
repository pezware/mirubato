/**
 * Sanitize data to ensure D1 compatibility by converting undefined to null
 * This mirrors the backend sanitization to ensure data is clean before sending
 */
export function sanitizeForD1(data: unknown, visited = new WeakSet()): unknown {
  if (data === undefined) return null
  if (data === null) return null
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForD1(item, visited))
  }
  if (typeof data === 'object' && data !== null) {
    // Prevent infinite recursion on circular references
    if (visited.has(data)) {
      return {}
    }
    visited.add(data)

    const sanitized: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      sanitized[key] = sanitizeForD1(value, visited)
    })
    return sanitized
  }
  return data
}
