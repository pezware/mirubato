import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../utils/cn'

export interface AutocompleteOption {
  value: string
  label: string
  metadata?: {
    composer?: string
    gradeLevel?: number
    instrument?: string
    [key: string]: unknown
  }
}

interface AutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (option: AutocompleteOption) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  options: AutocompleteOption[]
  placeholder?: string
  isLoading?: boolean
  className?: string
  inputClassName?: string
  dropdownClassName?: string
  emptyMessage?: string
  disabled?: boolean
  'data-testid'?: string
}

export default function Autocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  options,
  placeholder,
  isLoading = false,
  className,
  inputClassName,
  dropdownClassName,
  emptyMessage = 'No results found',
  disabled = false,
  'data-testid': dataTestId,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && e.key === 'ArrowDown') {
        setIsOpen(true)
        return
      }

      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < options.length) {
            const option = options[selectedIndex]
            onChange(option.value)
            onSelect?.(option)
            setIsOpen(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSelectedIndex(-1)
          break
      }
    },
    [isOpen, options, selectedIndex, onChange, onSelect]
  )

  // Handle option click
  const handleOptionClick = (option: AutocompleteOption) => {
    // Update the input value
    onChange(option.value)
    // Call the onSelect callback with the full option
    onSelect?.(option)
    // Close the dropdown
    setIsOpen(false)
    setSelectedIndex(-1)
    // Keep focus on the input
    inputRef.current?.focus()
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset selected index when options change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [options])

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      selectedElement?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [selectedIndex])

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={e => {
          // Delay closing to allow click events on options
          setTimeout(() => setIsOpen(false), 200)
          onBlur?.(e)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={dataTestId}
        className={cn(
          'w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg',
          'focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          inputClassName
        )}
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg',
            'border border-morandi-stone-200 max-h-60 overflow-auto',
            dropdownClassName
          )}
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-morandi-stone-500">
              Loading...
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-morandi-stone-500">
              {emptyMessage}
            </div>
          ) : (
            options.map((option, index) => (
              <div
                key={option.value}
                data-index={index}
                onClick={() => handleOptionClick(option)}
                className={cn(
                  'px-3 py-2 cursor-pointer transition-colors',
                  'hover:bg-morandi-sage-50',
                  selectedIndex === index && 'bg-morandi-sage-100',
                  'border-b border-morandi-stone-100 last:border-b-0'
                )}
              >
                <div className="text-sm text-morandi-stone-700">
                  {option.label}
                </div>
                {option.metadata?.composer && (
                  <div className="text-xs text-morandi-stone-500">
                    {option.metadata.composer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
