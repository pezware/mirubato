import { SecureStorage, secureStorage, tokenStorage } from './secureStorage'

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-encryption-key-1234567890'),
}))

describe('SecureStorage', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear()
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('basic operations', () => {
    it('stores and retrieves data with session storage by default', () => {
      const data = { user: 'test', id: 123 }
      secureStorage.setItem('test-data', data)

      const retrieved = secureStorage.getItem<typeof data>('test-data')
      expect(retrieved).toEqual(data)
    })

    it('stores and retrieves data with localStorage when persistent', () => {
      const data = 'persistent-value'
      secureStorage.setItem('test-data', data, { persistent: true })

      const retrieved = secureStorage.getItem<string>('test-data', true)
      expect(retrieved).toBe(data)
    })

    it('returns null for non-existent items', () => {
      const result = secureStorage.getItem('non-existent')
      expect(result).toBeNull()
    })

    it('removes items correctly', () => {
      secureStorage.setItem('test-data', 'value')
      secureStorage.removeItem('test-data')

      const result = secureStorage.getItem('test-data')
      expect(result).toBeNull()
    })

    it('encrypts data before storing', () => {
      const data = { secret: 'sensitive-info' }
      secureStorage.setItem('test-data', data)

      const rawValue = sessionStorage.getItem('secure_test-data')
      expect(rawValue).toBeDefined()
      expect(rawValue).not.toContain('sensitive-info')
      expect(rawValue).not.toContain('secret')
    })
  })

  describe('TTL handling', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('respects TTL and expires data', () => {
      const data = 'expires-soon'
      secureStorage.setItem('test-data', data, { ttl: 1000 }) // 1 second

      // Should exist immediately
      expect(secureStorage.getItem('test-data')).toBe(data)

      // Advance time past TTL
      jest.advanceTimersByTime(1500)

      // Should be expired and return null
      expect(secureStorage.getItem('test-data')).toBeNull()
    })

    it('removes expired items from storage', () => {
      secureStorage.setItem('test-data', 'value', { ttl: 1000 })

      jest.advanceTimersByTime(1500)
      secureStorage.getItem('test-data') // This should trigger removal

      expect(sessionStorage.getItem('secure_test-data')).toBeNull()
    })
  })

  describe('clear functionality', () => {
    it('clears all secure items from both storages', () => {
      // Add items to both storages
      secureStorage.setItem('session-item', 'value1', { persistent: false })
      secureStorage.setItem('local-item', 'value2', { persistent: true })

      // Add non-secure items that should not be cleared
      sessionStorage.setItem('regular-item', 'keep-me')
      localStorage.setItem('regular-item', 'keep-me-too')

      secureStorage.clear()

      // Secure items should be gone
      expect(secureStorage.getItem('session-item')).toBeNull()
      expect(secureStorage.getItem('local-item', true)).toBeNull()

      // Regular items should remain
      expect(sessionStorage.getItem('regular-item')).toBe('keep-me')
      expect(localStorage.getItem('regular-item')).toBe('keep-me-too')
    })
  })

  describe('error handling', () => {
    it('handles corrupted data gracefully', () => {
      // Manually set corrupted data
      sessionStorage.setItem('secure_test-data', 'corrupted-not-base64!')

      const result = secureStorage.getItem('test-data')
      expect(result).toBeNull()

      // Should remove corrupted item
      expect(sessionStorage.getItem('secure_test-data')).toBeNull()
    })

    it('handles invalid JSON gracefully', () => {
      // Create a new instance to get consistent encryption
      const storage = new SecureStorage()

      // Manually create invalid encrypted JSON
      const invalidJson = btoa('{invalid json}')
      sessionStorage.setItem('secure_test-data', invalidJson)

      const result = storage.getItem('test-data')
      expect(result).toBeNull()
    })
  })
})

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe('access token management', () => {
    it('stores access token in session storage', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      tokenStorage.setAccessToken(token)

      expect(tokenStorage.getAccessToken()).toBe(token)

      // Should be in session storage, not localStorage
      expect(sessionStorage.getItem('secure_access_token')).toBeDefined()
      expect(localStorage.getItem('secure_access_token')).toBeNull()
    })

    it('stores access token with custom expiration', () => {
      jest.useFakeTimers()

      const token = 'short-lived-token'
      tokenStorage.setAccessToken(token, 300) // 5 minutes

      expect(tokenStorage.getAccessToken()).toBe(token)

      // Advance time past expiration
      jest.advanceTimersByTime(301000)

      expect(tokenStorage.getAccessToken()).toBeNull()
    })

    it('uses default 1 hour expiration when not specified', () => {
      jest.useFakeTimers()

      const token = 'default-expiry-token'
      tokenStorage.setAccessToken(token)

      // Should exist before 1 hour
      jest.advanceTimersByTime(59 * 60 * 1000)
      expect(tokenStorage.getAccessToken()).toBe(token)

      // Should expire after 1 hour
      jest.advanceTimersByTime(2 * 60 * 1000)
      expect(tokenStorage.getAccessToken()).toBeNull()
    })
  })

  describe('refresh token management', () => {
    it('stores refresh token in localStorage', () => {
      const token = 'refresh-token-xyz'
      tokenStorage.setRefreshToken(token)

      expect(tokenStorage.getRefreshToken()).toBe(token)

      // Should be in localStorage for persistence
      expect(localStorage.getItem('secure_refresh_token')).toBeDefined()
      expect(sessionStorage.getItem('secure_refresh_token')).toBeNull()
    })

    it('refresh token has 30 day expiration', () => {
      jest.useFakeTimers()

      const token = 'long-lived-refresh'
      tokenStorage.setRefreshToken(token)

      // Should exist before 30 days
      jest.advanceTimersByTime(29 * 24 * 60 * 60 * 1000)
      expect(tokenStorage.getRefreshToken()).toBe(token)

      // Should expire after 30 days
      jest.advanceTimersByTime(2 * 24 * 60 * 60 * 1000)
      expect(tokenStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('clearTokens', () => {
    it('clears both access and refresh tokens', () => {
      tokenStorage.setAccessToken('access-token')
      tokenStorage.setRefreshToken('refresh-token')

      expect(tokenStorage.getAccessToken()).toBeTruthy()
      expect(tokenStorage.getRefreshToken()).toBeTruthy()

      tokenStorage.clearTokens()

      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(tokenStorage.getRefreshToken()).toBeNull()
    })
  })
})
