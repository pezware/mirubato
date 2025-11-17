import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { Logo } from '../components/Logo'
import { theme } from '../theme/mirubato'
import { fadeIn, scaleIn } from '../utils/animations'

export const Intro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Animation timings
  const logoFadeStart = 0
  const logoFadeDuration = fps * 0.5 // 0.5 seconds
  const taglineStart = fps * 1 // 1 second
  const taglineDuration = fps * 0.5

  const logoOpacity = fadeIn(frame, logoFadeStart, logoFadeDuration)
  const logoScale = scaleIn(frame, logoFadeStart, logoFadeDuration, 0.9, 1)

  const taglineOpacity = fadeIn(frame, taglineStart, taglineDuration)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${theme.colors.backgroundLight} 0%, ${theme.colors.background} 70%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Logo size="xl" opacity={logoOpacity} scale={logoScale} />
      </div>

      {/* Tagline */}
      <p
        style={{
          position: 'relative',
          zIndex: 10,
          fontSize: theme.fontSizes['2xl'],
          fontFamily: theme.fonts.ui,
          color: theme.colors.textSecondary,
          marginTop: theme.spacing['2xl'],
          opacity: taglineOpacity,
          fontWeight: 300,
          letterSpacing: '0.1em',
        }}
      >
        Master Your Musical Journey
      </p>
    </div>
  )
}
