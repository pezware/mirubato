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

  private async _initializeInternal(): Promise<void> {
    try {
      await this.toneInstance.start()

      const baseUrl = this.config.samplesBaseUrl!

      // Create piano sampler
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

      // Add reverb
      this.reverb = new this.toneInstance.Reverb({
        decay: this.config.reverb!.decay,
        wet: this.config.reverb!.wet,
        preDelay: this.config.reverb!.preDelay,
      }).toDestination()

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
    } catch (error) {
      this.loadingPromise = null
      throw error
    }
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

    const instrument = this.getActiveInstrument()
    if (instrument) {
      instrument.triggerAttackRelease(note, duration, undefined, velocity)
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
          if (this.shouldPlayVoice(voice.id)) {
            this.scheduleVoiceNotes(voice, currentTime, measure)
          }
        })
      })

      currentTime += this.getMeasureDuration(measure)
    })

    return scheduleId
  }

  private scheduleVoiceNotes(
    voice: Voice,
    measureStartTime: number,
    measure: MultiVoiceMeasure
  ): void {
    const beatDuration = this.getBeatDuration(measure.timeSignature)

    voice.notes.forEach(note => {
      const noteTime = measureStartTime + note.time * beatDuration
      const velocity = this.getVoiceVolume(voice.id) * 0.8

      this.toneInstance.Transport.schedule(time => {
        // Play the note
        const instrument = this.getActiveInstrument()
        if (instrument && !note.rest) {
          const duration = this.getNoteDuration(note.duration, beatDuration)
          instrument.triggerAttackRelease(note.keys, duration, time, velocity)
        }

        // Emit note play event
        this.notePlayListeners.forEach(listener => {
          listener({
            note: {
              keys: note.keys,
              voiceId: voice.id,
              duration: note.duration,
            },
            time,
            velocity,
          })
        })
      }, noteTime)
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
