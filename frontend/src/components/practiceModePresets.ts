import { PracticeMode } from './practiceModeTypes'

/**
 * Common practice mode presets
 */
export const practiceModePresets = {
  /** Beginner-friendly single voice practice */
  beginnerVoicePractice: {
    mode: PracticeMode.SINGLE_VOICE,
    tempoPercentage: 75,
  },

  /** Piano hands separate practice */
  pianoHandsSeparate: {
    mode: PracticeMode.HANDS_SEPARATE,
    selectedHand: 'right' as const,
  },

  /** Slow practice for difficult passages */
  slowPractice: {
    mode: PracticeMode.SLOW_PRACTICE,
    tempoPercentage: 50,
  },

  /** Loop practice for problem sections */
  problemSectionLoop: {
    mode: PracticeMode.LOOP_SECTION,
    loopStart: 1,
    loopEnd: 4,
  },

  /** Choir practice with one part highlighted */
  choirPartPractice: {
    mode: PracticeMode.VOICE_HIGHLIGHT,
    highlightedVoice: 'soprano',
  },
}