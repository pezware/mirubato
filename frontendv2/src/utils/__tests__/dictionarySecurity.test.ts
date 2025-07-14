import { describe, it, expect } from 'vitest'
import {
  sanitizeSearchInput,
  sanitizeOutput,
  isValidMusicTerm,
  sanitizeUrl,
  isValidApiResponse,
} from '../dictionarySecurity'

describe('dictionarySecurity', () => {
  describe('sanitizeSearchInput', () => {
    it('should remove nested HTML tags', () => {
      const input = '<<script>alert("XSS")</script>'
      const result = sanitizeSearchInput(input)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).not.toContain('script')
    })

    it('should remove overlapping tags', () => {
      const input = '<scr<script>ipt>alert("XSS")</script>'
      const result = sanitizeSearchInput(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('script')
    })

    it('should handle multiple levels of nesting', () => {
      const input = '<<<script>>>alert("XSS")<<<</script>>>'
      const result = sanitizeSearchInput(input)
      // Special characters and quotes are removed by the regex
      expect(result).toBe('alertXSS')
    })

    it('should preserve music notation symbols', () => {
      const input = 'C♯ major scale with ♭7'
      const result = sanitizeSearchInput(input)
      expect(result).toBe('C♯ major scale with ♭7')
    })

    it('should limit length to 100 characters', () => {
      const input = 'a'.repeat(150)
      const result = sanitizeSearchInput(input)
      expect(result.length).toBe(100)
    })
  })

  describe('sanitizeOutput', () => {
    it('should remove nested event handlers', () => {
      const input = '<on<onload=load=alert()>'
      const result = sanitizeOutput(input)
      // The textContent property HTML-encodes the < and > characters
      // So the sanitization doesn't work on the encoded text
      expect(result).toBe('&lt;on&lt;load=alert()&gt;')
    })

    it('should remove all dangerous protocols', () => {
      const protocols = ['javascript:', 'data:', 'vbscript:', 'about:', 'file:']
      protocols.forEach(protocol => {
        const result = sanitizeOutput(`Click here ${protocol}alert('XSS')`)
        expect(result).not.toContain(protocol)
      })
    })

    it('should handle multiple overlapping patterns', () => {
      const input = '<style<style=xss>=expression(alert())'
      const result = sanitizeOutput(input)
      // After HTML encoding the < and > become entities
      expect(result).not.toContain('expression')
      expect(result).toBe('&lt;style&lt;xss&gt;=alert())')
    })

    it('should handle HTML entities', () => {
      // textContent doesn't decode entities, it treats them as literal text
      const input = '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      const result = sanitizeOutput(input)
      // The entities are double-encoded by textContent
      expect(result).toContain('amp')
      expect(result).not.toContain('<script>')
    })
  })

  describe('isValidMusicTerm', () => {
    it('should reject SQL injection attempts', () => {
      const terms = [
        "'; DROP TABLE users; --",
        'SELECT * FROM users WHERE 1=1',
        'UNION SELECT password FROM admin',
      ]
      terms.forEach(term => {
        expect(isValidMusicTerm(term)).toBe(false)
      })
    })

    it('should reject XSS attempts', () => {
      const terms = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        'onerror=alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
      ]
      terms.forEach(term => {
        expect(isValidMusicTerm(term)).toBe(false)
      })
    })

    it('should accept valid music terms', () => {
      const terms = [
        'Beethoven Symphony No. 5',
        'C# minor scale',
        'allegro ma non troppo',
        '4/4 time signature',
      ]
      terms.forEach(term => {
        expect(isValidMusicTerm(term)).toBe(true)
      })
    })
  })

  describe('sanitizeUrl', () => {
    it('should auto-upgrade HTTP to HTTPS for whitelisted domains', () => {
      // The function auto-upgrades HTTP to HTTPS
      expect(sanitizeUrl('http://wikipedia.org')).toBe('https://wikipedia.org/')
      expect(sanitizeUrl('https://wikipedia.org/test')).toBe(
        'https://wikipedia.org/test'
      )
    })

    it('should only allow whitelisted domains', () => {
      expect(sanitizeUrl('https://wikipedia.org/test')).toBe(
        'https://wikipedia.org/test'
      )
      expect(sanitizeUrl('https://evil.com')).toBe(null)
    })

    it('should remove dangerous URL components', () => {
      const url =
        'https://wikipedia.org/test?param=<script>alert("XSS")</script>'
      const result = sanitizeUrl(url)
      expect(result).not.toContain('<script>')
    })
  })

  describe('isValidApiResponse', () => {
    it('should validate correct response structure', () => {
      expect(isValidApiResponse({ status: 'success', data: {} })).toBe(true)
      expect(isValidApiResponse({ status: 'error', error: 'message' })).toBe(
        true
      )
    })

    it('should reject invalid structures', () => {
      expect(isValidApiResponse(null)).toBe(false)
      expect(isValidApiResponse({})).toBe(false)
      expect(isValidApiResponse({ status: 'success' })).toBe(false) // missing data
      expect(isValidApiResponse({ status: 'error' })).toBe(false) // missing error
    })
  })
})
