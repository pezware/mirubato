import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi, afterEach, beforeAll } from 'vitest'

// Silence console output in tests to reduce memory usage
// const originalConsole = {
//   log: console.log,
//   warn: console.warn,
//   info: console.info,
//   debug: console.debug,
// }

beforeAll(() => {
  // Reduce console output in tests
  const isVerbose = process.env.VERBOSE_TESTS === 'true'
  if (!isVerbose) {
    console.log = vi.fn()
    console.info = vi.fn()
    console.debug = vi.fn()
    // Keep warn and error for important messages
  }
})

// Comprehensive cleanup after each test to prevent memory leaks
afterEach(() => {
  // Clean up React components
  cleanup()

  // Clear all mocks and their history
  vi.clearAllMocks()
  vi.clearAllTimers()

  // Reset fake timers if they were used
  if (vi.isFakeTimers()) {
    vi.useRealTimers()
  }

  // Clear localStorage and sessionStorage
  localStorage.clear()
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear()
  }

  // Clean up store event listeners and timers via global handoff
  declare global {
    var __cleanupLogbookStore: (() => void) | undefined
    var __cleanupRepertoireStore: (() => void) | undefined
    var __cleanupAuthStore: (() => void) | undefined
  }

  const cleanupFunctions = [
    globalThis.__cleanupLogbookStore,
    globalThis.__cleanupRepertoireStore,
    globalThis.__cleanupAuthStore,
  ]

  cleanupFunctions.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      try {
        cleanup()
      } catch {
        // Ignore cleanup errors in tests
      }
    }
  })

  // Clear any pending promises or microtasks
  return new Promise(resolve => setImmediate(resolve))
})

// Mock localStorage with actual storage functionality
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem = vi.fn((key: string) => {
    return this.store[key] || null
  })

  setItem = vi.fn((key: string, value: string) => {
    this.store[key] = value.toString()
  })

  removeItem = vi.fn((key: string) => {
    delete this.store[key]
  })

  clear = vi.fn(() => {
    this.store = {}
  })

  get length() {
    return Object.keys(this.store).length
  }

  key = vi.fn((index: number) => {
    const keys = Object.keys(this.store)
    return keys[index] || null
  })
}

global.localStorage = new LocalStorageMock() as unknown as Storage

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for HeadlessUI components
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  root = null
  rootMargin = ''
  thresholds = []
  takeRecords = vi.fn(() => [])
}

global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

// Mock DOMMatrix for PDF.js
global.DOMMatrix = vi.fn().mockImplementation(() => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  m11: 1,
  m12: 0,
  m13: 0,
  m14: 0,
  m21: 0,
  m22: 1,
  m23: 0,
  m24: 0,
  m31: 0,
  m32: 0,
  m33: 1,
  m34: 0,
  m41: 0,
  m42: 0,
  m43: 0,
  m44: 1,
  is2D: true,
  isIdentity: true,
  multiply: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  skewX: vi.fn(),
  skewY: vi.fn(),
  flipX: vi.fn(),
  flipY: vi.fn(),
  inverse: vi.fn(),
  transformPoint: vi.fn(),
  toFloat32Array: vi.fn(),
  toFloat64Array: vi.fn(),
  toString: vi.fn(),
}))

// Mock OffscreenCanvas for PDF rendering
global.OffscreenCanvas = vi.fn().mockImplementation((width, height) => ({
  width,
  height,
  getContext: vi.fn().mockImplementation(() => ({
    putImageData: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  })),
}))

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn().mockImplementation(callback => {
  setTimeout(() => callback({ timeRemaining: () => 50 }), 0)
  return 1
})
