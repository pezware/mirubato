import React from 'react'
import { Sequence, useVideoConfig } from 'remotion'
import { Intro } from './scenes/Intro'
import { Overview } from './scenes/Overview'
import { LogbookDemo } from './scenes/LogbookDemo'
import { ScorebookDemo } from './scenes/ScorebookDemo'
import { ToolboxDemo } from './scenes/ToolboxDemo'
import { Architecture } from './scenes/Architecture'
import { Outro } from './scenes/Outro'
import { Transition } from './components/Transition'

export const MirubatoIntro: React.FC = () => {
  const { fps } = useVideoConfig()

  // Scene durations (in seconds)
  const scenes = {
    intro: 8, // 8 seconds
    overview: 15, // 15 seconds
    logbook: 30, // 30 seconds
    scorebook: 25, // 25 seconds
    toolbox: 25, // 25 seconds
    architecture: 30, // 30 seconds
    outro: 10, // 10 seconds
  }

  // Calculate start frames
  const startFrames = {
    intro: 0,
    overview: scenes.intro * fps,
    logbook: (scenes.intro + scenes.overview) * fps,
    scorebook: (scenes.intro + scenes.overview + scenes.logbook) * fps,
    toolbox:
      (scenes.intro + scenes.overview + scenes.logbook + scenes.scorebook) *
      fps,
    architecture:
      (scenes.intro +
        scenes.overview +
        scenes.logbook +
        scenes.scorebook +
        scenes.toolbox) *
      fps,
    outro:
      (scenes.intro +
        scenes.overview +
        scenes.logbook +
        scenes.scorebook +
        scenes.toolbox +
        scenes.architecture) *
      fps,
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
      }}
    >
      {/* Intro Scene - Logo and tagline */}
      <Sequence
        from={startFrames.intro}
        durationInFrames={scenes.intro * fps}
        name="Intro"
      >
        <Transition type="fade" durationInFrames={fps * 0.5}>
          <Intro />
        </Transition>
      </Sequence>

      {/* Overview Scene - What is Mirubato */}
      <Sequence
        from={startFrames.overview}
        durationInFrames={scenes.overview * fps}
        name="Overview"
      >
        <Transition type="fade" durationInFrames={fps * 0.5}>
          <Overview />
        </Transition>
      </Sequence>

      {/* Logbook Demo - Practice tracking */}
      <Sequence
        from={startFrames.logbook}
        durationInFrames={scenes.logbook * fps}
        name="Logbook"
      >
        <Transition type="slide" durationInFrames={fps * 0.5}>
          <LogbookDemo />
        </Transition>
      </Sequence>

      {/* Scorebook Demo - Sheet music library */}
      <Sequence
        from={startFrames.scorebook}
        durationInFrames={scenes.scorebook * fps}
        name="Scorebook"
      >
        <Transition type="fade" durationInFrames={fps * 0.5}>
          <ScorebookDemo />
        </Transition>
      </Sequence>

      {/* Toolbox Demo - Practice tools */}
      <Sequence
        from={startFrames.toolbox}
        durationInFrames={scenes.toolbox * fps}
        name="Toolbox"
      >
        <Transition type="slide" durationInFrames={fps * 0.5}>
          <ToolboxDemo />
        </Transition>
      </Sequence>

      {/* Architecture - Technical overview */}
      <Sequence
        from={startFrames.architecture}
        durationInFrames={scenes.architecture * fps}
        name="Architecture"
      >
        <Transition type="fade" durationInFrames={fps * 0.5}>
          <Architecture />
        </Transition>
      </Sequence>

      {/* Outro - Call to action */}
      <Sequence
        from={startFrames.outro}
        durationInFrames={scenes.outro * fps}
        name="Outro"
      >
        <Transition type="scale" durationInFrames={fps * 0.5}>
          <Outro />
        </Transition>
      </Sequence>
    </div>
  )
}
