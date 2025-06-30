// Fallback script to load PDF.js worker from CDN if needed
// This is used in case the main bundle doesn't include the worker
if (
  typeof window !== 'undefined' &&
  window.pdfjsLib &&
  !window.pdfjsLib.GlobalWorkerOptions.workerSrc
) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs'
}
