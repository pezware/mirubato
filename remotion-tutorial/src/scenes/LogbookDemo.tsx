import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { theme } from '../theme/mirubato'
import { fadeIn, staggeredAppearance } from '../utils/animations'

export const LogbookDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.3)

  // Calendar heatmap animation - using Morandi sage greens
  const heatmapOpacity = fadeIn(frame, fps * 0.3, fps * 0.3)

  // Generate sample heatmap data (7x4 grid for weeks)
  const weeks = 4
  const daysPerWeek = 7
  const heatmapData = Array.from({ length: weeks * daysPerWeek }, (_, i) => {
    // Simulate practice data with varying intensity
    const intensity = Math.random() > 0.3 ? Math.random() : 0
    return intensity
  })

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return theme.colors.backgroundLighter // morandi-stone-200
    if (intensity < 0.3) return '#d4d9cc' // morandi-sage-200
    if (intensity < 0.6) return '#b8c2a9' // morandi-sage-300
    return theme.colors.primary // morandi-sage-400
  }

  // Timer display animation - matches TimerWidget styling
  const timerOpacity = fadeIn(frame, fps * 1, fps * 0.3)
  const timerValue = Math.floor(((frame - fps * 1.2) / fps) * 3) // Faster timer
  const timerDisplay = `${Math.floor(Math.max(0, timerValue) / 60)}:${String(Math.max(0, timerValue) % 60).padStart(2, '0')}`

  // Sample practice entries
  const sampleEntries = [
    {
      piece: 'Clair de Lune',
      composer: 'Debussy',
      duration: '25 min',
      type: 'Repertoire',
    },
    {
      piece: 'Scales & Arpeggios',
      composer: 'Technical',
      duration: '15 min',
      type: 'Technique',
    },
    {
      piece: 'Moonlight Sonata',
      composer: 'Beethoven',
      duration: '30 min',
      type: 'Repertoire',
    },
  ]

  // Annotation timing
  const showAnnotation = frame > fps * 1.5

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
        position: 'relative',
        padding: '4%',
      }}
    >
      <ChapterTitle
        title="Logbook"
        subtitle="Track every practice session"
        opacity={titleOpacity}
      />

      {/* Main Content Grid */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '5%',
          right: '5%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing['2xl'],
        }}
      >
        {/* Left Side - Timer Widget (Authentic Mirubato styling) */}
        <div
          style={{
            opacity: timerOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: '#dcfce7', // Green background like TimerWidget
              padding: theme.spacing.xl,
              borderRadius: '0.75rem',
              marginBottom: theme.spacing.xl,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span
                style={{
                  fontSize: theme.fontSizes['4xl'],
                  fontFamily: theme.fonts.ui,
                  fontWeight: 500,
                  color: '#15803d',
                }}
              >
                {timerDisplay}
              </span>
            </div>
            <p
              style={{
                fontSize: theme.fontSizes.base,
                fontFamily: theme.fonts.ui,
                color: '#166534',
                margin: 0,
                marginTop: theme.spacing.sm,
              }}
            >
              Practice session in progress
            </p>
          </div>

          {/* Recent Entries List */}
          <div>
            <h4
              style={{
                fontSize: theme.fontSizes.lg,
                fontFamily: theme.fonts.headers,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.md,
                fontWeight: 300,
              }}
            >
              Recent Sessions
            </h4>
            {sampleEntries.map((entry, i) => {
              const entryOpacity = staggeredAppearance(frame - fps * 1.5, i, 10)
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: theme.colors.backgroundLight,
                    padding: theme.spacing.md,
                    borderRadius: '0.5rem',
                    marginBottom: theme.spacing.sm,
                    opacity: entryOpacity,
                    transform: `translateX(${(1 - entryOpacity) * -20}px)`,
                    border: `1px solid ${theme.colors.backgroundLighter}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: theme.fontSizes.base,
                          fontFamily: theme.fonts.music,
                          color: theme.colors.musicTitle,
                          margin: 0,
                          fontWeight: 500,
                        }}
                      >
                        {entry.piece}
                      </p>
                      <p
                        style={{
                          fontSize: theme.fontSizes.sm,
                          fontFamily: theme.fonts.music,
                          color: theme.colors.musicComposer,
                          margin: 0,
                        }}
                      >
                        {entry.composer}
                      </p>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      <span
                        style={{
                          backgroundColor:
                            entry.type === 'Repertoire'
                              ? '#e5dded' // morandi-purple-200
                              : '#e8ebe4', // morandi-sage-100
                          color:
                            entry.type === 'Repertoire'
                              ? '#6b4a8c'
                              : theme.colors.primaryDark,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: '0.25rem',
                          fontSize: theme.fontSizes.xs,
                          fontFamily: theme.fonts.ui,
                          fontWeight: 500,
                        }}
                      >
                        {entry.type}
                      </span>
                      <p
                        style={{
                          fontSize: theme.fontSizes.sm,
                          fontFamily: theme.fonts.ui,
                          color: theme.colors.textMuted,
                          margin: 0,
                          marginTop: theme.spacing.xs,
                        }}
                      >
                        {entry.duration}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side - Calendar Heatmap */}
        <div
          style={{
            opacity: heatmapOpacity,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.lg,
              fontFamily: theme.fonts.headers,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.lg,
              fontWeight: 300,
            }}
          >
            Practice Heatmap
          </h4>
          <div
            style={{
              backgroundColor: theme.colors.backgroundLight,
              padding: theme.spacing.xl,
              borderRadius: '0.75rem',
              border: `1px solid ${theme.colors.backgroundLighter}`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks}, 1fr)`,
                gap: '8px',
              }}
            >
              {heatmapData.map((intensity, i) => {
                const cellOpacity = staggeredAppearance(frame - fps * 0.8, i, 1)
                return (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      backgroundColor: getHeatmapColor(intensity),
                      opacity: cellOpacity,
                      transform: `scale(${0.5 + cellOpacity * 0.5})`,
                    }}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div
              style={{
                marginTop: theme.spacing.lg,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                justifyContent: 'flex-end',
              }}
            >
              <span
                style={{
                  fontSize: theme.fontSizes.xs,
                  color: theme.colors.textMuted,
                  fontFamily: theme.fonts.ui,
                }}
              >
                Less
              </span>
              {[
                theme.colors.backgroundLighter,
                '#d4d9cc',
                '#b8c2a9',
                theme.colors.primary,
              ].map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '2px',
                    backgroundColor: color,
                  }}
                />
              ))}
              <span
                style={{
                  fontSize: theme.fontSizes.xs,
                  color: theme.colors.textMuted,
                  fontFamily: theme.fonts.ui,
                }}
              >
                More
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '5%',
          right: '5%',
        }}
      >
        {['Real-time sync across devices', 'Visual analytics', 'Export to CSV/JSON'].map(
          (text, i) => {
            const itemOpacity = staggeredAppearance(frame - fps * 2, i, 15)
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: theme.spacing.xl,
                  fontSize: theme.fontSizes.base,
                  fontFamily: theme.fonts.ui,
                  color: theme.colors.textMuted,
                  opacity: itemOpacity,
                }}
              >
                • {text}
              </span>
            )
          }
        )}
      </div>

      {/* Annotation */}
      {showAnnotation && (
        <Annotation
          text="Track progress visually"
          position={{ x: '55%', y: '68%' }}
          opacity={fadeIn(frame, fps * 1.5, fps * 0.2)}
          variant="highlight"
        />
      )}
    </div>
  )
}
