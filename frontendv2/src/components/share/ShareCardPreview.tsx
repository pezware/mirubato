import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format,
  getDay,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns'
import { type ShareCardData } from '../../hooks/useShareCard'

export type CardVariant = 'story' | 'square' | 'long'

interface ShareCardPreviewProps {
  data: ShareCardData
  variant: CardVariant
  showUsername?: boolean
  showNotes?: boolean
  className?: string
}

// Heatmap intensity colors (matching the app's Morandi palette)
const getIntensityColor = (intensity: number): string => {
  switch (intensity) {
    case 0:
      return '#e8e5e0' // morandi-stone-100
    case 1:
      return '#c5d1c5' // morandi-sage-200
    case 2:
      return '#a8bfa8' // morandi-sage-300
    case 3:
      return '#8ba98b' // morandi-sage-400
    case 4:
      return '#6b8f6b' // morandi-sage-500
    default:
      return '#e8e5e0'
  }
}

function MiniHeatmap({
  data,
  months = 4,
}: {
  data: Map<string, number>
  months?: number
}) {
  const now = new Date()
  const startDate = startOfMonth(subMonths(now, months - 1))
  const endDate = endOfMonth(now)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Find max value for intensity calculation
  const maxValue = Math.max(...Array.from(data.values()), 1)

  // Group days by weeks (visual columns)
  const weeks: Array<Array<{ date: Date; value: number; intensity: number }>> =
    []
  let currentWeek: Array<{ date: Date; value: number; intensity: number }> = []

  // Add empty days at the beginning if month doesn't start on Sunday
  const firstDayOfPeriod = getDay(startDate)
  for (let i = 0; i < firstDayOfPeriod; i++) {
    currentWeek.push({ date: new Date(0), value: 0, intensity: 0 })
  }

  days.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const value = data.get(dateStr) || 0
    const intensity = value > 0 ? Math.ceil((value / maxValue) * 4) : 0

    currentWeek.push({ date, value, intensity })

    if (getDay(date) === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const cellSize = 8
  const gap = 2

  return (
    <div style={{ display: 'flex', gap: `${gap}px` }}>
      {weeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}
        >
          {week.map((dayData, dayIndex) => {
            if (dayData.date.getFullYear() === 1970) {
              return (
                <div
                  key={dayIndex}
                  style={{ width: cellSize, height: cellSize }}
                />
              )
            }
            return (
              <div
                key={dayIndex}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getIntensityColor(dayData.intensity),
                  borderRadius: 2,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export const ShareCardPreview = forwardRef<
  HTMLDivElement,
  ShareCardPreviewProps
>(
  (
    { data, variant, showUsername = true, showNotes = false, className },
    ref
  ) => {
    const { t } = useTranslation(['common', 'share'])

    const isStory = variant === 'story'
    const isLong = variant === 'long'
    const cardWidth = 540
    // Long variant auto-calculates height based on content, but has a minimum
    const cardHeight = isLong ? 'auto' : isStory ? 960 : 540
    const minHeight = isLong ? 800 : undefined

    // Limit pieces to show (fewer if notes are shown, more in long variant)
    const hasNotes = showNotes && data.todayNotes.length > 0
    const maxPieces = isLong
      ? 10
      : hasNotes
        ? isStory
          ? 2
          : 1
        : isStory
          ? 4
          : 2
    const piecesToShow = data.todayPieces.slice(0, maxPieces)

    // Combine notes into a single display string (no truncation for long variant)
    const combinedNotes = data.todayNotes.join(' • ')
    const maxNotesLength = isLong ? Infinity : isStory ? 200 : 100
    const displayNotes =
      combinedNotes.length > maxNotesLength
        ? combinedNotes.slice(0, maxNotesLength).trim() + '...'
        : combinedNotes

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: cardWidth,
          height: cardHeight,
          minHeight: minHeight,
          background: 'linear-gradient(180deg, #f5f3f0 0%, #e8e5e0 100%)',
          borderRadius: 24,
          padding: isStory || isLong ? 32 : 24,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: isStory || isLong ? 24 : 16,
          }}
        >
          <img
            src="/logo-48x48.png"
            alt=""
            style={{ width: 32, height: 32, borderRadius: 6 }}
          />
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#3d3d3d',
                fontFamily: 'Lexend, Inter, sans-serif',
              }}
            >
              {t('common:appName')}
            </div>
            <div style={{ fontSize: 11, color: '#7a7a7a' }}>
              {t('share:practiceJournal', 'Practice Journal')}
            </div>
          </div>
        </div>

        {/* Today's Practice Section */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 16,
            padding: isStory || isLong ? 24 : 16,
            marginBottom: isStory || isLong ? 20 : 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#7a7a7a',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            {t('share:todaysPractice', "Today's Practice")}
          </div>
          <div
            style={{
              fontSize: isStory || isLong ? 48 : 36,
              fontWeight: 300,
              color: '#3d3d3d',
              fontFamily: 'Lexend, Inter, sans-serif',
            }}
          >
            {data.todayTotalFormatted || '0m'}
          </div>
          <div style={{ fontSize: 14, color: '#7a7a7a', marginTop: 4 }}>
            {data.todayFormatted}
          </div>
        </div>

        {/* Pieces Section */}
        {piecesToShow.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 16,
              padding: isStory || isLong ? 20 : 14,
              marginBottom: isStory || isLong ? 20 : 12,
              flex: isStory && !isLong ? 1 : 'none',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#7a7a7a',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              {t('share:piecesPracticed', 'Pieces Practiced')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {piecesToShow.map((piece, index) => (
                <div
                  key={index}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <span style={{ fontSize: 16, marginTop: 2 }}>&#119070;</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: isStory || isLong ? 16 : 14,
                        fontWeight: 500,
                        color: '#3d3d3d',
                        fontFamily: '"Noto Serif", Georgia, serif',
                        lineHeight: 1.3,
                      }}
                    >
                      {piece.title}
                    </div>
                    {piece.composer && (
                      <div
                        style={{
                          fontSize: isStory || isLong ? 13 : 12,
                          color: '#666',
                          fontFamily: '"Noto Serif", Georgia, serif',
                        }}
                      >
                        {piece.composer}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data.todayPieces.length > maxPieces && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#7a7a7a',
                    fontStyle: 'italic',
                  }}
                >
                  +{data.todayPieces.length - maxPieces}{' '}
                  {t('share:morePieces', 'more pieces')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {hasNotes && (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 16,
              padding: isStory || isLong ? 20 : 14,
              marginBottom: isStory || isLong ? 20 : 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#7a7a7a',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              {t('share:practiceNotes', 'Practice Notes')}
            </div>
            {isLong ? (
              // Long variant: show each note separately
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.todayNotes.map((note, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: 14,
                      color: '#4a4a4a',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      paddingLeft: 12,
                      borderLeft: '3px solid #a8bfa8',
                    }}
                  >
                    "{note}"
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: isStory ? 15 : 13,
                  color: '#4a4a4a',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}
              >
                "{displayNotes}"
              </div>
            )}
          </div>
        )}

        {/* Stats & Heatmap Section */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 16,
            padding: isStory || isLong ? 20 : 14,
            marginBottom: isStory || isLong ? 20 : 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#7a7a7a',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {t('share:practiceJourney', 'Practice Journey')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#3d3d3d' }}>
              {t('share:totalTime', 'Total')}: {data.totalFormatted}
            </div>
          </div>
          <MiniHeatmap
            data={data.heatmapData}
            months={isLong ? 6 : isStory ? 4 : 3}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          {showUsername && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: '#6b8f6b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {data.displayName[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: 13, color: '#3d3d3d', fontWeight: 500 }}>
                @{data.displayName.toLowerCase().replace(/\s+/g, '')}
              </span>
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: '#7a7a7a',
              marginLeft: showUsername ? 0 : 'auto',
            }}
          >
            mirubato.com
          </div>
        </div>
      </div>
    )
  }
)

ShareCardPreview.displayName = 'ShareCardPreview'
