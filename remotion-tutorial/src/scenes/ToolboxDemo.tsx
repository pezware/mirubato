import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { theme } from '../theme/mirubato'
import { fadeIn, pulse, staggeredAppearance } from '../utils/animations'

export const ToolboxDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.3)

  // Metronome animation - matches CollapsibleMetronome styling
  const metronomeOpacity = fadeIn(frame, fps * 0.5, fps * 0.3)
  const metronomePulse = pulse(frame, fps)

  // Circle of Fifths animation
  const circleOpacity = fadeIn(frame, fps * 1, fps * 0.3)
  const circleRotation = (frame / fps) * 8 // Slow rotation

  // Counter animation - matches CounterActive styling
  const counterOpacity = fadeIn(frame, fps * 1.5, fps * 0.3)
  const counterValue = Math.floor((frame - fps * 1.8) / (fps * 0.2))

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
        title="Toolbox"
        subtitle="Essential practice tools"
        opacity={titleOpacity}
      />

      {/* Tools Grid */}
      <div
        style={{
          position: 'absolute',
          top: '28%',
          left: '5%',
          right: '5%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: theme.spacing.xl,
        }}
      >
        {/* Metronome - Authentic CollapsibleMetronome styling */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '0.75rem',
            padding: theme.spacing.xl,
            opacity: metronomeOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
            boxShadow: theme.shadows.box,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.base,
              fontFamily: theme.fonts.ui,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 600,
            }}
          >
            Advanced Metronome
          </h4>

          {/* BPM Display */}
          <div
            style={{
              fontSize: theme.fontSizes['3xl'],
              fontFamily: theme.fonts.ui,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs,
            }}
          >
            120
          </div>
          <div
            style={{
              fontSize: theme.fontSizes.xs,
              color: theme.colors.textMuted,
              marginBottom: theme.spacing.md,
            }}
          >
            BPM
          </div>

          {/* Time Signature */}
          <div
            style={{
              fontSize: theme.fontSizes.sm,
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.md,
            }}
          >
            4/4
          </div>

          {/* Play Button - Morandi Purple */}
          <button
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: theme.colors.purple, // morandi-purple-400
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              transform: `scale(${metronomePulse})`,
              boxShadow: '0 0 12px rgba(184, 166, 201, 0.4)',
              border: 'none',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid white',
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                marginLeft: '3px',
              }}
            />
          </button>

          {/* Pattern Grid Preview */}
          <div
            style={{
              marginTop: theme.spacing.md,
              display: 'flex',
              gap: '3px',
              justifyContent: 'center',
            }}
          >
            {[true, false, false, false].map((active, i) => (
              <div
                key={i}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: active
                    ? theme.colors.purple
                    : theme.colors.backgroundLighter,
                }}
              />
            ))}
          </div>
        </div>

        {/* Circle of Fifths */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '0.75rem',
            padding: theme.spacing.xl,
            opacity: circleOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
            boxShadow: theme.shadows.box,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.base,
              fontFamily: theme.fonts.ui,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 600,
            }}
          >
            Circle of Fifths
          </h4>
          <div
            style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: `3px solid ${theme.colors.sky}`, // morandi-sky-400
                borderRadius: '50%',
                position: 'relative',
                transform: `rotate(${circleRotation}deg)`,
              }}
            >
              {[
                'C',
                'G',
                'D',
                'A',
                'E',
                'B',
                'F♯',
                'D♭',
                'A♭',
                'E♭',
                'B♭',
                'F',
              ].map((note, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180)
                const radius = 70
                return (
                  <div
                    key={note}
                    style={{
                      position: 'absolute',
                      left: `${50 + Math.cos(angle) * radius}%`,
                      top: `${50 + Math.sin(angle) * radius}%`,
                      transform: `translate(-50%, -50%) rotate(-${circleRotation}deg)`,
                      fontSize: theme.fontSizes.sm,
                      color: theme.colors.textPrimary,
                      fontFamily: theme.fonts.ui,
                      fontWeight: i === 0 ? 700 : 400,
                    }}
                  >
                    {note}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Practice Counter - Authentic CounterActive styling */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '0.75rem',
            padding: theme.spacing.xl,
            opacity: counterOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
            boxShadow: theme.shadows.box,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.base,
              fontFamily: theme.fonts.ui,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 600,
            }}
          >
            Practice Counter
          </h4>

          {/* Count Display */}
          <div
            style={{
              fontSize: theme.fontSizes['5xl'],
              fontFamily: theme.fonts.ui,
              fontWeight: 700,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs,
            }}
          >
            {Math.max(0, Math.min(counterValue, 15))}
          </div>
          <div
            style={{
              fontSize: theme.fontSizes.sm,
              color: theme.colors.textMuted,
              marginBottom: theme.spacing.lg,
            }}
          >
            repetitions
          </div>

          {/* Large Action Button - Morandi Sage like CounterActive */}
          <button
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary, // morandi-sage-400
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(156, 168, 136, 0.4)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: 'white',
                fontSize: theme.fontSizes['2xl'],
                fontWeight: 300,
              }}
            >
              +
            </div>
          </button>
        </div>
      </div>

      {/* Annotation */}
      {frame > fps * 2.5 && (
        <Annotation
          text="Interactive practice aids"
          position={{ x: '35%', y: '82%' }}
          opacity={fadeIn(frame, fps * 2.5, fps * 0.2)}
          variant="info"
        />
      )}
    </div>
  )
}
