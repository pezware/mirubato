import { interpolate, spring, SpringConfig } from 'remotion'

// Fade in animation
export const fadeIn = (
  frame: number,
  startFrame: number,
  duration: number
): number => {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
}

// Fade out animation
export const fadeOut = (
  frame: number,
  startFrame: number,
  duration: number
): number => {
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
}

// Spring slide in animation
export const slideIn = (
  frame: number,
  fps: number,
  delay: number = 0,
  config?: SpringConfig
): number => {
  return spring({
    frame: frame - delay,
    fps,
    config: config || { damping: 100, stiffness: 200, mass: 0.5 },
  })
}

// Staggered appearance for list items
export const staggeredAppearance = (
  frame: number,
  itemIndex: number,
  staggerDelay: number = 10
): number => {
  const startFrame = itemIndex * staggerDelay
  return interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
}

// Scale animation
export const scaleIn = (
  frame: number,
  startFrame: number,
  duration: number,
  from: number = 0.8,
  to: number = 1
): number => {
  return interpolate(frame, [startFrame, startFrame + duration], [from, to], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  })
}

// Slide from direction
export const slideFromDirection = (
  frame: number,
  startFrame: number,
  duration: number,
  direction: 'left' | 'right' | 'top' | 'bottom',
  distance: number = 100
): number => {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [distance, 0],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  )

  switch (direction) {
    case 'left':
      return -progress
    case 'right':
      return progress
    case 'top':
      return -progress
    case 'bottom':
      return progress
    default:
      return 0
  }
}

// Typewriter effect for text
export const typewriterEffect = (
  frame: number,
  text: string,
  startFrame: number,
  charsPerFrame: number = 0.5
): string => {
  const framesSinceStart = Math.max(0, frame - startFrame)
  const charCount = Math.min(
    text.length,
    Math.floor(framesSinceStart * charsPerFrame)
  )
  return text.slice(0, charCount)
}

// Pulse animation for highlights
export const pulse = (frame: number, fps: number): number => {
  return 1 + 0.1 * Math.sin((frame / fps) * Math.PI * 2)
}
