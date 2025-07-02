import * as pdfjs from 'pdfjs-dist'

// Set up PDF.js worker globally
// This ensures the worker is configured before any component tries to use it
export function setupPdfWorker(): void {
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const pdfjsVersion = pdfjs.version
    // Use CDN for the worker to reduce bundle size
    // Using jsDelivr CDN for better reliability and CORS support
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.mjs`
  }
}
