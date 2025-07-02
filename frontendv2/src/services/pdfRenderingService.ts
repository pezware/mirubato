import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Configure pdf.js worker - use CDN to avoid bundling the large worker file
// This significantly reduces bundle size
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  // Use the version that matches our pdfjs-dist
  // Using jsDelivr CDN for better reliability and CORS support
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`
}

interface CacheNode {
  key: string
  value: ImageData
  prev: CacheNode | null
  next: CacheNode | null
  size: number
}

interface MemoryStats {
  usedMB: number
  maxMB: number
  cachedPages: number
  hitRate: number
}

interface RenderRequest {
  pageNumber: number
  scale: number
  priority: number
  callback: (imageData: ImageData) => void
}

export interface RenderingConfig {
  maxCachedPages: number
  maxMemoryMB: number
  preloadStrategy: 'adjacent' | 'smart'
  mobileOptimizations: boolean
}

class LRUCache {
  private cache: Map<string, CacheNode>
  private head: CacheNode | null = null
  private tail: CacheNode | null = null
  private currentSize = 0
  private maxSize: number
  private hits = 0
  private misses = 0

  constructor(maxSizeMB: number) {
    this.cache = new Map()
    this.maxSize = maxSizeMB * 1024 * 1024 // Convert to bytes
  }

  private moveToHead(node: CacheNode): void {
    if (node === this.head) return

    // Remove from current position
    if (node.prev) node.prev.next = node.next
    if (node.next) node.next.prev = node.prev
    if (node === this.tail) this.tail = node.prev

    // Move to head
    node.prev = null
    node.next = this.head
    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node
  }

  private evictLRU(): void {
    if (!this.tail) return

    const node = this.tail
    this.cache.delete(node.key)
    this.currentSize -= node.size

    if (this.tail.prev) {
      this.tail = this.tail.prev
      this.tail.next = null
    } else {
      this.head = null
      this.tail = null
    }
  }

  get(key: string): ImageData | null {
    const node = this.cache.get(key)
    if (!node) {
      this.misses++
      return null
    }

    this.hits++
    this.moveToHead(node)
    return node.value
  }

  put(key: string, value: ImageData): void {
    const size = value.data.byteLength

    // If item is too large for cache, don't cache it
    if (size > this.maxSize) return

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!
      this.currentSize -= existing.size
      this.cache.delete(key)
    }

    // Evict until we have space
    while (this.currentSize + size > this.maxSize && this.tail) {
      this.evictLRU()
    }

    // Create new node
    const node: CacheNode = {
      key,
      value,
      size,
      prev: null,
      next: this.head,
    }

    if (this.head) this.head.prev = node
    this.head = node
    if (!this.tail) this.tail = node

    this.cache.set(key, node)
    this.currentSize += size
  }

  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
  }

  getStats(): { hitRate: number; sizeMB: number; count: number } {
    const total = this.hits + this.misses
    return {
      hitRate: total > 0 ? this.hits / total : 0,
      sizeMB: this.currentSize / (1024 * 1024),
      count: this.cache.size,
    }
  }
}

export class PdfRenderingService {
  private lruCache: LRUCache
  private renderQueue: RenderRequest[] = []
  private isRendering = false
  private config: RenderingConfig
  private documentCache = new Map<string, PDFDocumentProxy>()
  private loadingDocuments = new Map<string, Promise<PDFDocumentProxy>>()

  constructor(config: RenderingConfig) {
    this.config = config
    this.lruCache = new LRUCache(config.maxMemoryMB)
  }

  async loadDocument(url: string): Promise<PDFDocumentProxy> {
    // Check if already loaded
    if (this.documentCache.has(url)) {
      return this.documentCache.get(url)!
    }

    // Check if currently loading
    if (this.loadingDocuments.has(url)) {
      return this.loadingDocuments.get(url)!
    }

    // Start loading
    const loadingPromise = pdfjs
      .getDocument(url)
      .promise.then(doc => {
        this.documentCache.set(url, doc)
        this.loadingDocuments.delete(url)
        return doc
      })
      .catch(error => {
        this.loadingDocuments.delete(url)
        throw error
      })

    this.loadingDocuments.set(url, loadingPromise)
    return loadingPromise
  }

  async renderPage(
    url: string,
    pageNumber: number,
    scale: number,
    rotation = 0
  ): Promise<ImageData> {
    const pdfDoc = await this.loadDocument(url)
    return this.getRenderedPage(pdfDoc, pageNumber, scale, rotation)
  }

  async getRenderedPage(
    pdfDoc: PDFDocumentProxy,
    pageNumber: number,
    scale: number,
    rotation = 0
  ): Promise<ImageData> {
    const cacheKey = `${pdfDoc.fingerprints[0]}_${pageNumber}_${scale}_${rotation}`

    // Check cache first
    const cached = this.lruCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Render page
    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale, rotation })

    // Create offscreen canvas
    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get canvas context')
    }

    const renderContext = {
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport: viewport,
    }

    await page.render(renderContext).promise

    // Get image data and cache it
    const imageData = context.getImageData(
      0,
      0,
      viewport.width,
      viewport.height
    )
    this.lruCache.put(cacheKey, imageData)

    return imageData
  }

  async preloadPages(
    pdfDoc: PDFDocumentProxy,
    currentPage: number,
    viewMode: 'single' | 'double',
    scale = 1.0
  ): Promise<void> {
    const pagesToPreload: number[] = []
    const isLargePdf = pdfDoc.numPages >= 10

    if (viewMode === 'single') {
      // For large PDFs, preload more aggressively
      const preloadRange = isLargePdf ? 3 : 1

      // Preload backwards (fewer pages)
      for (let i = 1; i <= preloadRange; i++) {
        if (currentPage - i >= 1) {
          pagesToPreload.push(currentPage - i)
        }
      }

      // Preload forwards (more pages - users typically read forward)
      const forwardRange = isLargePdf ? 6 : 2
      for (let i = 1; i <= forwardRange; i++) {
        if (currentPage + i <= pdfDoc.numPages) {
          pagesToPreload.push(currentPage + i)
        }
      }
    } else {
      // Double page mode
      const preloadRange = isLargePdf ? 2 : 1

      // Preload previous spreads
      for (let i = 1; i <= preloadRange; i++) {
        const leftPage = currentPage - i * 2
        const rightPage = leftPage + 1
        if (leftPage >= 1) pagesToPreload.push(leftPage)
        if (rightPage >= 1) pagesToPreload.push(rightPage)
      }

      // Preload next spreads
      for (let i = 1; i <= preloadRange * 2; i++) {
        const leftPage = currentPage + i * 2 - 1
        const rightPage = leftPage + 1
        if (leftPage <= pdfDoc.numPages) pagesToPreload.push(leftPage)
        if (rightPage <= pdfDoc.numPages) pagesToPreload.push(rightPage)
      }
    }

    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      pagesToPreload.forEach((pageNum, index) => {
        // Stagger the preloading to avoid overwhelming the system
        const delay = index * 100 // 100ms between each preload

        setTimeout(() => {
          requestIdleCallback(
            () => {
              this.getRenderedPage(pdfDoc, pageNum, scale).catch(() => {
                // Ignore preload errors
              })
            },
            { timeout: 5000 }
          ) // 5 second max wait
        }, delay)
      })
    }
  }

  clearCache(): void {
    this.lruCache.clear()
  }

  getMemoryUsage(): MemoryStats {
    const stats = this.lruCache.getStats()
    return {
      usedMB: stats.sizeMB,
      maxMB: this.config.maxMemoryMB,
      cachedPages: stats.count,
      hitRate: stats.hitRate,
    }
  }

  // Queue management for preventing simultaneous renders
  async processRenderQueue(): Promise<void> {
    if (this.isRendering || this.renderQueue.length === 0) return

    this.isRendering = true
    const request = this.renderQueue.shift()

    if (request) {
      try {
        // Process request
        // Implementation depends on integration with viewer
      } catch (error) {
        console.error('Render error:', error)
      }
    }

    this.isRendering = false

    // Process next item
    if (this.renderQueue.length > 0) {
      this.processRenderQueue()
    }
  }
}

// Singleton instance
let serviceInstance: PdfRenderingService | null = null

export function getRenderingService(
  config?: RenderingConfig
): PdfRenderingService {
  if (!serviceInstance && config) {
    serviceInstance = new PdfRenderingService(config)
  }

  if (!serviceInstance) {
    throw new Error('Rendering service not initialized')
  }

  return serviceInstance
}
