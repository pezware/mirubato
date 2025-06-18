import { vi } from 'vitest'
import { logRequest } from '../../../middleware/logging'

describe('Logging Middleware', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('logRequest', () => {
    it('should not log in production mode (logging is commented out)', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'user-agent': 'test-agent',
          accept: 'application/json',
        },
      })

      await logRequest(request)

      // Since logging is disabled in production, no console.log calls should be made
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle GET requests without errors', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle POST requests with JSON body without errors', async () => {
      const body = JSON.stringify({
        query: 'query GetUser { user { id name } }',
        variables: { id: '123' },
        operationName: 'GetUser',
      })

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body,
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle POST requests with non-JSON content-type without errors', async () => {
      const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
        body: 'Some form data',
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle POST requests with invalid JSON body gracefully', async () => {
      const invalidJson = 'This is not valid JSON'

      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: invalidJson,
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle body read errors gracefully', async () => {
      // Create a request with a body that has already been consumed
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      })

      // Consume the body first
      await request.text()

      // Mock the clone method to throw an error
      vi.spyOn(request, 'clone').mockImplementation(() => {
        throw new Error('Cannot clone request')
      })

      await logRequest(request)

      // No logging should occur even on error
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle mixed case content-type header', async () => {
      const body = JSON.stringify({ test: 'data' })

      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body,
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle empty headers', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle requests with multiple headers', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
        headers: {
          authorization: 'Bearer token123',
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0',
          'x-custom-header': 'custom-value',
        },
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should handle GraphQL introspection query', async () => {
      const introspectionQuery = {
        query: `
          query IntrospectionQuery {
            __schema {
              queryType { name }
              mutationType { name }
            }
          }
        `,
      }

      const request = new Request('https://example.com/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(introspectionQuery),
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should not produce any console output', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      })

      await logRequest(request)

      // No console output should be produced
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle requests with different HTTP methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']

      for (const method of methods) {
        consoleLogSpy.mockClear()

        const request = new Request('https://example.com/api/test', {
          method,
        })

        await logRequest(request)

        // No logging should occur for any method
        expect(consoleLogSpy).not.toHaveBeenCalled()
      }
    })

    it('should handle edge case of content-type with boundary', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json; boundary=something',
        },
        body: JSON.stringify({ test: 'data' }),
      })

      await logRequest(request)

      // No logging should occur
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })
})
