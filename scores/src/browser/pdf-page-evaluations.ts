/// <reference lib="dom" />
/**
 * Browser-context evaluation functions for PDF rendering
 * These functions run inside the browser via Puppeteer's page.evaluate()
 */

/**
 * Check if a render error occurred
 */
export function checkRenderError(): string | undefined {
  return (window as any).renderError
}

/**
 * Check if rendering is complete
 */
export function checkRenderComplete(): boolean {
  return (window as any).renderComplete === true
}

/**
 * Check if canvas has been drawn to (has content)
 */
export function checkCanvasHasContent(): boolean {
  const canvas = document.getElementById(
    'pdf-canvas'
  ) as HTMLCanvasElement | null
  if (!canvas) return false

  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  // Check if canvas has been drawn to by sampling a pixel
  const imageData = ctx.getImageData(0, 0, 1, 1)
  return imageData.data.some((channel: number) => channel !== 0)
}

/**
 * Get error message from error element
 */
export function getErrorElementText(): string | null {
  const errorEl = document.getElementById('error')
  return errorEl ? errorEl.textContent : null
}

/**
 * Check if PDF.js library is loaded
 */
export function isPdfJsLoaded(): boolean {
  return typeof (window as any).pdfjsLib !== 'undefined'
}
