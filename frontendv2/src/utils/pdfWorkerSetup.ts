import { pdfjs } from 'react-pdf'

// Set up PDF.js worker globally
// This ensures the worker is configured before any component tries to use it
export function setupPdfWorker(): void {
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const pdfjsVersion = pdfjs.version
    console.log('Setting up PDF.js worker for version:', pdfjsVersion)

    // Use CDN for the worker to reduce bundle size
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`
  }
}
