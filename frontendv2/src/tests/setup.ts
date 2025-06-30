import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as Storage

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
