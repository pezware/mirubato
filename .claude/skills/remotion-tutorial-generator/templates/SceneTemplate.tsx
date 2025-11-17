/**
 * Template for a basic scene component in a Remotion video
 *
 * Usage:
 * 1. Copy this template to your Remotion project's src/scenes/ directory
 * 2. Rename the component and file appropriately
 * 3. Customize the content, animations, and styling
 * 4. Import and use in your main Video composition with <Sequence>
 */

import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill
} from 'remotion';

interface SceneProps {
  // Add any props needed for customization
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
}

export const SceneTemplate: React.FC<SceneProps> = ({
  title = 'Scene Title',
  subtitle = 'Scene subtitle or description',
  backgroundColor = '#0f172a'
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  // Fade in animation for title (0-30 frames)
  const titleOpacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'}
  );

  // Slide up animation for subtitle (starts at frame 15)
  const subtitleY = spring({
    frame: frame - 15,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5
    }
  });

  // Scale animation for main content (starts at frame 30)
  const contentScale = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 80,
      stiffness: 100,
      mass: 1
    }
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5%'
      }}
    >
      {/* Title Section */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          right: '10%',
          opacity: titleOpacity
        }}
      >
        <h1
          style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            color: '#ffffff',
            margin: 0,
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {title}
        </h1>
      </div>

      {/* Subtitle Section */}
      {frame > 15 && (
        <div
          style={{
            position: 'absolute',
            top: '28%',
            left: '15%',
            right: '15%',
            transform: `translateY(${(1 - subtitleY) * 50}px)`,
            opacity: subtitleY
          }}
        >
          <p
            style={{
              fontSize: '2rem',
              color: '#cbd5e1',
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.5
            }}
          >
            {subtitle}
          </p>
        </div>
      )}

      {/* Main Content Area */}
      {frame > 30 && (
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '10%',
            right: '10%',
            bottom: '15%',
            transform: `scale(${contentScale})`,
            opacity: contentScale,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Replace this with your actual content */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '2rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <p style={{color: '#e2e8f0', fontSize: '1.5rem', margin: 0}}>
              Your content goes here
            </p>
          </div>
        </div>
      )}

      {/* Optional: Progress indicator or scene number */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '5%',
          fontSize: '1rem',
          color: 'rgba(255, 255, 255, 0.5)'
        }}
      >
        Scene {/* scene number */}
      </div>
    </AbsoluteFill>
  );
};
