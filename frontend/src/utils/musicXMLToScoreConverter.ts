/**
 * MusicXML to Score Converter
 *
 * Properly parses MusicXML files into the new multi-voice Score format,
 * handling parts, staves, voices, and maintaining timing relationships.
 */

import {
  Score,
  Part,
  Staff,
  MultiVoiceMeasure,
  MultiVoiceNote,
  ScoreMetadata,
  BarLineType,
  VoltaInfo,
} from '../modules/sheetMusic/multiVoiceTypes'
import {
  Clef,
  KeySignature,
  TimeSignature,
  NoteDuration,
  DynamicMarking,
} from '../modules/sheetMusic/types'

/**
 * Converter class for MusicXML to Score conversion
 */
export class MusicXMLToScoreConverter {
  private doc: Document
  private divisions = 1 // Divisions per quarter note
  private currentTime = new Map<string, number>() // Track time per voice

  constructor(xmlString: string) {
    const parser = new DOMParser()
    this.doc = parser.parseFromString(xmlString, 'text/xml')

    // Check for parsing errors
    const parserError = this.doc.querySelector('parsererror')
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`)
    }
  }

  /**
   * Convert the MusicXML document to a Score
   */
  convert(): Score {
    const scorePartwise = this.doc.querySelector('score-partwise')
    if (!scorePartwise) {
      throw new Error('Invalid MusicXML: missing score-partwise element')
    }

    return {
      title: this.extractTitle(),
      composer: this.extractComposer(),
      arranger: this.extractArranger(),
      copyright: this.extractCopyright(),
      parts: this.extractParts(),
      measures: this.extractMeasures(),
      metadata: this.extractMetadata(),
    }
  }

  /**
   * Extract the title from the score
   */
  private extractTitle(): string {
    const workTitle = this.doc.querySelector('work > work-title')
    const movementTitle = this.doc.querySelector('movement-title')
    return workTitle?.textContent || movementTitle?.textContent || 'Untitled'
  }

  /**
   * Extract the composer
   */
  private extractComposer(): string {
    const creator = this.doc.querySelector('creator[type="composer"]')
    return creator?.textContent || 'Unknown'
  }

  /**
   * Extract the arranger if present
   */
  private extractArranger(): string | undefined {
    const arranger = this.doc.querySelector('creator[type="arranger"]')
    return arranger?.textContent || undefined
  }

  /**
   * Extract copyright information
   */
  private extractCopyright(): string | undefined {
    const copyright = this.doc.querySelector('rights')
    return copyright?.textContent || undefined
  }

  /**
   * Extract all parts from the score
   */
  private extractParts(): Part[] {
    const parts: Part[] = []
    const partList = this.doc.querySelector('part-list')

    if (!partList) {
      throw new Error('Invalid MusicXML: missing part-list')
    }

    const scoreParts = partList.querySelectorAll('score-part')

    scoreParts.forEach(scorePart => {
      const id = scorePart.getAttribute('id')
      if (!id) return

      const partName = scorePart.querySelector('part-name')?.textContent || id
      const instrument = this.extractInstrumentFromPart(scorePart)
      const staves = this.extractStavesForPart(id)

      // Extract MIDI information
      const midiInstrument = scorePart.querySelector('midi-instrument')
      const midiProgram =
        midiInstrument?.querySelector('midi-program')?.textContent
      const volume = midiInstrument?.querySelector('volume')?.textContent
      const pan = midiInstrument?.querySelector('pan')?.textContent

      parts.push({
        id,
        name: partName,
        instrument,
        staves,
        midiProgram: midiProgram ? parseInt(midiProgram) - 1 : undefined, // MusicXML uses 1-128
        volume: volume ? Math.round(parseFloat(volume) * 1.27) : undefined, // Convert 0-100 to 0-127
        pan: pan ? Math.round(parseFloat(pan) * 0.64 - 64) : undefined, // Convert 0-100 to -64-63
      })
    })

    return parts
  }

  /**
   * Extract instrument name from a score-part
   */
  private extractInstrumentFromPart(scorePart: Element): string {
    const instrumentName =
      scorePart.querySelector('instrument-name')?.textContent
    const partName = scorePart.querySelector('part-name')?.textContent || ''

    // Try to determine instrument from various sources
    if (instrumentName) return instrumentName.toLowerCase()
    if (partName.toLowerCase().includes('piano')) return 'piano'
    if (partName.toLowerCase().includes('guitar')) return 'guitar'
    if (partName.toLowerCase().includes('violin')) return 'violin'
    if (partName.toLowerCase().includes('voice')) return 'voice'

    return 'unknown'
  }

  /**
   * Determine which staves a part uses
   */
  private extractStavesForPart(partId: string): string[] {
    const part = this.doc.querySelector(`part[id="${partId}"]`)
    if (!part) return []

    const staves = new Set<string>()
    const measures = part.querySelectorAll('measure')

    measures.forEach(measure => {
      const staffElements = measure.querySelectorAll('note > staff')
      staffElements.forEach(staff => {
        const staffNumber = staff.textContent
        if (staffNumber) {
          staves.add(`${partId}-staff${staffNumber}`)
        }
      })
    })

    // If no explicit staff elements, assume single staff
    if (staves.size === 0) {
      staves.add(`${partId}-staff1`)
    }

    return Array.from(staves)
  }

  /**
   * Extract all measures from the score
   */
  private extractMeasures(): MultiVoiceMeasure[] {
    const measures: MultiVoiceMeasure[] = []

    // Find the first part to get measure structure
    const firstPart = this.doc.querySelector('part')
    if (!firstPart) {
      throw new Error('Invalid MusicXML: no parts found')
    }

    const measureElements = firstPart.querySelectorAll('measure')

    measureElements.forEach((measureElement, index) => {
      const measureNumber = parseInt(
        measureElement.getAttribute('number') || `${index + 1}`
      )
      measures.push(this.extractMeasure(measureNumber))
    })

    return measures
  }

  /**
   * Extract a specific measure across all parts
   */
  private extractMeasure(measureNumber: number): MultiVoiceMeasure {
    const staves: Staff[] = []
    const parts = this.doc.querySelectorAll('part')

    // Collect attributes from first part's measure
    let timeSignature: TimeSignature | undefined
    let keySignature: KeySignature | undefined
    let tempo: number | undefined
    let dynamics: DynamicMarking | undefined
    let rehearsalMark: string | undefined
    let barLine: BarLineType | undefined
    let repeatCount: number | undefined
    let volta: VoltaInfo | undefined

    parts.forEach(part => {
      const partId = part.getAttribute('id')
      if (!partId) return

      const measure = part.querySelector(`measure[number="${measureNumber}"]`)
      if (!measure) return

      // Extract measure attributes from first part
      if (staves.length === 0) {
        const attributes = this.extractMeasureAttributes(measure)
        timeSignature = attributes.timeSignature
        keySignature = attributes.keySignature
        tempo = attributes.tempo
        dynamics = attributes.dynamics
        rehearsalMark = attributes.rehearsalMark
        barLine = attributes.barLine
        repeatCount = attributes.repeatCount
        volta = attributes.volta
      }

      // Extract staves for this part's measure
      const partStaves = this.extractStavesFromMeasure(measure, partId)
      staves.push(...partStaves)
    })

    return {
      number: measureNumber,
      staves,
      timeSignature,
      keySignature,
      tempo,
      dynamics,
      rehearsalMark,
      barLine,
      repeatCount,
      volta,
    }
  }

  /**
   * Extract staves from a measure
   */
  private extractStavesFromMeasure(measure: Element, partId: string): Staff[] {
    const stavesMap = new Map<string, Staff>()
    const notes = measure.querySelectorAll('note')

    // Extract divisions if present
    const divisions = measure.querySelector('attributes > divisions')
    if (divisions) {
      this.divisions = parseInt(divisions.textContent || '1')
    }

    // Reset time tracking for new measure if it's the first measure
    const measureNumber = measure.getAttribute('number')
    if (measureNumber === '1') {
      this.currentTime.clear()
    }

    notes.forEach(note => {
      const staffNumber = note.querySelector('staff')?.textContent || '1'
      const staffId = `${partId}-staff${staffNumber}`
      const voiceNumber = note.querySelector('voice')?.textContent || '1'
      const voiceId = `${partId}-voice${voiceNumber}`

      // Get or create staff
      if (!stavesMap.has(staffId)) {
        const clef = this.extractClefForStaff(measure, staffNumber)
        stavesMap.set(staffId, {
          id: staffId,
          clef,
          voices: [],
          name: `Staff ${staffNumber}`,
        })
      }

      const staff = stavesMap.get(staffId)!

      // Get or create voice
      let voice = staff.voices.find(v => v.id === voiceId)
      if (!voice) {
        voice = {
          id: voiceId,
          name: `Voice ${voiceNumber}`,
          notes: [],
          stemDirection: this.extractStemDirection(measure, voiceNumber),
        }
        staff.voices.push(voice)
      }

      // Initialize time tracking for this voice if needed
      if (!this.currentTime.has(voiceId)) {
        this.currentTime.set(voiceId, 0)
      }

      // Convert and add note
      const multiVoiceNote = this.convertNote(note, voiceId, staffId)
      if (multiVoiceNote) {
        voice.notes.push(multiVoiceNote)
      }
    })

    // Sort notes by time within each voice
    stavesMap.forEach(staff => {
      staff.voices.forEach(voice => {
        voice.notes.sort((a, b) => a.time - b.time)
      })
    })

    return Array.from(stavesMap.values())
  }

  /**
   * Extract clef for a specific staff
   */
  private extractClefForStaff(measure: Element, staffNumber: string): Clef {
    const attributes = measure.querySelector('attributes')
    if (!attributes) return Clef.TREBLE

    const clefs = attributes.querySelectorAll('clef')
    for (const clef of clefs) {
      const clefStaff = clef.getAttribute('number') || '1'
      if (clefStaff === staffNumber) {
        const sign = clef.querySelector('sign')?.textContent
        const line = clef.querySelector('line')?.textContent

        if (sign === 'G' && line === '2') return Clef.TREBLE
        if (sign === 'F' && line === '4') return Clef.BASS
        if (sign === 'C' && line === '3') return Clef.ALTO
        if (sign === 'C' && line === '4') return Clef.TENOR
      }
    }

    return Clef.TREBLE
  }

  /**
   * Extract stem direction preference for a voice
   */
  private extractStemDirection(
    measure: Element,
    voiceNumber: string
  ): 'up' | 'down' | 'auto' | undefined {
    // In MusicXML, stem direction is typically per-note, but we can infer a preference
    const notes = measure.querySelectorAll('note')
    let upCount = 0
    let downCount = 0

    notes.forEach(note => {
      const voice = note.querySelector('voice')?.textContent
      if (voice === voiceNumber) {
        const stem = note.querySelector('stem')?.textContent
        if (stem === 'up') upCount++
        else if (stem === 'down') downCount++
      }
    })

    if (upCount > downCount * 2) return 'up'
    if (downCount > upCount * 2) return 'down'
    return 'auto'
  }

  /**
   * Convert a MusicXML note to MultiVoiceNote
   */
  private convertNote(
    noteElement: Element,
    voiceId: string,
    staffId: string
  ): MultiVoiceNote | null {
    // Handle rests
    const isRest = noteElement.querySelector('rest') !== null

    // Get pitch or rest position
    let keys: string[] = []
    if (!isRest) {
      const pitch = noteElement.querySelector('pitch')
      if (!pitch) return null

      const step = pitch.querySelector('step')?.textContent
      const octave = pitch.querySelector('octave')?.textContent
      const alter = pitch.querySelector('alter')?.textContent

      if (!step || !octave) return null

      let key = step.toLowerCase()
      if (alter === '1') key += '#'
      else if (alter === '-1') key += 'b'
      key += '/' + octave

      keys = [key]
    } else {
      // For rests, use a default position
      keys = ['b/4']
    }

    // Get duration
    const duration = this.extractDuration(noteElement)
    if (!duration) return null

    // Get current time for this voice
    const time = this.currentTime.get(voiceId) || 0

    // Calculate duration in quarter notes for time tracking
    const durationElement = noteElement.querySelector('duration')
    let quarterNoteDuration = 0
    if (durationElement) {
      const durationValue = parseInt(durationElement.textContent || '0')
      quarterNoteDuration = durationValue / this.divisions
    }

    // Update time for next note (but not for chord notes)
    const isChord = noteElement.querySelector('chord') !== null
    if (!isChord) {
      this.currentTime.set(voiceId, time + quarterNoteDuration)
    }

    // Extract additional attributes
    const accidental = noteElement.querySelector('accidental')?.textContent
    const dots = noteElement.querySelectorAll('dot').length
    const stem = noteElement.querySelector('stem')?.textContent as
      | 'up'
      | 'down'
      | 'auto'
      | undefined
    const tieType = noteElement.querySelector('tie')?.getAttribute('type')

    // Create the note
    const multiVoiceNote: MultiVoiceNote = {
      keys,
      duration,
      time,
      voiceId,
      staffId,
      rest: isRest,
      accidental: accidental || undefined,
      dots: dots > 0 ? dots : undefined,
      stem,
      tie:
        tieType === 'start' ? 'start' : tieType === 'stop' ? 'stop' : undefined,
    }

    return multiVoiceNote
  }

  /**
   * Extract duration from a note element
   */
  private extractDuration(noteElement: Element): NoteDuration | null {
    const type = noteElement.querySelector('type')?.textContent

    switch (type) {
      case 'whole':
        return NoteDuration.WHOLE
      case 'half':
        return NoteDuration.HALF
      case 'quarter':
        return NoteDuration.QUARTER
      case 'eighth':
        return NoteDuration.EIGHTH
      case '16th':
        return NoteDuration.SIXTEENTH
      case '32nd':
        return NoteDuration.THIRTY_SECOND
      default:
        return null
    }
  }

  /**
   * Extract measure attributes
   */
  private extractMeasureAttributes(measure: Element): {
    timeSignature?: TimeSignature
    keySignature?: KeySignature
    tempo?: number
    dynamics?: DynamicMarking
    rehearsalMark?: string
    barLine?: BarLineType
    repeatCount?: number
    volta?: VoltaInfo
  } {
    const attributes: {
      timeSignature?: TimeSignature
      keySignature?: KeySignature
      tempo?: number
      dynamics?: DynamicMarking
      rehearsalMark?: string
      barLine?: BarLineType
      repeatCount?: number
      volta?: VoltaInfo
    } = {}

    // Time signature
    const time = measure.querySelector('attributes > time')
    if (time) {
      const beats = time.querySelector('beats')?.textContent
      const beatType = time.querySelector('beat-type')?.textContent
      if (beats && beatType) {
        const timeSig = `${beats}/${beatType}`
        // Map to our TimeSignature enum if it matches
        if (Object.values(TimeSignature).includes(timeSig as TimeSignature)) {
          attributes.timeSignature = timeSig as TimeSignature
        }
      }
    }

    // Key signature
    const key = measure.querySelector('attributes > key > fifths')
    if (key) {
      const fifths = parseInt(key.textContent || '0')
      attributes.keySignature = this.fifthsToKeySignature(fifths)
    }

    // Tempo
    const sound = measure.querySelector('sound')
    if (sound) {
      const tempo = sound.getAttribute('tempo')
      if (tempo) {
        attributes.tempo = parseInt(tempo)
      }
    }

    // Dynamics
    const dynamics = measure.querySelector('dynamics')
    if (dynamics) {
      const dynamicType = dynamics.firstElementChild?.tagName.toLowerCase()
      if (dynamicType) {
        attributes.dynamics = dynamicType as DynamicMarking
      }
    }

    // Rehearsal mark
    const rehearsal = measure.querySelector('rehearsal')
    if (rehearsal) {
      attributes.rehearsalMark = rehearsal.textContent || undefined
    }

    // Bar line
    const barline = measure.querySelector('barline')
    if (barline) {
      const barStyle = barline.querySelector('bar-style')?.textContent
      const repeat = barline.querySelector('repeat')

      if (repeat) {
        const direction = repeat.getAttribute('direction')
        if (direction === 'forward') attributes.barLine = 'repeat-start'
        else if (direction === 'backward') attributes.barLine = 'repeat-end'
      } else if (barStyle === 'light-light') {
        attributes.barLine = 'double'
      } else if (barStyle === 'light-heavy') {
        attributes.barLine = 'end'
      }
    }

    return attributes
  }

  /**
   * Convert fifths to key signature
   */
  private fifthsToKeySignature(fifths: number): KeySignature {
    const keyMap: Record<number, KeySignature> = {
      0: KeySignature.C_MAJOR,
      1: KeySignature.G_MAJOR,
      2: KeySignature.D_MAJOR,
      3: KeySignature.A_MAJOR,
      4: KeySignature.E_MAJOR,
      5: KeySignature.B_MAJOR,
      6: KeySignature.F_SHARP_MAJOR,
      7: KeySignature.C_SHARP_MAJOR,
      '-1': KeySignature.F_MAJOR,
      '-2': KeySignature.B_FLAT_MAJOR,
      '-3': KeySignature.E_FLAT_MAJOR,
      '-4': KeySignature.A_FLAT_MAJOR,
      '-5': KeySignature.D_FLAT_MAJOR,
      '-6': KeySignature.G_FLAT_MAJOR,
      '-7': KeySignature.C_FLAT_MAJOR,
    }

    return keyMap[fifths] || KeySignature.C_MAJOR
  }

  /**
   * Extract metadata
   */
  private extractMetadata(): ScoreMetadata {
    const encoding = this.doc.querySelector('encoding')
    const software = encoding?.querySelector('software')?.textContent
    const encodingDate =
      encoding?.querySelector('encoding-date')?.textContent || null

    return {
      createdAt: encodingDate ? new Date(encodingDate) : new Date(),
      modifiedAt: new Date(),
      source: 'MusicXML import',
      encodingSoftware: software || undefined,
      tags: ['imported', 'musicxml'],
    }
  }
}
