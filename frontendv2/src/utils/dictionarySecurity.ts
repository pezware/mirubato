import DOMPurify from 'dompurify'

/**
 * Security utilities for the Music Dictionary feature
 * Provides input validation, output sanitization, and URL safety
 */

/**
 * Sanitize user search input to prevent XSS and injection attacks
 * @param input - Raw user input
 * @returns Sanitized search string
 */
export const sanitizeSearchInput = (input: string): string => {
  if (!input || typeof input !== 'string') return ''

  // Remove any HTML/script tags
  const cleaned = input.replace(/<[^>]*>/g, '')

  // Limit length to prevent abuse
  const truncated = cleaned.substring(0, 100)

  // Remove special characters except music notation and international characters
  // Allow: letters, numbers, spaces, hyphens, music symbols (♯♭♮#b), and international characters
  const safe = truncated.replace(
    /[^\w\s\-♯♭♮#b\u00C0-\u024F\u4E00-\u9FFF]/gi,
    ''
  )

  // Normalize whitespace
  return safe.trim().replace(/\s+/g, ' ')
}

/**
 * Validate if a term is a valid music-related search term
 * @param term - Sanitized search term
 * @returns True if valid, false otherwise
 */
export const isValidMusicTerm = (term: string): boolean => {
  // Must have at least 2 characters
  if (term.length < 2) return false

  // Must not exceed 100 characters
  if (term.length > 100) return false

  // Must not be only numbers
  if (/^\d+$/.test(term)) return false

  // Must not contain SQL-like patterns (case-insensitive)
  const sqlPatterns =
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE|FROM|EXEC|SCRIPT|JAVASCRIPT|ONCLICK)\b)/i
  if (sqlPatterns.test(term)) return false

  // Must not contain common XSS patterns
  const xssPatterns =
    /(javascript:|onerror=|onload=|<script|<iframe|<object|<embed|<svg|<img)/i
  if (xssPatterns.test(term)) return false

  return true
}

/**
 * Sanitize text output to prevent XSS when displaying content
 * @param text - Text to sanitize
 * @returns Safe text for display
 */
export const sanitizeOutput = (text: string | undefined | null): string => {
  if (!text || typeof text !== 'string') return ''

  // Create a temporary element to decode HTML entities safely
  const temp = document.createElement('div')
  temp.textContent = text
  const decoded = temp.innerHTML

  // Remove any potential XSS vectors
  return decoded
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/style\s*=/gi, '') // Remove style attributes
    .trim()
}

/**
 * Whitelist of allowed domains for external links
 */
const ALLOWED_DOMAINS = [
  'wikipedia.org',
  'en.wikipedia.org',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'spotify.com',
  'open.spotify.com',
  'amazon.com',
  'www.amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.es',
  'amazon.it',
] as const

/**
 * Validate and sanitize external URLs
 * @param url - URL to validate
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeUrl = (url: string | undefined | null): string | null => {
  if (!url || typeof url !== 'string') return null

  try {
    const parsed = new URL(url)

    // Force HTTPS for security
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:'
    }

    // Only allow HTTPS URLs
    if (parsed.protocol !== 'https:') {
      console.warn(`Blocked non-HTTPS URL: ${url}`)
      return null
    }

    // Check against whitelist
    const hostname = parsed.hostname.toLowerCase()
    const isAllowed = ALLOWED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    )

    if (!isAllowed) {
      console.warn(`Blocked external URL with unallowed domain: ${url}`)
      return null
    }

    // Remove any potentially dangerous URL components
    parsed.hash = '' // Remove fragments that might contain XSS

    return parsed.toString()
  } catch (error) {
    console.error('Invalid URL:', url, error)
    return null
  }
}

/**
 * Sanitize HTML content for safe rendering
 * Only allows basic formatting tags
 * @param html - HTML content to sanitize
 * @returns Safe HTML string
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html || typeof html !== 'string') return ''

  // Configure DOMPurify to only allow safe tags and attributes
  const config = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'ul',
      'ol',
      'li',
      'span',
    ],
    ALLOWED_ATTR: ['class'], // Only allow class attribute for styling
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'link',
      'meta',
    ],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  }

  return DOMPurify.sanitize(html, config)
}

/**
 * Create a URL-safe slug from a term
 * @param term - Term to convert to slug
 * @returns URL-safe slug
 */
export const createSlug = (term: string): string => {
  return term
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Limit length
}

/**
 * Validate API response data structure
 * @param data - Data to validate
 * @returns True if data structure is valid
 */
export const isValidApiResponse = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false

  // Check for expected response structure
  const response = data as { status?: string; error?: string; data?: unknown }

  // Must have status field
  if (!response.status || typeof response.status !== 'string') return false

  // If error, must have error message
  if (response.status === 'error' && !response.error) return false

  // If success, must have data field
  if (response.status === 'success' && !response.data) return false

  return true
}

/**
 * Rate limiting helper for frontend
 * @param key - Unique key for the rate limit
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with check and reset methods
 */
export const createRateLimiter = (
  key: string,
  maxRequests: number,
  windowMs: number
) => {
  const storageKey = `rate_limit_${key}`

  return {
    check: (): boolean => {
      const now = Date.now()
      const data = localStorage.getItem(storageKey)

      if (!data) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ count: 1, resetAt: now + windowMs })
        )
        return true
      }

      try {
        const { count, resetAt } = JSON.parse(data)

        if (now > resetAt) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ count: 1, resetAt: now + windowMs })
          )
          return true
        }

        if (count >= maxRequests) {
          return false
        }

        localStorage.setItem(
          storageKey,
          JSON.stringify({ count: count + 1, resetAt })
        )
        return true
      } catch {
        localStorage.removeItem(storageKey)
        return true
      }
    },

    reset: (): void => {
      localStorage.removeItem(storageKey)
    },

    timeUntilReset: (): number => {
      const data = localStorage.getItem(storageKey)
      if (!data) return 0

      try {
        const { resetAt } = JSON.parse(data)
        const remaining = resetAt - Date.now()
        return remaining > 0 ? remaining : 0
      } catch {
        return 0
      }
    },
  }
}

/**
 * Escape special characters in text for safe display
 * @param text - Text to escape
 * @returns Escaped text
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, char => map[char] || char)
}
