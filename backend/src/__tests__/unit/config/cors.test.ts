import { vi } from 'vitest'
// Mock the shared configuration module before importing
vi.mock('@mirubato/shared/config/environment', () => ({
  getConfig: vi
    .fn()
    .mockReturnValue({ frontend: { url: 'https://example.com' } }),
  getCorsOrigins: vi.fn().mockReturnValue(['https://example.com']),
  isOriginAllowed: vi.fn().mockReturnValue(true),
}))

import {
  getConfig,
  getCorsOrigins,
  isOriginAllowed as checkOrigin,
} from '@mirubato/shared/config/environment'

const mockGetConfig = getConfig as ReturnType<typeof vi.fn>
const mockGetCorsOrigins = getCorsOrigins as ReturnType<typeof vi.fn>
const mockCheckOrigin = checkOrigin as ReturnType<typeof vi.fn>

describe('CORS Configuration', () => {
  let getCorsConfig: typeof import('../../../config/cors').getCorsConfig
  let isOriginAllowed: typeof import('../../../config/cors').isOriginAllowed

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset default mocks
    mockGetConfig.mockReturnValue({ frontend: { url: 'https://example.com' } })
    mockGetCorsOrigins.mockReturnValue(['https://example.com'])
    mockCheckOrigin.mockReturnValue(true)

    // Dynamically import the module to ensure mocks are applied
    const corsModule = await import('../../../config/cors')
    getCorsConfig = corsModule.getCorsConfig
    isOriginAllowed = corsModule.isOriginAllowed
  })

  describe('getCorsConfig', () => {
    it('should return production configuration', async () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'https://www.example.com',
        'https://*.cloudflare.com',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      expect(mockGetConfig).toHaveBeenCalledWith('production')
      expect(mockGetCorsOrigins).toHaveBeenCalledWith(mockConfig)

      expect(result).toEqual({
        production: {
          domains: ['https://example.com', 'https://www.example.com'],
          patterns: [
            'https://*.cloudflare.com',
            'https://*.workers.dev',
            'https://*.pages.dev',
          ],
        },
        development: {
          origins: [],
        },
      })
    })

    it('should return development configuration', () => {
      const mockConfig = { frontend: { url: 'http://localhost:3000' } }
      const mockOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://example.com',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('development')

      expect(mockGetConfig).toHaveBeenCalledWith('local')
      expect(mockGetCorsOrigins).toHaveBeenCalledWith(mockConfig)

      expect(result).toEqual({
        production: {
          domains: ['https://example.com'],
          patterns: ['https://*.workers.dev', 'https://*.pages.dev'],
        },
        development: {
          origins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        },
      })
    })

    it('should handle undefined environment', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = ['https://example.com']

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig()

      expect(mockGetConfig).toHaveBeenCalledWith(undefined)
      expect(result.production.domains).toContain('https://example.com')
    })

    it('should always include workers.dev and pages.dev patterns', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = ['https://example.com']

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      expect(result.production.patterns).toContain('https://*.workers.dev')
      expect(result.production.patterns).toContain('https://*.pages.dev')
    })

    it('should not duplicate workers.dev patterns if already present', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'https://*.workers.dev',
        'https://*.pages.dev',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      const workersPatterns = result.production.patterns.filter(
        p => p === 'https://*.workers.dev'
      )
      const pagesPatterns = result.production.patterns.filter(
        p => p === 'https://*.pages.dev'
      )

      expect(workersPatterns).toHaveLength(1)
      expect(pagesPatterns).toHaveLength(1)
    })

    it('should separate domains from patterns correctly', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'https://www.example.com',
        'https://*.cloudflare.com',
        'https://*.example.org',
        'http://localhost:3000',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      expect(result.production.domains).toEqual([
        'https://example.com',
        'https://www.example.com',
      ])
      expect(result.production.patterns).toContain('https://*.cloudflare.com')
      expect(result.production.patterns).toContain('https://*.example.org')
      expect(result.development.origins).toContain('http://localhost:3000')
    })

    it('should filter HTTPS domains for production', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'http://example.com', // Should be filtered out
        'https://secure.example.com',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      expect(result.production.domains).toEqual([
        'https://example.com',
        'https://secure.example.com',
      ])
      expect(result.production.domains).not.toContain('http://example.com')
    })

    it('should filter localhost/127.0.0.1 for development', () => {
      const mockConfig = { frontend: { url: 'http://localhost:3000' } }
      const mockOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:5000',
        'https://example.com', // Should not appear in development origins
        'http://example.com', // Should not appear in development origins
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('development')

      expect(result.development.origins).toEqual([
        'http://localhost:3000',
        'http://127.0.0.1:5000',
      ])
      expect(result.development.origins).not.toContain('https://example.com')
      expect(result.development.origins).not.toContain('http://example.com')
    })
  })

  describe('isOriginAllowed', () => {
    it('should delegate to shared configuration for production', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockCheckOrigin.mockReturnValue(true)

      const result = isOriginAllowed('https://example.com', 'production')

      expect(mockGetConfig).toHaveBeenCalledWith('production')
      expect(mockCheckOrigin).toHaveBeenCalledWith(
        'https://example.com',
        mockConfig
      )
      expect(result).toBe(true)
    })

    it('should delegate to shared configuration for development', () => {
      const mockConfig = { frontend: { url: 'http://localhost:3000' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockCheckOrigin.mockReturnValue(true)

      const result = isOriginAllowed('http://localhost:3000', 'development')

      expect(mockGetConfig).toHaveBeenCalledWith('local')
      expect(mockCheckOrigin).toHaveBeenCalledWith(
        'http://localhost:3000',
        mockConfig
      )
      expect(result).toBe(true)
    })

    it('should return false for disallowed origins', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockCheckOrigin.mockReturnValue(false)

      const result = isOriginAllowed('https://malicious.com', 'production')

      expect(result).toBe(false)
    })

    it('should handle empty origin', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockCheckOrigin.mockReturnValue(false)

      const result = isOriginAllowed('', 'production')

      expect(mockCheckOrigin).toHaveBeenCalledWith('', mockConfig)
      expect(result).toBe(false)
    })

    it('should handle null/undefined origin gracefully', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockCheckOrigin.mockReturnValue(false)

      const result = isOriginAllowed(null as unknown as string, 'production')

      expect(mockCheckOrigin).toHaveBeenCalledWith(null, mockConfig)
      expect(result).toBe(false)
    })
  })

  describe('corsConfig export', () => {
    it('should export a static configuration', async () => {
      // Mock the configuration for this test
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = ['https://example.com']

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      // Import corsConfig after setting up mocks
      const corsModule = await import('../../../config/cors')
      const { corsConfig } = corsModule

      // The corsConfig is initialized when the module is imported
      // We should test that it exists and has the expected structure
      expect(corsConfig).toBeDefined()
      expect(corsConfig).toHaveProperty('production')
      expect(corsConfig).toHaveProperty('development')
      expect(corsConfig.production).toHaveProperty('domains')
      expect(corsConfig.production).toHaveProperty('patterns')
      expect(corsConfig.development).toHaveProperty('origins')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty origins array', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue([])

      const result = getCorsConfig('production')

      expect(result.production.domains).toEqual([])
      expect(result.production.patterns).toEqual([
        'https://*.workers.dev',
        'https://*.pages.dev',
      ])
      expect(result.development.origins).toEqual([])
    })

    it('should handle origins with mixed protocols', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'http://example.com',
        'ftp://example.com',
        'ws://example.com',
        'wss://example.com',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      // Only HTTPS should be in production domains
      expect(result.production.domains).toEqual(['https://example.com'])
      // Non-localhost HTTP should not be in development
      expect(result.development.origins).toEqual([])
    })

    it('should handle malformed URLs gracefully', () => {
      const mockConfig = { frontend: { url: 'https://example.com' } }
      const mockOrigins = [
        'https://example.com',
        'not-a-url',
        'https://',
        '://example.com',
        '',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('production')

      // Should still process valid URLs
      expect(result.production.domains).toContain('https://example.com')
      // Malformed URLs should be handled gracefully (may be filtered out or included as-is)
      expect(result).toBeDefined()
    })

    it('should handle origins with ports', () => {
      const mockConfig = { frontend: { url: 'http://localhost:3000' } }
      const mockOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:8080',
        'https://example.com:443',
        'https://example.com:8443',
      ]

      mockGetConfig.mockReturnValue(mockConfig)
      mockGetCorsOrigins.mockReturnValue(mockOrigins)

      const result = getCorsConfig('development')

      expect(result.development.origins).toEqual([
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:8080',
      ])
      expect(result.production.domains).toEqual([
        'https://example.com:443',
        'https://example.com:8443',
      ])
    })
  })
})
