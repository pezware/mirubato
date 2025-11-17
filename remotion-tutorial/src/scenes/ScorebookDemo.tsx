import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { theme } from '../theme/mirubato'
import { fadeIn, slideIn, staggeredAppearance } from '../utils/animations'

export const ScorebookDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.5)

  // Sample sheet music entries
  const scores = [
    {
      title: 'Clair de Lune',
      composer: 'Claude Debussy',
      format: 'PDF',
    },
    {
      title: 'Moonlight Sonata',
      composer: 'Ludwig van Beethoven',
      format: 'PDF',
    },
    {
      title: 'Gymnopédie No. 1',
      composer: 'Erik Satie',
      format: 'Image',
    },
  ]

  // AI extraction animation
  const showAIExtraction = frame > fps * 2
  const aiProgress = fadeIn(frame, fps * 2, fps * 1)

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
        title="Scorebook"
        subtitle="Your digital sheet music library"
        opacity={titleOpacity}
      />

      {/* Sheet Music Cards */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '10%',
          display: 'flex',
          gap: theme.spacing.xl,
        }}
      >
        {scores.map((score, index) => {
          const cardOpacity = staggeredAppearance(frame - fps * 0.8, index, 15)
          const cardScale = 0.9 + cardOpacity * 0.1

          return (
            <div
              key={index}
              style={{
                backgroundColor: theme.colors.backgroundLight,
                borderRadius: '1rem',
                padding: theme.spacing.xl,
                width: '280px',
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
                border: `1px solid ${theme.colors.backgroundLighter}`,
                boxShadow: theme.shadows.box,
              }}
            >
              {/* PDF/Image Icon */}
              <div
                style={{
                  width: '100%',
                  height: '120px',
                  backgroundColor: theme.colors.backgroundLighter,
                  borderRadius: '0.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: theme.spacing.md,
                  color: theme.colors.textMuted,
                  fontSize: theme.fontSizes['2xl'],
                }}
              >
                {score.format === 'PDF' ? '📄' : '🖼️'}
              </div>

              {/* Music Title */}
              <h3
                style={{
                  fontSize: theme.fontSizes.xl,
                  fontFamily: theme.fonts.music,
                  fontWeight: 500,
                  color: theme.colors.musicTitle,
                  margin: 0,
                  marginBottom: theme.spacing.xs,
                }}
              >
                {score.title}
              </h3>

              {/* Composer */}
              <p
                style={{
                  fontSize: theme.fontSizes.base,
                  fontFamily: theme.fonts.music,
                  color: theme.colors.musicComposer,
                  margin: 0,
                }}
              >
                {score.composer}
              </p>
            </div>
          )
        })}
      </div>

      {/* AI Metadata Extraction Animation */}
      {showAIExtraction && (
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '10%',
            right: '10%',
            opacity: aiProgress,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.lg,
            }}
          >
            <div
              style={{
                backgroundColor: theme.colors.accentAlt,
                color: '#0f172a',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: '0.5rem',
                fontFamily: theme.fonts.ui,
                fontWeight: 600,
                fontSize: theme.fontSizes.lg,
              }}
            >
              AI Powered
            </div>
            <p
              style={{
                fontSize: theme.fontSizes.xl,
                fontFamily: theme.fonts.ui,
                color: theme.colors.textSecondary,
                margin: 0,
              }}
            >
              Automatic metadata extraction from uploaded scores
            </p>
          </div>

          {/* Progress bar */}
          <div
            style={{
              marginTop: theme.spacing.lg,
              height: '8px',
              backgroundColor: theme.colors.backgroundLighter,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(aiProgress * 100, 100)}%`,
                backgroundColor: theme.colors.accentAlt,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Annotation */}
      {frame > fps * 3 && (
        <Annotation
          text="Supports PDF & images"
          position={{ x: '65%', y: '25%' }}
          opacity={fadeIn(frame, fps * 3, fps * 0.3)}
          variant="tech"
        />
      )}
    </div>
  )
}
