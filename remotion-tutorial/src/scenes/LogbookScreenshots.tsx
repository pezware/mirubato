import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { Annotation } from '../components/Annotation'
import { ScreenshotFrame } from '../components/ScreenshotFrame'
import { theme } from '../theme/mirubato'
import { fadeIn, staggeredAppearance } from '../utils/animations'

/**
 * LogbookScreenshots - Uses real UI screenshots captured by Playwright
 * Falls back to placeholder if screenshots don't exist
 */
export const LogbookScreenshots: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = fadeIn(frame, 0, fps * 0.3)

  // Feature highlights timing
  const showOverview = frame > fps * 0.5
  const showEntries = frame > fps * 3
  const showStats = frame > fps * 6

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

      {/* Main Screenshot Display Area */}
      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '10%',
          right: '10%',
          height: '55%',
        }}
      >
        {/* Phase 1: Show overview screenshot with zoom */}
        {showOverview && !showEntries && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 0.5, fps * 0.3),
            }}
          >
            <ScreenshotFrame
              src="logbook/overview-full.png"
              showBrowserFrame={true}
              zoom={{
                startScale: 1,
                endScale: 1.1,
                focusX: '50%',
                focusY: '30%',
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}

        {/* Phase 2: Show entries list */}
        {showEntries && !showStats && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 3, fps * 0.3),
            }}
          >
            <ScreenshotFrame
              src="logbook/data-view.png"
              showBrowserFrame={true}
              highlight={{
                x: '5%',
                y: '20%',
                width: '90%',
                height: '60%',
                label: 'Practice History',
              }}
              cursor={{
                show: true,
                startX: '80',
                startY: '10',
                endX: '50',
                endY: '40',
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}

        {/* Phase 3: Show analytics */}
        {showStats && (
          <div
            style={{
              opacity: fadeIn(frame, fps * 6, fps * 0.3),
            }}
          >
            <ScreenshotFrame
              src="logbook/practice-chart.png"
              showBrowserFrame={false}
              zoom={{
                startScale: 0.9,
                endScale: 1,
                focusX: '50%',
                focusY: '50%',
              }}
              animateIn={true}
              animationDelay={0}
            />
          </div>
        )}
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
        {[
          'Real-time sync across devices',
          'Visual analytics',
          'Export to CSV/JSON',
        ].map((text, i) => {
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
        })}
      </div>

      {/* Annotations */}
      {frame > fps * 4 && frame < fps * 6 && (
        <Annotation
          text="Track every session"
          position={{ x: '65%', y: '35%' }}
          opacity={fadeIn(frame, fps * 4, fps * 0.2)}
          variant="highlight"
        />
      )}

      {frame > fps * 7 && (
        <Annotation
          text="Visualize your progress"
          position={{ x: '55%', y: '68%' }}
          opacity={fadeIn(frame, fps * 7, fps * 0.2)}
          variant="info"
        />
      )}
    </div>
  )
}
