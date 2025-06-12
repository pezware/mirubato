import * as Tone from 'tone'
import {
  MultiVoiceAudioManagerInterface,
  AudioExportOptions,
  NotePlayEvent,
  MeasureChangeEvent,
} from './multiVoiceAudioManagerInterface'
import { AudioManagerConfig } from './audioManagerInterface'
import {
  Score,
  Voice,
  MultiVoiceMeasure,
} from '../modules/sheetMusic/multiVoiceTypes'
import { TimeSignature } from '../modules/sheetMusic/types'

/**
 * Multi-Voice Audio Manager implementation using Tone.js
 * Provides polyphonic playback of multi-voice scores with voice isolation,
 * muting, and advanced playback controls.
 *
 * @category Audio
 * @subcategory Multi-Voice Implementation
 * @example
 * ```typescript
 * const audioManager = new MultiVoiceAudioManager();
 * await audioManager.initialize();
 *
 * // Play a complete score
 * await audioManager.playScore(score);
 *
 * // Play only the right hand
 * await audioManager.playVoice(score, 'rightHand');
 *
 * // Mute left hand during practice
 * audioManager.muteVoice('leftHand');
 * ```
 */
export class MultiVoiceAudioManager implements MultiVoiceAudioManagerInterface {
  private initialized = false
  private audioStarted = false
  private pianoSampler: Tone.Sampler | null = null
  private guitarSynth: Tone.PolySynth | null = null
  private currentInstrument: 'piano' | 'guitar' = 'piano'
  private loadingPromise: Promise<void> | null = null
  private config: AudioManagerConfig
  private toneInstance: typeof Tone

  // Voice management
  private mutedVoices = new Set<string>()
  private soloedVoice: string | null = null
  private voiceVolumes = new Map<string, number>()
  private voiceGains = new Map<string, Tone.Gain>()

  // Playback state
  private isPlayingState = false
  private currentScheduleId: number | null = null
  private playbackSpeed = 1.0

  // Metronome
  private metronomeActive = false
  private metronomeLoop: Tone.Loop | null = null
  private metronomeSynth: Tone.Synth | null = null

  // Effects
  private reverb: Tone.Reverb | null = null

  // Event listeners
  private notePlayListeners: Array<(event: NotePlayEvent) => void> = []
  private measureChangeListeners: Array<(event: MeasureChangeEvent) => void> =
    []

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

    // Pre-initialize to reduce first-play latency
    if (typeof window !== 'undefined') {
      this.preInitialize()
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = this._initializeInternal()
    return this.loadingPromise
  }

  /**
   * Start the audio context after user interaction
   * This must be called in response to a user gesture (click, tap, etc.)
   */
  private async ensureAudioStarted(): Promise<void> {
    if (this.audioStarted) {
      return
    }

    try {
      await this.toneInstance.start()
      this.audioStarted = true
    } catch (error) {
      // Failed to start audio context - audio might work later
    }
  }

  private async _initializeInternal(): Promise<void> {
    try {
      // Don't start the audio context here - wait for user interaction
      // await this.toneInstance.start()

      const baseUrl = this.config.samplesBaseUrl!

      // Create piano sampler with reduced sample set for faster loading
      // Only load essential notes - Tone.js will interpolate the rest
      this.pianoSampler = new this.toneInstance.Sampler({
        urls: {
          A0: 'A0.mp3',
          A1: 'A1.mp3',
          A2: 'A2.mp3',
          A3: 'A3.mp3',
          A4: 'A4.mp3',
          A5: 'A5.mp3',
          A6: 'A6.mp3',
          A7: 'A7.mp3',
          C1: 'C1.mp3',
          C2: 'C2.mp3',
          C3: 'C3.mp3',
          C4: 'C4.mp3',
          C5: 'C5.mp3',
          C6: 'C6.mp3',
          C7: 'C7.mp3',
          C8: 'C8.mp3',
          'F#1': 'Fs1.mp3',
          'F#2': 'Fs2.mp3',
          'F#3': 'Fs3.mp3',
          'F#4': 'Fs4.mp3',
          'F#5': 'Fs5.mp3',
          'F#6': 'Fs6.mp3',
          'F#7': 'Fs7.mp3',
        },
        release: 1,
        baseUrl,
        // Add onload callback to track loading progress
        onload: () => {
          // Piano samples loaded
        },
      }).toDestination()

      // Create guitar synth
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

      // Add reverb with reduced processing for lower latency
      this.reverb = new this.toneInstance.Reverb({
        decay: this.config.reverb!.decay || 1.5, // Reduced from 2.5
        wet: this.config.reverb!.wet || 0.1, // Reduced from 0.15
        preDelay: this.config.reverb!.preDelay || 0.01,
      }).toDestination()

      // Connect instruments directly to destination first, reverb is optional
      // This reduces latency in the signal chain
      try {
        this.pianoSampler.disconnect()
        this.guitarSynth.disconnect()
      } catch {
        // Ignore disconnect errors in test environment
      }

      // Create parallel signal paths
      this.pianoSampler.toDestination()
      this.guitarSynth.toDestination()

      // Also send to reverb (parallel processing)
      this.pianoSampler.connect(this.reverb)
      this.guitarSynth.connect(this.reverb)

      // Create metronome synth
      this.metronomeSynth = new this.toneInstance.Synth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination()

      await this.toneInstance.loaded()

      this.initialized = true

      // Set up optimized audio context settings
      if (this.toneInstance.context) {
        // Reduce latency by setting lower buffer size if supported
        const ctx = this.toneInstance.context as unknown as AudioContext
        try {
          if (ctx && 'latencyHint' in ctx) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioCtx = ctx as any
            audioCtx.latencyHint = 'interactive'
          }
        } catch {
          // Ignore if latencyHint is not supported
        }
      }
    } catch (error) {
      this.loadingPromise = null
      throw error
    }
  }

  /**
   * Pre-initialize audio context to reduce first-play latency
   */
  private preInitialize(): void {
    // Schedule initialization after a short delay to not block initial render
    setTimeout(() => {
      if (!this.initialized && !this.loadingPromise) {
        // Start loading in background
        this.initialize().catch(() => {
          // Background audio initialization failed
        })
      }
    }, 100)
  }

  setInstrument(instrument: 'piano' | 'guitar'): void {
    this.currentInstrument = instrument
  }

  getInstrument(): 'piano' | 'guitar' {
    return this.currentInstrument
  }

  async playNote(
    note: string | string[],
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Ensure audio context is started (requires user interaction)
    await this.ensureAudioStarted()

    const instrument = this.getActiveInstrument()
    if (instrument) {
      // Use immediate timing for lower latency
      const time = this.toneInstance.immediate()
      instrument.triggerAttackRelease(note, duration, time, velocity)
    }
  }

  async playNoteAt(
    note: string | string[],
    time: number,
    duration: string = '8n',
    velocity: number = 0.8
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const instrument = this.getActiveInstrument()
    if (instrument) {
      const toneTime = this.toneInstance.now() + time
      instrument.triggerAttackRelease(note, duration, toneTime, velocity)
    }
  }

  async playScore(score: Score, startMeasure: number = 1): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Ensure audio context is started (requires user interaction)
    await this.ensureAudioStarted()

    this.stopPlayback()
    this.isPlayingState = true

    // Set initial tempo
    const firstMeasure = score.measures[0]
    if (firstMeasure?.tempo) {
      this.toneInstance.Transport.bpm.value = firstMeasure.tempo
    }

    // Schedule all notes
    const scheduleId = this.scheduleScore(score, startMeasure)
    this.currentScheduleId = scheduleId

    // Start transport
    this.toneInstance.Transport.start()
  }

  async playVoice(
    score: Score,
    voiceId: string,
    startMeasure: number = 1
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Create a filtered score with only the specified voice
    const filteredScore = this.filterScoreByVoice(score, voiceId)
    await this.playScore(filteredScore, startMeasure)
  }

  stopPlayback(): void {
    this.toneInstance.Transport.stop()
    if (this.currentScheduleId !== null) {
      this.toneInstance.Transport.clear(this.currentScheduleId)
    }
    this.isPlayingState = false
    this.currentScheduleId = null
  }

  isPlaying(): boolean {
    return this.isPlayingState
  }

  muteVoice(voiceId: string): void {
    this.mutedVoices.add(voiceId)
    const gain = this.voiceGains.get(voiceId)
    if (gain) {
      gain.gain.value = 0
    }
  }

  unmuteVoice(voiceId: string): void {
    this.mutedVoices.delete(voiceId)
    const gain = this.voiceGains.get(voiceId)
    if (gain) {
      gain.gain.value = this.voiceVolumes.get(voiceId) ?? 1
    }
  }

  isVoiceMuted(voiceId: string): boolean {
    return this.mutedVoices.has(voiceId)
  }

  soloVoice(voiceId: string): void {
    this.soloedVoice = voiceId
  }

  clearSolo(): void {
    this.soloedVoice = null
  }

  getSoloedVoice(): string | null {
    return this.soloedVoice
  }

  setVoiceVolume(voiceId: string, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    this.voiceVolumes.set(voiceId, clampedVolume)

    const gain = this.voiceGains.get(voiceId)
    if (gain && !this.isVoiceMuted(voiceId)) {
      gain.gain.value = clampedVolume
    }
  }

  getVoiceVolume(voiceId: string): number {
    return this.voiceVolumes.get(voiceId) ?? 1
  }

  startMetronome(timeSignature: TimeSignature, tempo: number = 120): void {
    this.stopMetronome()

    const beatsPerMeasure = this.getBeatsPerMeasure(timeSignature)
    this.toneInstance.Transport.bpm.value = tempo

    let beatCount = 0
    this.metronomeLoop = new this.toneInstance.Loop(time => {
      const isDownbeat = beatCount % beatsPerMeasure === 0
      const frequency = isDownbeat ? 880 : 440 // A5 for downbeat, A4 for other beats

      this.metronomeSynth?.triggerAttackRelease(frequency, '32n', time, 0.5)
      beatCount++
    }, '4n')

    this.metronomeLoop.start(0)
    this.metronomeActive = true
  }

  stopMetronome(): void {
    if (this.metronomeLoop) {
      this.metronomeLoop.stop()
      this.metronomeLoop.dispose()
      this.metronomeLoop = null
    }
    this.metronomeActive = false
  }

  isMetronomeActive(): boolean {
    return this.metronomeActive
  }

  setMetronomeTempo(tempo: number): void {
    this.toneInstance.Transport.bpm.value = tempo
  }

  onNotePlay(callback: (event: NotePlayEvent) => void): () => void {
    this.notePlayListeners.push(callback)
    return () => {
      const index = this.notePlayListeners.indexOf(callback)
      if (index >= 0) {
        this.notePlayListeners.splice(index, 1)
      }
    }
  }

  onMeasureChange(callback: (event: MeasureChangeEvent) => void): () => void {
    this.measureChangeListeners.push(callback)
    return () => {
      const index = this.measureChangeListeners.indexOf(callback)
      if (index >= 0) {
        this.measureChangeListeners.splice(index, 1)
      }
    }
  }

  async exportAudio(
    _score: Score,
    _options: AudioExportOptions
  ): Promise<ArrayBuffer> {
    // This is a placeholder implementation
    // In a real implementation, we would use Tone.js Offline rendering
    // to export the audio to a buffer
    const buffer = new ArrayBuffer(44100 * 2 * 2) // 1 second of stereo audio at 44.1kHz
    return buffer
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed))
    // Adjust transport playback rate
    // Note: Transport.playbackRate is available in newer versions of Tone.js
    ;(
      this.toneInstance.Transport as unknown as { playbackRate: number }
    ).playbackRate = this.playbackSpeed
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed
  }

  isLoading(): boolean {
    return this.loadingPromise !== null && !this.initialized
  }

  dispose(): void {
    this.stopPlayback()
    this.stopMetronome()

    if (this.pianoSampler) {
      this.pianoSampler.dispose()
      this.pianoSampler = null
    }
    if (this.guitarSynth) {
      this.guitarSynth.dispose()
      this.guitarSynth = null
    }
    if (this.metronomeSynth) {
      this.metronomeSynth.dispose()
      this.metronomeSynth = null
    }

    this.voiceGains.forEach(gain => gain.dispose())
    this.voiceGains.clear()

    if (this.reverb) {
      this.reverb.dispose()
      this.reverb = null
    }

    this.initialized = false
    this.loadingPromise = null
  }

  // Private helper methods

  private getActiveInstrument(): Tone.Sampler | Tone.PolySynth | null {
    if (this.currentInstrument === 'piano') {
      return this.pianoSampler
    } else if (this.currentInstrument === 'guitar') {
      return this.guitarSynth
    }
    return null
  }

  private scheduleScore(score: Score, startMeasure: number): number {
    let currentTime = 0
    const scheduleId = Date.now()

    // Pre-calculate which voices should play to avoid repeated checks
    const activeVoices = new Set<string>()
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (this.shouldPlayVoice(voice.id)) {
            activeVoices.add(voice.id)
          }
        })
      })
    })

    // Use a single batch scheduling for better performance
    const scheduleBatch = () => {
      score.measures.forEach(measure => {
        if (measure.number < startMeasure) {
          // Skip measures before start
          currentTime += this.getMeasureDuration(measure)
          return
        }

        // Emit measure change event
        this.toneInstance.Transport.schedule(time => {
          this.measureChangeListeners.forEach(listener => {
            listener({ measureNumber: measure.number, time })
          })
        }, currentTime)

        // Update tempo if changed
        if (measure.tempo) {
          this.toneInstance.Transport.schedule(() => {
            this.toneInstance.Transport.bpm.value = measure.tempo!
          }, currentTime)
        }

        // Schedule all notes in the measure
        measure.staves.forEach(staff => {
          staff.voices.forEach(voice => {
            if (activeVoices.has(voice.id)) {
              this.scheduleVoiceNotes(voice, currentTime, measure)
            }
          })
        })

        currentTime += this.getMeasureDuration(measure)
      })
    }

    // Execute batch scheduling
    scheduleBatch()

    return scheduleId
  }

  private scheduleVoiceNotes(
    voice: Voice,
    measureStartTime: number,
    measure: MultiVoiceMeasure
  ): void {
    const beatDuration = this.getBeatDuration(measure.timeSignature)
    const instrument = this.getActiveInstrument()

    if (!instrument) return

    // Pre-calculate voice volume once
    const voiceVelocity = this.getVoiceVolume(voice.id) * 0.8

    // Process notes in batch
    const notesToSchedule: Array<{
      time: number
      keys: string[]
      duration: string
      velocity: number
    }> = []

    voice.notes.forEach(note => {
      if (!note.rest && note.keys && note.keys.length > 0) {
        const noteTime = measureStartTime + note.time * beatDuration
        const duration = this.getNoteDuration(note.duration, beatDuration)

        // Convert keys from VexFlow format (e.g., "c/4") to Tone.js format (e.g., "C4")
        const toneKeys = note.keys
          .map(key => {
            const parts = key.split('/')
            if (parts.length !== 2) return null
            const [noteName, octave] = parts
            // Convert to Tone.js format: uppercase note + octave
            return noteName.toUpperCase() + octave
          })
          .filter(Boolean) as string[]

        if (toneKeys.length > 0) {
          notesToSchedule.push({
            time: noteTime,
            keys: toneKeys,
            duration,
            velocity: voiceVelocity,
          })
        }
      }
    })

    // Schedule all notes at once
    notesToSchedule.forEach(({ time, keys, duration, velocity }) => {
      this.toneInstance.Transport.schedule(scheduleTime => {
        try {
          instrument.triggerAttackRelease(
            keys,
            duration,
            scheduleTime,
            velocity
          )
        } catch (error) {
          // Error playing note
        }

        // Emit note play event - only if there are listeners
        if (this.notePlayListeners.length > 0) {
          this.notePlayListeners.forEach(listener => {
            listener({
              note: {
                keys,
                voiceId: voice.id,
                duration,
              },
              time: scheduleTime,
              velocity,
            })
          })
        }
      }, time)
    })
  }

  private shouldPlayVoice(voiceId: string): boolean {
    if (this.soloedVoice) {
      return voiceId === this.soloedVoice
    }
    return !this.mutedVoices.has(voiceId)
  }

  private filterScoreByVoice(score: Score, voiceId: string): Score {
    return {
      ...score,
      measures: score.measures.map(measure => ({
        ...measure,
        staves: measure.staves.map(staff => ({
          ...staff,
          voices: staff.voices.filter(voice => voice.id === voiceId),
        })),
      })),
    }
  }

  private getMeasureDuration(measure: MultiVoiceMeasure): number {
    const timeSignature = measure.timeSignature || TimeSignature.FOUR_FOUR
    const beatsPerMeasure = this.getBeatsPerMeasure(timeSignature)
    const beatDuration = 60 / (measure.tempo || 120) // seconds per beat
    return beatsPerMeasure * beatDuration
  }

  private getBeatDuration(_timeSignature?: TimeSignature): number {
    const tempo = this.toneInstance.Transport.bpm.value
    return 60 / tempo // seconds per beat
  }

  private getBeatsPerMeasure(timeSignature: TimeSignature): number {
    const signatures: Partial<Record<TimeSignature, number>> = {
      [TimeSignature.FOUR_FOUR]: 4,
      [TimeSignature.THREE_FOUR]: 3,
      [TimeSignature.SIX_EIGHT]: 6,
      [TimeSignature.TWO_FOUR]: 2,
      [TimeSignature.FIVE_FOUR]: 5,
      [TimeSignature.SEVEN_EIGHT]: 7,
      [TimeSignature.TWELVE_EIGHT]: 12,
      [TimeSignature.NINE_EIGHT]: 9,
      [TimeSignature.THREE_EIGHT]: 3,
    }
    return signatures[timeSignature] || 4
  }

  private getNoteDuration(duration: string, _beatDuration: number): string {
    // Convert our duration format to Tone.js format
    // This is a simplified mapping - extend as needed
    const durationMap: Record<string, string> = {
      whole: '1n',
      half: '2n',
      quarter: '4n',
      eighth: '8n',
      sixteenth: '16n',
      'thirty-second': '32n',
    }
    return durationMap[duration] || '4n'
  }
}

// Factory function for creating MultiVoiceAudioManager instances
export function createMultiVoiceAudioManager(
  config?: AudioManagerConfig,
  toneInstance?: typeof Tone
): MultiVoiceAudioManagerInterface {
  return new MultiVoiceAudioManager(config, toneInstance)
}
