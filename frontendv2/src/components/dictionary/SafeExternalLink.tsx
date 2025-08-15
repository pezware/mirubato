import React from 'react'
import { useTranslation } from 'react-i18next'
import { sanitizeUrl } from '@/utils/dictionarySecurity'
import { SafeExternalLinkProps } from '@/types/dictionary'

/**
 * Secure external link component that validates URLs and confirms before opening
 */
const SafeExternalLink: React.FC<SafeExternalLinkProps> = ({
  url,
  children,
  className = '',
  confirmBeforeOpen = true,
}) => {
  const { t } = useTranslation(['toolbox'])

  // Sanitize and validate the URL
  const safeUrl = sanitizeUrl(url)

  // If URL is invalid, render as disabled text
  if (!safeUrl) {
    return (
      <span
        className={`text-stone-400 cursor-not-allowed ${className}`}
        title={t('toolbox:dictionary.linkUnavailable')}
      >
        {children}
        <span className="ml-1 text-xs">(unavailable)</span>
      </span>
    )
  }

  // Extract domain for display
  let domain = ''
  try {
    const urlObj = new URL(safeUrl)
    domain = urlObj.hostname.replace('www.', '')
  } catch {
    domain = 'external site'
  }

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (confirmBeforeOpen) {
      const confirmed = window.confirm(
        t('toolbox:dictionary.confirmExternalLink', { domain })
      )

      if (confirmed) {
        window.open(safeUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      window.open(safeUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <a
      href={safeUrl}
      onClick={handleClick}
      className={`text-sage-600 hover:text-sage-700 hover:underline inline-flex items-center ${className}`}
      rel="noopener noreferrer nofollow"
      target="_blank"
      title={t('toolbox:dictionary.opensInNewTab', { domain })}
    >
      {children}
      <svg
        className="ml-1 w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  )
}

export default SafeExternalLink
