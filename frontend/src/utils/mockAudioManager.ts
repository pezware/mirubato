import {
  AudioManagerInterface,
  AudioManagerConfig,
} from './audioManagerInterface'

/**
 * Mock Audio Manager for testing
 * @category Audio
 * @subcategory Testing
 */
export class MockAudioManager implements AudioManagerInterface {
  private _initialized = false
  private _instrument: 'piano' | 'guitar' = 'piano'
  private _loading = false
  private playedNotes: Array<{
    note: string | string[]
    duration?: string
    velocity?: number
    time?: number
  }> = []

  constructor(config: AudioManagerConfig = {}) {
    this._instrument = config.defaultInstrument || 'piano'
  }

  isInitialized(): boolean {
    return this._initialized
  }

  async initialize(): Promise<void> {
    this._loading = true
    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 10))
    this._initialized = true
    this._loading = false
  }

  setInstrument(instrument: 'piano' | 'guitar'): void {
    this._instrument = instrument
  }

  getInstrument(): 'piano' | 'guitar' {
    return this._instrument
  }

  async playNote(
    note: string | string[],
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this._initialized) {
      await this.initialize()
    }
    this.playedNotes.push({ note, duration, velocity })
  }

  async playNoteAt(
    note: string | string[],
    time: number,
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this._initialized) {
      await this.initialize()
    }
    this.playedNotes.push({ note, duration, velocity, time })
  }

  isLoading(): boolean {
    return this._loading
  }

  dispose(): void {
    this._initialized = false
    this._loading = false
    this.playedNotes = []
  }

  // Test helper methods
  getPlayedNotes() {
    return this.playedNotes
  }

  clearPlayedNotes() {
    this.playedNotes = []
  }
}
