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

// Color palette - professional Morandi tones aligned with frontend design
const colors = {
  background: {
    gradient: 'linear-gradient(160deg, #faf9f7 0%, #f5f3f0 100%)',
    card: 'rgba(255, 255, 255, 0.8)',
    cardAlt: 'rgba(255, 255, 255, 0.6)',
  },
  text: {
    primary: '#1f2937', // gray-800 - stronger contrast
    secondary: '#4b5563', // gray-600
    tertiary: '#6b7280', // gray-500
    accent: '#6b8f6b', // morandi-sage-500
  },
  chart: {
    bar: '#7ba87b',
    barLight: '#a8c4a8',
    barEmpty: '#e8e5e0',
  },
  heatmap: {
    empty: '#e8e5e0',
    level1: '#d4ddd4',
    level2: '#a8c4a8',
    level3: '#7ba87b',
    level4: '#4d8a4d',
  },
  status: {
    planned: '#9ca3af',
    learning: '#60a5fa',
    polished: '#34d399',
    dropped: '#f87171',
  },
}

// Inline SVG icons for html-to-image compatibility
const MusicIcon = ({
  size = 14,
  color = colors.text.accent,
}: {
  size?: number
  color?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)

const PenLineIcon = ({
  size = 14,
  color = colors.text.tertiary,
}: {
  size?: number
  color?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
)

const CalendarIcon = ({
  size = 14,
  color = colors.text.tertiary,
}: {
  size?: number
  color?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
)

const ActivityIcon = ({
  size = 14,
  color = colors.text.tertiary,
}: {
  size?: number
  color?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </svg>
)

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
  isStory = true,
}: {
  data: Map<string, number>
  months?: number
  isStory?: boolean
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

  // Larger cells for better visibility
  const cellSize = isStory ? 9 : 7
  const gap = 2

  return (
    <div style={{ display: 'flex', gap: `${gap}px`, flexWrap: 'wrap' }}>
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
  // Improved proportions - wider bars, better height
  const barHeight = isStory ? 80 : 50
  const barWidth = isStory ? 52 : 40
  const gap = isStory ? 8 : 6

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: `${gap}px`,
        height: barHeight + 20,
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
              gap: 3,
            }}
          >
            <div
              style={{
                width: barWidth,
                height: height,
                backgroundColor: hasData
                  ? colors.chart.bar
                  : colors.chart.barEmpty,
                borderRadius: 3,
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: hasData ? colors.text.secondary : colors.text.tertiary,
                fontWeight: hasData ? 500 : 400,
                fontFamily: 'Inter, system-ui, sans-serif',
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

// Section card base style helper
const getSectionStyle = (isStory: boolean) => ({
  backgroundColor: colors.background.cardAlt,
  borderRadius: 12,
  padding: isStory ? 14 : 10,
  marginBottom: isStory ? 10 : 8,
  border: '1px solid rgba(0,0,0,0.03)',
})

// Section header style helper
const getSectionHeaderStyle = () => ({
  fontSize: 9,
  fontWeight: 600 as const,
  color: colors.text.tertiary,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.2,
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
})

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
    const cardWidth = 540

    // Determine content to show
    const hasNotes = showNotes && data.periodNotes.length > 0

    // Show ALL pieces - card will expand to fit
    const piecesToShow = data.periodPieces
    const eventsToShow = isWeekly ? data.weeklyEvents.slice(0, 4) : []

    // FULL notes display - no truncation when user opts in
    const combinedNotes = data.periodNotes.join(' • ')
    // Only truncate at very extreme lengths to prevent card from being too tall
    const maxNotesLength = isStory ? 600 : 400
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
          // AUTO HEIGHT - content determines size
          height: 'auto',
          minHeight: isStory ? 600 : 400,
          background: colors.background.gradient,
          borderRadius: 16,
          // Tighter padding for denser layout
          padding: isStory ? 24 : 18,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Inter", system-ui, sans-serif',
          boxSizing: 'border-box',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header - single line for Practice Journal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: isStory ? 16 : 12,
          }}
        >
          <img
            src="/logo-48x48.png"
            alt="Mirubato logo"
            style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.text.primary,
                fontFamily: '"Lexend", system-ui, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {t('common:appName')}
            </div>
            <div
              style={{
                fontSize: 10,
                color: colors.text.tertiary,
                whiteSpace: 'nowrap',
              }}
            >
              {t('share:practiceJournal', 'Practice Journal')}
            </div>
          </div>
        </div>

        {/* Main Practice Section */}
        <div
          style={{
            backgroundColor: colors.background.card,
            borderRadius: 12,
            padding: isStory ? 20 : 14,
            marginBottom: isStory ? 10 : 8,
            textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            {isWeekly
              ? t('share:weeklyPractice', 'Weekly Practice')
              : t('share:todaysPractice', "Today's Practice")}
          </div>
          <div
            style={{
              // LARGER duration for better visual hierarchy
              fontSize: isStory ? 56 : 40,
              fontWeight: 200,
              color: colors.text.primary,
              fontFamily: '"Lexend", system-ui, sans-serif',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {data.periodTotalFormatted || '0m'}
          </div>
          <div
            style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}
          >
            {data.periodLabel.replace(/ \(.*\)$/, '')}
          </div>

          {/* Weekly Stats Row */}
          {isWeekly && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isStory ? 28 : 20,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${colors.heatmap.empty}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: colors.text.primary,
                  }}
                >
                  {data.weeklySessionCount}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('share:sessions', 'Sessions')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: colors.text.primary,
                  }}
                >
                  {data.periodPieces.length}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('share:pieces', 'Pieces')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color:
                      data.weeklyConsistency >= 70
                        ? colors.text.accent
                        : colors.text.primary,
                  }}
                >
                  {data.weeklyConsistency}%
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: colors.text.tertiary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('share:consistency', 'Consistency')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly Bar Chart - no header, chart is self-explanatory */}
        {isWeekly && data.weeklyDailyData.length > 0 && (
          <div style={getSectionStyle(isStory)}>
            <WeeklyBarChart data={data.weeklyDailyData} isStory={isStory} />
          </div>
        )}

        {/* Pieces Section - no header, show all pieces */}
        {piecesToShow.length > 0 && (
          <div style={getSectionStyle(isStory)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {piecesToShow.map((piece, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <MusicIcon size={14} color={colors.text.accent} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: isStory ? 14 : 12,
                        fontWeight: 500,
                        color: colors.text.primary,
                        fontFamily: '"Noto Serif", Georgia, serif',
                        lineHeight: 1.3,
                      }}
                    >
                      {piece.title}
                    </div>
                    {piece.composer && (
                      <div
                        style={{
                          fontSize: isStory ? 12 : 10,
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
                        fontSize: 10,
                        color: colors.text.tertiary,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        backgroundColor: 'rgba(107, 143, 107, 0.1)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {formatDuration(piece.duration)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Section (Weekly only) - single line header */}
        {eventsToShow.length > 0 && (
          <div style={getSectionStyle(isStory)}>
            <div style={{ ...getSectionHeaderStyle(), whiteSpace: 'nowrap' }}>
              <ActivityIcon size={12} color={colors.text.tertiary} />
              <span>{t('share:keyEvents', 'Key Events')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {eventsToShow.map((event, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(event.newStatus),
                      flexShrink: 0,
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

        {/* Notes Section - FULL content display */}
        {hasNotes && (
          <div style={getSectionStyle(isStory)}>
            <div style={getSectionHeaderStyle()}>
              <PenLineIcon size={12} color={colors.text.tertiary} />
              <span>{t('share:practiceNotes', 'Practice Notes')}</span>
            </div>
            <div
              style={{
                fontSize: isStory ? 13 : 11,
                color: colors.text.secondary,
                lineHeight: 1.6,
                fontStyle: 'italic',
                // Removed word-break to let content flow naturally
              }}
            >
              "{displayNotes}"
            </div>
          </div>
        )}

        {/* Stats & Heatmap Section - ensure no cut-off */}
        <div
          style={{
            ...getSectionStyle(isStory),
            marginBottom: 0, // Remove bottom margin before footer
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                ...getSectionHeaderStyle(),
                whiteSpace: 'nowrap',
                marginBottom: 0,
              }}
            >
              <CalendarIcon size={12} color={colors.text.tertiary} />
              <span>{t('share:practiceJourney', 'Practice Journey')}</span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 10,
                fontWeight: 500,
                color: colors.text.primary,
                whiteSpace: 'nowrap',
              }}
            >
              {isWeekly && (
                <span style={{ color: colors.text.secondary }}>
                  {data.weeklySessionCount} {t('share:sessions', 'sessions')}
                </span>
              )}
              <span>
                {t('share:totalTime', 'Total')}: {data.totalFormatted}
              </span>
            </div>
          </div>
          <MiniHeatmap
            data={data.heatmapData}
            months={isStory ? 4 : 3}
            isStory={isStory}
          />
        </div>

        {/* Footer with export timestamp */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: isStory ? 14 : 10,
            paddingTop: isStory ? 12 : 8,
            borderTop: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {showUsername && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: colors.text.accent,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {data.displayName[0]?.toUpperCase() || '?'}
              </div>
              <span
                style={{
                  fontSize: 12,
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
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginLeft: showUsername ? 0 : 'auto',
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: colors.text.tertiary,
                fontWeight: 300,
              }}
            >
              {format(new Date(), 'MMM d, yyyy HH:mm')}
            </span>
            <span
              style={{
                fontSize: 10,
                color: colors.text.tertiary,
              }}
            >
              mirubato.com
            </span>
          </div>
        </div>
      </div>
    )
  }
)

ShareCardPreview.displayName = 'ShareCardPreview'
