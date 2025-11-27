// Thumbnail configuration - shared between generation and serving
// Changing these values will affect both new thumbnails and on-demand generation

export const THUMBNAIL_CONFIG = {
  // Width in pixels (height calculated from A4 ratio)
  WIDTH: 400,
  // A4 ratio (√2 ≈ 1.414)
  A4_RATIO: 1.414,
  // WebP quality (0-100, lower = smaller file, faster load)
  QUALITY: 75,
  // Cache control header for immutable thumbnails
  CACHE_CONTROL: 'public, max-age=31536000, immutable',
  // R2 storage path pattern
  getStoragePath: (scoreId: string) => `thumbnails/${scoreId}/thumb.webp`,
} as const

// Derived values
export const THUMBNAIL_HEIGHT = Math.floor(
  THUMBNAIL_CONFIG.WIDTH * THUMBNAIL_CONFIG.A4_RATIO
)
