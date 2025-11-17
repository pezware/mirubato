import React from 'react'
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { interpolate, spring } from 'remotion'

interface HighlightArea {
  x: string // percentage
  y: string // percentage
  width: string // percentage
  height: string // percentage
  label?: string
}

interface ScreenshotFrameProps {
  src: string // Path relative to public/screenshots/
  alt?: string
  showBrowserFrame?: boolean
  zoom?: {
    startScale?: number
    endScale?: number
    focusX?: string // percentage
    focusY?: string // percentage
  }
  pan?: {
    startX?: string
    startY?: string
    endX?: string
    endY?: string
  }
  highlight?: HighlightArea
  cursor?: {
    show?: boolean
    startX?: string
    startY?: string
    endX?: string
    endY?: string
    clickAt?: number // frame number to show click animation
  }
  opacity?: number
  animateIn?: boolean
  animationDelay?: number
}

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({
  src,
  alt = 'Screenshot',
  showBrowserFrame = true,
  zoom,
  pan,
  highlight,
  cursor,
  opacity = 1,
  animateIn = true,
  animationDelay = 0
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Entrance animation
  const entranceOpacity = animateIn
    ? interpolate(
        frame,
        [animationDelay, animationDelay + fps * 0.3],
        [0, 1],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 1

  const entranceScale = animateIn
    ? spring({
        frame: frame - animationDelay,
        fps,
        config: {
          damping: 100,
          stiffness: 200,
          mass: 0.8
        }
      })
    : 1

  // Zoom animation
  const zoomScale = zoom
    ? interpolate(
        frame,
        [animationDelay, animationDelay + fps * 2],
        [zoom.startScale || 1, zoom.endScale || 1.2],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 1

  const zoomTransformOrigin = zoom
    ? `${zoom.focusX || '50%'} ${zoom.focusY || '50%'}`
    : 'center center'

  // Pan animation
  const panX = pan
    ? interpolate(
        frame,
        [animationDelay, animationDelay + fps * 2],
        [parseInt(pan.startX || '0'), parseInt(pan.endX || '0')],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 0

  const panY = pan
    ? interpolate(
        frame,
        [animationDelay, animationDelay + fps * 2],
        [parseInt(pan.startY || '0'), parseInt(pan.endY || '0')],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 0

  // Cursor animation
  const cursorX = cursor?.show
    ? interpolate(
        frame,
        [animationDelay + fps * 0.5, animationDelay + fps * 1.5],
        [parseInt(cursor.startX || '0'), parseInt(cursor.endX || '50')],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 0

  const cursorY = cursor?.show
    ? interpolate(
        frame,
        [animationDelay + fps * 0.5, animationDelay + fps * 1.5],
        [parseInt(cursor.startY || '0'), parseInt(cursor.endY || '50')],
        { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
      )
    : 0

  const cursorClickScale = cursor?.clickAt
    ? frame >= cursor.clickAt && frame < cursor.clickAt + fps * 0.2
      ? interpolate(
          frame,
          [cursor.clickAt, cursor.clickAt + fps * 0.1, cursor.clickAt + fps * 0.2],
          [1, 0.8, 1],
          { extrapolateRight: 'clamp' }
        )
      : 1
    : 1

  // Highlight pulse animation
  const highlightOpacity = highlight
    ? 0.3 + Math.sin(frame / fps * 4) * 0.1
    : 0

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        opacity: entranceOpacity * opacity,
        transform: `scale(${entranceScale * 0.95 + 0.05})`
      }}
    >
      {showBrowserFrame && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            backgroundColor: '#e5e7eb',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: '8px',
            zIndex: 10
          }}
        >
          {/* Browser window controls */}
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b'
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}
          />
          <div
            style={{
              flex: 1,
              marginLeft: '12px',
              backgroundColor: 'white',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '12px',
              color: '#6b7280'
            }}
          >
            mirubato.com
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: showBrowserFrame ? '40px' : 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          borderRadius: showBrowserFrame ? '0 0 8px 8px' : '8px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#f3f4f6'
        }}
      >
        <Img
          src={staticFile(`screenshots/${src}`)}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoomScale}) translate(${panX}px, ${panY}px)`,
            transformOrigin: zoomTransformOrigin
          }}
        />

        {/* Highlight overlay */}
        {highlight && (
          <div
            style={{
              position: 'absolute',
              left: highlight.x,
              top: highlight.y,
              width: highlight.width,
              height: highlight.height,
              backgroundColor: `rgba(251, 191, 36, ${highlightOpacity})`,
              border: '3px solid #fbbf24',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}
          >
            {highlight.label && (
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#fbbf24',
                  color: '#1f2937',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {highlight.label}
              </div>
            )}
          </div>
        )}

        {/* Cursor */}
        {cursor?.show && (
          <div
            style={{
              position: 'absolute',
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              transform: `translate(-50%, -50%) scale(${cursorClickScale})`,
              pointerEvents: 'none',
              zIndex: 100
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}
            >
              <path
                d="M5 3L19 12L12 13L9 20L5 3Z"
                fill="white"
                stroke="black"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
