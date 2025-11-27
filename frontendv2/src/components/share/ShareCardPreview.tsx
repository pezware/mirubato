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
import { type UseShareCardReturn } from '../../hooks/useShareCard'
import { formatDuration } from '../../utils/dateUtils'

export type CardVariant = 'story' | 'square'

interface ShareCardPreviewProps {
  data: UseShareCardReturn
  variant: CardVariant
  showUsername?: boolean
  showNotes?: boolean
  className?: string
}

// Color palette - elegant Morandi tones
const colors = {
  background: {
    gradient: 'linear-gradient(145deg, #faf9f7 0%, #f0ece6 50%, #e8e4dc 100%)',
    card: 'rgba(255, 255, 255, 0.75)',
    cardAlt: 'rgba(255, 255, 255, 0.55)',
  },
  text: {
    primary: '#2d2d2d',
    secondary: '#5a5a5a',
    tertiary: '#8a8a8a',
    accent: '#6b8f6b',
  },
  chart: {
    bar: '#8ba98b',
    barLight: '#c5d1c5',
    barEmpty: '#e8e5e0',
  },
  heatmap: {
    empty: '#e8e5e0',
    level1: '#c5d1c5',
    level2: '#a8bfa8',
    level3: '#8ba98b',
    level4: '#6b8f6b',
  },
  status: {
    planned: '#9ca3af',
    learning: '#60a5fa',
    polished: '#34d399',
    dropped: '#f87171',
  },
}

// Heatmap intensity colors
const getIntensityColor = (intensity: number): string => {
  switch (intensity) {
    case 0:
      return colors.heatmap.empty
    case 1:
      return colors.heatmap.level1
    case 2:
      return colors.heatmap.level2
    case 3:
      return colors.heatmap.level3
    case 4:
      return colors.heatmap.level4
    default:
      return colors.heatmap.empty
  }
}

// Status badge colors
const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase()
  if (statusLower in colors.status) {
    return colors.status[statusLower as keyof typeof colors.status]
  }
  return colors.text.secondary
}

// Mini Heatmap Component
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

  const maxValue = Math.max(...Array.from(data.values()), 1)

  const weeks: Array<Array<{ date: Date; value: number; intensity: number }>> =
    []
  let currentWeek: Array<{ date: Date; value: number; intensity: number }> = []

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

// Weekly Bar Chart Component
function WeeklyBarChart({
  data,
  isStory,
}: {
  data: { dayLabel: string; minutes: number }[]
  isStory: boolean
}) {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1)
  const barHeight = isStory ? 100 : 60
  const barWidth = isStory ? 48 : 36
  const gap = isStory ? 8 : 6

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: `${gap}px`,
        height: barHeight + 24,
      }}
    >
      {data.map((day, index) => {
        const height =
          day.minutes > 0
            ? Math.max((day.minutes / maxMinutes) * barHeight, 4)
            : 4
        const hasData = day.minutes > 0

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                width: barWidth,
                height: height,
                backgroundColor: hasData
                  ? colors.chart.bar
                  : colors.chart.barEmpty,
                borderRadius: 4,
                transition: 'height 0.3s ease',
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: hasData ? colors.text.secondary : colors.text.tertiary,
                fontWeight: hasData ? 500 : 400,
              }}
            >
              {day.dayLabel}
            </span>
          </div>
        )
      })}
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
    const isWeekly = data.viewMode === 'week'
    const cardWidth = isStory ? 540 : 540
    // Adjust heights: weekly cards need more space for bar chart
    const cardHeight = isStory ? (isWeekly ? 1080 : 960) : isWeekly ? 620 : 540

    // Determine max pieces based on content
    const hasNotes = showNotes && data.periodNotes.length > 0
    const hasEvents = isWeekly && data.weeklyEvents.length > 0

    const getMaxPieces = (): number => {
      if (isWeekly) {
        // Weekly cards show fewer pieces due to bar chart
        if (hasNotes) return isStory ? 3 : 2
        if (hasEvents) return isStory ? 4 : 3
        return isStory ? 5 : 4
      }
      // Daily cards
      if (hasNotes) return isStory ? 3 : 2
      return isStory ? 5 : 3
    }

    const maxPieces = getMaxPieces()
    const piecesToShow = data.periodPieces.slice(0, maxPieces)
    const eventsToShow = isWeekly ? data.weeklyEvents.slice(0, 3) : []

    // Combine notes into a single display string
    const combinedNotes = data.periodNotes.join(' • ')
    const maxNotesLength = isStory ? 180 : 100
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
          background: colors.background.gradient,
          borderRadius: 20,
          padding: isStory ? 32 : 24,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: isStory ? 20 : 14,
          }}
        >
          <img
            src="/logo-48x48.png"
            alt="Mirubato logo"
            style={{ width: 32, height: 32, borderRadius: 8 }}
          />
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: colors.text.primary,
                fontFamily: 'Lexend, Inter, sans-serif',
              }}
            >
              {t('common:appName')}
            </div>
            <div style={{ fontSize: 11, color: colors.text.tertiary }}>
              {t('share:practiceJournal', 'Practice Journal')}
            </div>
          </div>
        </div>

        {/* Main Practice Section */}
        <div
          style={{
            backgroundColor: colors.background.card,
            borderRadius: 16,
            padding: isStory ? 24 : 18,
            marginBottom: isStory ? 16 : 12,
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 6,
            }}
          >
            {isWeekly
              ? t('share:weeklyPractice', 'Weekly Practice')
              : t('share:todaysPractice', "Today's Practice")}
          </div>
          <div
            style={{
              fontSize: isStory ? 44 : 32,
              fontWeight: 300,
              color: colors.text.primary,
              fontFamily: 'Lexend, Inter, sans-serif',
              lineHeight: 1.1,
            }}
          >
            {data.periodTotalFormatted || '0m'}
          </div>
          <div
            style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}
          >
            {data.periodLabel.replace(/ \(.*\)$/, '')}
          </div>

          {/* Weekly Stats Row */}
          {isWeekly && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isStory ? 32 : 24,
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${colors.heatmap.empty}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: colors.text.primary,
                  }}
                >
                  {data.weeklySessionCount}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('share:sessions', 'Sessions')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: colors.text.primary,
                  }}
                >
                  {data.periodPieces.length}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('share:pieces', 'Pieces')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: colors.text.accent,
                  }}
                >
                  {data.weeklyConsistency}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('share:consistency', 'Consistency')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Bar Chart */}
        {isWeekly && data.weeklyDailyData.length > 0 && (
          <div
            style={{
              backgroundColor: colors.background.cardAlt,
              borderRadius: 16,
              padding: isStory ? 18 : 14,
              marginBottom: isStory ? 16 : 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {t('share:dailyBreakdown', 'Daily Breakdown')}
            </div>
            <WeeklyBarChart data={data.weeklyDailyData} isStory={isStory} />
          </div>
        )}

        {/* Pieces Section */}
        {piecesToShow.length > 0 && (
          <div
            style={{
              backgroundColor: colors.background.cardAlt,
              borderRadius: 16,
              padding: isStory ? 18 : 14,
              marginBottom: isStory ? 16 : 12,
              flex: isWeekly ? 'none' : isStory ? 1 : 'none',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              {isWeekly
                ? t('share:topPieces', 'Top Pieces This Week')
                : t('share:piecesPracticed', 'Pieces Practiced')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {piecesToShow.map((piece, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      marginTop: 2,
                      opacity: 0.6,
                    }}
                  >
                    &#119070;
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: isStory ? 15 : 13,
                        fontWeight: 500,
                        color: colors.text.primary,
                        fontFamily: '"Noto Serif", Georgia, serif',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {piece.title}
                    </div>
                    {piece.composer && (
                      <div
                        style={{
                          fontSize: isStory ? 12 : 11,
                          color: colors.text.secondary,
                          fontFamily: '"Noto Serif", Georgia, serif',
                        }}
                      >
                        {piece.composer}
                      </div>
                    )}
                  </div>
                  {isWeekly && (
                    <div
                      style={{
                        fontSize: 11,
                        color: colors.text.tertiary,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDuration(piece.duration)}
                    </div>
                  )}
                </div>
              ))}
              {data.periodPieces.length > maxPieces && (
                <div
                  style={{
                    fontSize: 11,
                    color: colors.text.tertiary,
                    fontStyle: 'italic',
                  }}
                >
                  +{data.periodPieces.length - maxPieces}{' '}
                  {t('share:morePieces', 'more')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Section (Weekly only) */}
        {eventsToShow.length > 0 && (
          <div
            style={{
              backgroundColor: colors.background.cardAlt,
              borderRadius: 16,
              padding: isStory ? 18 : 14,
              marginBottom: isStory ? 16 : 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              {t('share:keyEvents', 'Key Events')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {eventsToShow.map((event, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(event.newStatus),
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    <span
                      style={{ fontWeight: 500, color: colors.text.primary }}
                    >
                      {event.pieceTitle}
                    </span>
                    {' → '}
                    <span
                      style={{
                        fontWeight: 500,
                        color: getStatusColor(event.newStatus),
                      }}
                    >
                      {event.newStatus}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {hasNotes && (
          <div
            style={{
              backgroundColor: colors.background.cardAlt,
              borderRadius: 16,
              padding: isStory ? 18 : 14,
              marginBottom: isStory ? 16 : 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              {t('share:practiceNotes', 'Practice Notes')}
            </div>
            <div
              style={{
                fontSize: isStory ? 14 : 12,
                color: colors.text.secondary,
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              "{displayNotes}"
            </div>
          </div>
        )}

        {/* Stats & Heatmap Section */}
        <div
          style={{
            backgroundColor: colors.background.cardAlt,
            borderRadius: 16,
            padding: isStory ? 18 : 14,
            marginBottom: isStory ? 16 : 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {t('share:practiceJourney', 'Practice Journey')}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: colors.text.primary,
              }}
            >
              {t('share:totalTime', 'Total')}: {data.totalFormatted}
            </div>
          </div>
          <MiniHeatmap data={data.heatmapData} months={isStory ? 4 : 3} />
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
                  backgroundColor: colors.text.accent,
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
              <span
                style={{
                  fontSize: 13,
                  color: colors.text.primary,
                  fontWeight: 500,
                }}
              >
                @{data.displayName.toLowerCase().replace(/\s+/g, '')}
              </span>
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: colors.text.tertiary,
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
