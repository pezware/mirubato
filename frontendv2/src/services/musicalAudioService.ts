import * as Tone from 'tone'
import { PlaybackMode } from '../components/circle-of-fifths/types'

// Convert note names to Tone.js format (e.g., "C#4")
const toToneNote = (note: string, octave: number = 4): string => {
  // Handle enharmonic slash notation (e.g., "F#/Gb" -> "F#")
  const slashIndex = note.indexOf('/')
  const baseNote = slashIndex > -1 ? note.substring(0, slashIndex) : note

  // Remove chord notation (m, dim, maj, etc.) to get just the note name
  const noteOnly = baseNote.replace(/m(aj)?|dim|aug|sus|add|[0-9]+/g, '').trim()

  // Handle enharmonic equivalents
  const noteMap: Record<string, string> = {
    'E#': 'F',
    'B#': 'C',
    Cb: 'B',
    Fb: 'E',
  }

  const mappedNote = noteMap[noteOnly] || noteOnly
  return `${mappedNote}${octave}`
}

class MusicalAudioService {
  private sampler: Tone.Sampler | null = null
  private volume: Tone.Volume | null = null
  private reverb: Tone.Reverb | null = null
  private initialized = false
  private currentSequence: Tone.Sequence | null = null
  private playbackTimeout: NodeJS.Timeout | null = null

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Start Tone.js audio context
      await Tone.start()

      // Create sampler with selective piano samples for lightweight loading
      this.sampler = new Tone.Sampler({
        urls: {
          A1: 'A1.mp3',
          A2: 'A2.mp3',
          A3: 'A3.mp3',
          A4: 'A4.mp3',
          A5: 'A5.mp3',
          A6: 'A6.mp3',
          C2: 'C2.mp3',
          C3: 'C3.mp3',
          C4: 'C4.mp3',
          C5: 'C5.mp3',
          C6: 'C6.mp3',
          'D#2': 'Ds2.mp3',
          'D#3': 'Ds3.mp3',
          'D#4': 'Ds4.mp3',
          'D#5': 'Ds5.mp3',
          'F#2': 'Fs2.mp3',
          'F#3': 'Fs3.mp3',
          'F#4': 'Fs4.mp3',
          'F#5': 'Fs5.mp3',
        },
        release: 1,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
      })

      // Create reverb effect
      this.reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
      })

      // Create volume control
      this.volume = new Tone.Volume(-6) // Adjust volume

      // Wait for samples to load
      await Tone.loaded()

      // Connect sampler -> reverb -> volume -> destination
      this.sampler.connect(this.reverb)
      this.reverb.connect(this.volume)
      this.volume.toDestination()

      // Generate reverb impulse response
      await this.reverb.generate()

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize musical audio service:', error)
      throw error
    }
  }

  setVolume(volume: number): void {
    if (!this.volume) return

    // Convert 0-100 to dB (-60 to 0)
    const db = volume === 0 ? -Infinity : -60 + (volume / 100) * 60
    this.volume.volume.rampTo(db, 0.1)
  }

  async playChord(notes: string[], duration: number = 1): Promise<void> {
    await this.initialize()
    if (!this.sampler) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Convert notes to Tone.js format
    const toneNotes = notes.map(note => toToneNote(note))

    // Play chord
    this.sampler.triggerAttackRelease(toneNotes, duration)

    // Wait for the chord to finish playing
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.playbackTimeout = null
        resolve()
      }, duration * 1000)
    })
  }

  async playScale(
    notes: string[],
    mode: 'ascending' | 'descending' | 'both' = 'ascending',
    tempo: number = 120
  ): Promise<void> {
    await this.initialize()
    if (!this.sampler) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Helper to get note order value for octave calculation
    const getNoteOrder = (note: string): number => {
      const noteOrder: Record<string, number> = {
        C: 0,
        'C#': 1,
        Db: 1,
        D: 2,
        'D#': 3,
        Eb: 3,
        E: 4,
        F: 5,
        'F#': 6,
        Gb: 6,
        G: 7,
        'G#': 8,
        Ab: 8,
        A: 9,
        'A#': 10,
        Bb: 10,
        B: 11,
      }
      // Handle enharmonic slash notation
      const cleanNote = note.includes('/') ? note.split('/')[0] : note
      return noteOrder[cleanNote] ?? 0
    }

    // Prepare note sequence with proper octaves
    let sequence: string[] = []
    const baseOctave = 4

    if (mode === 'ascending' || mode === 'both') {
      let currentOctave = baseOctave
      let lastNoteOrder = -1

      sequence = notes.map(note => {
        const noteOrder = getNoteOrder(note)

        // If the note order decreased, we've crossed into a new octave
        if (lastNoteOrder !== -1 && noteOrder < lastNoteOrder) {
          currentOctave++
        }

        lastNoteOrder = noteOrder
        return toToneNote(note, currentOctave)
      })
    }

    if (mode === 'descending') {
      // For descending, start from the octave where the scale would end
      let currentOctave = baseOctave
      let lastNoteOrder = -1

      // First, calculate the ending octave
      notes.forEach(note => {
        const noteOrder = getNoteOrder(note)
        if (lastNoteOrder !== -1 && noteOrder < lastNoteOrder) {
          currentOctave++
        }
        lastNoteOrder = noteOrder
      })

      // Then create the descending sequence
      sequence = notes.map(note => toToneNote(note, currentOctave)).reverse()
    }

    if (mode === 'both') {
      // Create ascending sequence
      let currentOctave = baseOctave
      let lastNoteOrder = -1

      const ascending = notes.map(note => {
        const noteOrder = getNoteOrder(note)

        if (lastNoteOrder !== -1 && noteOrder < lastNoteOrder) {
          currentOctave++
        }

        lastNoteOrder = noteOrder
        return toToneNote(note, currentOctave)
      })

      // Add the tonic an octave higher
      const tonicOctave = currentOctave + 1
      const topNote = toToneNote(notes[0], tonicOctave)

      // Create descending sequence (excluding the repeated top note)
      const descending = [...ascending, topNote].reverse().slice(1)
      sequence = [...ascending, topNote, ...descending]
    }

    // Calculate note duration based on tempo
    const noteDuration = 60 / tempo // Duration of each note in seconds

    // Create and start sequence
    this.currentSequence = new Tone.Sequence(
      (time, note) => {
        if (this.sampler) {
          this.sampler.triggerAttackRelease(note, noteDuration * 0.8, time)
        }
      },
      sequence,
      noteDuration
    ).start(0)

    // Start transport
    Tone.Transport.start()

    // Stop after sequence completes and wait for it
    const totalDuration = sequence.length * noteDuration
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.stopCurrentSequence()
        resolve()
      }, totalDuration * 1000)
    })
  }

  async playArpeggio(
    notes: string[],
    pattern: number[] = [0, 2, 4], // Default to triad
    tempo: number = 120
  ): Promise<void> {
    await this.initialize()
    if (!this.sampler) return

    // Stop any currently playing sequence
    this.stopCurrentSequence()

    // Helper to get note order value for octave calculation
    const getNoteOrder = (note: string): number => {
      const noteOrder: Record<string, number> = {
        C: 0,
        'C#': 1,
        Db: 1,
        D: 2,
        'D#': 3,
        Eb: 3,
        E: 4,
        F: 5,
        'F#': 6,
        Gb: 6,
        G: 7,
        'G#': 8,
        Ab: 8,
        A: 9,
        'A#': 10,
        Bb: 10,
        B: 11,
      }
      const cleanNote = note.includes('/') ? note.split('/')[0] : note
      return noteOrder[cleanNote] ?? 0
    }

    // Create arpeggio pattern with proper octaves
    const arpeggioNotes: string[] = []
    const baseOctave = 4

    // Build ascending arpeggio
    for (const index of pattern) {
      if (index < notes.length) {
        const note = notes[index]
        // Calculate octave based on position in scale
        const rootOrder = getNoteOrder(notes[0])
        const noteOrder = getNoteOrder(note)
        const octaveOffset = noteOrder < rootOrder ? 1 : 0
        arpeggioNotes.push(toToneNote(note, baseOctave + octaveOffset))
      }
    }

    // Add descending pattern
    for (let i = pattern.length - 2; i > 0; i--) {
      const index = pattern[i]
      if (index < notes.length) {
        const note = notes[index]
        const rootOrder = getNoteOrder(notes[0])
        const noteOrder = getNoteOrder(note)
        const octaveOffset = noteOrder < rootOrder ? 1 : 0
        arpeggioNotes.push(toToneNote(note, baseOctave + octaveOffset))
      }
    }

    // Calculate note duration based on tempo
    const noteDuration = 60 / (tempo * 2) // Faster for arpeggios

    // Create and start sequence
    this.currentSequence = new Tone.Sequence(
      (time, note) => {
        if (this.sampler) {
          this.sampler.triggerAttackRelease(note, noteDuration * 0.8, time)
        }
      },
      arpeggioNotes,
      noteDuration
    ).start(0)

    // Start transport
    Tone.Transport.start()

    // Stop after sequence completes and wait for it
    const totalDuration = arpeggioNotes.length * noteDuration
    return new Promise(resolve => {
      this.playbackTimeout = setTimeout(() => {
        this.stopCurrentSequence()
        resolve()
      }, totalDuration * 1000)
    })
  }

  async playKeyAudio(
    keyId: string,
    scale: string[],
    _primaryChords: string[],
    mode: PlaybackMode,
    tempo: number = 120
  ): Promise<void> {
    switch (mode) {
      case 'chord': {
        // Play the tonic chord (I chord)
        const tonicChord = this.buildChord(keyId, scale)
        await this.playChord(tonicChord)
        break
      }

      case 'scale':
        await this.playScale(scale, 'both', tempo)
        break

      case 'arpeggio': {
        const arpeggioNotes = this.buildChord(keyId, scale)
        await this.playArpeggio(arpeggioNotes, [0, 1, 2], tempo)
        break
      }
    }
  }

  private buildChord(root: string, scale: string[]): string[] {
    // Handle enharmonic slash notation in root (e.g., "F#/Gb" -> "F#")
    let cleanRoot = root.includes('/') ? root.split('/')[0] : root

    // Remove 'm' from minor key names (e.g., "Am" -> "A", "F#m" -> "F#")
    if (cleanRoot.endsWith('m')) {
      cleanRoot = cleanRoot.slice(0, -1)
    }

    // Find the root in the scale
    const rootIndex = scale.findIndex(note => {
      const cleanNote = note.includes('/') ? note.split('/')[0] : note
      return cleanNote === cleanRoot
    })

    if (rootIndex === -1) {
      // If still not found, try to find just the root note
      return [cleanRoot] // Fallback to just root
    }

    const chord: string[] = [cleanRoot]

    // Add third (2 scale degrees up)
    const thirdIndex = (rootIndex + 2) % scale.length
    chord.push(scale[thirdIndex])

    // Add fifth (4 scale degrees up)
    const fifthIndex = (rootIndex + 4) % scale.length
    chord.push(scale[fifthIndex])

    return chord
  }

  private stopCurrentSequence(): void {
    // Stop any currently playing notes
    if (this.sampler) {
      this.sampler.releaseAll()
    }

    if (this.currentSequence) {
      this.currentSequence.stop()
      this.currentSequence.dispose()
      this.currentSequence = null
    }

    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout)
      this.playbackTimeout = null
    }

    // Stop and clear transport
    Tone.Transport.stop()
    Tone.Transport.cancel()
    Tone.Transport.position = 0
  }

  // Public method to stop playback
  stop(): void {
    this.stopCurrentSequence()
  }

  dispose(): void {
    this.stopCurrentSequence()

    if (this.sampler) {
      this.sampler.dispose()
      this.sampler = null
    }

    if (this.reverb) {
      this.reverb.dispose()
      this.reverb = null
    }

    if (this.volume) {
      this.volume.dispose()
      this.volume = null
    }

    this.initialized = false
  }
}

// Export singleton instance
export const musicalAudioService = new MusicalAudioService()
