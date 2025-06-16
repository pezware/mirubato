/**
 * Cookie utilities for Cloudflare Workers
 * Handles secure cookie creation and parsing for HTTP-only authentication
 */

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
  domain?: string
  maxAge?: number // in seconds
  expires?: Date
}

/**
 * Serialize a cookie with the given name, value, and options
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]

  // Default to secure settings
  const opts: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...options,
  }

  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
  if (opts.path) parts.push(`Path=${opts.path}`)
  if (opts.domain) parts.push(`Domain=${opts.domain}`)

  if (opts.maxAge !== undefined) {
    parts.push(`Max-Age=${opts.maxAge}`)
  } else if (opts.expires) {
    parts.push(`Expires=${opts.expires.toUTCString()}`)
  }

  return parts.join('; ')
}

/**
 * Parse cookies from a Cookie header string
 */
export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  if (!cookieHeader) return {}

  const cookies: Record<string, string> = {}

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name && valueParts.length > 0) {
      try {
        cookies[decodeURIComponent(name)] = decodeURIComponent(
          valueParts.join('=')
        )
      } catch {
        // Skip malformed cookies
      }
    }
  })

  return cookies
}

/**
 * Get a specific cookie value from the request
 */
export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie')
  const cookies = parseCookies(cookieHeader)
  return cookies[name] || null
}

/**
 * Create auth cookie options based on environment
 */
export function getAuthCookieOptions(env: {
  ENVIRONMENT?: string
}): CookieOptions {
  const isProduction = env.ENVIRONMENT === 'production'

  return {
    httpOnly: true,
    secure: true, // Always use secure in Cloudflare Workers
    sameSite: 'lax',
    path: '/',
    // 7 days for access token
    maxAge: 7 * 24 * 60 * 60,
    // In production, set domain to allow subdomain access
    ...(isProduction && { domain: '.mirubato.com' }),
  }
}

/**
 * Create refresh cookie options based on environment
 */
export function getRefreshCookieOptions(env: {
  ENVIRONMENT?: string
}): CookieOptions {
  const isProduction = env.ENVIRONMENT === 'production'

  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    // 30 days for refresh token
    maxAge: 30 * 24 * 60 * 60,
    ...(isProduction && { domain: '.mirubato.com' }),
  }
}

/**
 * Create a cookie that clears an existing cookie
 */
export function createClearCookie(
  name: string,
  options: CookieOptions = {}
): string {
  return serializeCookie(name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  })
}
