import DOMPurify from 'dompurify'

/**
 * Safely renders markdown to HTML with sanitization to prevent XSS attacks.
 *
 * @param markdown - The markdown content to render
 * @returns Sanitized HTML string safe for use with dangerouslySetInnerHTML
 */
export function renderMarkdownSafely(markdown: string): string {
  // Basic markdown to HTML conversion
  const html = markdown
    // Headers
    .replace(
      /^### (.*$)/gim,
      '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>'
    )
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6">$1</h1>')
    // Bold and emphasis
    .replace(/\*\*\*(.*)\*\*\*/g, '<hr class="my-4 border-gray-600" />')
    .replace(/\*\*(.*)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
      // Sanitize URL to prevent javascript: protocol
      const sanitizedUrl = url.replace(/^javascript:/i, '')

      if (sanitizedUrl.endsWith('.md')) {
        // Internal doc link
        const docUrl = sanitizedUrl.replace(/^\.\//, '').replace(/\.md$/, '.md')
        return `<a href="/docs/${docUrl}" class="text-blue-400 hover:text-blue-300 underline internal-link">${text}</a>`
      }
      return `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${text}</a>`
    })
    // Code blocks
    .replace(
      /```typescript([\s\S]*?)```/g,
      '<pre class="bg-gray-800 p-4 rounded overflow-auto my-4"><code class="text-sm">$1</code></pre>'
    )
    .replace(
      /```bash([\s\S]*?)```/g,
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
    // Blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-gray-500 pl-4 italic">$1</blockquote>'
    )
    // Line breaks and paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">')

  const wrappedHtml = `<div class="markdown-content"><p class="mb-4">${html}</p></div>`

  // Sanitize HTML to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(wrappedHtml, {
    // Allow safe HTML tags and attributes
    ALLOWED_TAGS: [
      'div',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'code',
      'pre',
      'a',
      'li',
      'ul',
      'ol',
      'blockquote',
      'hr',
      'br',
    ],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
    // Forbid javascript: protocol and other dangerous schemes
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    // Additional security options
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    // Ensure links are safe
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  })

  return sanitizedHtml
}

/**
 * Configuration for markdown rendering
 */
export const MARKDOWN_CONFIG = {
  // Add any configuration options here if needed in the future
  maxContentLength: 1000000, // 1MB max content size
  allowedProtocols: ['http:', 'https:', 'mailto:'],
} as const
