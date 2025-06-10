// Practice mode configuration - moved to separate file for React Refresh compatibility

export enum PracticeMode {
  DEFAULT = 'default',
  SIGHT_READING = 'sight-reading',
  TEMPO_PRACTICE = 'tempo-practice',
  LISTEN_ONLY = 'listen-only',
  LEFT_HAND_ONLY = 'left-hand-only',
  RIGHT_HAND_ONLY = 'right-hand-only',
  SLOW_PRACTICE = 'slow-practice',
}

export interface PracticeModeConfig {
  mode: PracticeMode
  label: string
  description: string
  settings: {
    tempo?: number
    showNotes?: boolean
    playback?: boolean
    metronome?: boolean
    activeVoices?: string[]
    loop?: boolean
    countdown?: boolean
  }
}

export const practiceModePresets: Record<PracticeMode, PracticeModeConfig> = {
  [PracticeMode.DEFAULT]: {
    mode: PracticeMode.DEFAULT,
    label: 'Default',
    description: 'Standard practice mode with all features enabled',
    settings: {
      tempo: 100,
      showNotes: true,
      playback: true,
      metronome: false,
      loop: false,
      countdown: true,
    },
  },
  [PracticeMode.SIGHT_READING]: {
    mode: PracticeMode.SIGHT_READING,
    label: 'Sight Reading',
    description: 'Practice reading new music without playback assistance',
    settings: {
      tempo: 80,
      showNotes: true,
      playback: false,
      metronome: true,
      loop: false,
      countdown: true,
    },
  },
  [PracticeMode.TEMPO_PRACTICE]: {
    mode: PracticeMode.TEMPO_PRACTICE,
    label: 'Tempo Practice',
    description: 'Gradually increase tempo for technical mastery',
    settings: {
      tempo: 60,
      showNotes: true,
      playback: true,
      metronome: true,
      loop: true,
      countdown: true,
    },
  },
  [PracticeMode.LISTEN_ONLY]: {
    mode: PracticeMode.LISTEN_ONLY,
    label: 'Listen Only',
    description: 'Listen to the piece without visual cues',
    settings: {
      tempo: 100,
      showNotes: false,
      playback: true,
      metronome: false,
      loop: false,
      countdown: false,
    },
  },
  [PracticeMode.LEFT_HAND_ONLY]: {
    mode: PracticeMode.LEFT_HAND_ONLY,
    label: 'Left Hand Only',
    description: 'Focus on left hand parts (bass clef)',
    settings: {
      tempo: 80,
      showNotes: true,
      playback: true,
      metronome: false,
      activeVoices: ['bass'],
      loop: false,
      countdown: true,
    },
  },
  [PracticeMode.RIGHT_HAND_ONLY]: {
    mode: PracticeMode.RIGHT_HAND_ONLY,
    label: 'Right Hand Only',
    description: 'Focus on right hand parts (treble clef)',
    settings: {
      tempo: 80,
      showNotes: true,
      playback: true,
      metronome: false,
      activeVoices: ['treble'],
      loop: false,
      countdown: true,
    },
  },
  [PracticeMode.SLOW_PRACTICE]: {
    mode: PracticeMode.SLOW_PRACTICE,
    label: 'Slow Practice',
    description: 'Practice at reduced tempo for accuracy',
    settings: {
      tempo: 50,
      showNotes: true,
      playback: true,
      metronome: true,
      loop: false,
      countdown: true,
    },
  },
}