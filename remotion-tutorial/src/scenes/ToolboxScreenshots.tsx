import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { ScreenshotFrame } from '../components/ScreenshotFrame'
import { theme } from '../theme/mirubato'
import { fadeIn } from '../utils/animations'

/**
 * ToolboxScreenshots - Uses real UI screenshots captured by Playwright
 * Shows metronome, counter, and circle of fifths in sequence
 */
export const ToolboxScreenshots: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.3)

  // Tool showcase timing
  const showMetronome = frame >= fps * 0.5 && frame < fps * 4
  const showCounter = frame >= fps * 4 && frame < fps * 7.5
  const showCircle = frame >= fps * 7.5

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
        position: 'relative',
        padding: '4%'
      }}
    >
      <ChapterTitle
        title="Toolbox"
        subtitle="Essential practice tools"
        opacity={titleOpacity}
      />

      {/* Main Screenshot Display */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '15%',
          right: '15%',
          height: '55%'
        }}
      >
        {/* Metronome */}
        {showMetronome && (
          <div style={{ opacity: fadeIn(frame, fps * 0.5, fps * 0.3) }}>
            <ScreenshotFrame
              src="toolbox/metronome-full.png"
              showBrowserFrame={true}
              zoom={{
                startScale: 1,
                endScale: 1.05,
                focusX: '30%',
                focusY: '40%'
              }}
              highlight={{
                x: '2%',
                y: '15%',
                width: '35%',
                height: '70%',
                label: 'BPM Control'
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}

        {/* Practice Counter */}
        {showCounter && (
          <div style={{ opacity: fadeIn(frame, fps * 4, fps * 0.3) }}>
            <ScreenshotFrame
              src="toolbox/counter-full.png"
              showBrowserFrame={true}
              cursor={{
                show: true,
                startX: '40',
                startY: '30',
                endX: '50',
                endY: '60',
                clickAt: frame - fps * 4 > fps * 1 ? Math.floor(fps * 5) : undefined
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}

        {/* Circle of Fifths */}
        {showCircle && (
          <div style={{ opacity: fadeIn(frame, fps * 7.5, fps * 0.3) }}>
            <ScreenshotFrame
              src="toolbox/circle-of-fifths-full.png"
              showBrowserFrame={true}
              zoom={{
                startScale: 0.95,
                endScale: 1,
                focusX: '50%',
                focusY: '50%'
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}
      </div>

      {/* Tool Labels */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        {showMetronome && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 0.8, fps * 0.2),
              backgroundColor: theme.colors.purple,
              color: 'white',
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              borderRadius: '2rem',
              fontSize: theme.fontSizes.lg,
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              boxShadow: theme.shadows.box
            }}
          >
            Advanced Metronome with Pattern Editor
          </div>
        )}

        {showCounter && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 4.3, fps * 0.2),
              backgroundColor: theme.colors.primary,
              color: 'white',
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              borderRadius: '2rem',
              fontSize: theme.fontSizes.lg,
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              boxShadow: theme.shadows.box
            }}
          >
            Practice Counter for Repetitions
          </div>
        )}

        {showCircle && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 7.8, fps * 0.2),
              backgroundColor: theme.colors.sky,
              color: 'white',
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              borderRadius: '2rem',
              fontSize: theme.fontSizes.lg,
              fontFamily: theme.fonts.ui,
              fontWeight: 600,
              boxShadow: theme.shadows.box
            }}
          >
            Interactive Circle of Fifths
          </div>
        )}
      </div>

      {/* Annotations */}
      {showMetronome && frame > fps * 2 && (
        <Annotation
          text="Customize your rhythm"
          position={{ x: '70%', y: '45%' }}
          opacity={fadeIn(frame, fps * 2, fps * 0.2)}
          variant="tech"
        />
      )}

      {showCounter && frame > fps * 5.5 && (
        <Annotation
          text="Track your reps"
          position={{ x: '65%', y: '40%' }}
          opacity={fadeIn(frame, fps * 5.5, fps * 0.2)}
          variant="highlight"
        />
      )}

      {showCircle && frame > fps * 9 && (
        <Annotation
          text="Learn music theory"
          position={{ x: '60%', y: '35%' }}
          opacity={fadeIn(frame, fps * 9, fps * 0.2)}
          variant="info"
        />
      )}
    </div>
  )
}
