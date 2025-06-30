/**
 * Device detection configuration for adaptive PDF viewer
 */

// Extended Navigator type for Network Information API
interface NavigatorConnection {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g'
  downlink?: number
  rtt?: number
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection
  mozConnection?: NavigatorConnection
  webkitConnection?: NavigatorConnection
}

export const DEVICE_DETECTION_CONFIG = {
  // Memory thresholds (in GB)
  LOW_MEMORY_THRESHOLD_GB: 4,

  // Network speed thresholds (in Mbps)
  SLOW_CONNECTION_THRESHOLD_MBPS: 1,

  // Device type patterns
  MOBILE_USER_AGENTS: [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ],

  // Browser capability checks
  REQUIRED_APIS: ['IntersectionObserver', 'ResizeObserver'],

  // Performance thresholds
  LOW_PERFORMANCE_INDICATORS: {
    // If device has less than this many CPU cores
    MIN_CPU_CORES: 2,
    // If device pixel ratio is below this (low res screen)
    MIN_PIXEL_RATIO: 1.5,
  },

  // Local development detection
  LOCAL_HOSTNAMES: ['localhost', '127.0.0.1'] as readonly string[],
  LOCAL_DOMAINS: ['.localhost'] as readonly string[],
} as const

/**
 * Helper functions for device detection
 */
export const DeviceDetection = {
  /**
   * Check if the current device is mobile
   */
  isMobile(): boolean {
    return DEVICE_DETECTION_CONFIG.MOBILE_USER_AGENTS.some(regex =>
      regex.test(navigator.userAgent)
    )
  },

  /**
   * Check if the device has low memory
   */
  hasLowMemory(): boolean {
    // @ts-expect-error - navigator.deviceMemory is not in all browsers
    const memory = navigator.deviceMemory
    return memory
      ? memory < DEVICE_DETECTION_CONFIG.LOW_MEMORY_THRESHOLD_GB
      : false
  },

  /**
   * Check if the connection is slow
   */
  hasSlowConnection(): boolean {
    const nav = navigator as NavigatorWithConnection
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection
    if (!connection || !connection.effectiveType) return false

    // Map connection types to approximate speeds
    const connectionSpeeds: Record<string, number> = {
      'slow-2g': 0.05,
      '2g': 0.15,
      '3g': 0.75,
      '4g': 4,
    }

    const speed = connectionSpeeds[connection.effectiveType] || 10
    return speed < DEVICE_DETECTION_CONFIG.SLOW_CONNECTION_THRESHOLD_MBPS
  },

  /**
   * Check if running in local development
   */
  isLocalDevelopment(): boolean {
    const hostname = window.location.hostname

    return (
      DEVICE_DETECTION_CONFIG.LOCAL_HOSTNAMES.includes(hostname) ||
      DEVICE_DETECTION_CONFIG.LOCAL_DOMAINS.some(domain =>
        hostname.endsWith(domain)
      )
    )
  },

  /**
   * Check if the browser supports required APIs
   */
  hasRequiredAPIs(): boolean {
    return DEVICE_DETECTION_CONFIG.REQUIRED_APIS.every(api => api in window)
  },

  /**
   * Get a score for device capabilities (0-100)
   */
  getDeviceScore(): number {
    let score = 100

    if (this.isMobile()) score -= 20
    if (this.hasLowMemory()) score -= 20
    if (this.hasSlowConnection()) score -= 20
    if (!this.hasRequiredAPIs()) score -= 20

    if ('hardwareConcurrency' in navigator) {
      const cores = navigator.hardwareConcurrency
      if (
        cores < DEVICE_DETECTION_CONFIG.LOW_PERFORMANCE_INDICATORS.MIN_CPU_CORES
      ) {
        score -= 10
      }
    }

    if (
      window.devicePixelRatio <
      DEVICE_DETECTION_CONFIG.LOW_PERFORMANCE_INDICATORS.MIN_PIXEL_RATIO
    ) {
      score -= 10
    }

    return Math.max(0, score)
  },

  /**
   * Determine if image viewer should be used based on device capabilities
   */
  shouldUseImageViewer(): boolean {
    // Always use PDF viewer in local development
    if (this.isLocalDevelopment()) {
      return false
    }

    // Use image viewer if device score is below 50
    return this.getDeviceScore() < 50
  },
}
