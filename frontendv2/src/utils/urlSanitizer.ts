/**
 * URL Sanitization utility to prevent XSS attacks
 */

/**
 * Validates if a URL is safe to use as an image source
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is safe
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false

  try {
    // Data URLs are safe as they don't make external requests
    if (url.startsWith('data:image/')) {
      // Validate data URL format
      const dataUrlRegex =
        /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/
      return dataUrlRegex.test(url)
    }

    // Blob URLs are safe as they reference local objects
    if (url.startsWith('blob:')) {
      return true
    }

    // Parse as URL to validate format
    const parsedUrl = new URL(url)

    // Only allow HTTPS URLs for external images (or HTTP for localhost)
    if (parsedUrl.protocol === 'https:') {
      return true
    }

    if (
      parsedUrl.protocol === 'http:' &&
      (parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1' ||
        parsedUrl.hostname.endsWith('.localhost'))
    ) {
      return true
    }

    return false
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Sanitizes a URL for use as an image source
 * Returns undefined if the URL is not safe
 * @param url - The URL to sanitize
 * @returns The original URL if safe, undefined otherwise
 */
export function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return isValidImageUrl(url) ? url : undefined
}

/**
 * Creates a safe fallback URL for images
 * @returns A safe placeholder image URL
 */
export function getFallbackImageUrl(): string {
  // Return a safe data URL for a 1x1 transparent pixel
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}
