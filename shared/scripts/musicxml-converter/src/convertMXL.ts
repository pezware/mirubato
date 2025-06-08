#!/usr/bin/env node

/**
 * MXL to Multi-Voice Score Converter
 *
 * Converts MXL (compressed MusicXML) files to TypeScript Score format
 * using the multi-voice data model.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import yauzl from 'yauzl'
import { promisify } from 'util'
import { XMLParser } from 'fast-xml-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import types (we'll define them inline since we can't import from frontend)
interface Score {
  title: string
  composer: string
  arranger?: string
  copyright?: string
  parts: Part[]
  measures: MultiVoiceMeasure[]
  metadata: ScoreMetadata
}

interface Part {
  id: string
  name: string
  instrument: string
  staves: string[]
  midiProgram?: number
  volume?: number
  pan?: number
}

interface Staff {
  id: string
  clef: Clef
  voices: Voice[]
  name?: string
}

interface Voice {
  id: string
  name?: string
  stemDirection?: 'up' | 'down' | 'auto'
  notes: MultiVoiceNote[]
}

interface MultiVoiceNote {
  keys: string[]
  duration: NoteDuration
  time: number
  voiceId: string
  staffId?: string
  accidental?: string
  dots?: number
  stem?: 'up' | 'down' | 'auto'
  rest?: boolean
  tie?: 'start' | 'stop' | 'continue'
}

interface MultiVoiceMeasure {
  number: number
  staves: Staff[]
  timeSignature?: TimeSignature
  keySignature?: KeySignature
  tempo?: number
  dynamics?: DynamicMarking
  rehearsalMark?: string
  barLine?: BarLineType
  repeatCount?: number
  volta?: VoltaInfo
}

interface ScoreMetadata {
  createdAt: Date
  modifiedAt: Date
  source: string
  originalFilename?: string
  encodingSoftware?: string
  tags: string[]
  performanceNotes?: string
  difficulty?: number
  duration?: number
}

interface VoltaInfo {
  number: number
  endings: number[]
}

// Enums
enum Clef {
  TREBLE = 'treble',
  BASS = 'bass',
  ALTO = 'alto',
  TENOR = 'tenor',
}

enum NoteDuration {
  WHOLE = 'w',
  HALF = 'h',
  QUARTER = 'q',
  EIGHTH = '8',
  SIXTEENTH = '16',
  THIRTY_SECOND = '32',
}

enum TimeSignature {
  FOUR_FOUR = '4/4',
  THREE_FOUR = '3/4',
  TWO_FOUR = '2/4',
  SIX_EIGHT = '6/8',
  TWELVE_EIGHT = '12/8',
  THREE_EIGHT = '3/8',
  FIVE_FOUR = '5/4',
  SEVEN_EIGHT = '7/8',
  CUT_TIME = '2/2',
  COMMON_TIME = 'C',
}

enum KeySignature {
  C_MAJOR = 'C',
  G_MAJOR = 'G',
  D_MAJOR = 'D',
  A_MAJOR = 'A',
  E_MAJOR = 'E',
  B_MAJOR = 'B',
  F_SHARP_MAJOR = 'F#',
  C_SHARP_MAJOR = 'C#',
  F_MAJOR = 'F',
  B_FLAT_MAJOR = 'Bb',
  E_FLAT_MAJOR = 'Eb',
  A_FLAT_MAJOR = 'Ab',
  D_FLAT_MAJOR = 'Db',
  G_FLAT_MAJOR = 'Gb',
  C_FLAT_MAJOR = 'Cb',
  A_MINOR = 'Am',
  E_MINOR = 'Em',
  B_MINOR = 'Bm',
  F_SHARP_MINOR = 'F#m',
  C_SHARP_MINOR = 'C#m',
  G_SHARP_MINOR = 'G#m',
  D_SHARP_MINOR = 'D#m',
  A_SHARP_MINOR = 'A#m',
  D_MINOR = 'Dm',
  G_MINOR = 'Gm',
  C_MINOR = 'Cm',
  F_MINOR = 'Fm',
  B_FLAT_MINOR = 'Bbm',
  E_FLAT_MINOR = 'Ebm',
  A_FLAT_MINOR = 'Abm',
}

enum DynamicMarking {
  pppp = 'pppp',
  ppp = 'ppp',
  pp = 'pp',
  p = 'p',
  mp = 'mp',
  mf = 'mf',
  f = 'f',
  ff = 'ff',
  fff = 'fff',
  ffff = 'ffff',
  sfz = 'sfz',
  fp = 'fp',
}

type BarLineType =
  | 'single'
  | 'double'
  | 'end'
  | 'repeat-start'
  | 'repeat-end'
  | 'repeat-both'

/**
 * MusicXML to Score Converter
 * Based on the frontend converter but adapted for Node.js
 */
class MusicXMLToScoreConverter {
  private xmlData: any
  private divisions = 1
  private currentTime = new Map<string, number>()
  private parser: XMLParser

  constructor(xmlString: string) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTagValue: true,
      isArray: (tagName: string) => {
        // Force these tags to always be arrays
        return ['part', 'measure', 'note', 'score-part', 'creator'].includes(
          tagName
        )
      },
    })

    this.xmlData = this.parser.parse(xmlString)

    // Debug: log the top-level keys (uncomment for debugging)
    // console.log('   Top-level XML keys:', Object.keys(this.xmlData))

    if (!this.xmlData['score-partwise'] && !this.xmlData['score-timewise']) {
      throw new Error(
        'Invalid MusicXML: must be score-partwise or score-timewise format'
      )
    }

    // If it's score-timewise, we'll need to convert it to partwise format
    if (this.xmlData['score-timewise']) {
      console.log(
        '   Converting from score-timewise to score-partwise format...'
      )
      this.xmlData = this.convertTimewiseToPartwise(this.xmlData)
    }
  }

  /**
   * Convert score-timewise format to score-partwise format
   */
  private convertTimewiseToPartwise(timewiseData: any): any {
    const timewise = timewiseData['score-timewise']

    // Create partwise structure
    const partwise = {
      'score-partwise': {
        work: timewise.work,
        identification: timewise.identification,
        encoding: timewise.encoding,
        'movement-title': timewise['movement-title'],
        'part-list': timewise['part-list'],
        part: [],
      },
    }

    // Get all parts from part-list
    const partList = timewise['part-list']
    const scoreParts = Array.isArray(partList['score-part'])
      ? partList['score-part']
      : [partList['score-part']]

    // Initialize parts
    const partsMap = new Map()
    scoreParts.forEach((scorePart: any) => {
      const partId = scorePart['@_id']
      partsMap.set(partId, {
        '@_id': partId,
        measure: [],
      })
    })

    // Convert measures from timewise to partwise
    const measures = Array.isArray(timewise.measure)
      ? timewise.measure
      : [timewise.measure]

    measures.forEach((measure: any) => {
      const measureNumber = measure['@_number']
      const parts = Array.isArray(measure.part) ? measure.part : [measure.part]

      parts.forEach((part: any) => {
        const partId = part['@_id']
        if (partsMap.has(partId)) {
          const targetPart = partsMap.get(partId)
          targetPart.measure.push({
            '@_number': measureNumber,
            ...part,
            '@_id': undefined, // Remove the id from the measure
          })
        }
      })
    })

    // Add parts to partwise structure
    ;(partwise['score-partwise'] as any).part = Array.from(partsMap.values())

    return partwise
  }

  convert(): Score {
    const scoreData = this.xmlData['score-partwise']

    return {
      title: this.extractTitle(scoreData),
      composer: this.extractComposer(scoreData),
      arranger: this.extractArranger(scoreData),
      copyright: this.extractCopyright(scoreData),
      parts: this.extractParts(scoreData),
      measures: this.extractMeasures(scoreData),
      metadata: this.extractMetadata(scoreData),
    }
  }

  private extractTitle(scoreData: any): string {
    if (scoreData.work?.['work-title']) {
      return scoreData.work['work-title']
    }
    if (scoreData['movement-title']) {
      return scoreData['movement-title']
    }
    return 'Untitled'
  }

  private extractComposer(scoreData: any): string {
    if (scoreData.identification?.creator) {
      const creators = Array.isArray(scoreData.identification.creator)
        ? scoreData.identification.creator
        : [scoreData.identification.creator]

      const composer = creators.find((c: any) => c['@_type'] === 'composer')
      if (composer) {
        return composer['#text'] || 'Unknown'
      }
    }
    return 'Unknown'
  }

  private extractArranger(scoreData: any): string | undefined {
    if (scoreData.identification?.creator) {
      const creators = Array.isArray(scoreData.identification.creator)
        ? scoreData.identification.creator
        : [scoreData.identification.creator]

      const arranger = creators.find((c: any) => c['@_type'] === 'arranger')
      if (arranger) {
        return arranger['#text']
      }
    }
    return undefined
  }

  private extractCopyright(scoreData: any): string | undefined {
    return scoreData.identification?.rights || undefined
  }

  private extractParts(scoreData: any): Part[] {
    const parts: Part[] = []
    const partList = scoreData['part-list']

    if (!partList?.['score-part']) {
      throw new Error('Invalid MusicXML: missing part-list')
    }

    const scoreParts = Array.isArray(partList['score-part'])
      ? partList['score-part']
      : [partList['score-part']]

    scoreParts.forEach((scorePart: any) => {
      const id = scorePart['@_id']
      if (!id) return

      const partNameRaw = scorePart['part-name']
      const partName =
        typeof partNameRaw === 'string'
          ? partNameRaw
          : typeof partNameRaw === 'object' && partNameRaw['#text']
            ? partNameRaw['#text']
            : id
      const instrument = this.extractInstrumentFromPart(scorePart)
      const staves = this.extractStavesForPart(scoreData, id)

      const midiInstrument = scorePart['midi-instrument']
      const midiProgram = midiInstrument?.['midi-program']
      const volume = midiInstrument?.volume
      const pan = midiInstrument?.pan

      parts.push({
        id,
        name: partName,
        instrument,
        staves,
        midiProgram: midiProgram ? parseInt(midiProgram) - 1 : undefined,
        volume: volume ? Math.round(parseFloat(volume) * 1.27) : undefined,
        pan: pan ? Math.round(parseFloat(pan) * 0.64 - 64) : undefined,
      })
    })

    return parts
  }

  private extractInstrumentFromPart(scorePart: any): string {
    const instrumentName = scorePart['score-instrument']?.['instrument-name']
    const partName = scorePart['part-name']
    const partNameStr =
      typeof partName === 'string'
        ? partName.toLowerCase()
        : typeof partName === 'object' && partName['#text']
          ? partName['#text'].toLowerCase()
          : ''

    if (instrumentName) {
      const instNameStr =
        typeof instrumentName === 'string'
          ? instrumentName
          : typeof instrumentName === 'object' && instrumentName['#text']
            ? instrumentName['#text']
            : instrumentName.toString()
      return instNameStr.toLowerCase()
    }

    if (partNameStr.includes('piano')) return 'piano'
    if (partNameStr.includes('guitar')) return 'guitar'
    if (partNameStr.includes('violin')) return 'violin'
    if (partNameStr.includes('voice')) return 'voice'

    return 'unknown'
  }

  private extractStavesForPart(scoreData: any, partId: string): string[] {
    const parts = Array.isArray(scoreData.part)
      ? scoreData.part
      : [scoreData.part]
    const part = parts.find((p: any) => p['@_id'] === partId)
    if (!part) return []

    const staves = new Set<string>()
    const measures = Array.isArray(part.measure) ? part.measure : [part.measure]

    measures.forEach((measure: any) => {
      if (measure.note) {
        const notes = Array.isArray(measure.note)
          ? measure.note
          : [measure.note]
        notes.forEach((note: any) => {
          const staffNumber = note.staff || 1
          staves.add(`${partId}-staff${staffNumber}`)
        })
      }
    })

    if (staves.size === 0) {
      staves.add(`${partId}-staff1`)
    }

    return Array.from(staves)
  }

  private extractMeasures(scoreData: any): MultiVoiceMeasure[] {
    const measures: MultiVoiceMeasure[] = []
    const parts = Array.isArray(scoreData.part)
      ? scoreData.part
      : [scoreData.part]
    const firstPart = parts[0]

    if (!firstPart) {
      throw new Error('Invalid MusicXML: no parts found')
    }

    const measureElements = Array.isArray(firstPart.measure)
      ? firstPart.measure
      : [firstPart.measure]

    measureElements.forEach((_: any, index: number) => {
      measures.push(this.extractMeasure(scoreData, index + 1))
    })

    return measures
  }

  private extractMeasure(
    scoreData: any,
    measureNumber: number
  ): MultiVoiceMeasure {
    const staves: Staff[] = []
    const parts = Array.isArray(scoreData.part)
      ? scoreData.part
      : [scoreData.part]

    let timeSignature: TimeSignature | undefined
    let keySignature: KeySignature | undefined
    let tempo: number | undefined
    let dynamics: DynamicMarking | undefined
    let rehearsalMark: string | undefined
    let barLine: BarLineType | undefined

    parts.forEach((part: any) => {
      const partId = part['@_id']
      if (!partId) return

      const measures = Array.isArray(part.measure)
        ? part.measure
        : [part.measure]
      const measure = measures[measureNumber - 1]
      if (!measure) return

      // Extract attributes from first part
      if (staves.length === 0 && measure.attributes) {
        const attributes = this.extractMeasureAttributes(measure)
        timeSignature = attributes.timeSignature
        keySignature = attributes.keySignature
        tempo = attributes.tempo
        dynamics = attributes.dynamics
        rehearsalMark = attributes.rehearsalMark
        barLine = attributes.barLine
      }

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
    }
  }

  private extractStavesFromMeasure(measure: any, partId: string): Staff[] {
    const stavesMap = new Map<string, Staff>()

    if (measure.attributes?.divisions) {
      this.divisions = parseInt(measure.attributes.divisions)
    }

    if (!measure.note) return []

    const notes = Array.isArray(measure.note) ? measure.note : [measure.note]

    notes.forEach((note: any) => {
      const staffNumber = note.staff || 1
      const staffId = `${partId}-staff${staffNumber}`
      const voiceNumber = note.voice || 1
      const voiceId = `${partId}-voice${voiceNumber}`

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
      let voice = staff.voices.find(v => v.id === voiceId)

      if (!voice) {
        voice = {
          id: voiceId,
          name: `Voice ${voiceNumber}`,
          notes: [],
          stemDirection: this.extractStemDirection(notes, voiceNumber),
        }
        staff.voices.push(voice)
      }

      if (!this.currentTime.has(voiceId)) {
        this.currentTime.set(voiceId, 0)
      }

      const multiVoiceNote = this.convertNote(note, voiceId, staffId)
      if (multiVoiceNote) {
        voice.notes.push(multiVoiceNote)
      }
    })

    stavesMap.forEach(staff => {
      staff.voices.forEach(voice => {
        voice.notes.sort((a, b) => a.time - b.time)
      })
    })

    return Array.from(stavesMap.values())
  }

  private extractClefForStaff(measure: any, staffNumber: number): Clef {
    if (!measure.attributes?.clef) return Clef.TREBLE

    const clefs = Array.isArray(measure.attributes.clef)
      ? measure.attributes.clef
      : [measure.attributes.clef]

    for (const clef of clefs) {
      const clefStaff = clef['@_number'] || 1
      if (clefStaff === staffNumber) {
        const sign = clef.sign
        const line = clef.line

        if (sign === 'G' && line === 2) return Clef.TREBLE
        if (sign === 'F' && line === 4) return Clef.BASS
        if (sign === 'C' && line === 3) return Clef.ALTO
        if (sign === 'C' && line === 4) return Clef.TENOR
      }
    }

    return Clef.TREBLE
  }

  private extractStemDirection(
    notes: any[],
    voiceNumber: number
  ): 'up' | 'down' | 'auto' {
    let upCount = 0
    let downCount = 0

    notes.forEach(note => {
      if (note.voice === voiceNumber) {
        if (note.stem === 'up') upCount++
        else if (note.stem === 'down') downCount++
      }
    })

    if (upCount > downCount * 2) return 'up'
    if (downCount > upCount * 2) return 'down'
    return 'auto'
  }

  private convertNote(
    noteData: any,
    voiceId: string,
    staffId: string
  ): MultiVoiceNote | null {
    const isRest = noteData.rest !== undefined

    let keys: string[] = []
    if (!isRest && noteData.pitch) {
      const step = noteData.pitch.step.toLowerCase()
      const octave = noteData.pitch.octave
      const alter = noteData.pitch.alter

      let key = step
      if (alter === 1) key += '#'
      else if (alter === -1) key += 'b'
      key += '/' + octave

      keys = [key]
    } else if (isRest) {
      keys = ['b/4']
    }

    const duration = this.extractDuration(noteData)
    if (!duration) return null

    const time = this.currentTime.get(voiceId) || 0

    let quarterNoteDuration = 0
    if (noteData.duration) {
      quarterNoteDuration = noteData.duration / this.divisions
    }

    const isChord = noteData.chord !== undefined
    if (!isChord) {
      this.currentTime.set(voiceId, time + quarterNoteDuration)
    }

    const dots = noteData.dot
      ? Array.isArray(noteData.dot)
        ? noteData.dot.length
        : 1
      : 0
    const tieData = noteData.tie
    let tie: 'start' | 'stop' | 'continue' | undefined

    if (tieData) {
      const tieType = Array.isArray(tieData)
        ? tieData[0]['@_type']
        : tieData['@_type']
      tie =
        tieType === 'start' ? 'start' : tieType === 'stop' ? 'stop' : undefined
    }

    return {
      keys,
      duration,
      time,
      voiceId,
      staffId,
      rest: isRest,
      accidental: noteData.accidental || undefined,
      dots: dots > 0 ? dots : undefined,
      stem: noteData.stem,
      tie,
    }
  }

  private extractDuration(noteData: any): NoteDuration | null {
    const type = noteData.type

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

  private extractMeasureAttributes(measure: any): {
    timeSignature?: TimeSignature
    keySignature?: KeySignature
    tempo?: number
    dynamics?: DynamicMarking
    rehearsalMark?: string
    barLine?: BarLineType
  } {
    const attributes: any = {}

    if (measure.attributes?.time) {
      const time = measure.attributes.time
      const timeSig = `${time.beats}/${time['beat-type']}`
      if (Object.values(TimeSignature).includes(timeSig as TimeSignature)) {
        attributes.timeSignature = timeSig as TimeSignature
      }
    }

    if (measure.attributes?.key?.fifths !== undefined) {
      attributes.keySignature = this.fifthsToKeySignature(
        measure.attributes.key.fifths
      )
    }

    if (measure.sound?.['@_tempo']) {
      attributes.tempo = parseInt(measure.sound['@_tempo'])
    }

    if (measure.direction?.sound?.['@_tempo']) {
      attributes.tempo = parseInt(measure.direction.sound['@_tempo'])
    }

    if (measure.direction?.['direction-type']?.dynamics) {
      const dynamics = measure.direction['direction-type'].dynamics
      const dynamicType = Object.keys(dynamics)[0]
      if (
        dynamicType &&
        Object.values(DynamicMarking).includes(dynamicType as DynamicMarking)
      ) {
        attributes.dynamics = dynamicType as DynamicMarking
      }
    }

    if (measure.direction?.['direction-type']?.rehearsal) {
      attributes.rehearsalMark = measure.direction['direction-type'].rehearsal
    }

    if (measure.barline) {
      const barline = measure.barline
      const repeat = barline.repeat

      if (repeat) {
        if (repeat['@_direction'] === 'forward')
          attributes.barLine = 'repeat-start'
        else if (repeat['@_direction'] === 'backward')
          attributes.barLine = 'repeat-end'
      } else if (barline['bar-style'] === 'light-light') {
        attributes.barLine = 'double'
      } else if (barline['bar-style'] === 'light-heavy') {
        attributes.barLine = 'end'
      }
    }

    return attributes
  }

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

  private extractMetadata(scoreData: any): ScoreMetadata {
    const encoding = scoreData.identification?.encoding
    const software = encoding?.software
    const encodingDate = encoding?.['encoding-date']

    return {
      createdAt: encodingDate ? new Date(encodingDate) : new Date(),
      modifiedAt: new Date(),
      source: 'MusicXML import',
      encodingSoftware: software || undefined,
      tags: ['imported', 'musicxml', 'multi-voice'],
    }
  }
}

// Helper to read MXL files
async function readMXLFile(filepath: string): Promise<string> {
  // First, get the list of files and find the main score file
  const mainScoreFile = await findMainScoreFile(filepath)

  // Then read the main score file
  return await readFileFromZip(filepath, mainScoreFile)
}

// Find the main score file in the MXL archive
async function findMainScoreFile(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(filepath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err)
        return
      }

      if (!zipfile) {
        reject(new Error('Failed to open zip file'))
        return
      }

      let mainScoreFile = ''
      const entries: string[] = []

      zipfile.on('entry', (entry: any) => {
        entries.push(entry.fileName)

        // If this is the container file, read it to find the main score
        if (entry.fileName === 'META-INF/container.xml') {
          zipfile.openReadStream(
            entry,
            (streamErr: Error | null, readStream: any) => {
              if (streamErr) {
                zipfile.close()
                reject(streamErr)
                return
              }

              let data = ''
              readStream.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              readStream.on('end', () => {
                try {
                  const parser = new XMLParser({
                    ignoreAttributes: false,
                    attributeNamePrefix: '@_',
                  })
                  const container = parser.parse(data)
                  const rootFiles = container.container?.rootfiles?.rootfile
                  if (rootFiles) {
                    const rootFile = Array.isArray(rootFiles)
                      ? rootFiles[0]
                      : rootFiles
                    mainScoreFile = rootFile['@_full-path']
                    console.log(`   Found main score file: ${mainScoreFile}`)
                  }
                } catch (parseError) {
                  // Continue reading other entries
                }
                zipfile.readEntry()
              })
            }
          )
        } else {
          zipfile.readEntry()
        }
      })

      zipfile.on('end', () => {
        zipfile.close()

        if (mainScoreFile) {
          resolve(mainScoreFile)
        } else {
          // Fallback: find any XML file that's not in META-INF
          const scoreFile = entries.find(
            filename =>
              filename.endsWith('.xml') && !filename.includes('META-INF/')
          )

          if (scoreFile) {
            console.log(`   Using fallback score file: ${scoreFile}`)
            resolve(scoreFile)
          } else {
            reject(new Error('No MusicXML score file found'))
          }
        }
      })

      zipfile.on('error', reject)
      zipfile.readEntry()
    })
  })
}

// Read a specific file from the zip archive
async function readFileFromZip(
  filepath: string,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(filepath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err)
        return
      }

      if (!zipfile) {
        reject(new Error('Failed to open zip file'))
        return
      }

      zipfile.on('entry', (entry: any) => {
        if (entry.fileName === filename) {
          zipfile.openReadStream(
            entry,
            (streamErr: Error | null, readStream: any) => {
              if (streamErr) {
                zipfile.close()
                reject(streamErr)
                return
              }

              let data = ''
              readStream.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              readStream.on('end', () => {
                zipfile.close()
                resolve(data)
              })
              readStream.on('error', (readError: Error) => {
                zipfile.close()
                reject(readError)
              })
            }
          )
        } else {
          zipfile.readEntry()
        }
      })

      zipfile.on('end', () => {
        zipfile.close()
        reject(new Error(`File ${filename} not found in archive`))
      })

      zipfile.on('error', reject)
      zipfile.readEntry()
    })
  })
}

// Generate TypeScript file content
function generateTypeScriptFile(score: Score, varName: string): string {
  // Convert the score object to a string with proper formatting
  const scoreString = JSON.stringify(
    score,
    (key, value) => {
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        return value.toISOString()
      }
      // Convert enum values to their string representation
      if (
        key === 'clef' ||
        key === 'duration' ||
        key === 'timeSignature' ||
        key === 'keySignature' ||
        key === 'dynamics'
      ) {
        return value
      }
      return value
    },
    2
  )

  // Replace enum string values with enum references
  const formattedScore = scoreString
    .replace(/"clef": "(\w+)"/g, '"clef": Clef.$1')
    .replace(/"duration": "(\w+)"/g, '"duration": NoteDuration.$1')
    .replace(/"timeSignature": "([^"]+)"/g, (match, value) => {
      const enumKey = Object.entries(TimeSignature).find(
        ([_, v]) => v === value
      )?.[0]
      return enumKey ? `"timeSignature": TimeSignature.${enumKey}` : match
    })
    .replace(/"keySignature": "([^"]+)"/g, (match, value) => {
      const enumKey = Object.entries(KeySignature).find(
        ([_, v]) => v === value
      )?.[0]
      return enumKey ? `"keySignature": KeySignature.${enumKey}` : match
    })
    .replace(/"dynamics": "(\w+)"/g, '"dynamics": DynamicMarking.$1')
    .replace(
      /"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"/g,
      'new Date("$1")'
    )

  return `/**
 * ${score.title}
 * Composer: ${score.composer}${score.arranger ? `\n * Arranger: ${score.arranger}` : ''}${score.copyright ? `\n * Copyright: ${score.copyright}` : ''}
 * 
 * Converted from MusicXML using multi-voice converter
 * Generated on: ${new Date().toISOString()}
 */

import type { Score } from '../../../modules/sheetMusic/multiVoiceTypes'
import { 
  Clef, 
  NoteDuration, 
  TimeSignature, 
  KeySignature,
  DynamicMarking 
} from '../../../modules/sheetMusic/types'

export const ${varName}: Score = ${formattedScore}
`
}

// Main conversion function
async function convertMXLFile(
  inputPath: string,
  outputDir: string
): Promise<void> {
  try {
    console.log(`\n📄 Converting ${basename(inputPath)}...`)

    // Read the MXL file
    const xmlContent = await readMXLFile(inputPath)

    // Convert to Score format
    const converter = new MusicXMLToScoreConverter(xmlContent)
    const score = converter.convert()

    // Generate variable name from filename
    const baseName = basename(inputPath, '.mxl')
    const cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

    // Generate TypeScript content
    const tsContent = generateTypeScriptFile(score, cleanName)

    // Write files
    const outputPath = join(outputDir, `${cleanName}.ts`)
    const jsonPath = join(outputDir, `${cleanName}.json`)

    writeFileSync(outputPath, tsContent)
    writeFileSync(jsonPath, JSON.stringify(score, null, 2))

    console.log(`   ✅ Generated ${basename(outputPath)}`)
    console.log(`   ✅ Generated ${basename(jsonPath)}`)
    console.log(
      `   📊 ${score.measures.length} measures, ${score.parts.length} parts`
    )
  } catch (error) {
    console.error(`   ❌ Error converting ${basename(inputPath)}:`, error)
    throw error
  }
}

// Main function
async function main() {
  const sourceDir = '/Users/arbeitandy/src/others/musetrainer-library/scores'
  const outputDir = join(__dirname, '..', 'output')

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Files to convert
  const files = [
    'Bach_Minuet_in_G_Major_BWV_Anh._114.mxl',
    'Mozart_-_Piano_Sonata_No._16_-_Allegro.mxl',
    'Prlude_Opus_28_No._4_in_E_Minor__Chopin.mxl',
  ]

  console.log('🎵 MusicXML to Multi-Voice Score Converter')
  console.log('=========================================')
  console.log(`Source: ${sourceDir}`)
  console.log(`Output: ${outputDir}`)

  for (const file of files) {
    const inputPath = join(sourceDir, file)

    if (!existsSync(inputPath)) {
      console.error(`\n❌ File not found: ${file}`)
      continue
    }

    try {
      await convertMXLFile(inputPath, outputDir)
    } catch (error) {
      // Error already logged in convertMXLFile
    }
  }

  console.log('\n✨ Conversion complete!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { convertMXLFile, MusicXMLToScoreConverter }
