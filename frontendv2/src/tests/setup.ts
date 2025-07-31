// Global test setup for all test files
import { vi } from 'vitest'

// Mock IndexedDB globally
class MockIDBRequest {
  result: any = null
  error: any = null
  onsuccess: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
}

class MockIDBTransaction {
  objectStore() {
    return {
      put: vi.fn(() => new MockIDBRequest()),
      get: vi.fn(() => new MockIDBRequest()),
      delete: vi.fn(() => new MockIDBRequest()),
      clear: vi.fn(() => new MockIDBRequest()),
      getAll: vi.fn(() => new MockIDBRequest()),
    }
  }
}

class MockIDBDatabase {
  transaction() {
    return new MockIDBTransaction()
  }
  close() {}
}

const mockIndexedDB = {
  open: vi.fn(() => {
    const request = new MockIDBRequest()
    setTimeout(() => {
      request.result = new MockIDBDatabase()
      if (request.onsuccess) {
        request.onsuccess({ target: request })
      }
    }, 0)
    return request
  }),
  deleteDatabase: vi.fn(() => new MockIDBRequest()),
}

// Define globally for all tests
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// Mock other browser APIs that might be needed
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
})
