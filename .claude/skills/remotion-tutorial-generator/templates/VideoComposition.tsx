/**
 * Template for main video composition
 *
 * This file defines the overall structure of your tutorial video
 * with multiple scenes arranged using Sequences.
 *
 * Usage:
 * 1. Copy to your Remotion project's src/ directory
 * 2. Import your scene components
 * 3. Arrange scenes with appropriate timing using <Sequence>
 * 4. Register in Root.tsx with <Composition>
 */

import React from 'react';
import {Sequence, Audio, AbsoluteFill} from 'remotion';

// Import your scene components
// import {IntroScene} from './scenes/IntroScene';
// import {OverviewScene} from './scenes/OverviewScene';
// import {FeatureDemoScene} from './scenes/FeatureDemoScene';
// import {ArchitectureScene} from './scenes/ArchitectureScene';
// import {OutroScene} from './scenes/OutroScene';

interface VideoProps {
  // Props that can be passed to customize the video
  projectName?: string;
  projectColor?: string;
  // Add other customizable properties
}

export const TutorialVideo: React.FC<VideoProps> = ({
  projectName = 'Your Project Name',
  projectColor = '#3b82f6'
}) => {
  // Video configuration
  const fps = 30;

  // Scene durations (in seconds, converted to frames)
  const sceneDurations = {
    intro: 8,      // 8 seconds
    overview: 15,  // 15 seconds
    feature1: 20,  // 20 seconds per feature
    feature2: 20,
    feature3: 20,
    architecture: 30,  // 30 seconds
    outro: 10      // 10 seconds
  };

  // Convert to frames
  const frames = Object.fromEntries(
    Object.entries(sceneDurations).map(([key, seconds]) => [key, seconds * fps])
  );

  // Calculate cumulative start times
  const startTimes = {
    intro: 0,
    overview: frames.intro,
    feature1: frames.intro + frames.overview,
    feature2: frames.intro + frames.overview + frames.feature1,
    feature3: frames.intro + frames.overview + frames.feature1 + frames.feature2,
    architecture: frames.intro + frames.overview + frames.feature1 + frames.feature2 + frames.feature3,
    outro: frames.intro + frames.overview + frames.feature1 + frames.feature2 + frames.feature3 + frames.architecture
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#000000'}}>
      {/* Background Music (optional) */}
      {/* Uncomment and add your audio file */}
      {/* <Audio src="/audio/background-music.mp3" volume={0.2} /> */}

      {/* Scene 1: Intro */}
      <Sequence from={startTimes.intro} durationInFrames={frames.intro}>
        {/* <IntroScene projectName={projectName} /> */}
        <AbsoluteFill style={{
          backgroundColor: projectColor,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{fontSize: '5rem', color: 'white'}}>{projectName}</h1>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Overview */}
      <Sequence from={startTimes.overview} durationInFrames={frames.overview}>
        {/* <OverviewScene /> */}
        <AbsoluteFill style={{
          backgroundColor: '#1e293b',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10%'
        }}>
          <div style={{textAlign: 'center'}}>
            <h2 style={{fontSize: '3rem', color: 'white', marginBottom: '2rem'}}>
              Overview
            </h2>
            <p style={{fontSize: '2rem', color: '#cbd5e1'}}>
              Brief overview of what your project does
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Feature Demo 1 */}
      <Sequence from={startTimes.feature1} durationInFrames={frames.feature1}>
        {/* <FeatureDemoScene featureNumber={1} /> */}
        <AbsoluteFill style={{
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{fontSize: '3rem', color: 'white'}}>Feature 1</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Feature Demo 2 */}
      <Sequence from={startTimes.feature2} durationInFrames={frames.feature2}>
        {/* <FeatureDemoScene featureNumber={2} /> */}
        <AbsoluteFill style={{
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{fontSize: '3rem', color: 'white'}}>Feature 2</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Feature Demo 3 */}
      <Sequence from={startTimes.feature3} durationInFrames={frames.feature3}>
        {/* <FeatureDemoScene featureNumber={3} /> */}
        <AbsoluteFill style={{
          backgroundColor: '#0f172a',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{fontSize: '3rem', color: 'white'}}>Feature 3</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Architecture */}
      <Sequence from={startTimes.architecture} durationInFrames={frames.architecture}>
        {/* <ArchitectureScene /> */}
        <AbsoluteFill style={{
          backgroundColor: '#1e293b',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2 style={{fontSize: '3rem', color: 'white'}}>System Architecture</h2>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: Outro */}
      <Sequence from={startTimes.outro} durationInFrames={frames.outro}>
        {/* <OutroScene /> */}
        <AbsoluteFill style={{
          backgroundColor: projectColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <h2 style={{fontSize: '3rem', color: 'white'}}>Get Started</h2>
          <p style={{fontSize: '2rem', color: 'white'}}>github.com/yourproject</p>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// Default props for the composition (used in Root.tsx)
export const tutorialVideoProps = {
  projectName: 'Your Project',
  projectColor: '#3b82f6'
};
