import * as Tone from 'tone'

interface MetronomeConfig {
  tempo: number
  volume: number
  accentBeats: boolean
}

interface VisualCallback {
  onBeat?: (beatNumber: number, isAccent: boolean) => void
}

class MetronomeService {
  private clickSynth: Tone.MembraneSynth
  private accentSynth: Tone.MembraneSynth
  private currentBeat: number = 0
  private beatsPerMeasure: number = 4
  private isPlaying: boolean = false
  private volume: Tone.Volume
  private visualCallback?: VisualCallback
  private lookaheadTime: number = 0.1 // How far ahead to schedule audio (sec)
  private scheduleInterval: number = 25 // How often to call scheduler (ms)
  private nextNoteTime: number = 0 // When the next note is due
  private timerID: number | null = null
  private tempo: number = 120

  constructor() {
    // Create volume control
    this.volume = new Tone.Volume(-6).toDestination()

    // Create synths for normal and accent beats
    this.clickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 6,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).connect(this.volume)

    this.accentSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 8,
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.15,
      },
    }).connect(this.volume)
  }

  async start(
    config: MetronomeConfig,
    visualCallback?: VisualCallback
  ): Promise<void> {
    // Ensure audio nodes exist (helps in test environments with mocks)
    this.ensureNodes()
    // Ensure audio context is started
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }

    // Stop any existing playback
    this.stop()

    // Set initial state
    this.setVolume(config.volume)
    this.visualCallback = visualCallback
    this.currentBeat = 0
    this.tempo = config.tempo
    this.nextNoteTime = Tone.now()

    // Set Transport BPM
    Tone.Transport.bpm.value = config.tempo

    // Start the Transport
    Tone.Transport.start()

    // Start the lookahead scheduler
    this.scheduler(config)
    this.isPlaying = true
  }

  private ensureNodes(): void {
    // Lazily (re)create nodes if missing (robust against mocking differences)
    if (!this.volume) {
      const vol: any = (Tone as any).Volume?.(-6) ?? new (Tone as any).Volume(-6)
      this.volume = vol.toDestination ? vol.toDestination() : vol
    }
    if (!this.clickSynth) {
      this.clickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 6,
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).connect(this.volume)
    }
    if (!this.accentSynth) {
      this.accentSynth = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 8,
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.15,
        },
      }).connect(this.volume)
    }
  }

  private scheduler(config: MetronomeConfig): void {
    // Schedule all notes that need to play before the next interval
    while (this.nextNoteTime < Tone.now() + this.lookaheadTime) {
      this.scheduleNote(this.nextNoteTime, config)
      this.nextNote()
    }

    // Set up next scheduler call
    this.timerID = window.setTimeout(() => {
      if (this.isPlaying) {
        this.scheduler(config)
      }
    }, this.scheduleInterval)
  }

  private scheduleNote(time: number, config: MetronomeConfig): void {
    const isAccent = config.accentBeats && this.currentBeat === 0

    // Schedule the audio
    if (isAccent) {
      this.accentSynth.triggerAttackRelease('G2', '16n', time)
    } else {
      this.clickSynth.triggerAttackRelease('C3', '16n', time)
    }

    // Schedule visual feedback in perfect sync with audio
    if (this.visualCallback?.onBeat) {
      const beatNumber = this.currentBeat
      Tone.Draw.schedule(() => {
        this.visualCallback!.onBeat!(beatNumber, isAccent)
      }, time)
    }
  }

  private nextNote(): void {
    // Calculate time until next beat
    const secondsPerBeat = 60.0 / this.tempo
    this.nextNoteTime += secondsPerBeat

    // Advance beat counter
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure
  }

  stop(): void {
    this.isPlaying = false

    // Clear the scheduler
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    // Stop and clean Transport
    Tone.Transport.stop()
    Tone.Transport.cancel()

    // Reset state
    this.currentBeat = 0
    this.nextNoteTime = 0
  }

  setTempo(tempo: number): void {
    this.tempo = tempo
    // Use Transport's BPM for smooth tempo changes
    Tone.Transport.bpm.rampTo(tempo, 0.1)
  }

  setVolume(volume: number): void {
    // Convert 0-1 range to decibels (-60 to 0)
    const db = volume === 0 ? -Infinity : -60 + volume * 60
    // Lazily (re)create volume node if it wasn't initialized yet
    if (!this.volume) {
      const vol: any = (Tone as any).Volume?.(-6) ?? new (Tone as any).Volume(-6)
      this.volume = vol.toDestination ? vol.toDestination() : vol
    }
    this.volume.volume.rampTo(db, 0.05) // Smooth volume changes
  }

  setBeatsPerMeasure(beats: number): void {
    this.beatsPerMeasure = beats
    this.currentBeat = 0
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  dispose(): void {
    this.stop()
    this.clickSynth?.dispose?.()
    this.accentSynth?.dispose?.()
    ;(this.volume as any)?.dispose?.()
  }
}

// Create singleton instance
let metronomeInstance: MetronomeService | null = null

export const getMetronome = (): MetronomeService => {
  // Create or repair singleton instance if internal nodes are missing
  if (!metronomeInstance) {
    metronomeInstance = new MetronomeService()
  } else {
    const m = metronomeInstance as unknown as {
      volume?: any
      clickSynth?: any
      accentSynth?: any
    }
    if (!m.volume || !m.clickSynth || !m.accentSynth) {
      metronomeInstance = new MetronomeService()
    }
  }
  return metronomeInstance
}

// Export types for use in components
export type { MetronomeConfig, VisualCallback }

// Test-only helper to ensure a fresh instance after mocks are applied
export const __resetMetronomeForTests = (): void => {
  try {
    metronomeInstance?.dispose?.()
  } catch {
    // ignore dispose errors in tests
  }
  metronomeInstance = null
}
