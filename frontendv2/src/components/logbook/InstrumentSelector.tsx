import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus, Check, X } from 'lucide-react'
import {
  IconPiano,
  IconGuitarPick,
  IconMusic,
  IconMicrophone,
  IconCircle,
  IconLayoutGrid,
} from '@tabler/icons-react'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import { Button, Input, Checkbox } from '../ui'

// Common orchestral instruments
const DEFAULT_INSTRUMENTS = [
  'piano',
  'guitar',
  'violin',
  'viola',
  'cello',
  'double-bass',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'french-horn',
  'trumpet',
  'trombone',
  'tuba',
  'percussion',
  'harp',
  'saxophone',
  'voice',
  'organ',
  'accordion',
]

interface InstrumentSelectorProps {
  value?: string
  onChange: (value: string | undefined) => void
  className?: string
}

export function InstrumentSelector({
  value,
  onChange,
  className = '',
}: InstrumentSelectorProps) {
  const { t } = useTranslation('common')
  const { addCustomInstrument, preferences, setPrimaryInstrument } =
    useUserPreferences()

  const [isExpanded, setIsExpanded] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInstrument, setCustomInstrument] = useState('')
  const [makePrimary, setMakePrimary] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get all available instruments (default + custom)
  const allInstruments = [
    ...DEFAULT_INSTRUMENTS,
    ...(preferences.customInstruments || []),
  ]

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
        setShowCustomInput(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInstrumentSelect = (instrument: string) => {
    if (value === instrument) {
      // If clicking the same instrument, unselect it
      onChange(undefined)
    } else {
      onChange(instrument)
      // Auto-set as primary instrument when selecting
      if (instrument !== preferences.primaryInstrument) {
        setPrimaryInstrument(instrument)
      }
    }
    setIsExpanded(false)
  }

  const handleAddCustom = () => {
    if (customInstrument.trim()) {
      const normalized = customInstrument.trim().toLowerCase()
      addCustomInstrument(normalized)
      onChange(normalized)

      if (makePrimary) {
        setPrimaryInstrument(normalized)
      }

      setCustomInstrument('')
      setShowCustomInput(false)
      setIsExpanded(false)
      setMakePrimary(false)
    }
  }

  const getInstrumentIcon = (instrument: string): React.ReactNode => {
    const iconProps = {
      size: 18,
      className: 'text-morandi-stone-600',
      stroke: 1.5,
    }

    const iconMap: Record<string, React.ReactNode> = {
      piano: <IconPiano {...iconProps} />,
      guitar: <IconGuitarPick {...iconProps} />,
      violin: <IconMusic {...iconProps} />,
      viola: <IconMusic {...iconProps} />,
      cello: <IconMusic {...iconProps} />,
      'double-bass': <IconMusic {...iconProps} />,
      flute: <IconMusic {...iconProps} />,
      oboe: <IconMusic {...iconProps} />,
      clarinet: <IconMusic {...iconProps} />,
      bassoon: <IconMusic {...iconProps} />,
      'french-horn': <IconMusic {...iconProps} />,
      trumpet: <IconMusic {...iconProps} />,
      trombone: <IconMusic {...iconProps} />,
      tuba: <IconMusic {...iconProps} />,
      percussion: <IconCircle {...iconProps} />,
      harp: <IconMusic {...iconProps} />,
      saxophone: <IconMusic {...iconProps} />,
      voice: <IconMicrophone {...iconProps} />,
      organ: <IconPiano {...iconProps} />,
      accordion: <IconLayoutGrid {...iconProps} />,
    }
    return iconMap[instrument] || <IconMusic {...iconProps} />
  }

  const displayValue = value
    ? t(`instruments.${value}`, { defaultValue: value })
    : t('instruments.none', 'No instrument')

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 text-left bg-white border border-stone-300 rounded-lg hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent flex items-center justify-between"
      >
        <span
          className={`flex items-center gap-2 ${value ? 'text-stone-900' : 'text-stone-500'}`}
        >
          {value && getInstrumentIcon(value)}
          {displayValue}
        </span>
        <ChevronRight
          className={`w-4 h-4 text-stone-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Expanded dropdown */}
      {isExpanded && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Quick select options */}
          {DEFAULT_INSTRUMENTS.slice(0, 5).map(instrument => (
            <button
              key={instrument}
              type="button"
              onClick={() => handleInstrumentSelect(instrument)}
              className={`w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center justify-between ${
                value === instrument ? 'bg-sage-50' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {getInstrumentIcon(instrument)}
                {t(`instruments.${instrument}`, { defaultValue: instrument })}
              </span>
              {value === instrument && (
                <Check className="w-4 h-4 text-sage-600" />
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-stone-200 my-1" />

          {/* All instruments */}
          <div className="px-3 py-1">
            <span className="text-xs text-stone-500 uppercase">
              {t('instruments.allInstruments', 'All Instruments')}
            </span>
          </div>
          {allInstruments.sort().map(instrument => (
            <button
              key={instrument}
              type="button"
              onClick={() => handleInstrumentSelect(instrument)}
              className={`w-full px-3 py-2 text-left hover:bg-stone-50 flex items-center justify-between ${
                value === instrument ? 'bg-sage-50' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {getInstrumentIcon(instrument)}
                {t(`instruments.${instrument}`, { defaultValue: instrument })}
              </span>
              {value === instrument && (
                <Check className="w-4 h-4 text-sage-600" />
              )}
            </button>
          ))}

          {/* Add custom instrument */}
          <div className="border-t border-stone-200 mt-1 p-3">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full px-3 py-2 text-left text-sage-600 hover:bg-sage-50 rounded flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('instruments.addCustom', 'Add custom instrument')}
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={customInstrument}
                  onChange={e => setCustomInstrument(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                  placeholder={t(
                    'instruments.customPlaceholder',
                    'Instrument name'
                  )}
                  className="w-full"
                  autoFocus
                />
                <Checkbox
                  checked={makePrimary}
                  onChange={setMakePrimary}
                  label={t(
                    'instruments.setAsPrimary',
                    'Set as my primary instrument'
                  )}
                  size="sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustom}
                    disabled={!customInstrument.trim()}
                  >
                    {t('common:add')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomInstrument('')
                      setMakePrimary(false)
                    }}
                  >
                    {t('common:cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Option to unselect */}
          {value && (
            <>
              <div className="border-t border-stone-200 mt-1" />
              <button
                type="button"
                onClick={() => {
                  onChange(undefined)
                  setIsExpanded(false)
                }}
                className="w-full px-3 py-2 text-left text-stone-500 hover:bg-stone-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('instruments.noInstrument', 'No instrument')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
