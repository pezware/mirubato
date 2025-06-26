import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

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

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    position: 0,
    seconds: 0,
    state: 'stopped',
  },
  Sampler: vi.fn(() => ({
    toDestination: vi.fn(),
    dispose: vi.fn(),
  })),
  Draw: {
    schedule: vi.fn(),
  },
}))

// Mock VexFlow
vi.mock('vexflow', () => ({
  Renderer: vi.fn(() => ({
    resize: vi.fn(),
    getContext: vi.fn(() => ({
      clear: vi.fn(),
    })),
  })),
  Stave: vi.fn(() => ({
    addClef: vi.fn(),
    addTimeSignature: vi.fn(),
    setContext: vi.fn(),
    draw: vi.fn(),
  })),
  StaveNote: vi.fn(() => ({
    setContext: vi.fn(),
    draw: vi.fn(),
  })),
  Voice: vi.fn(() => ({
    addTickables: vi.fn(),
    draw: vi.fn(),
  })),
  Formatter: {
    FormatAndDraw: vi.fn(),
  },
}))
