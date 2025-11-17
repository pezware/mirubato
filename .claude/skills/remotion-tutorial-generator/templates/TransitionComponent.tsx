/**
 * Reusable Transition Component
 *
 * Wraps content with smooth transition effects for scene changes.
 * Supports fade, slide, wipe, and custom transitions.
 *
 * Usage:
 * <Transition type="fade" direction="in" durationInFrames={30}>
 *   <YourContent />
 * </Transition>
 */

import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';

export type TransitionType = 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'wipeLeft' | 'wipeRight' | 'zoom' | 'blur';
export type TransitionDirection = 'in' | 'out';

interface TransitionProps {
  children: React.ReactNode;
  type: TransitionType;
  direction: TransitionDirection;
  durationInFrames: number;
  startFrame?: number;  // When to start the transition (default: 0)
  style?: React.CSSProperties;
}

export const Transition: React.FC<TransitionProps> = ({
  children,
  type,
  direction,
  durationInFrames,
  startFrame = 0,
  style = {}
}) => {
  const frame = useCurrentFrame();

  // Calculate progress (0 to 1)
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationInFrames],
    direction === 'in' ? [0, 1] : [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  // Generate transition styles based on type
  const transitionStyle: React.CSSProperties = (() => {
    switch (type) {
      case 'fade':
        return {
          opacity: progress
        };

      case 'slideLeft':
        return {
          transform: `translateX(${(1 - progress) * 100}%)`,
          opacity: progress
        };

      case 'slideRight':
        return {
          transform: `translateX(${(1 - progress) * -100}%)`,
          opacity: progress
        };

      case 'slideUp':
        return {
          transform: `translateY(${(1 - progress) * 100}%)`,
          opacity: progress
        };

      case 'slideDown':
        return {
          transform: `translateY(${(1 - progress) * -100}%)`,
          opacity: progress
        };

      case 'wipeLeft':
        return {
          clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`
        };

      case 'wipeRight':
        return {
          clipPath: `inset(0 0 0 ${(1 - progress) * 100}%)`
        };

      case 'zoom':
        return {
          transform: `scale(${0.8 + progress * 0.2})`,
          opacity: progress
        };

      case 'blur':
        return {
          filter: `blur(${(1 - progress) * 20}px)`,
          opacity: progress
        };

      default:
        return {};
    }
  })();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...transitionStyle,
        ...style
      }}
    >
      {children}
    </div>
  );
};

// Helper component for crossfading between scenes
interface CrossfadeProps {
  sceneA: React.ReactNode;
  sceneB: React.ReactNode;
  crossfadeStart: number;  // Frame when crossfade begins
  crossfadeDuration: number;  // Duration in frames
}

export const Crossfade: React.FC<CrossfadeProps> = ({
  sceneA,
  sceneB,
  crossfadeStart,
  crossfadeDuration
}) => {
  const frame = useCurrentFrame();

  const sceneAOpacity = interpolate(
    frame,
    [crossfadeStart, crossfadeStart + crossfadeDuration],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  const sceneBOpacity = interpolate(
    frame,
    [crossfadeStart, crossfadeStart + crossfadeDuration],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      {/* Scene A */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: sceneAOpacity
        }}
      >
        {sceneA}
      </div>

      {/* Scene B */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: sceneBOpacity
        }}
      >
        {sceneB}
      </div>
    </div>
  );
};

// Predefined transition presets
export const TransitionPresets = {
  // Quick transitions (0.5 seconds at 30fps)
  quick: {
    durationInFrames: 15
  },
  // Standard transitions (1 second at 30fps)
  standard: {
    durationInFrames: 30
  },
  // Slow transitions (2 seconds at 30fps)
  slow: {
    durationInFrames: 60
  }
};

// Example usage:
// <Transition
//   type="slideLeft"
//   direction="in"
//   {...TransitionPresets.standard}
// >
//   <MyScene />
// </Transition>
