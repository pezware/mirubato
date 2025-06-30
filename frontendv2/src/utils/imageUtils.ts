/**
 * Utilities for progressive image loading
 */

/**
 * Generate a low-quality image placeholder (LQIP) from an image URL
 * This creates a blurred version for the blur-up effect
 */
export async function generateLQIP(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Create a small canvas for the low-quality version
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Use a very small size for the placeholder (e.g., 20px wide)
        const placeholderWidth = 20
        const aspectRatio = img.height / img.width
        const placeholderHeight = Math.round(placeholderWidth * aspectRatio)

        canvas.width = placeholderWidth
        canvas.height = placeholderHeight

        // Draw the image at low resolution
        ctx.drawImage(img, 0, 0, placeholderWidth, placeholderHeight)

        // Convert to data URL (this will be a very small image)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.4)
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = imageUrl
  })
}

/**
 * Preload an image and optionally generate LQIP
 */
export async function preloadImage(
  url: string,
  options?: { generateLQIP?: boolean }
): Promise<{ url: string; lqip?: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = async () => {
      const result: { url: string; lqip?: string } = { url }

      if (options?.generateLQIP) {
        try {
          result.lqip = await generateLQIP(url)
        } catch (error) {
          console.warn('Failed to generate LQIP:', error)
        }
      }

      resolve(result)
    }

    img.onerror = () => {
      reject(new Error(`Failed to preload image: ${url}`))
    }

    img.src = url
  })
}

/**
 * Load images with progressive enhancement
 */
export class ProgressiveImageLoader {
  private cache = new Map<string, { url: string; lqip?: string }>()

  async load(
    url: string,
    options?: {
      generateLQIP?: boolean
      onLQIPReady?: (lqip: string) => void
      onFullImageReady?: (url: string) => void
    }
  ): Promise<void> {
    // Check cache first
    const cached = this.cache.get(url)
    if (cached) {
      if (cached.lqip && options?.onLQIPReady) {
        options.onLQIPReady(cached.lqip)
      }
      if (options?.onFullImageReady) {
        options.onFullImageReady(url)
      }
      return
    }

    try {
      const result = await preloadImage(url, {
        generateLQIP: options?.generateLQIP,
      })

      this.cache.set(url, result)

      if (result.lqip && options?.onLQIPReady) {
        options.onLQIPReady(result.lqip)
      }

      if (options?.onFullImageReady) {
        options.onFullImageReady(url)
      }
    } catch (error) {
      console.error('Failed to load image:', error)
      throw error
    }
  }

  /**
   * Preload multiple images in parallel
   */
  async preloadBatch(
    urls: string[],
    options?: { generateLQIP?: boolean }
  ): Promise<void> {
    await Promise.all(
      urls.map(url =>
        this.load(url, options).catch(err =>
          console.warn(`Failed to preload ${url}:`, err)
        )
      )
    )
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }
}
