import { nanoid } from 'nanoid'

const DEVICE_ID_KEY = 'mirubato:deviceId'
const DEVICE_NAME_KEY = 'mirubato:deviceName'

/**
 * Device metadata for tracking different devices/browsers
 */
export interface DeviceMetadata {
  deviceId: string
  deviceName: string
  lastSeen: number
  userAgent: string
  platform: string
}

/**
 * Get or create a unique device ID for this browser/device
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = `device_${nanoid()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}

/**
 * Get the device name (auto-generated from user agent and platform)
 */
export function getDeviceName(): string {
  let deviceName = localStorage.getItem(DEVICE_NAME_KEY)

  if (!deviceName) {
    const ua = navigator.userAgent
    const platform = navigator.platform

    // Extract browser name
    let browser = 'Unknown Browser'
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'

    // Extract OS/Platform
    let os = platform
    if (platform.includes('Win')) os = 'Windows'
    else if (platform.includes('Mac')) os = 'macOS'
    else if (platform.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad'))
      os = 'iOS'

    deviceName = `${browser} on ${os}`
    localStorage.setItem(DEVICE_NAME_KEY, deviceName)
  }

  return deviceName
}

/**
 * Get complete device metadata
 */
export function getDeviceMetadata(): DeviceMetadata {
  return {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    lastSeen: Date.now(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
  }
}

/**
 * Update device last seen timestamp
 */
export function updateDeviceLastSeen(): void {
  // This would typically be called on app startup or during sync
  const metadata = getDeviceMetadata()

  // Store in localStorage for local tracking
  localStorage.setItem('mirubato:deviceMetadata', JSON.stringify(metadata))
}

/**
 * Clear device ID (useful for testing or user-initiated reset)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY)
  localStorage.removeItem(DEVICE_NAME_KEY)
  localStorage.removeItem('mirubato:deviceMetadata')
}
