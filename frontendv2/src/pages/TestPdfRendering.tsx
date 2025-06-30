import { useState } from 'react'
import PdfJsViewer from '../components/score/PdfJsViewer'
import type { PdfInfo, PdfError } from '../components/score/PdfJsViewer'
import { PdfRenderingProvider } from '../contexts/PdfRenderingContext'

export default function TestPdfRendering() {
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single')
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null)
  const [error, setError] = useState<PdfError | null>(null)

  // Test with the 6-page Recuerdos de la Alhambra PDF
  // Using the scores service URL pattern
  const testPdfUrl =
    'http://scores-mirubato.localhost:9788/test-data/IMSLP528958-PMLP33377-Recuerdos_de_la_Alhambra.pdf'

  return (
    <PdfRenderingProvider>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">PDF Rendering Test</h1>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            <div className="flex gap-4 items-center mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Scale</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="px-3 py-1">{(scale * 100).toFixed(0)}%</span>
                  <button
                    onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={e =>
                    setViewMode(e.target.value as 'single' | 'double')
                  }
                  className="px-3 py-1 border rounded"
                >
                  <option value="single">Single Page</option>
                  <option value="double">Double Page</option>
                </select>
              </div>
            </div>

            {pdfInfo && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">PDF Info</h3>
                <p>Title: {pdfInfo.title || 'N/A'}</p>
                <p>Pages: {pdfInfo.numPages}</p>
                <p>Author: {pdfInfo.author || 'N/A'}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-700 mb-1">Error</h3>
                <p className="text-sm text-red-600">
                  {error.message} (Code: {error.code})
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <PdfJsViewer
              url={testPdfUrl}
              currentPage={currentPage}
              viewMode={viewMode}
              scale={scale}
              onPageChange={setCurrentPage}
              onLoad={setPdfInfo}
              onError={setError}
              className="mx-auto"
            />
          </div>
        </div>
      </div>
    </PdfRenderingProvider>
  )
}
