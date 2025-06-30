/**
 * Shared HTML template for PDF rendering
 */

export interface PdfHtmlTemplateOptions {
  pdfUrl: string
  pageNumber: number
  scale?: number
  quality?: 'simple' | 'full'
}

/**
 * Generate the HTML template for PDF rendering
 */
export function generatePdfHtmlTemplate(
  options: PdfHtmlTemplateOptions
): string {
  const { pdfUrl, pageNumber, scale = 2.0, quality = 'simple' } = options

  if (quality === 'simple') {
    return generateSimpleTemplate(pdfUrl, pageNumber, scale)
  }

  return generateFullTemplate(pdfUrl, pageNumber, scale)
}

/**
 * Simple template with minimal overhead for fast rendering
 */
function generateSimpleTemplate(
  pdfUrl: string,
  pageNumber: number,
  scale: number
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    #container { 
      width: 100vw; 
      height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center;
    }
    canvas { 
      max-width: 100%; 
      max-height: 100%; 
      display: block;
    }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="pdf-canvas"></canvas>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
    
    async function renderPdf() {
      try {
        const loadingTask = pdfjsLib.getDocument('${pdfUrl}');
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(${pageNumber});
        
        const scale = ${scale};
        const viewport = page.getViewport({ scale });
        
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        window.renderComplete = true;
      } catch (error) {
        console.error('PDF render error:', error);
        window.renderError = error.message;
      }
    }
    
    renderPdf();
  </script>
</body>
</html>`
}

/**
 * Full template with loading states and error handling
 */
function generateFullTemplate(
  pdfUrl: string,
  pageNumber: number,
  scale: number
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Page ${pageNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #f5f5f5;
    }
    
    #pdf-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    
    #pdf-canvas {
      max-width: 100%;
      max-height: 100%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background: white;
    }
    
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: Arial, sans-serif;
      font-size: 18px;
      color: #666;
    }
    
    #error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: Arial, sans-serif;
      font-size: 18px;
      color: #d32f2f;
      text-align: center;
      padding: 20px;
      background: white;
      border: 2px solid #d32f2f;
      border-radius: 8px;
      display: none;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
    
    window.renderingComplete = false;
    
    async function renderPDF() {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const canvas = document.getElementById('pdf-canvas');
      const ctx = canvas.getContext('2d');
      
      try {
        loadingEl.textContent = 'Loading PDF...';
        const loadingTask = pdfjsLib.getDocument('${pdfUrl}');
        
        loadingTask.onProgress = function(progress) {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            loadingEl.textContent = \`Loading PDF... \${percent}%\`;
          }
        };
        
        const pdf = await loadingTask.promise;
        
        if (${pageNumber} < 1 || ${pageNumber} > pdf.numPages) {
          throw new Error(\`Invalid page number. PDF has \${pdf.numPages} pages.\`);
        }
        
        loadingEl.textContent = \`Rendering page ${pageNumber}...\`;
        const page = await pdf.getPage(${pageNumber});
        
        const viewport = page.getViewport({ scale: ${scale} });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        loadingEl.style.display = 'none';
        window.renderingComplete = true;
        window.renderComplete = true;
        window.dispatchEvent(new Event('pdf-rendered'));
        
      } catch (error) {
        console.error('Error rendering PDF:', error);
        errorEl.textContent = \`Error: \${error.message}\`;
        errorEl.style.display = 'block';
        loadingEl.style.display = 'none';
        window.renderError = error.message;
        window.dispatchEvent(new CustomEvent('pdf-error', { detail: error }));
      }
    }
    
    window.addEventListener('DOMContentLoaded', renderPDF);
  </script>
</head>
<body>
  <div id="pdf-container">
    <div id="loading">Initializing...</div>
    <div id="error"></div>
    <canvas id="pdf-canvas"></canvas>
  </div>
</body>
</html>`
}

/**
 * Get the PDF.js library URLs for a specific version
 */
export function getPdfJsUrls(version = '4.0.379') {
  return {
    main: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.min.mjs`,
    worker: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`,
  }
}
