import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'

interface TransitionProps {
  type: 'fade' | 'slide' | 'wipe' | 'scale'
  durationInFrames: number
  direction?: 'in' | 'out'
  children: React.ReactNode
}

export const Transition: React.FC<TransitionProps> = ({
  type,
  durationInFrames,
  direction = 'in',
  children,
}) => {
  const frame = useCurrentFrame()

  const progress = interpolate(
    frame,
    [0, durationInFrames],
    direction === 'in' ? [0, 1] : [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const getStyle = (): React.CSSProperties => {
    switch (type) {
      case 'fade':
        return { opacity: progress }
      case 'slide':
        return { transform: `translateX(${(1 - progress) * -100}%)` }
      case 'wipe':
        return { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }
      case 'scale':
        return {
          transform: `scale(${0.8 + progress * 0.2})`,
          opacity: progress,
        }
      default:
        return {}
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...getStyle(),
      }}
    >
      {children}
    </div>
  )
}
