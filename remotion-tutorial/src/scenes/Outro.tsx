import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { Logo } from '../components/Logo'
import { theme } from '../theme/mirubato'
import { fadeIn, scaleIn, staggeredAppearance } from '../utils/animations'

export const Outro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoOpacity = fadeIn(frame, 0, fps * 0.3)
  const logoScale = scaleIn(frame, 0, fps * 0.3, 0.9, 1)

  const ctaOpacity = fadeIn(frame, fps * 0.5, fps * 0.3)

  const actions = [
    { label: 'Get Started', icon: '🚀' },
    { label: 'View on GitHub', icon: '📦' },
    { label: 'Read Docs', icon: '📚' },
  ]

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
          marginBottom: theme.spacing['3xl'],
        }}
      >
        <Logo size="lg" opacity={logoOpacity} scale={logoScale} />
      </div>

      {/* Call to Action Text */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          opacity: ctaOpacity,
          marginBottom: theme.spacing['2xl'],
        }}
      >
        <h2
          style={{
            fontSize: theme.fontSizes['4xl'],
            fontFamily: theme.fonts.headers,
            fontWeight: 300,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing.md,
          }}
        >
          Start Your Journey Today
        </h2>
        <p
          style={{
            fontSize: theme.fontSizes.xl,
            fontFamily: theme.fonts.ui,
            color: theme.colors.textSecondary,
            margin: 0,
          }}
        >
          Transform your practice routine with Mirubato
        </p>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          gap: theme.spacing.xl,
        }}
      >
        {actions.map((action, index) => {
          const buttonOpacity = staggeredAppearance(frame - fps * 1.2, index, 8)
          const buttonScale = 0.9 + buttonOpacity * 0.1

          return (
            <div
              key={action.label}
              style={{
                backgroundColor:
                  index === 0
                    ? theme.colors.primary
                    : theme.colors.backgroundLight,
                color: theme.colors.textPrimary,
                padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
                borderRadius: '0.75rem',
                fontSize: theme.fontSizes.xl,
                fontFamily: theme.fonts.ui,
                fontWeight: 500,
                opacity: buttonOpacity,
                transform: `scale(${buttonScale})`,
                border:
                  index !== 0
                    ? `2px solid ${theme.colors.backgroundLighter}`
                    : 'none',
                boxShadow: index === 0 ? theme.shadows.glow : theme.shadows.box,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <span>{action.icon}</span>
              {action.label}
            </div>
          )
        })}
      </div>

      {/* GitHub URL */}
      {frame > fps * 2 && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: fadeIn(frame, fps * 2, fps * 0.3),
          }}
        >
          <p
            style={{
              fontSize: theme.fontSizes.lg,
              fontFamily: theme.fonts.ui,
              color: theme.colors.textMuted,
              margin: 0,
            }}
          >
            github.com/pezware/mirubato
          </p>
        </div>
      )}
    </div>
  )
}
