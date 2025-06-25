import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosRequestConfig } from 'axios'

describe('API Client', () => {
  // Store original modules
  const originalLocation = window.location

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Reset localStorage mocks
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.clear as ReturnType<typeof vi.fn>).mockReset()

    // Reset modules to ensure fresh imports
    vi.resetModules()

    // Mock window.location
    delete (window as { location?: Location }).location
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hostname: 'localhost',
        pathname: '/',
        href: '/',
      } as Location,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  describe('API URL Configuration', () => {
    it('should use localhost URL for localhost', async () => {
      window.location.hostname = 'localhost'

      // Mock axios to capture the config
      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(config => ({
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            get: vi.fn(),
            _config: config, // Store config for testing
          })),
        },
      }))

      const axios = (await import('axios')).default
      await import('../../../api/client')

      const createCall = (axios.create as ReturnType<typeof vi.fn>).mock
        .calls[0]
      expect(createCall[0].baseURL).toBe('http://localhost:8787')
    })

    it('should use staging URL for staging hostname', async () => {
      window.location.hostname = 'staging.mirubato.com'

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(config => ({
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            get: vi.fn(),
            _config: config,
          })),
        },
      }))

      const axios = (await import('axios')).default
      await import('../../../api/client')

      const createCall = (axios.create as ReturnType<typeof vi.fn>).mock
        .calls[0]
      expect(createCall[0].baseURL).toBe('https://api-staging.mirubato.com')
    })

    it('should use production URL for production hostname', async () => {
      window.location.hostname = 'mirubato.com'

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(config => ({
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            get: vi.fn(),
            _config: config,
          })),
        },
      }))

      const axios = (await import('axios')).default
      await import('../../../api/client')

      const createCall = (axios.create as ReturnType<typeof vi.fn>).mock
        .calls[0]
      expect(createCall[0].baseURL).toBe('https://api.mirubato.com')
    })
  })

  describe('Interceptor Behavior', () => {
    it('should register request and response interceptors', async () => {
      const mockRequestUse = vi.fn()
      const mockResponseUse = vi.fn()

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            interceptors: {
              request: { use: mockRequestUse },
              response: { use: mockResponseUse },
            },
            get: vi.fn(),
          })),
        },
      }))

      await import('../../../api/client')

      // Check that interceptors were registered
      expect(mockRequestUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      )
      expect(mockResponseUse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      )
    })

    describe('Request Interceptor Logic', () => {
      it('should add authorization header when token exists', async () => {
        let capturedRequestInterceptor: (
          config: AxiosRequestConfig
        ) => AxiosRequestConfig

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: {
                  use: vi.fn(success => {
                    capturedRequestInterceptor = success
                  }),
                },
                response: { use: vi.fn() },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        // Test the interceptor
        ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
          'test-token'
        )

        const config: AxiosRequestConfig = {
          headers: {},
          url: '/test',
        }

        const result = capturedRequestInterceptor!(config)

        expect(localStorage.getItem).toHaveBeenCalledWith('auth-token')
        expect(config.headers!.Authorization).toBe('Bearer test-token')
        expect(result).toBe(config)
      })

      it('should not add authorization header when no token', async () => {
        let capturedRequestInterceptor: (
          config: AxiosRequestConfig
        ) => AxiosRequestConfig

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: {
                  use: vi.fn(success => {
                    capturedRequestInterceptor = success
                  }),
                },
                response: { use: vi.fn() },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')
        ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
          null
        )

        const config: AxiosRequestConfig = {
          headers: {},
          url: '/test',
        }

        const result = capturedRequestInterceptor!(config)

        expect(localStorage.getItem).toHaveBeenCalledWith('auth-token')
        expect(config.headers!.Authorization).toBeUndefined()
        expect(result).toBe(config)
      })

      it('should handle config without headers', async () => {
        let capturedRequestInterceptor: (
          config: AxiosRequestConfig
        ) => AxiosRequestConfig

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: {
                  use: vi.fn(success => {
                    capturedRequestInterceptor = success
                  }),
                },
                response: { use: vi.fn() },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')
        ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
          'test-token'
        )

        const config: AxiosRequestConfig = {
          url: '/test',
          // No headers property
        }

        const result = capturedRequestInterceptor!(config)

        expect(localStorage.getItem).toHaveBeenCalledWith('auth-token')
        // Should not throw and should return config unchanged
        expect(result).toBe(config)
        expect(config.headers).toBeUndefined()
      })
    })

    describe('Response Interceptor Logic', () => {
      it('should clear tokens on 401 response', async () => {
        let capturedErrorHandler: (error: unknown) => Promise<unknown>

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: { use: vi.fn() },
                response: {
                  use: vi.fn((_success, error) => {
                    capturedErrorHandler = error
                  }),
                },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        const error = {
          response: { status: 401 },
          config: {},
        }

        await expect(capturedErrorHandler!(error)).rejects.toEqual(error)

        expect(localStorage.removeItem).toHaveBeenCalledWith('auth-token')
        expect(localStorage.removeItem).toHaveBeenCalledWith('refresh-token')
      })

      it('should redirect on 401 for protected routes', async () => {
        let capturedErrorHandler: (error: unknown) => Promise<unknown>

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: { use: vi.fn() },
                response: {
                  use: vi.fn((_success, error) => {
                    capturedErrorHandler = error
                  }),
                },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        window.location.pathname = '/logbook'

        const error = {
          response: { status: 401 },
          config: {},
        }

        await expect(capturedErrorHandler!(error)).rejects.toEqual(error)

        expect(window.location.href).toBe('/')
      })

      it('should not redirect on 401 for public routes', async () => {
        let capturedErrorHandler: (error: unknown) => Promise<unknown>

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: { use: vi.fn() },
                response: {
                  use: vi.fn((_success, error) => {
                    capturedErrorHandler = error
                  }),
                },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        window.location.pathname = '/'
        const originalHref = window.location.href

        const error = {
          response: { status: 401 },
          config: {},
        }

        await expect(capturedErrorHandler!(error)).rejects.toEqual(error)

        expect(window.location.href).toBe(originalHref)
      })

      it('should pass through non-401 errors', async () => {
        let capturedErrorHandler: (error: unknown) => Promise<unknown>

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: { use: vi.fn() },
                response: {
                  use: vi.fn((_success, error) => {
                    capturedErrorHandler = error
                  }),
                },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        const error = {
          response: { status: 500 },
          config: {},
        }

        await expect(capturedErrorHandler!(error)).rejects.toEqual(error)
      })

      it('should handle network errors without response', async () => {
        let capturedErrorHandler: (error: unknown) => Promise<unknown>

        vi.doMock('axios', () => ({
          default: {
            create: vi.fn(() => ({
              interceptors: {
                request: { use: vi.fn() },
                response: {
                  use: vi.fn((_success, error) => {
                    capturedErrorHandler = error
                  }),
                },
              },
              get: vi.fn(),
            })),
          },
        }))

        await import('../../../api/client')

        const error = {
          message: 'Network Error',
          config: {},
        }

        await expect(capturedErrorHandler!(error)).rejects.toEqual(error)
      })
    })
  })

  describe('fetcher helper', () => {
    it('should return data from successful requests', async () => {
      const mockData = { users: [{ id: 1, name: 'Test' }] }
      const mockGet = vi.fn().mockResolvedValue({ data: mockData })

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            get: mockGet,
          })),
        },
      }))

      const { fetcher } = await import('../../../api/client')
      const result = await fetcher('/users')

      expect(mockGet).toHaveBeenCalledWith('/users')
      expect(result).toEqual(mockData)
    })

    it('should propagate errors from failed requests', async () => {
      const error = new Error('API Error')
      const mockGet = vi.fn().mockRejectedValue(error)

      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => ({
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            get: mockGet,
          })),
        },
      }))

      const { fetcher } = await import('../../../api/client')

      await expect(fetcher('/users')).rejects.toThrow('API Error')
    })
  })
})
