import { logRequest } from '../../../middleware/logging'

describe('Logging Middleware', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('logRequest', () => {
    it('should log basic request information', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'user-agent': 'test-agent',
          accept: 'application/json',
        },
      })

      await logRequest(request)

      expect(consoleLogSpy).toHaveBeenCalledWith('=== Incoming Request ===')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'URL:',
        'https://example.com/api/test'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('Method:', 'GET')
      expect(consoleLogSpy).toHaveBeenCalledWith('Headers:', {
        'user-agent': 'test-agent',
        accept: 'application/json',
      })
      expect(consoleLogSpy).toHaveBeenCalledWith('======================')
    })

    it('should not attempt to read body for GET requests', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
      })

      await logRequest(request)

      // Should not have any body-related logs
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Body:'),
        expect.anything()
      )
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Parsed GraphQL:'),
        expect.anything()
      )
    })

    it('should log JSON body for POST requests with application/json content-type', async () => {
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

      expect(consoleLogSpy).toHaveBeenCalledWith('Body:', body)
      expect(consoleLogSpy).toHaveBeenCalledWith('Parsed GraphQL:', {
        query: 'query GetUser { user { id name } }',
        variables: { id: '123' },
        operationName: 'GetUser',
      })
    })

    it('should handle POST requests with non-JSON content-type', async () => {
      const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
        body: 'Some form data',
      })

      await logRequest(request)

      // Should not attempt to read body for non-JSON content
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Body:'),
        expect.anything()
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith('Body:', invalidJson)
      expect(consoleLogSpy).toHaveBeenCalledWith('Body is not valid JSON')
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
      jest.spyOn(request, 'clone').mockImplementation(() => {
        throw new Error('Cannot clone request')
      })

      await logRequest(request)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Could not read body:',
        expect.any(Error)
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith('Body:', body)
    })

    it('should handle empty headers', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
      })

      await logRequest(request)

      expect(consoleLogSpy).toHaveBeenCalledWith('Headers:', {})
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

      expect(consoleLogSpy).toHaveBeenCalledWith('Headers:', {
        authorization: 'Bearer token123',
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0',
        'x-custom-header': 'custom-value',
      })
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

      expect(consoleLogSpy).toHaveBeenCalledWith('Parsed GraphQL:', {
        query: expect.stringContaining('__schema'),
        variables: undefined,
        operationName: undefined,
      })
    })

    it('should log all calls in correct order', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      })

      await logRequest(request)

      const calls = consoleLogSpy.mock.calls.map(call => call[0])

      expect(calls).toEqual([
        '=== Incoming Request ===',
        'URL:',
        'Method:',
        'Headers:',
        'Body:',
        'Parsed GraphQL:',
        '======================',
      ])
    })

    it('should handle requests with different HTTP methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']

      for (const method of methods) {
        consoleLogSpy.mockClear()

        const request = new Request('https://example.com/api/test', {
          method,
        })

        await logRequest(request)

        expect(consoleLogSpy).toHaveBeenCalledWith('Method:', method)
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Body:',
        JSON.stringify({ test: 'data' })
      )
    })
  })
})
