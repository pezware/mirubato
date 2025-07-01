import React, { useState } from 'react'
import { Upload, Link, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface ImportResult {
  success: boolean
  data?: {
    id: string
    title: string
    composer: string
    instrument: string
    difficulty: string
    pdfUrl: string
  }
  warning?: string
  error?: string
  message?: string
}

export const ScoreImport: React.FC = () => {
  const [importMode, setImportMode] = useState<'url' | 'file'>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const { token } = useAuthStore()

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const validatePdf = (file: File): boolean => {
    return (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    )
  }

  const handleImport = async () => {
    setLoading(true)
    setResult(null)

    try {
      if (importMode === 'url') {
        if (!url) {
          setResult({ success: false, error: 'Please enter a URL' })
          return
        }

        if (!validateUrl(url)) {
          setResult({ success: false, error: 'Invalid URL format' })
          return
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(
          `${import.meta.env.VITE_SCORES_URL}/api/import`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ url }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          setResult({
            success: false,
            error: data.error || data.message || 'Import failed',
          })
          return
        }

        setResult(data)
      } else {
        // File upload mode
        if (!file) {
          setResult({ success: false, error: 'Please select a file' })
          return
        }

        if (!validatePdf(file)) {
          setResult({ success: false, error: 'Please select a valid PDF file' })
          return
        }

        // Convert file to base64
        const reader = new FileReader()
        reader.onload = async e => {
          const base64 = e.target?.result as string
          const base64Data = base64.split(',')[1]

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          }

          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await fetch(
            `${import.meta.env.VITE_SCORES_URL}/api/import`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                url: `data:application/pdf;base64,${base64Data}`,
                filename: file.name,
              }),
            }
          )

          const data = await response.json()

          if (!response.ok) {
            setResult({
              success: false,
              error: data.error || data.message || 'Upload failed',
            })
            return
          }

          setResult(data)
        }

        reader.readAsDataURL(file)
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Import Sheet Music</h2>

      {/* Mode selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setImportMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            importMode === 'url'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Link size={20} />
          Import from URL
        </button>
        <button
          onClick={() => setImportMode('file')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            importMode === 'file'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Upload size={20} />
          Upload PDF
        </button>
      </div>

      {/* Input section */}
      <div className="mb-6">
        {importMode === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/score.pdf"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter a direct link to a PDF file from Mutopia Project or other
              sources
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF File
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{' '}
                MB)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Importing...
          </>
        ) : (
          <>
            <Upload size={20} />
            Import Sheet Music
          </>
        )}
      </button>

      {/* Result display */}
      {result && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            result.success
              ? result.warning
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {result.success ? (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle
                  className={
                    result.warning ? 'text-yellow-600' : 'text-green-600'
                  }
                  size={24}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    Import Successful!
                  </h3>
                  {result.data && (
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <p>
                        <strong>Title:</strong> {result.data.title}
                      </p>
                      <p>
                        <strong>Composer:</strong> {result.data.composer}
                      </p>
                      <p>
                        <strong>Instrument:</strong> {result.data.instrument}
                      </p>
                      <p>
                        <strong>Difficulty:</strong> {result.data.difficulty}
                      </p>
                    </div>
                  )}
                  {result.warning && (
                    <p className="mt-2 text-sm text-yellow-700">
                      <strong>Note:</strong> {result.warning}
                    </p>
                  )}
                  <a
                    href={`/scorebook/${result.data?.id}`}
                    className="inline-block mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    View Score →
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <h3 className="font-semibold text-red-900">Import Failed</h3>
                <p className="mt-1 text-sm text-red-700">
                  {result.error || result.message}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rate limit info */}
      {!token && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Anonymous users are limited to 1 import every
            10 minutes. Sign in to remove this limit.
          </p>
        </div>
      )}
    </div>
  )
}
