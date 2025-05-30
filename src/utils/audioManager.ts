import * as Tone from 'tone'

class AudioManager {
  private initialized = false
  private synth: Tone.Synth | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Initialize Tone.js audio context
      await Tone.start()
      
      // Create a simple piano-like synth
      this.synth = new Tone.Synth({
        oscillator: {
          type: 'triangle'
        },
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.2,
          release: 1.5
        }
      }).toDestination()

      // Add a gentle reverb for more natural sound
      const reverb = new Tone.Reverb({
        decay: 2.5,
        preDelay: 0.01,
        wet: 0.2
      }).toDestination()
      
      this.synth.connect(reverb)
      
      this.initialized = true
      console.log('Audio system initialized')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      throw new Error('Audio initialization failed')
    }
  }

  async playNote(note: string, duration: string = '8n'): Promise<void> {
    // Ensure audio is initialized (handles user gesture requirement)
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.synth) {
      throw new Error('Synth not initialized')
    }

    try {
      // Play the note
      this.synth.triggerAttackRelease(note, duration)
    } catch (error) {
      console.error('Failed to play note:', error)
    }
  }

  // Clean up resources
  dispose(): void {
    if (this.synth) {
      this.synth.dispose()
      this.synth = null
    }
    this.initialized = false
  }
}

// Export singleton instance
export const audioManager = new AudioManager()