import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, TrendingUp, X } from 'lucide-react'
import { SegmentedControl, Button } from '../../ui'
import type { SegmentOption } from '../../ui'
import { LogbookEntry } from '../../../api/logbook'
import { generateNormalizedScoreId } from '../../../utils/scoreIdNormalizer'
import { formatComposerName } from '../../../utils/textFormatting'

export interface PeriodPreset {
  id: 'daily' | 'week' | 'month' | 'year'
  label: string
  days: number | null
  icon: React.ReactNode
}

interface PeriodPresetsProps {
  entries: LogbookEntry[]
  onDataChange: (
    filteredData: LogbookEntry[],
    selectedPeriod: PeriodPreset['id']
  ) => void
  className?: string
}

export function PeriodPresets({
  entries,
  onDataChange,
  className = '',
}: PeriodPresetsProps) {
  const { t } = useTranslation(['reports'])
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodPreset['id']>('daily')
  const [selectedPieces, setSelectedPieces] = useState<string[]>([])
  const [showPieceSelector, setShowPieceSelector] = useState(false)

  // Define period presets - memoized to avoid recreating on every render
  const periodPresets: PeriodPreset[] = useMemo(
    () => [
      {
        id: 'daily',
        label: t('reports:presets.dailyShort'),
        days: 365, // Show last 12 months of daily data
        icon: <Calendar size={16} />,
      },
      {
        id: 'week',
        label: t('reports:presets.weeklyShort'),
        days: 365, // Show last 12 months aggregated by week
        icon: <Clock size={16} />,
      },
      {
        id: 'month',
        label: t('reports:presets.monthlyShort'),
        days: 365, // Show last 12 months aggregated by month
        icon: <TrendingUp size={16} />,
      },
      {
        id: 'year',
        label: t('reports:presets.yearlyShort'),
        days: 365, // Show last 12 months aggregated by year
        icon: <TrendingUp size={16} />,
      },
    ],
    [t]
  )

  // Extract unique pieces from entries with normalized keys for deduplication
  const availablePieces = useMemo(() => {
    // Map normalized keys to formatted display values
    const pieceMap = new Map<string, string>()

    entries.forEach(entry => {
      entry.pieces.forEach(piece => {
        // Create normalized key for deduplication
        const normalizedKey = generateNormalizedScoreId(
          piece.title,
          piece.composer
        )

        // Create formatted display value
        const formattedComposer = piece.composer
          ? formatComposerName(piece.composer)
          : 'Unknown'
        const formattedTitle = formatComposerName(piece.title)
        const displayValue = `${formattedComposer} - ${formattedTitle}`

        // Store with normalized key to prevent duplicates
        pieceMap.set(normalizedKey, displayValue)
      })
    })

    // Return sorted display values
    return Array.from(pieceMap.values()).sort()
  }, [entries])

  // Filter data directly based on selected period and pieces
  const filteredData = useMemo(() => {
    let filtered = entries

    // Apply date filter for preset periods
    const preset = periodPresets.find(p => p.id === selectedPeriod)
    if (preset?.days) {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - preset.days)

      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.timestamp)
        return entryDate >= startDate && entryDate <= endDate
      })
    }

    // Apply piece filter if any are selected
    if (selectedPieces.length > 0) {
      filtered = filtered.filter(entry => {
        return entry.pieces.some(piece => {
          // Create the same formatted display value for comparison
          const formattedComposer = piece.composer
            ? formatComposerName(piece.composer)
            : 'Unknown'
          const formattedTitle = formatComposerName(piece.title)
          const displayValue = `${formattedComposer} - ${formattedTitle}`
          return selectedPieces.includes(displayValue)
        })
      })
    }

    return filtered
  }, [entries, selectedPeriod, selectedPieces, periodPresets])

  // Notify parent of data changes
  useEffect(() => {
    onDataChange(filteredData, selectedPeriod)
  }, [filteredData, selectedPeriod, onDataChange])

  const periodOptions: SegmentOption[] = periodPresets.map(preset => ({
    value: preset.id,
    label: preset.label,
    icon: preset.icon,
  }))

  const handlePieceToggle = (piece: string) => {
    setSelectedPieces(prev =>
      prev.includes(piece) ? prev.filter(p => p !== piece) : [...prev, piece]
    )
  }

  const clearPieces = () => {
    setSelectedPieces([])
  }

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Period Selector */}
      <div>
        <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
          {t('reports:presets.quickPeriods')}
        </h4>
        <SegmentedControl
          options={periodOptions}
          value={selectedPeriod}
          onChange={value => setSelectedPeriod(value as PeriodPreset['id'])}
          size="sm"
          className="w-full"
        />
      </div>

      {/* Piece Filter */}
      {availablePieces.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-morandi-stone-700">
              {t('reports:presets.pieces')}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPieceSelector(!showPieceSelector)}
              className="text-xs"
            >
              {showPieceSelector
                ? t('reports:presets.hidePieces')
                : t('reports:presets.selectPieces')}
              {selectedPieces.length > 0 && (
                <span className="ml-1 bg-morandi-purple-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {selectedPieces.length}
                </span>
              )}
            </Button>
          </div>

          {/* Selected pieces display */}
          {selectedPieces.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedPieces.map(piece => (
                <span
                  key={piece}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-morandi-sage-100 text-morandi-stone-700 rounded-full text-xs"
                >
                  {piece.length > 30 ? `${piece.substring(0, 30)}...` : piece}
                  <button
                    onClick={() => handlePieceToggle(piece)}
                    className="hover:bg-morandi-sage-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPieces}
                className="text-xs text-morandi-stone-500 hover:text-morandi-stone-700"
              >
                {t('reports:presets.clearAll')}
              </Button>
            </div>
          )}

          {/* Piece selector dropdown */}
          {showPieceSelector && (
            <div className="max-h-48 overflow-y-auto bg-white border border-morandi-stone-200 rounded-lg p-2">
              <div className="space-y-1">
                {availablePieces.map(piece => (
                  <label
                    key={piece}
                    className="flex items-center gap-2 p-2 hover:bg-morandi-stone-50 rounded cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPieces.includes(piece)}
                      onChange={() => handlePieceToggle(piece)}
                      className="rounded text-morandi-purple-600 focus:ring-morandi-purple-500"
                    />
                    <span className="flex-1 truncate" title={piece}>
                      {piece}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status display - only show if pieces are selected */}
      {selectedPieces.length > 0 && (
        <div className="text-xs text-morandi-stone-600 bg-morandi-stone-50 rounded p-2">
          <div>
            {t('reports:presets.filteringBy')}{' '}
            <span className="font-medium">
              {selectedPieces.length === 1
                ? selectedPieces[0].split(' - ')[1] || selectedPieces[0]
                : t('reports:presets.multiplePieces', {
                    count: selectedPieces.length,
                  })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
