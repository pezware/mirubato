import { nanoid } from 'nanoid'

/**
 * Device ID utility for generating and managing unique device identifiers
 * Used for sync deduplication and tracking across different devices
 */

const DEVICE_ID_KEY = 'mirubato:device-id'
const DEVICE_INFO_KEY = 'mirubato:device-info'

interface DeviceInfo {
  id: string
  userAgent: string
  platform: string
  screen: string
  timezone: string
  language: string
  createdAt: string
  lastUsedAt: string
}

/**
 * Get or create a unique device ID
 * This ID persists across browser sessions and is used for sync deduplication
 */
export function getOrCreateDeviceId(): string {
  try {
    // Try to get existing device ID
    const existingId = localStorage.getItem(DEVICE_ID_KEY)
    if (existingId && existingId.startsWith('dev_')) {
      // Update last used timestamp
      updateDeviceInfo(existingId)
      return existingId
    }

    // Generate new device ID
    const deviceId = `dev_${nanoid(16)}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)

    // Store device info for debugging and analytics
    const deviceInfo: DeviceInfo = {
      id: deviceId,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    }

    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo))

    console.log(`[DeviceID] Generated new device ID: ${deviceId}`)
    return deviceId
  } catch (error) {
    // Fallback for environments without localStorage or restricted access
    console.warn(
      '[DeviceID] Failed to persist device ID, using session-only ID:',
      error
    )
    return `session_${nanoid(16)}`
  }
}

/**
 * Update device info timestamp when device is used
 */
function updateDeviceInfo(_deviceId: string): void {
  try {
    const existingInfo = localStorage.getItem(DEVICE_INFO_KEY)
    if (existingInfo) {
      const info = JSON.parse(existingInfo) as DeviceInfo
      info.lastUsedAt = new Date().toISOString()
      localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info))
    }
  } catch (error) {
    // Ignore errors in device info updates
    console.warn('[DeviceID] Failed to update device info:', error)
  }
}

/**
 * Get device information for debugging purposes
 */
export function getDeviceInfo(): DeviceInfo | null {
  try {
    const info = localStorage.getItem(DEVICE_INFO_KEY)
    return info ? JSON.parse(info) : null
  } catch (error) {
    console.warn('[DeviceID] Failed to get device info:', error)
    return null
  }
}

/**
 * Generate content-based idempotency key for API requests
 * Combines device ID, operation, and content hash for uniqueness
 */
export function generateIdempotencyKey(
  method: string,
  url: string,
  data?: unknown
): string {
  const deviceId = getOrCreateDeviceId()
  const timestamp = Date.now()

  // Create content hash
  const contentString = data ? JSON.stringify(data) : ''
  const contentHash = simpleHash(contentString)

  // Create unique key combining all factors
  const key = `${deviceId}_${method}_${simpleHash(url)}_${contentHash}_${timestamp}`

  return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64)
}

/**
 * Generate a deterministic idempotency key for the same request content
 * Useful for operations like /api/sync/push to safely replay on retry.
 */
export function generateDeterministicIdempotencyKey(
  method: string,
  url: string,
  data?: unknown
): string {
  const deviceId = getOrCreateDeviceId()

  const normalizedData = deepSort(data)
  const contentString = normalizedData ? JSON.stringify(normalizedData) : ''
  const urlHash = simpleHash(url)
  const contentHash = simpleHash(contentString)

  const key = `${deviceId}_${method}_${urlHash}_${contentHash}`
  return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64)
}

/**
 * Simple hash function for content hashing
 * Not cryptographically secure, but sufficient for idempotency keys
 */
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

// Recursively sort object keys for stable hashing
function deepSort<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(v => deepSort(v)) as unknown as T
  if (typeof value === 'object') {
    const obj = value as unknown as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    Object.keys(obj)
      .sort()
      .forEach(k => {
        sorted[k] = deepSort(obj[k])
      })
    return sorted as unknown as T
  }
  return value
}

/**
 * Reset device ID (useful for testing or privacy concerns)
 */
export function resetDeviceId(): string {
  try {
    localStorage.removeItem(DEVICE_ID_KEY)
    localStorage.removeItem(DEVICE_INFO_KEY)
    console.log('[DeviceID] Device ID reset')
  } catch (error) {
    console.warn('[DeviceID] Failed to reset device ID:', error)
  }

  return getOrCreateDeviceId()
}

/**
 * Check if current device ID is valid
 */
export function isValidDeviceId(deviceId?: string): boolean {
  if (!deviceId) return false
  return deviceId.startsWith('dev_') || deviceId.startsWith('session_')
}
