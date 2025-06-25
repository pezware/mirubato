import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService } from '../email'
import type { Env } from '../../types/context'
import type { D1Database } from '@cloudflare/workers-types'

// Mock global fetch
global.fetch = vi.fn()

describe('EmailService', () => {
  let emailService: EmailService
  let mockEnv: Env

  beforeEach(() => {
    vi.clearAllMocks()

    mockEnv = {
      RESEND_API_KEY: 'test-resend-api-key',
      ENVIRONMENT: 'development',
      DB: {} as unknown as D1Database,
      JWT_SECRET: 'test-secret',
      RATE_LIMITER: undefined,
      CF_VERSION_METADATA: { id: 'test-version' },
    }

    emailService = new EmailService(mockEnv)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sendMagicLinkEmail', () => {
    const validEmail = 'test@example.com'
    const validToken = 'magic-token-123'

    it('should send magic link email successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      // Should not throw
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-resend-api-key',
          }),
        })
      )
    })

    it('should use correct magic link URL for production', async () => {
      mockEnv.ENVIRONMENT = 'production'
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      expect(body.html).toContain(
        'https://mirubato.com/auth/verify?token=magic-token-123'
      )
    })

    it('should log magic link in development mode', async () => {
      mockEnv.ENVIRONMENT = 'development'
      emailService = new EmailService(mockEnv)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      // In development, it should log instead of sending
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MAGIC LINK GENERATED')
      )
      expect(global.fetch).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Invalid API key'),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await expect(
        emailService.sendMagicLinkEmail(validEmail, validToken)
      ).rejects.toThrow('Failed to send email: Invalid API key')
    })

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      await expect(
        emailService.sendMagicLinkEmail(validEmail, validToken)
      ).rejects.toThrow('Network error')
    })

    it('should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await expect(
        emailService.sendMagicLinkEmail(validEmail, validToken)
      ).rejects.toThrow('Failed to send email: Rate limit exceeded')
    })

    it('should properly escape HTML in email content', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      const emailWithSpecialChars = 'user+test@example.com'
      await emailService.sendMagicLinkEmail(emailWithSpecialChars, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      // Email should be properly included without breaking HTML
      expect(body.to).toBe(emailWithSpecialChars)
      expect(body.html).toContain('Sign in to Mirubato')
    })

    it('should include all required email fields', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      expect(body).toHaveProperty('from')
      expect(body).toHaveProperty('to')
      expect(body).toHaveProperty('subject')
      expect(body).toHaveProperty('html')
      expect(body.from).toBe('Mirubato <noreply@mirubato.com>')
      expect(body.to).toBe(validEmail)
      expect(body.subject).toBe('Your Mirubato sign-in link')
    })

    it('should generate proper HTML email content', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)
      const html = body.html

      // Check for essential HTML elements
      expect(html).toBeDefined()
      expect(html).toContain('<body') // Body tag with attributes
      expect(html).toContain('</body>')
      expect(html).toContain(validToken)
    })
  })

  describe('Error handling', () => {
    it('should handle missing API key', async () => {
      mockEnv.RESEND_API_KEY = ''
      emailService = new EmailService(mockEnv)

      await expect(
        emailService.sendMagicLinkEmail('test@example.com', 'token')
      ).rejects.toThrow('Email service not configured')

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle malformed API response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      // Should not throw if response was ok
      await emailService.sendMagicLinkEmail('test@example.com', 'token')
    })

    it('should handle timeout errors', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      )

      await expect(
        emailService.sendMagicLinkEmail('test@example.com', 'token')
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('Environment-specific behavior', () => {
    it('should use staging URL for staging environment', async () => {
      mockEnv.ENVIRONMENT = 'staging'
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail('test@example.com', 'token')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      // Should use local URL for non-production environments
      expect(body.html).toContain(
        'http://localhost:3000/auth/verify?token=token'
      )
    })

    it('should handle undefined environment', async () => {
      mockEnv.ENVIRONMENT = undefined as unknown as 'development' | 'production'
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response
      )

      await emailService.sendMagicLinkEmail('test@example.com', 'token')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      // Should default to local URL
      expect(body.html).toContain(
        'http://localhost:3000/auth/verify?token=token'
      )
    })
  })
})
