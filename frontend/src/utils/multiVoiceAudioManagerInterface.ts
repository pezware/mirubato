import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { TimeSignature } from '../modules/sheetMusic/types'
import { AudioManagerInterface } from './audioManagerInterface'

/**
 * Audio export options
 */
export interface AudioExportOptions {
  /** Output format */
  format: 'wav' | 'mp3' | 'ogg'
  /** Sample rate in Hz */
  sampleRate?: number
  /** Bit depth (for WAV) */
  bitDepth?: 16 | 24 | 32
  /** Quality (for lossy formats, 0-1) */
  quality?: number
}

/**
 * Note playback event data
 */
export interface NotePlayEvent {
  /** The note being played */
  note: {
    keys: string[]
    voiceId: string
    duration?: string
  }
  /** Time of playback (in seconds) */
  time: number
  /** Velocity (0-1) */
  velocity: number
}

/**
 * Measure change event data
 */
export interface MeasureChangeEvent {
  /** Measure number */
  measureNumber: number
  /** Time of change (in seconds) */
  time: number
}

/**
 * Multi-Voice Audio Manager Interface
 * Extends the basic AudioManager with polyphonic score playback capabilities
 *
 * @category Audio
 * @subcategory Multi-Voice
 */
export interface MultiVoiceAudioManagerInterface extends AudioManagerInterface {
  /**
   * Play a complete score with all voices
   * @param score - The multi-voice score to play
   * @param startMeasure - Optional measure to start from (1-based)
   * @returns Promise that resolves when playback starts
   */
  playScore(score: Score, startMeasure?: number): Promise<void>

  /**
   * Play only a specific voice from the score
   * @param score - The complete score
   * @param voiceId - ID of the voice to play
   * @param startMeasure - Optional measure to start from (1-based)
   * @returns Promise that resolves when playback starts
   */
  playVoice(score: Score, voiceId: string, startMeasure?: number): Promise<void>

  /**
   * Stop all playback
   */
  stopPlayback(): void

  /**
   * Check if playback is active
   * @returns True if currently playing
   */
  isPlaying(): boolean

  /**
   * Mute a specific voice
   * @param voiceId - ID of the voice to mute
   */
  muteVoice(voiceId: string): void

  /**
   * Unmute a specific voice
   * @param voiceId - ID of the voice to unmute
   */
  unmuteVoice(voiceId: string): void

  /**
   * Check if a voice is muted
   * @param voiceId - ID of the voice to check
   * @returns True if voice is muted
   */
  isVoiceMuted(voiceId: string): boolean

  /**
   * Solo a specific voice (mute all others)
   * @param voiceId - ID of the voice to solo
   */
  soloVoice(voiceId: string): void

  /**
   * Clear solo mode (unmute all voices)
   */
  clearSolo(): void

  /**
   * Get the currently soloed voice
   * @returns Voice ID or null if no solo
   */
  getSoloedVoice(): string | null

  /**
   * Set volume for a specific voice
   * @param voiceId - ID of the voice
   * @param volume - Volume level (0-1)
   */
  setVoiceVolume(voiceId: string, volume: number): void

  /**
   * Get volume for a specific voice
   * @param voiceId - ID of the voice
   * @returns Volume level (0-1)
   */
  getVoiceVolume(voiceId: string): number

  /**
   * Start metronome with specific time signature
   * @param timeSignature - Time signature for the metronome
   * @param tempo - Tempo in BPM
   */
  startMetronome(timeSignature: TimeSignature, tempo?: number): void

  /**
   * Stop metronome
   */
  stopMetronome(): void

  /**
   * Check if metronome is active
   * @returns True if metronome is running
   */
  isMetronomeActive(): boolean

  /**
   * Set metronome tempo
   * @param tempo - Tempo in BPM
   */
  setMetronomeTempo(tempo: number): void

  /**
   * Subscribe to note play events
   * @param callback - Function to call when a note is played
   * @returns Unsubscribe function
   */
  onNotePlay(callback: (event: NotePlayEvent) => void): () => void

  /**
   * Subscribe to measure change events
   * @param callback - Function to call when measure changes
   * @returns Unsubscribe function
   */
  onMeasureChange(callback: (event: MeasureChangeEvent) => void): () => void

  /**
   * Export score as audio file
   * @param score - The score to export
   * @param options - Export options
   * @returns Promise resolving to audio buffer
   */
  exportAudio(score: Score, options: AudioExportOptions): Promise<ArrayBuffer>

  /**
   * Set playback speed multiplier
   * @param speed - Speed multiplier (0.5 = half speed, 2 = double speed)
   */
  setPlaybackSpeed(speed: number): void

  /**
   * Get current playback speed
   * @returns Speed multiplier
   */
  getPlaybackSpeed(): number
}
