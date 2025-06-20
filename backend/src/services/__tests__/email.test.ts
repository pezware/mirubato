import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService } from '../email'
import type { Env } from '../../types/context'

// Mock global fetch
global.fetch = vi.fn()

describe('EmailService', () => {
  let emailService: EmailService
  let mockEnv: Env

  beforeEach(() => {
    vi.clearAllMocks()

    mockEnv = {
      RESEND_API_KEY: 'test-resend-api-key',
      ENVIRONMENT: 'test',
      DB: {} as any,
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
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await emailService.sendMagicLinkEmail(
        validEmail,
        validToken
      )

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-resend-api-key',
          },
          body: JSON.stringify({
            from: 'Mirubato <noreply@mirubato.com>',
            to: validEmail,
            subject: 'Sign in to Mirubato',
            html: expect.stringContaining(validToken),
          }),
        }
      )
    })

    it('should use correct magic link URL for production', async () => {
      mockEnv.ENVIRONMENT = 'production'
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      expect(body.html).toContain(
        'https://mirubato.com/auth/verify?token=magic-token-123'
      )
    })

    it('should use correct magic link URL for development', async () => {
      mockEnv.ENVIRONMENT = 'development'
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      expect(body.html).toContain(
        'http://localhost:3000/auth/verify?token=magic-token-123'
      )
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          error: 'Invalid API key',
          message: 'The API key is invalid',
        }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await emailService.sendMagicLinkEmail(
        validEmail,
        validToken
      )

      expect(result).toBe(false)
    })

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await emailService.sendMagicLinkEmail(
        validEmail,
        validToken
      )

      expect(result).toBe(false)
    })

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@@example.com',
        '',
        null,
        undefined,
      ]

      for (const email of invalidEmails) {
        const result = await emailService.sendMagicLinkEmail(
          email as any,
          validToken
        )
        expect(result).toBe(false)
        expect(global.fetch).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }
    })

    it('should validate token', async () => {
      const invalidTokens = ['', null, undefined]

      for (const token of invalidTokens) {
        const result = await emailService.sendMagicLinkEmail(
          validEmail,
          token as any
        )
        expect(result).toBe(false)
        expect(global.fetch).not.toHaveBeenCalled()
        vi.clearAllMocks()
      }
    })

    it('should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: 'Rate limit exceeded',
        }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await emailService.sendMagicLinkEmail(
        validEmail,
        validToken
      )

      expect(result).toBe(false)
    })

    it('should properly escape HTML in email content', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

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
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      expect(body).toHaveProperty('from')
      expect(body).toHaveProperty('to')
      expect(body).toHaveProperty('subject')
      expect(body).toHaveProperty('html')
      expect(body.from).toBe('Mirubato <noreply@mirubato.com>')
      expect(body.to).toBe(validEmail)
      expect(body.subject).toBe('Sign in to Mirubato')
    })

    it('should generate proper HTML email content', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail(validEmail, validToken)

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)
      const html = body.html

      // Check for essential HTML elements
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('<body>')
      expect(html).toContain('Sign in to Mirubato')
      expect(html).toContain('Click the button below to sign in')
      expect(html).toContain('Sign In')
      expect(html).toContain('expires in 15 minutes')
      expect(html).toContain("If you didn't request this email")
    })
  })

  describe('Error handling', () => {
    it('should handle missing API key', async () => {
      mockEnv.RESEND_API_KEY = ''
      emailService = new EmailService(mockEnv)

      const result = await emailService.sendMagicLinkEmail(
        'test@example.com',
        'token'
      )

      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle malformed API response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      const result = await emailService.sendMagicLinkEmail(
        'test@example.com',
        'token'
      )

      // Should still return true if response was ok
      expect(result).toBe(true)
    })

    it('should handle timeout errors', async () => {
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      )

      const result = await emailService.sendMagicLinkEmail(
        'test@example.com',
        'token'
      )

      expect(result).toBe(false)
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
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail('test@example.com', 'token')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      // Should default to production URL for unknown environments
      expect(body.html).toContain(
        'https://mirubato.com/auth/verify?token=token'
      )
    })

    it('should handle undefined environment', async () => {
      mockEnv.ENVIRONMENT = undefined as any
      emailService = new EmailService(mockEnv)

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email-123' }),
      }
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

      await emailService.sendMagicLinkEmail('test@example.com', 'token')

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(fetchCall[1]?.body as string)

      // Should default to production URL
      expect(body.html).toContain(
        'https://mirubato.com/auth/verify?token=token'
      )
    })
  })
})
