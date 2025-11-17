import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { theme } from '../theme/mirubato'
import { fadeIn, pulse, staggeredAppearance } from '../utils/animations'

export const ToolboxDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.5)

  // Metronome animation
  const metronomeOpacity = fadeIn(frame, fps * 0.8, fps * 0.5)
  const metronomePulse = pulse(frame, fps)

  // Circle of Fifths animation
  const circleOpacity = fadeIn(frame, fps * 1.5, fps * 0.5)
  const circleRotation = (frame / fps) * 10 // Slow rotation

  // Counter animation
  const counterOpacity = fadeIn(frame, fps * 2.2, fps * 0.5)
  const counterValue = Math.floor((frame - fps * 2.5) / (fps * 0.3))

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
        title="Toolbox"
        subtitle="Essential practice tools at your fingertips"
        opacity={titleOpacity}
      />

      {/* Tools Grid */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '10%',
          right: '10%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: theme.spacing['2xl'],
        }}
      >
        {/* Metronome */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '1rem',
            padding: theme.spacing.xl,
            opacity: metronomeOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.xl,
              fontFamily: theme.fonts.headers,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 300,
            }}
          >
            Metronome
          </h4>
          <div
            style={{
              fontSize: theme.fontSizes['5xl'],
              fontFamily: theme.fonts.ui,
              fontWeight: 200,
              color: theme.colors.primary,
              marginBottom: theme.spacing.md,
            }}
          >
            120
          </div>
          <div
            style={{
              fontSize: theme.fontSizes.lg,
              color: theme.colors.textMuted,
              marginBottom: theme.spacing.lg,
            }}
          >
            BPM
          </div>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              margin: '0 auto',
              transform: `scale(${metronomePulse})`,
              boxShadow: theme.shadows.glow,
            }}
          />
        </div>

        {/* Circle of Fifths */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '1rem',
            padding: theme.spacing.xl,
            opacity: circleOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.xl,
              fontFamily: theme.fonts.headers,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 300,
            }}
          >
            Circle of Fifths
          </h4>
          <div
            style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: `3px solid ${theme.colors.accentAlt}`,
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
                const radius = 75
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

        {/* Practice Counter */}
        <div
          style={{
            backgroundColor: theme.colors.backgroundLight,
            borderRadius: '1rem',
            padding: theme.spacing.xl,
            opacity: counterOpacity,
            textAlign: 'center',
            border: `1px solid ${theme.colors.backgroundLighter}`,
          }}
        >
          <h4
            style={{
              fontSize: theme.fontSizes.xl,
              fontFamily: theme.fonts.headers,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.lg,
              fontWeight: 300,
            }}
          >
            Practice Counter
          </h4>
          <div
            style={{
              fontSize: theme.fontSizes['6xl'],
              fontFamily: theme.fonts.ui,
              fontWeight: 200,
              color: theme.colors.success,
              marginBottom: theme.spacing.md,
            }}
          >
            {Math.max(0, Math.min(counterValue, 25))}
          </div>
          <div
            style={{
              fontSize: theme.fontSizes.lg,
              color: theme.colors.textMuted,
            }}
          >
            repetitions
          </div>
          <div
            style={{
              marginTop: theme.spacing.lg,
              display: 'flex',
              justifyContent: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <div
              style={{
                backgroundColor: theme.colors.backgroundLighter,
                color: theme.colors.textPrimary,
                padding: theme.spacing.sm,
                borderRadius: '0.25rem',
                fontFamily: theme.fonts.ui,
                fontSize: theme.fontSizes.base,
              }}
            >
              +
            </div>
            <div
              style={{
                backgroundColor: theme.colors.backgroundLighter,
                color: theme.colors.textPrimary,
                padding: theme.spacing.sm,
                borderRadius: '0.25rem',
                fontFamily: theme.fonts.ui,
                fontSize: theme.fontSizes.base,
              }}
            >
              −
            </div>
          </div>
        </div>
      </div>

      {/* Annotation */}
      {frame > fps * 3.5 && (
        <Annotation
          text="Interactive practice aids"
          position={{ x: '35%', y: '85%' }}
          opacity={fadeIn(frame, fps * 3.5, fps * 0.3)}
          variant="info"
        />
      )}
    </div>
  )
}
