import React from 'react'
import { Sequence, useVideoConfig } from 'remotion'
import { Intro } from './scenes/Intro'
import { Overview } from './scenes/Overview'
import { LogbookDemo } from './scenes/LogbookDemo'
import { ToolboxDemo } from './scenes/ToolboxDemo'
import { Architecture } from './scenes/Architecture'
import { Outro } from './scenes/Outro'
import { Transition } from './components/Transition'
import { theme } from './theme/mirubato'

export const MirubatoIntro: React.FC = () => {
  const { fps } = useVideoConfig()

  // Scene durations (in seconds) - Optimized for 1.5x-2x speed
  // Total: ~65 seconds (was 143 seconds)
  const scenes = {
    intro: 5, // 5 seconds (was 8)
    overview: 10, // 10 seconds (was 15)
    logbook: 18, // 18 seconds (was 30)
    // REMOVED: scorebook (beta feature)
    toolbox: 12, // 12 seconds (was 25)
    architecture: 15, // 15 seconds (was 30)
    outro: 5, // 5 seconds (was 10)
  }

  // Calculate start frames
  const startFrames = {
    intro: 0,
    overview: scenes.intro * fps,
    logbook: (scenes.intro + scenes.overview) * fps,
    toolbox: (scenes.intro + scenes.overview + scenes.logbook) * fps,
    architecture:
      (scenes.intro + scenes.overview + scenes.logbook + scenes.toolbox) * fps,
    outro:
      (scenes.intro +
        scenes.overview +
        scenes.logbook +
        scenes.toolbox +
        scenes.architecture) *
      fps,
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Intro Scene - Logo and tagline */}
      <Sequence
        from={startFrames.intro}
        durationInFrames={scenes.intro * fps}
        name="Intro"
      >
        <Transition type="fade" durationInFrames={fps * 0.3}>
          <Intro />
        </Transition>
      </Sequence>

      {/* Overview Scene - What is Mirubato */}
      <Sequence
        from={startFrames.overview}
        durationInFrames={scenes.overview * fps}
        name="Overview"
      >
        <Transition type="fade" durationInFrames={fps * 0.3}>
          <Overview />
        </Transition>
      </Sequence>

      {/* Logbook Demo - Practice tracking */}
      <Sequence
        from={startFrames.logbook}
        durationInFrames={scenes.logbook * fps}
        name="Logbook"
      >
        <Transition type="slide" durationInFrames={fps * 0.3}>
          <LogbookDemo />
        </Transition>
      </Sequence>

      {/* Toolbox Demo - Practice tools */}
      <Sequence
        from={startFrames.toolbox}
        durationInFrames={scenes.toolbox * fps}
        name="Toolbox"
      >
        <Transition type="slide" durationInFrames={fps * 0.3}>
          <ToolboxDemo />
        </Transition>
      </Sequence>

      {/* Architecture - Technical overview */}
      <Sequence
        from={startFrames.architecture}
        durationInFrames={scenes.architecture * fps}
        name="Architecture"
      >
        <Transition type="fade" durationInFrames={fps * 0.3}>
          <Architecture />
        </Transition>
      </Sequence>

      {/* Outro - Call to action */}
      <Sequence
        from={startFrames.outro}
        durationInFrames={scenes.outro * fps}
        name="Outro"
      >
        <Transition type="scale" durationInFrames={fps * 0.3}>
          <Outro />
        </Transition>
      </Sequence>
    </div>
  )
}
