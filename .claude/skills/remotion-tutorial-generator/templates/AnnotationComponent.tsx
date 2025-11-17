/**
 * Reusable Annotation Component
 *
 * Creates animated text annotations with optional arrows/pointers
 * to highlight specific parts of your video content.
 *
 * Usage:
 * <Annotation
 *   text="This is important!"
 *   position={{x: '30%', y: '50%'}}
 *   arrow={{angle: 45, length: 50}}
 *   delay={30}
 * />
 */

import React from 'react';
import {useCurrentFrame, useVideoConfig, spring} from 'remotion';

export interface AnnotationProps {
  text: string;
  position: {
    x: string | number;
    y: string | number;
  };
  arrow?: {
    angle: number;  // Degrees (0 = right, 90 = down, etc.)
    length: number; // Pixels
  };
  delay?: number;          // Frames to delay appearance
  backgroundColor?: string;
  textColor?: string;
  fontSize?: string;
  maxWidth?: string;
}

export const Annotation: React.FC<AnnotationProps> = ({
  text,
  position,
  arrow,
  delay = 0,
  backgroundColor = '#fbbf24',
  textColor = '#1f2937',
  fontSize = '1.5rem',
  maxWidth = '300px'
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Spring animation for entrance
  const scale = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 100,
      stiffness: 300,
      mass: 0.5
    }
  });

  const opacity = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 200,
      stiffness: 300,
      mass: 0.2
    }
  });

  // Don't render before delay
  if (frame < delay) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: typeof position.x === 'number' ? `${position.x}px` : position.x,
        top: typeof position.y === 'number' ? `${position.y}px` : position.y,
        transform: `scale(${scale})`,
        opacity,
        transformOrigin: 'center center',
        zIndex: 100
      }}
    >
      {/* The annotation box */}
      <div
        style={{
          backgroundColor,
          color: textColor,
          padding: '0.75rem 1.25rem',
          borderRadius: '0.5rem',
          fontSize,
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          maxWidth,
          textAlign: 'center',
          lineHeight: 1.4,
          position: 'relative'
        }}
      >
        {text}

        {/* Arrow pointing from annotation */}
        {arrow && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${arrow.length}px`,
              height: '3px',
              backgroundColor: textColor,
              transform: `translate(-50%, -50%) rotate(${arrow.angle}deg)`,
              transformOrigin: '0 center',
              zIndex: -1
            }}
          >
            {/* Arrowhead */}
            <div
              style={{
                position: 'absolute',
                right: '-8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderLeft: `8px solid ${textColor}`,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Preset annotation styles
export const AnnotationPresets = {
  warning: {
    backgroundColor: '#ef4444',
    textColor: '#ffffff'
  },
  info: {
    backgroundColor: '#3b82f6',
    textColor: '#ffffff'
  },
  success: {
    backgroundColor: '#10b981',
    textColor: '#ffffff'
  },
  highlight: {
    backgroundColor: '#fbbf24',
    textColor: '#1f2937'
  },
  subtle: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textColor: '#ffffff'
  }
};

// Example usage with presets:
// <Annotation
//   text="Success!"
//   position={{x: '50%', y: '50%'}}
//   {...AnnotationPresets.success}
// />
