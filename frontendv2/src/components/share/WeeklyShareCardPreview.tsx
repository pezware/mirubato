import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type WeeklyShareCardData } from '../../hooks/useWeeklyShareCard'

interface WeeklyShareCardPreviewProps {
  data: WeeklyShareCardData
  showUsername?: boolean
  className?: string
}

// Stats card colors (matching Morandi palette)
const statColors = {
  time: { bg: '#fef3e2', text: '#b45309' }, // amber
  sessions: { bg: '#e0f2fe', text: '#0369a1' }, // blue
  pieces: { bg: '#dcfce7', text: '#15803d' }, // green
  consistency: { bg: '#fef9c3', text: '#a16207' }, // yellow
}

function formatDurationCompact(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export const WeeklyShareCardPreview = forwardRef<
  HTMLDivElement,
  WeeklyShareCardPreviewProps
>(({ data, showUsername = true, className }, ref) => {
  const { t } = useTranslation(['common', 'share'])

  const cardWidth = 540
  // Height is auto based on content
  const topPieces = data.pieces.slice(0, 5)

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: cardWidth,
        minHeight: 700,
        background: 'linear-gradient(180deg, #f5f3f0 0%, #e8e5e0 100%)',
        borderRadius: 24,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo-48x48.png"
            alt=""
            style={{ width: 32, height: 32, borderRadius: 6 }}
          />
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#3d3d3d',
                fontFamily: 'Lexend, Inter, sans-serif',
              }}
            >
              {t('share:weeklyReport', 'Weekly Report')}
            </div>
            <div style={{ fontSize: 12, color: '#7a7a7a' }}>
              {data.dateRangeFormatted}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#9a9a9a',
          }}
        >
          mirubato.com
        </div>
      </div>

      {/* Practice Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {/* Total Time */}
        <div
          style={{
            backgroundColor: statColors.time.bg,
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: statColors.time.text,
              fontFamily: 'Lexend, Inter, sans-serif',
            }}
          >
            {data.totalFormatted}
          </div>
          <div style={{ fontSize: 10, color: '#7a7a7a', marginTop: 2 }}>
            {t('share:totalTime', 'Total Time')}
          </div>
        </div>

        {/* Sessions */}
        <div
          style={{
            backgroundColor: statColors.sessions.bg,
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: statColors.sessions.text,
              fontFamily: 'Lexend, Inter, sans-serif',
            }}
          >
            {data.sessionCount}
          </div>
          <div style={{ fontSize: 10, color: '#7a7a7a', marginTop: 2 }}>
            {t('share:sessions', 'Sessions')}
          </div>
        </div>

        {/* Pieces */}
        <div
          style={{
            backgroundColor: statColors.pieces.bg,
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: statColors.pieces.text,
              fontFamily: 'Lexend, Inter, sans-serif',
            }}
          >
            {data.pieceCount}
          </div>
          <div style={{ fontSize: 10, color: '#7a7a7a', marginTop: 2 }}>
            {t('share:pieces', 'Pieces')}
          </div>
        </div>

        {/* Consistency */}
        <div
          style={{
            backgroundColor: statColors.consistency.bg,
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: statColors.consistency.text,
              fontFamily: 'Lexend, Inter, sans-serif',
            }}
          >
            {data.consistencyPercent}%
          </div>
          <div style={{ fontSize: 10, color: '#7a7a7a', marginTop: 2 }}>
            {t('share:consistency', 'Consistency')}
          </div>
        </div>
      </div>

      {/* Average Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16 }}>&#9201;</div>
          <div>
            <div style={{ fontSize: 10, color: '#7a7a7a' }}>
              {t('share:avgSession', 'Avg Session')}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#3d3d3d',
                fontFamily: 'Lexend, Inter, sans-serif',
              }}
            >
              {data.avgSessionFormatted}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 16 }}>&#128197;</div>
          <div>
            <div style={{ fontSize: 10, color: '#7a7a7a' }}>
              {t('share:dailyAvg', 'Daily Avg')}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#3d3d3d',
                fontFamily: 'Lexend, Inter, sans-serif',
              }}
            >
              {data.dailyAvgFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Practice Chart */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
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
          {t('share:dailyPractice', 'Daily Practice')}
        </div>

        {/* Bar Chart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: 80,
            gap: 8,
          }}
        >
          {data.dailyData.map((day, index) => {
            const heightPercent =
              data.maxDailyMinutes > 0
                ? (day.minutes / data.maxDailyMinutes) * 100
                : 0
            const hasData = day.minutes > 0

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {/* Time label (only if has data) */}
                {hasData && (
                  <div
                    style={{
                      fontSize: 9,
                      color: '#6b8f6b',
                      fontWeight: 500,
                    }}
                  >
                    {formatDurationCompact(day.minutes)}
                  </div>
                )}
                {/* Bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 40,
                    height: hasData ? `${Math.max(heightPercent, 8)}%` : 4,
                    backgroundColor: hasData ? '#8ba98b' : '#e0e0e0',
                    borderRadius: 4,
                    transition: 'height 0.3s ease',
                  }}
                />
                {/* Day label */}
                <div
                  style={{
                    fontSize: 10,
                    color: hasData ? '#3d3d3d' : '#aaa',
                    fontWeight: hasData ? 500 : 400,
                  }}
                >
                  {day.dayName}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Pieces Section */}
      {topPieces.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 16,
            padding: 16,
            flex: 1,
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
            {t('share:topPieces', 'Top Pieces')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPieces.map((piece, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#3d3d3d',
                      fontFamily: '"Noto Serif", Georgia, serif',
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
                        fontSize: 12,
                        color: '#666',
                        fontFamily: '"Noto Serif", Georgia, serif',
                      }}
                    >
                      {piece.composer}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#6b8f6b',
                    }}
                  >
                    {formatDurationCompact(piece.totalMinutes)}
                  </div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {piece.sessionCount}{' '}
                    {piece.sessionCount === 1
                      ? t('share:session', 'session')
                      : t('share:sessionPlural', 'sessions')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.pieces.length > 5 && (
            <div
              style={{
                fontSize: 12,
                color: '#7a7a7a',
                fontStyle: 'italic',
                marginTop: 8,
              }}
            >
              +{data.pieces.length - 5} {t('share:morePieces', 'more pieces')}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {showUsername && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#6b8f6b',
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
          <span style={{ fontSize: 12, color: '#3d3d3d', fontWeight: 500 }}>
            @{data.displayName.toLowerCase().replace(/\s+/g, '')}
          </span>
        </div>
      )}
    </div>
  )
})

WeeklyShareCardPreview.displayName = 'WeeklyShareCardPreview'
