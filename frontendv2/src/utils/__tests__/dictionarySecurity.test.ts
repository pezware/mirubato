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
    it('should remove HTML tags and dangerous content', () => {
      // Test that HTML tags are stripped
      const input1 = 'Hello<b>World</b>'
      const result1 = sanitizeOutput(input1)
      expect(result1).toBe('HelloWorld')

      // Test that script tags and their content are removed
      const input2 = '<script>alert("XSS")</script>Safe text'
      const result2 = sanitizeOutput(input2)
      expect(result2).toBe('Safe text')

      // Verify no HTML remains
      expect(result1).not.toContain('<')
      expect(result1).not.toContain('>')
      expect(result2).not.toContain('<')
      expect(result2).not.toContain('>')
    })

    it('should remove all dangerous protocols', () => {
      const protocols = ['javascript:', 'data:', 'vbscript:', 'about:', 'file:']
      protocols.forEach(protocol => {
        const result = sanitizeOutput(`Click here ${protocol}alert('XSS')`)
        expect(result).not.toContain(protocol)
      })
    })

    it('should remove event handlers', () => {
      const input = 'Click <span onclick="alert(1)">here</span> text'
      const result = sanitizeOutput(input)
      expect(result).toBe('Click here text')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('alert')

      // Test inline event handlers
      const input2 = 'text with onmouseover=alert(2) handler'
      const result2 = sanitizeOutput(input2)
      expect(result2).toBe('text with alert(2) handler')
      expect(result2).not.toContain('onmouseover=')
    })

    it('should handle HTML entities by keeping them as-is', () => {
      // DOMPurify will not decode entities when no tags are allowed
      const input = '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      const result = sanitizeOutput(input)
      // The entities remain as-is since they're treated as plain text
      expect(result).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;')
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
