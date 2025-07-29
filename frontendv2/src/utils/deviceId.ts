import { v4 as uuidv4 } from 'uuid'

const DEVICE_ID_KEY = 'mirubato_device_id'
const DEVICE_NAME_KEY = 'mirubato_device_name'

// Type definitions
interface NetworkInformation {
  effectiveType: string
  downlink?: number
  rtt?: number
}

interface DeviceInfo {
  id: string
  name: string
  platform: string
  userAgent: string
  screen: {
    width: number
    height: number
    pixelRatio: number
  }
  connection?: {
    type: string
    downlink?: number
    rtt?: number
  }
}

/**
 * Get or generate a persistent device ID for this browser/device
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    // Generate new device ID with prefix for identification
    const platform = detectPlatform()
    deviceId = `${platform}_${uuidv4()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)

    // Also set a default device name
    const deviceName = generateDeviceName()
    localStorage.setItem(DEVICE_NAME_KEY, deviceName)
  }

  return deviceId
}

/**
 * Get the device name (user-friendly identifier)
 */
export function getDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) || generateDeviceName()
}

/**
 * Update the device name
 */
export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name)
}

/**
 * Detect the platform/browser type
 */
function detectPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase()

  // Check for mobile devices first
  if (/iphone|ipod/.test(userAgent)) return 'ios'
  if (/ipad/.test(userAgent)) return 'ipad'
  if (/android/.test(userAgent)) return 'android'

  // Check for desktop browsers
  if (/edg/.test(userAgent)) return 'edge'
  if (/chrome/.test(userAgent)) return 'chrome'
  if (/safari/.test(userAgent)) return 'safari'
  if (/firefox/.test(userAgent)) return 'firefox'

  return 'web'
}

/**
 * Generate a default device name based on browser and date
 */
function generateDeviceName(): string {
  const platform = detectPlatform()
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const platformNames: Record<string, string> = {
    ios: 'iPhone',
    ipad: 'iPad',
    android: 'Android',
    edge: 'Edge Browser',
    chrome: 'Chrome Browser',
    safari: 'Safari Browser',
    firefox: 'Firefox Browser',
    web: 'Web Browser',
  }

  return `${platformNames[platform] || 'Browser'} - ${date}`
}

/**
 * Get device information for debugging
 */
export function getDeviceInfo(): DeviceInfo {
  const info: DeviceInfo = {
    id: getDeviceId(),
    name: getDeviceName(),
    platform: detectPlatform(),
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
    },
  }

  // Add connection info if available
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: NetworkInformation })
      .connection
    if (conn) {
      info.connection = {
        type: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      }
    }
  }

  return info
}

/**
 * Clear device information (for testing/reset)
 */
export function clearDeviceInfo(): void {
  localStorage.removeItem(DEVICE_ID_KEY)
  localStorage.removeItem(DEVICE_NAME_KEY)
}
