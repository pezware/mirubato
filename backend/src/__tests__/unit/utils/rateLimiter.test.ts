import {
  createRateLimiter,
  RateLimiterDurableObject,
  RateLimiter,
} from '../../../utils/rateLimiter'
import type { DurableObjectNamespace } from '@cloudflare/workers-types'

describe('Rate Limiter', () => {
  describe('createRateLimiter', () => {
    let mockNamespace: jest.Mocked<DurableObjectNamespace>

    beforeEach(() => {
      mockNamespace = {
        get: jest.fn(),
        idFromName: jest.fn(),
        idFromString: jest.fn(),
        newUniqueId: jest.fn(),
      } as any
    })

    it('should create a rate limiter instance', () => {
      const rateLimiter = createRateLimiter(mockNamespace, 'test-user')

      expect(rateLimiter).toBeDefined()
      expect(rateLimiter.checkLimit).toBeInstanceOf(Function)
    })

    it('should create a rate limiter without identifier', () => {
      const rateLimiter = createRateLimiter(mockNamespace)

      expect(rateLimiter).toBeDefined()
      expect(rateLimiter.checkLimit).toBeInstanceOf(Function)
    })

    it('should always allow requests in current implementation', async () => {
      const rateLimiter = createRateLimiter(mockNamespace, 'test-user')

      const result = await rateLimiter.checkLimit()

      expect(result).toBe(true)
    })

    it('should handle multiple check calls', async () => {
      const rateLimiter = createRateLimiter(mockNamespace, 'test-user')

      const results = await Promise.all([
        rateLimiter.checkLimit(),
        rateLimiter.checkLimit(),
        rateLimiter.checkLimit(),
      ])

      expect(results).toEqual([true, true, true])
    })

    it('should return same interface for different identifiers', () => {
      const rateLimiter1 = createRateLimiter(mockNamespace, 'user1')
      const rateLimiter2 = createRateLimiter(mockNamespace, 'user2')

      expect(rateLimiter1).toHaveProperty('checkLimit')
      expect(rateLimiter2).toHaveProperty('checkLimit')
      expect(typeof rateLimiter1.checkLimit).toBe('function')
      expect(typeof rateLimiter2.checkLimit).toBe('function')
    })
  })

  describe('RateLimiterDurableObject', () => {
    let durableObject: RateLimiterDurableObject

    beforeEach(() => {
      durableObject = new RateLimiterDurableObject()
      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(1000000)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should allow first request', async () => {
      const request = new Request('https://example.com?id=user1')

      const response = await durableObject.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ allowed: true })
    })

    it('should track requests per identifier', async () => {
      const request1 = new Request('https://example.com?id=user1')
      const request2 = new Request('https://example.com?id=user2')

      const response1 = await durableObject.fetch(request1)
      const response2 = await durableObject.fetch(request2)

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.allowed).toBe(true)
      expect(data2.allowed).toBe(true)
    })

    it('should use anonymous identifier when id not provided', async () => {
      const request = new Request('https://example.com')

      const response = await durableObject.fetch(request)
      const data = await response.json()

      expect(data.allowed).toBe(true)
    })

    it('should allow requests within rate limit', async () => {
      const requests: Promise<Response>[] = []

      // Send 100 requests (below the 120 limit)
      for (let i = 0; i < 100; i++) {
        const request = new Request(`https://example.com?id=user1`)
        requests.push(durableObject.fetch(request))
      }

      const responses = await Promise.all(requests)
      const data = await Promise.all(responses.map(r => r.json()))

      // All should be allowed
      expect(data.every(d => d.allowed)).toBe(true)
    })

    it('should block requests when rate limit exceeded', async () => {
      const requests: Promise<Response>[] = []

      // Send 125 requests (above the 120 limit)
      for (let i = 0; i < 125; i++) {
        const request = new Request(`https://example.com?id=user1`)
        requests.push(durableObject.fetch(request))
      }

      const responses = await Promise.all(requests)
      const data = await Promise.all(responses.map(r => r.json()))

      // First 120 should be allowed, remaining should be blocked
      const allowedCount = data.filter(d => d.allowed).length
      const blockedCount = data.filter(d => !d.allowed).length

      expect(allowedCount).toBe(120)
      expect(blockedCount).toBe(5)
    })

    it('should clean up old requests outside time window', async () => {
      let currentTime = 1000000

      // Mock Date.now to control time
      const mockNow = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => currentTime)

      // Send some initial requests
      for (let i = 0; i < 50; i++) {
        const request = new Request(`https://example.com?id=user1`)
        await durableObject.fetch(request)
      }

      // Advance time by more than the window (60 seconds)
      currentTime += 70000 // 70 seconds

      // Send more requests - these should be allowed since old ones expired
      const requests: Promise<Response>[] = []
      for (let i = 0; i < 100; i++) {
        const request = new Request(`https://example.com?id=user1`)
        requests.push(durableObject.fetch(request))
      }

      const responses = await Promise.all(requests)
      const data = await Promise.all(responses.map(r => r.json()))

      // All should be allowed since previous requests are outside the window
      expect(data.every(d => d.allowed)).toBe(true)

      mockNow.mockRestore()
    })

    it('should maintain separate counters for different identifiers', async () => {
      // Fill up rate limit for user1
      for (let i = 0; i < 120; i++) {
        const request = new Request(`https://example.com?id=user1`)
        await durableObject.fetch(request)
      }

      // user1 should be blocked
      const blockedRequest = new Request(`https://example.com?id=user1`)
      const blockedResponse = await durableObject.fetch(blockedRequest)
      const blockedData = await blockedResponse.json()
      expect(blockedData.allowed).toBe(false)

      // user2 should still be allowed
      const allowedRequest = new Request(`https://example.com?id=user2`)
      const allowedResponse = await durableObject.fetch(allowedRequest)
      const allowedData = await allowedResponse.json()
      expect(allowedData.allowed).toBe(true)
    })

    it('should handle edge case at exactly the limit', async () => {
      // Send exactly 120 requests
      for (let i = 0; i < 120; i++) {
        const request = new Request(`https://example.com?id=user1`)
        const response = await durableObject.fetch(request)
        const data = await response.json()
        expect(data.allowed).toBe(true)
      }

      // 121st request should be blocked
      const request = new Request(`https://example.com?id=user1`)
      const response = await durableObject.fetch(request)
      const data = await response.json()
      expect(data.allowed).toBe(false)
    })

    it('should return proper content type headers', async () => {
      const request = new Request('https://example.com?id=user1')

      const response = await durableObject.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle malformed URLs gracefully', async () => {
      // Test with URL that has malformed query params
      const request = new Request('https://example.com?id=')

      const response = await durableObject.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
    })

    it('should handle time window edge cases', async () => {
      let currentTime = 1000000
      const mockNow = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => currentTime)

      // Send a request at time 0
      let request = new Request(`https://example.com?id=user1`)
      await durableObject.fetch(request)

      // Advance time to just under the window (59.9 seconds)
      currentTime += 59900

      // This request should count against the limit
      request = new Request(`https://example.com?id=user1`)
      let response = await durableObject.fetch(request)
      let data = await response.json()
      expect(data.allowed).toBe(true)

      // Advance time to just over the window (60.1 seconds from original)
      currentTime += 200

      // Now the first request should be cleaned up
      request = new Request(`https://example.com?id=user1`)
      response = await durableObject.fetch(request)
      data = await response.json()
      expect(data.allowed).toBe(true)

      mockNow.mockRestore()
    })

    it('should handle concurrent requests properly', async () => {
      // Simulate concurrent requests
      const concurrentRequests = Array.from(
        { length: 10 },
        () => new Request(`https://example.com?id=user1`)
      )

      const responses = await Promise.all(
        concurrentRequests.map(req => durableObject.fetch(req))
      )
      const data = await Promise.all(responses.map(r => r.json()))

      // All should be allowed since we're well under the limit
      expect(data.every(d => d.allowed)).toBe(true)
    })
  })

  describe('Interface Compliance', () => {
    it('should implement RateLimiter interface', () => {
      const mockNamespace = {} as DurableObjectNamespace
      const rateLimiter = createRateLimiter(mockNamespace)

      // TypeScript compilation ensures interface compliance,
      // but we can also test at runtime
      expect(rateLimiter).toHaveProperty('checkLimit')
      expect(typeof rateLimiter.checkLimit).toBe('function')
    })

    it('should return Promise<boolean> from checkLimit', async () => {
      const mockNamespace = {} as DurableObjectNamespace
      const rateLimiter = createRateLimiter(mockNamespace)

      const result = rateLimiter.checkLimit()

      expect(result).toBeInstanceOf(Promise)
      expect(typeof (await result)).toBe('boolean')
    })
  })
})
