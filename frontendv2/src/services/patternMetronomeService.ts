import * as Tone from 'tone'

export interface PatternConfig {
  tempo: number
  volume: number
  beatValue?: number // 4 for quarter note, 8 for eighth note, etc.
  patterns: {
    accent: boolean[]
    click: boolean[]
    woodblock: boolean[]
    shaker: boolean[]
    triangle: boolean[]
  }
}

interface VisualCallback {
  onBeat?: (beatNumber: number, layers: Record<string, boolean>) => void
}

class PatternMetronomeService {
  private synths?: Record<
    string,
    Tone.Synth | Tone.MembraneSynth | Tone.MetalSynth | Tone.NoiseSynth
  >
  private currentBeat: number = 0
  private beatsPerMeasure: number = 4
  private beatValue: number = 4
  private isPlaying: boolean = false
  private volume?: Tone.Volume
  private visualCallback?: VisualCallback
  private lookaheadTime: number = 0.1
  private scheduleInterval: number = 25
  private nextNoteTime: number = 0
  private timerID: number | null = null
  private tempo: number = 120
  private patterns: PatternConfig['patterns'] = {
    accent: [true, false, false, false],
    click: [false, true, true, true],
    woodblock: [false, false, false, false],
    shaker: [false, false, false, false],
    triangle: [false, false, false, false],
  }
  private isInitialized: boolean = false
  private pendingTempo?: number
  private pendingVolume?: number

  constructor() {
    // Don't create Tone.js objects here - wait for user gesture
    // Store any pending settings to apply after initialization
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return

    // Create volume control
    this.volume = new Tone.Volume(-6).toDestination()

    // Create different synths for each sound layer
    this.synths = {
      // Accent - Deep kick-like sound
      accent: new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 8,
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0,
          release: 0.15,
        },
      }).connect(this.volume),

      // Click - Standard metronome click
      click: new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 6,
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).connect(this.volume),

      // Woodblock - Woody percussive sound
      woodblock: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.05,
          sustain: 0,
          release: 0.05,
        },
      }).connect(this.volume),

      // Shaker - Soft noise-based rhythm
      shaker: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.02,
          sustain: 0,
          release: 0.02,
        },
      }).connect(this.volume),

      // Triangle - Bright metallic accent
      triangle: new Tone.MetalSynth({
        envelope: {
          attack: 0.001,
          decay: 0.1, // Reduced from 0.2 for tighter sound
          release: 0.1, // Reduced from 0.2
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -6, // Slightly quieter to balance with other sounds
      }).connect(this.volume),
    }

    this.isInitialized = true

    // Apply any pending settings
    if (this.pendingTempo !== undefined) {
      Tone.Transport.bpm.value = this.pendingTempo
      this.pendingTempo = undefined
    }
    if (this.pendingVolume !== undefined) {
      const db =
        this.pendingVolume === 0 ? -Infinity : -60 + this.pendingVolume * 60
      this.volume.volume.value = db
      this.pendingVolume = undefined
    }
  }

  async start(
    config: PatternConfig,
    visualCallback?: VisualCallback
  ): Promise<void> {
    // Don't try to start audio context here - it should be started by user gesture in UI
    // The component should ensure Tone.start() is called before calling this method

    // Ensure Tone.js objects are initialized
    await this.ensureInitialized()

    // Stop any existing playback
    this.stop()

    // Set initial state
    this.setVolume(config.volume)
    this.visualCallback = visualCallback
    this.currentBeat = 0
    this.tempo = config.tempo
    this.patterns = config.patterns
    this.beatValue = config.beatValue || 4

    // Calculate beats per measure from the pattern length
    this.beatsPerMeasure = config.patterns.accent.length

    // Set Transport BPM
    Tone.Transport.bpm.value = config.tempo

    // Start the Transport and get the start time
    Tone.Transport.start()

    // Initialize next note time to current transport time
    this.nextNoteTime = Tone.Transport.seconds

    // Start the lookahead scheduler
    this.scheduler()
    this.isPlaying = true
  }

  private scheduler(): void {
    // Use Transport.seconds for more accurate timing
    const currentTime = Tone.Transport.seconds

    // Schedule all notes that need to play before the next interval
    while (this.nextNoteTime < currentTime + this.lookaheadTime) {
      this.scheduleNote(this.nextNoteTime)
      this.nextNote()
    }

    // Set up next scheduler call
    this.timerID = window.setTimeout(() => {
      if (this.isPlaying) {
        this.scheduler()
      }
    }, this.scheduleInterval)
  }

  private scheduleNote(time: number): void {
    if (!this.synths) return // Safety check

    const layersToPlay: Record<string, boolean> = {}

    // Check each layer's pattern for this beat
    if (this.patterns.accent[this.currentBeat]) {
      // Calculate relative time from now
      const now = Tone.now()
      const relativeTime = time - Tone.Transport.seconds + now
      this.synths.accent.triggerAttackRelease('G2', '16n', relativeTime)
      layersToPlay.accent = true
    }

    if (this.patterns.click[this.currentBeat]) {
      const now = Tone.now()
      const relativeTime = time - Tone.Transport.seconds + now
      this.synths.click.triggerAttackRelease('C3', '16n', relativeTime)
      layersToPlay.click = true
    }

    if (this.patterns.woodblock[this.currentBeat]) {
      const now = Tone.now()
      const relativeTime = time - Tone.Transport.seconds + now
      this.synths.woodblock.triggerAttackRelease('E4', '16n', relativeTime)
      layersToPlay.woodblock = true
    }

    if (this.patterns.shaker[this.currentBeat]) {
      const now = Tone.now()
      const relativeTime = time - Tone.Transport.seconds + now
      ;(this.synths.shaker as Tone.NoiseSynth).triggerAttackRelease(
        '8n',
        relativeTime
      )
      layersToPlay.shaker = true
    }

    if (this.patterns.triangle[this.currentBeat]) {
      const now = Tone.now()
      const relativeTime = time - Tone.Transport.seconds + now
      ;(this.synths.triangle as Tone.MetalSynth).triggerAttackRelease(
        '16n',
        relativeTime
      )
      layersToPlay.triangle = true
    }

    // Schedule visual feedback in perfect sync with audio
    if (this.visualCallback?.onBeat) {
      const beatNumber = this.currentBeat
      Tone.Draw.schedule(() => {
        this.visualCallback!.onBeat!(beatNumber, layersToPlay)
      }, time)
    }
  }

  private nextNote(): void {
    // Calculate time until next beat
    // For different beat values: quarter note = 4, eighth note = 8
    // If beatValue is 8, we need to adjust the tempo calculation
    const beatMultiplier = 4 / this.beatValue
    const secondsPerBeat = (60.0 / this.tempo) * beatMultiplier
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

    // Clear the Transport position
    Tone.Transport.position = 0

    // Reset state
    this.currentBeat = 0
    this.nextNoteTime = 0
  }

  setTempo(tempo: number): void {
    this.tempo = tempo

    if (!this.isInitialized) {
      // Store for later application
      this.pendingTempo = tempo
      return
    }

    try {
      // Use Transport's BPM for smooth tempo changes
      Tone.Transport.bpm.rampTo(tempo, 0.1)
    } catch (_error) {
      // If error occurs, store as pending
      this.pendingTempo = tempo
      console.debug('Tempo will be set when audio context starts')
    }
  }

  setVolume(volume: number): void {
    if (!this.isInitialized || !this.volume) {
      // Store for later application
      this.pendingVolume = volume
      return
    }

    try {
      // Convert 0-1 range to decibels (-60 to 0)
      const db = volume === 0 ? -Infinity : -60 + volume * 60
      this.volume.volume.rampTo(db, 0.05) // Smooth volume changes
    } catch (_error) {
      // If error occurs, store as pending
      this.pendingVolume = volume
      console.debug('Volume will be set when audio context starts')
    }
  }

  setPatterns(patterns: PatternConfig['patterns']): void {
    this.patterns = patterns
    this.beatsPerMeasure = patterns.accent.length
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  dispose(): void {
    this.stop()
    if (this.synths) {
      Object.values(this.synths).forEach(synth => synth.dispose())
    }
    if (this.volume) {
      this.volume.dispose()
    }
    this.isInitialized = false
  }
}

// Create singleton instance
let patternMetronomeInstance: PatternMetronomeService | null = null

export const getPatternMetronome = (): PatternMetronomeService => {
  if (!patternMetronomeInstance) {
    patternMetronomeInstance = new PatternMetronomeService()
  }
  return patternMetronomeInstance
}

// Export types for use in components
export type { VisualCallback }
