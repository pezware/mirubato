import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi, afterEach, beforeAll } from 'vitest'

// Reduce console noise in tests
beforeAll(() => {
  const isVerbose = process.env.VERBOSE_TESTS === 'true'
  if (!isVerbose) {
    console.log = vi.fn()
    console.info = vi.fn()
    console.debug = vi.fn()
  }
})

// Comprehensive cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.clearAllTimers()

  if (vi.isFakeTimers()) {
    vi.useRealTimers()
  }
})

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver (used by some UI components)
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }
})

// Mock IntersectionObserver (used by HeadlessUI and other components)
class IntersectionObserverMock {
  root = null
  rootMargin = ''
  thresholds: number[] = []

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])

  constructor(
    _callback?: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})
