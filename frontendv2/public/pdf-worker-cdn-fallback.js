// Fallback script to load PDF.js worker from CDN if needed
// This is used in case the main bundle doesn't include the worker
if (
  typeof window !== 'undefined' &&
  window.pdfjsLib &&
  !window.pdfjsLib.GlobalWorkerOptions.workerSrc
) {
  // Use the version property if available, otherwise fallback to known version
  const version = window.pdfjsLib.version || '5.3.31'
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    '//unpkg.com/pdfjs-dist@' + version + '/build/pdf.worker.min.mjs'
}
