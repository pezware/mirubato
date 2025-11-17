import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { theme } from '../theme/mirubato'
import { fadeIn, staggeredAppearance } from '../utils/animations'

export const Overview: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.5)

  const features = [
    'Track your practice sessions with precision',
    'Organize your sheet music library',
    'Master essential music theory tools',
    'Build consistent practice habits',
  ]

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
        title="What is Mirubato?"
        subtitle="A comprehensive music education platform"
        opacity={titleOpacity}
      />

      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '10%',
          right: '10%',
        }}
      >
        {features.map((feature, index) => {
          const itemOpacity = staggeredAppearance(frame - fps * 1, index, 15)

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: theme.spacing.xl,
                opacity: itemOpacity,
                transform: `translateX(${(1 - itemOpacity) * -30}px)`,
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.primary,
                  marginRight: theme.spacing.lg,
                  boxShadow: theme.shadows.glow,
                }}
              />
              <p
                style={{
                  fontSize: theme.fontSizes['2xl'],
                  fontFamily: theme.fonts.ui,
                  color: theme.colors.textPrimary,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {feature}
              </p>
            </div>
          )
        })}
      </div>

      {/* Decorative element */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          fontSize: theme.fontSizes['6xl'],
          opacity: 0.1,
          color: theme.colors.primary,
        }}
      >
        ♪ ♫ ♬
      </div>
    </div>
  )
}
