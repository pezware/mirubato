/**
 * Audio Manager Interface for dependency injection
 * @category Audio
 * @subcategory Core Interfaces
 */
export interface AudioManagerInterface {
  /**
   * Check if audio system is initialized
   */
  isInitialized(): boolean

  /**
   * Initialize the audio system
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>

  /**
   * Set the current instrument
   * @param instrument - 'piano' or 'guitar'
   */
  setInstrument(instrument: 'piano' | 'guitar'): void

  /**
   * Get the current instrument
   * @returns Current instrument type
   */
  getInstrument(): 'piano' | 'guitar'

  /**
   * Play a note or chord immediately
   * @param note - Note name(s) to play (e.g., 'C4' or ['C4', 'E4', 'G4'])
   * @param duration - Duration of the note (default: '8n')
   * @param velocity - Volume/velocity (0-1, default: 0.8)
   */
  playNote(
    note: string | string[],
    duration?: string,
    velocity?: number
  ): Promise<void>

  /**
   * Schedule a note to play at a specific time
   * @param note - Note name(s) to play
   * @param time - Time to play the note (in seconds)
   * @param duration - Duration of the note (default: '8n')
   * @param velocity - Volume/velocity (0-1, default: 0.8)
   */
  playNoteAt(
    note: string | string[],
    time: number,
    duration?: string,
    velocity?: number
  ): Promise<void>

  /**
   * Check if audio is currently loading
   * @returns True if loading, false otherwise
   */
  isLoading(): boolean

  /**
   * Clean up audio resources
   */
  dispose(): void
}

/**
 * Configuration options for AudioManager
 */
export interface AudioManagerConfig {
  /**
   * Base URL for loading audio samples
   */
  samplesBaseUrl?: string

  /**
   * Default instrument to use
   */
  defaultInstrument?: 'piano' | 'guitar'

  /**
   * Reverb settings
   */
  reverb?: {
    decay?: number
    wet?: number
    preDelay?: number
  }
}
