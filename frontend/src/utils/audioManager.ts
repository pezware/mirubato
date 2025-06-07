import * as Tone from 'tone'
import {
  AudioManagerInterface,
  AudioManagerConfig,
} from './audioManagerInterface'

/**
 * Audio Manager implementation using Tone.js for music practice applications.
 * Provides note playback, chord support, and instrument switching for piano and guitar.
 *
 * @category Audio
 * @subcategory Core Implementation
 * @example
 * ```typescript
 * const audioManager = new AudioManager({
 *   defaultInstrument: 'piano',
 *   reverb: { decay: 2.0, wet: 0.1 }
 * });
 *
 * await audioManager.initialize();
 *
 * // Play individual notes
 * audioManager.playNote('C4');
 * audioManager.playNote(['C4', 'E4', 'G4']); // C major chord
 *
 * // Switch instruments
 * audioManager.setInstrument('guitar');
 * audioManager.playNote('E2'); // Low E string
 * ```
 */
export class AudioManager implements AudioManagerInterface {
  private initialized = false
  private pianoSampler: Tone.Sampler | null = null
  private guitarSynth: Tone.PolySynth | null = null
  private currentInstrument: 'piano' | 'guitar'
  private loadingPromise: Promise<void> | null = null
  private config: AudioManagerConfig
  private toneInstance: typeof Tone

  /**
   * Creates a new AudioManager instance with optional configuration.
   *
   * @param config - Configuration options for audio settings
   * @param toneInstance - Tone.js instance for dependency injection (mainly for testing)
   */
  constructor(
    config: AudioManagerConfig = {},
    toneInstance: typeof Tone = Tone
  ) {
    this.config = {
      samplesBaseUrl: 'https://tonejs.github.io/audio/salamander/',
      defaultInstrument: 'piano',
      reverb: {
        decay: 2.5,
        wet: 0.15,
        preDelay: 0.01,
      },
      ...config,
    }
    this.currentInstrument = this.config.defaultInstrument || 'piano'
    this.toneInstance = toneInstance
  }

  /**
   * Checks if the audio system has been initialized.
   *
   * @returns True if audio system is ready for playback
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Initializes the audio system and loads instrument samples.
   * Must be called before any audio playback. Safe to call multiple times.
   *
   * @returns Promise that resolves when audio system is ready
   *
   * @example
   * ```typescript
   * const audioManager = new AudioManager();
   * await audioManager.initialize();
   *
   * if (audioManager.isInitialized()) {
   *   audioManager.playNote('C4');
   * }
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Audio already initialized')
      return
    }

    // If already loading, wait for it
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = this._initializeInternal()
    return this.loadingPromise
  }

  private async _initializeInternal(): Promise<void> {
    try {
      console.log('Initializing audio system...')

      // Start the audio context - requires user gesture
      await this.toneInstance.start()
      console.log('Tone.js started successfully')

      const baseUrl = this.config.samplesBaseUrl!

      console.log(`Loading piano samples from: ${baseUrl}`)

      // Create piano sampler with Salamander Grand Piano samples
      // We'll use a subset of samples to reduce loading time
      // The sampler will automatically pitch-shift to fill in missing notes
      this.pianoSampler = new this.toneInstance.Sampler({
        urls: {
          A0: 'A0.mp3',
          C1: 'C1.mp3',
          'D#1': 'Ds1.mp3',
          'F#1': 'Fs1.mp3',
          A1: 'A1.mp3',
          C2: 'C2.mp3',
          'D#2': 'Ds2.mp3',
          'F#2': 'Fs2.mp3',
          A2: 'A2.mp3',
          C3: 'C3.mp3',
          'D#3': 'Ds3.mp3',
          'F#3': 'Fs3.mp3',
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          'D#5': 'Ds5.mp3',
          'F#5': 'Fs5.mp3',
          A5: 'A5.mp3',
          C6: 'C6.mp3',
          'D#6': 'Ds6.mp3',
          'F#6': 'Fs6.mp3',
          A6: 'A6.mp3',
          C7: 'C7.mp3',
          'D#7': 'Ds7.mp3',
          'F#7': 'Fs7.mp3',
          A7: 'A7.mp3',
          C8: 'C8.mp3',
        },
        release: 1,
        baseUrl,
        onload: () => {
          console.log('Piano samples loaded successfully')
        },
        onerror: error => {
          console.error('Failed to load piano samples:', error)
          // Try to continue with synthetic sound as fallback
        },
      }).toDestination()

      // Create guitar synth (using synthetic sound for now)
      this.guitarSynth = new this.toneInstance.PolySynth(
        this.toneInstance.Synth,
        {
          oscillator: {
            type: 'triangle',
          },
          envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.3,
            release: 1,
          },
        }
      ).toDestination()

      // Add reverb for both instruments
      const reverb = new this.toneInstance.Reverb({
        decay: this.config.reverb!.decay,
        wet: this.config.reverb!.wet,
        preDelay: this.config.reverb!.preDelay,
      }).toDestination()

      this.pianoSampler.connect(reverb)
      this.guitarSynth.connect(reverb)

      // Wait for piano samples to load
      console.log('Loading piano samples...')
      await new Promise<void>((resolve, reject) => {
        this.toneInstance
          .loaded()
          .then(() => {
            console.log('Piano samples loaded successfully')
            resolve()
          })
          .catch(reject)
      })

      this.initialized = true
      console.log('Audio system ready!')
    } catch (error) {
      console.error('Audio initialization error:', error)
      this.loadingPromise = null
      throw error
    }
  }

  // Set the current instrument
  setInstrument(instrument: 'piano' | 'guitar'): void {
    this.currentInstrument = instrument
    console.log(`Switched to ${instrument}`)
  }

  // Get the current instrument
  getInstrument(): 'piano' | 'guitar' {
    return this.currentInstrument
  }

  async playNote(
    note: string | string[],
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    console.log(
      `playNote called with: ${note}, instrument: ${this.currentInstrument}`
    )

    // Initialize on first play attempt
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      if (this.currentInstrument === 'piano' && this.pianoSampler) {
        // For piano, use the sampler
        this.pianoSampler.triggerAttackRelease(
          note,
          duration,
          undefined,
          velocity
        )
      } else if (this.currentInstrument === 'guitar' && this.guitarSynth) {
        // For guitar, use the synth (for now)
        this.guitarSynth.triggerAttackRelease(
          note,
          duration,
          undefined,
          velocity
        )
      } else {
        throw new Error(`${this.currentInstrument} not available`)
      }

      console.log(`Successfully played: ${note} on ${this.currentInstrument}`)
    } catch (error) {
      console.error('Error playing note:', error)
      throw error
    }
  }

  // Play a note with specific timing
  async playNoteAt(
    note: string | string[],
    time: number,
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Calculate time relative to Tone.js current time
      const toneTime = this.toneInstance.now() + time

      if (this.currentInstrument === 'piano' && this.pianoSampler) {
        this.pianoSampler.triggerAttackRelease(
          note,
          duration,
          toneTime,
          velocity
        )
      } else if (this.currentInstrument === 'guitar' && this.guitarSynth) {
        this.guitarSynth.triggerAttackRelease(
          note,
          duration,
          toneTime,
          velocity
        )
      }
    } catch (error) {
      console.error('Error scheduling note:', error)
      throw error
    }
  }

  // Check if currently loading
  isLoading(): boolean {
    return this.loadingPromise !== null && !this.initialized
  }

  // Clean up resources
  dispose(): void {
    if (this.pianoSampler) {
      this.pianoSampler.dispose()
      this.pianoSampler = null
    }
    if (this.guitarSynth) {
      this.guitarSynth.dispose()
      this.guitarSynth = null
    }
    this.initialized = false
    this.loadingPromise = null
  }
}

// Create a factory function for creating AudioManager instances
export function createAudioManager(
  config?: AudioManagerConfig,
  toneInstance?: typeof Tone
): AudioManagerInterface {
  return new AudioManager(config, toneInstance)
}

// Default instance for backward compatibility
// This will be deprecated in favor of dependency injection
export const audioManager = createAudioManager()
