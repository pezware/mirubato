import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

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

  const renderMarkdown = (md: string) => {
    // Basic markdown to HTML conversion
    let html = md
      // Headers
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>'
      )
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
      // Bold
      .replace(/\*\*\*(.*)\*\*\*/g, '<hr class="my-4 border-gray-600" />')
      .replace(/\*\*(.*)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
        if (url.endsWith('.md')) {
          // Internal doc link
          const docUrl = url.replace(/^\.\//, '').replace(/\.md$/, '.md')
          return `<a href="/docs/${docUrl}" class="text-blue-400 hover:text-blue-300 underline internal-link">${text}</a>`
        }
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${text}</a>`
      })
      // Code blocks
      .replace(
        /```typescript([\s\S]*?)```/g,
        '<pre class="bg-gray-800 p-4 rounded overflow-auto my-4"><code class="text-sm">$1</code></pre>'
      )
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="bg-gray-800 p-4 rounded overflow-auto my-4"><code class="text-sm">$1</code></pre>'
      )
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>'
      )
      // Lists
      .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')

    return `<p class="mb-4">${html}</p>`
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
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    </div>
  )
}
