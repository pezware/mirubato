import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type WeeklyShareCardData } from '../../hooks/useWeeklyShareCard'

interface WeeklyShareCardPreviewProps {
  data: WeeklyShareCardData
  showUsername?: boolean
  className?: string
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
  const topPieces = data.pieces.slice(0, 5)

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: cardWidth,
        background: 'linear-gradient(180deg, #f5f3f0 0%, #e8e5e0 100%)',
        borderRadius: 24,
        padding: 24,
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
          gap: 12,
          marginBottom: 16,
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
            {t('share:weeklyReport', 'Weekly Report')}
          </div>
          <div style={{ fontSize: 11, color: '#7a7a7a' }}>
            {data.dateRangeFormatted}
          </div>
        </div>
      </div>

      {/* Main Stats - Large Display */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#7a7a7a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          {t('share:totalTime', 'Total Time')}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 300,
            color: '#3d3d3d',
            fontFamily: 'Lexend, Inter, sans-serif',
          }}
        >
          {data.totalFormatted}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginTop: 8,
            fontSize: 12,
            color: '#666',
          }}
        >
          <span>
            <strong style={{ color: '#3d3d3d' }}>{data.sessionCount}</strong>{' '}
            {t('share:sessions', 'sessions')}
          </span>
          <span>
            <strong style={{ color: '#3d3d3d' }}>{data.pieceCount}</strong>{' '}
            {t('share:pieces', 'pieces')}
          </span>
          <span>
            <strong style={{ color: '#6b8f6b' }}>
              {data.consistencyPercent}%
            </strong>{' '}
            {t('share:consistency', 'consistency')}
          </span>
        </div>
      </div>

      {/* Daily Practice Chart */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#7a7a7a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
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
            height: 60,
            gap: 4,
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
                <div
                  style={{
                    width: '100%',
                    maxWidth: 36,
                    height: hasData ? `${Math.max(heightPercent, 10)}%` : 3,
                    backgroundColor: hasData ? '#8ba98b' : '#ddd',
                    borderRadius: 3,
                  }}
                />
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
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#7a7a7a',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            {t('share:topPieces', 'Top Pieces')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      fontSize: 13,
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
                        fontSize: 11,
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
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#6b8f6b',
                    }}
                  >
                    {formatDurationCompact(piece.totalMinutes)}
                  </div>
                  <div style={{ fontSize: 10, color: '#999' }}>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        {showUsername && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
})

WeeklyShareCardPreview.displayName = 'WeeklyShareCardPreview'
