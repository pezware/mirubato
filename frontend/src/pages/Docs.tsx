import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { renderMarkdownSafely } from '../utils/markdownRenderer'

export default function Docs() {
  const { '*': path } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMarkdown()
  }, [path])

  const loadMarkdown = async () => {
    try {
      setLoading(true)
      setError(null)

      const docPath = path || 'README.md'
      const response = await fetch(`/docs/${docPath}`)

      if (!response.ok) {
        throw new Error(`Document not found: ${docPath}`)
      }

      const text = await response.text()
      setContent(text)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load documentation'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Handle internal link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('internal-link')) {
        e.preventDefault()
        const href = target.getAttribute('href')
        if (href) {
          navigate(href)
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading documentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Documentation Error</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            to="/docs"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Return to documentation home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/debug"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Debug
          </Link>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Back to App
          </Link>
        </div>

        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdownSafely(content) }}
        />
      </div>
    </div>
  )
}
