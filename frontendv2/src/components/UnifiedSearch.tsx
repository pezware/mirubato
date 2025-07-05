import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useUnifiedSearch,
  type UnifiedSearchResult,
} from '../hooks/useUnifiedSearch'
import type { LogbookEntry } from '../api/logbook'
import { Input } from './ui/Input'
import Card from './ui/Card'
import { cn } from '../utils/cn'

interface UnifiedSearchProps {
  className?: string
  onSelect?: (result: UnifiedSearchResult) => void
  placeholder?: string
}

export default function UnifiedSearch({
  className,
  onSelect,
  placeholder,
}: UnifiedSearchProps) {
  const { t } = useTranslation(['common', 'logbook', 'scorebook'])
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { combined: results } = useUnifiedSearch(query)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const handleSelect = (result: UnifiedSearchResult) => {
    if (onSelect) {
      onSelect(result)
    } else {
      // Default navigation behavior
      if (result.type === 'score') {
        navigate(`/scorebook/${result.id}`)
      } else if (result.type === 'logbook') {
        const entry = result.data as LogbookEntry
        if (entry.scoreId) {
          navigate(`/scorebook/${entry.scoreId}`)
        } else {
          navigate('/logbook')
        }
      }
    }

    setQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(e.target.value.length >= 2)
          }}
          onFocus={() => setIsOpen(query.length >= 2)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('common:search')}
          className="w-full pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-morandi-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 p-0">
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-morandi-sand-100 transition-colors',
                  'focus:outline-none focus:bg-morandi-sand-100',
                  selectedIndex === index && 'bg-morandi-sand-100'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {result.type === 'score' ? (
                        <span className="text-morandi-sky-600">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-morandi-sage-600">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </span>
                      )}
                      <span className="font-medium text-morandi-stone-800">
                        {result.title}
                      </span>
                      {result.instrument && (
                        <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-600 text-xs rounded-full">
                          {result.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                          {result.instrument}
                        </span>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-morandi-stone-600 line-clamp-1">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    {result.date && (
                      <span className="text-xs text-morandi-stone-500">
                        {formatDate(result.date)}
                      </span>
                    )}
                    {result.duration && (
                      <span className="text-xs text-morandi-stone-500">
                        {result.duration} {t('common:minutes')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 p-4 text-center text-morandi-stone-600">
          {t('common:noResults')}
        </Card>
      )}
    </div>
  )
}
