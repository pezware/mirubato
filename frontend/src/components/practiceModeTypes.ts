/**
 * Available practice modes
 */
export enum PracticeMode {
  /** Practice all voices together */
  FULL_SCORE = 'full_score',
  /** Practice a single voice */
  SINGLE_VOICE = 'single_voice',
  /** Practice hands separately (piano) */
  HANDS_SEPARATE = 'hands_separate',
  /** Practice with one voice highlighted */
  VOICE_HIGHLIGHT = 'voice_highlight',
  /** Practice with backing tracks */
  ACCOMPANIMENT = 'accompaniment',
  /** Slow practice mode */
  SLOW_PRACTICE = 'slow_practice',
  /** Section looping */
  LOOP_SECTION = 'loop_section',
}

/**
 * Practice mode configuration
 */
export interface PracticeModeConfig {
  mode: PracticeMode
  /** Selected voice for single voice mode */
  selectedVoice?: string
  /** Selected hand for hands separate mode */
  selectedHand?: 'left' | 'right'
  /** Highlighted voice for highlight mode */
  highlightedVoice?: string
  /** Voices to use as accompaniment */
  accompanimentVoices?: string[]
  /** Tempo percentage for slow practice (25-100) */
  tempoPercentage?: number
  /** Loop section start measure */
  loopStart?: number
  /** Loop section end measure */
  loopEnd?: number
}