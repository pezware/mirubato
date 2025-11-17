import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { theme } from '../theme/mirubato'
import { fadeIn, slideIn, staggeredAppearance } from '../utils/animations'

export const LogbookDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.5)

  // Calendar heatmap animation
  const heatmapOpacity = fadeIn(frame, fps * 0.5, fps * 0.5)

  // Generate sample heatmap data (7x5 grid for weeks)
  const weeks = 5
  const daysPerWeek = 7
  const heatmapData = Array.from({ length: weeks * daysPerWeek }, (_, i) => {
    // Simulate practice data with varying intensity
    const intensity = Math.random() > 0.3 ? Math.random() : 0
    return intensity
  })

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return theme.colors.backgroundLighter
    if (intensity < 0.3) return '#22c55e40'
    if (intensity < 0.6) return '#22c55e80'
    return '#22c55e'
  }

  // Timer display animation
  const timerOpacity = fadeIn(frame, fps * 1.5, fps * 0.5)
  const timerValue = Math.floor(((frame - fps * 2) / fps) * 2) // Simulated timer
  const timerDisplay = `${Math.floor(Math.max(0, timerValue) / 60)}:${String(Math.max(0, timerValue) % 60).padStart(2, '0')}`

  // Annotation timing
  const showAnnotation = frame > fps * 2.5

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
        position: 'relative',
        padding: '5%',
      }}
    >
      <ChapterTitle
        title="Logbook"
        subtitle="Track every practice session"
        opacity={titleOpacity}
      />

      {/* Calendar Heatmap */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '10%',
          opacity: heatmapOpacity,
        }}
      >
        <h4
          style={{
            fontSize: theme.fontSizes.xl,
            fontFamily: theme.fonts.ui,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.md,
          }}
        >
          Practice Heatmap
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gap: '6px',
          }}
        >
          {heatmapData.map((intensity, i) => {
            const cellOpacity = staggeredAppearance(frame - fps * 1, i, 1)
            return (
              <div
                key={i}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
                  backgroundColor: getHeatmapColor(intensity),
                  opacity: cellOpacity,
                  transform: `scale(${cellOpacity})`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Timer Display */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          right: '10%',
          opacity: timerOpacity,
          textAlign: 'center',
        }}
      >
        <h4
          style={{
            fontSize: theme.fontSizes.xl,
            fontFamily: theme.fonts.ui,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.md,
          }}
        >
          Live Timer
        </h4>
        <div
          style={{
            fontSize: theme.fontSizes['7xl'],
            fontFamily: theme.fonts.ui,
            fontWeight: 200,
            color: theme.colors.primary,
            textShadow: theme.shadows.glow,
          }}
        >
          {timerDisplay}
        </div>
        <div
          style={{
            marginTop: theme.spacing.lg,
            display: 'flex',
            justifyContent: 'center',
            gap: theme.spacing.md,
          }}
        >
          <div
            style={{
              backgroundColor: theme.colors.success,
              color: theme.colors.textPrimary,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              borderRadius: '0.5rem',
              fontFamily: theme.fonts.ui,
              fontSize: theme.fontSizes.lg,
            }}
          >
            Start
          </div>
          <div
            style={{
              backgroundColor: theme.colors.backgroundLighter,
              color: theme.colors.textPrimary,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              borderRadius: '0.5rem',
              fontFamily: theme.fonts.ui,
              fontSize: theme.fontSizes.lg,
            }}
          >
            Reset
          </div>
        </div>
      </div>

      {/* Features list */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '10%',
          right: '10%',
        }}
      >
        {[
          'Real-time sync across devices',
          'Advanced analytics',
          'Export to CSV/JSON',
        ].map((text, i) => {
          const itemOpacity = staggeredAppearance(frame - fps * 3, i, 20)
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: theme.spacing.xl,
                fontSize: theme.fontSizes.lg,
                fontFamily: theme.fonts.ui,
                color: theme.colors.textMuted,
                opacity: itemOpacity,
              }}
            >
              • {text}
            </span>
          )
        })}
      </div>

      {/* Annotation */}
      {showAnnotation && (
        <Annotation
          text="Visual progress tracking"
          position={{ x: '12%', y: '75%' }}
          opacity={fadeIn(frame, fps * 2.5, fps * 0.3)}
          variant="highlight"
        />
      )}
    </div>
  )
}
