import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { PiecesStatistics } from '../PiecesStatistics'
import { PieceComposerStats } from '../PieceComposerStats'
import { useAutocomplete } from '../../../hooks/useAutocomplete'
import { formatDuration } from '../../../utils/dateUtils'
import { Card } from '../../ui/Card'
import { Search } from 'lucide-react'

interface PiecesViewProps {
  analytics: EnhancedAnalyticsData
}

export default function PiecesView({ analytics }: PiecesViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [selectedComposer, setSelectedComposer] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Autocomplete hooks - with search query
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    composer: selectedComposer || undefined,
    minLength: 0,
  })

  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0,
  })

  // Update autocomplete queries when search changes
  useEffect(() => {
    pieceAutocomplete.setQuery(searchQuery)
  }, [searchQuery, pieceAutocomplete])

  // Filter analytics based on search query
  const filteredAnalytics = useMemo(() => {
    if (!searchQuery.trim()) return analytics

    const searchLower = searchQuery.toLowerCase()

    // Filter entries based on piece or composer matching search
    const filteredEntries = analytics.filteredEntries.filter(entry =>
      entry.pieces.some(
        piece =>
          piece.title.toLowerCase().includes(searchLower) ||
          (piece.composer && piece.composer.toLowerCase().includes(searchLower))
      )
    )

    // Recalculate piece stats based on filtered entries
    const newPieceStats = new Map<
      string,
      {
        count: number
        totalDuration: number
        lastPracticed: string
        techniques: Set<string>
      }
    >()

    filteredEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        const key = piece.composer
          ? `${piece.composer} - ${piece.title}`
          : piece.title

        const existing = newPieceStats.get(key) || {
          count: 0,
          totalDuration: 0,
          lastPracticed: entry.timestamp,
          techniques: new Set<string>(),
        }

        existing.count += 1
        existing.totalDuration += entry.duration / entry.pieces.length
        existing.techniques = new Set([
          ...existing.techniques,
          ...entry.techniques,
        ])

        if (new Date(entry.timestamp) > new Date(existing.lastPracticed)) {
          existing.lastPracticed = entry.timestamp
        }

        newPieceStats.set(key, existing)
      })
    })

    return {
      ...analytics,
      filteredEntries,
      pieceStats: newPieceStats,
    }
  }, [analytics, searchQuery])

  // Get all unique composers and pieces for dropdowns
  const allComposers = useMemo(() => {
    const composers = new Set<string>()
    analytics.filteredEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        if (piece.composer) composers.add(piece.composer)
      })
    })
    return Array.from(composers).sort()
  }, [analytics])

  const allPieces = useMemo(() => {
    const pieces = new Set<string>()
    analytics.filteredEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        const key = piece.composer
          ? `${piece.composer} - ${piece.title}`
          : piece.title
        pieces.add(key)
      })
    })
    return Array.from(pieces).sort()
  }, [analytics])

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-morandi-stone-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('reports:searchPiecesComposers')}
              className="w-full pl-10 pr-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedComposer || ''}
              onChange={e => setSelectedComposer(e.target.value || null)}
              className="px-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500"
            >
              <option value="">{t('reports:allComposers')}</option>
              {allComposers.map(composer => (
                <option key={composer} value={composer}>
                  {composer}
                </option>
              ))}
            </select>
            <select
              value={selectedPiece || ''}
              onChange={e => setSelectedPiece(e.target.value || null)}
              className="px-4 py-2 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-purple-500"
            >
              <option value="">{t('reports:allPieces')}</option>
              {allPieces
                .filter(
                  piece => !selectedComposer || piece.includes(selectedComposer)
                )
                .map(piece => (
                  <option key={piece} value={piece}>
                    {piece}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Selected Piece/Composer Stats */}
      {(selectedPiece || selectedComposer) && (
        <PieceComposerStats
          analytics={filteredAnalytics}
          selectedPiece={selectedPiece}
          selectedComposer={selectedComposer}
          formatDuration={formatDuration}
        />
      )}

      {/* Pieces Statistics Table */}
      <div>
        <h3 className="text-lg font-semibold text-morandi-stone-700 mb-3">
          {t('reports:detailedStatistics')}
        </h3>
        <PiecesStatistics
          analytics={filteredAnalytics}
          formatDuration={formatDuration}
          selectedPiece={selectedPiece}
          selectedComposer={selectedComposer}
          setSelectedPiece={setSelectedPiece}
        />
      </div>
    </div>
  )
}
