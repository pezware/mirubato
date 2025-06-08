/**
 * Multi-Voice MusicXML Converter
 *
 * Converts MusicXML files to the new multi-voice Score format
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import yauzl from 'yauzl'
import { promisify } from 'util'

// We'll need to copy the converter logic from frontend since we can't import it directly
// This is a standalone script that generates the conversion

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  clef: string
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
  duration: string
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
  timeSignature?: string
  keySignature?: string
  tempo?: number
  barLine?: string
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

class MultiVoiceMusicXMLConverter {
  private doc: Document
  private divisions = 1
  private currentTime = new Map<string, number>()

  constructor(xmlString: string) {
    // Simple XML parsing without DOMParser (using regex for this script)
    this.doc = this.parseXML(xmlString)
  }

  // Simplified XML parsing for Node.js environment
  private parseXML(xmlString: string): Document {
    // This is a placeholder - in a real implementation, we'd use a proper XML parser
    // For now, we'll use fast-xml-parser which is already a dependency
    const parser = require('fast-xml-parser')
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTrueNumberOnly: true,
    }
    const parsed = parser.parse(xmlString, options)
    return parsed as any
  }

  convert(): Score {
    const scoreData = (this.doc as any)['score-partwise']
    if (!scoreData) {
      throw new Error('Not a valid MusicXML score-partwise document')
    }

    const title = this.extractTitle(scoreData)
    const composer = this.extractComposer(scoreData)
    const parts = this.extractParts(scoreData)
    const measures = this.extractMeasures(scoreData, parts)

    return {
      title,
      composer,
      parts,
      measures,
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        source: 'MusicXML import',
        tags: ['converted', 'musicxml', 'multi-voice'],
      },
    }
  }

  private extractTitle(scoreData: any): string {
    const work = scoreData.work
    if (work && work['work-title']) {
      return work['work-title']
    }
    const movement = scoreData['movement-title']
    if (movement) {
      return movement
    }
    return 'Untitled Score'
  }

  private extractComposer(scoreData: any): string {
    const identification = scoreData.identification
    if (identification && identification.creator) {
      const creators = Array.isArray(identification.creator)
        ? identification.creator
        : [identification.creator]
      const composer = creators.find((c: any) => c['@_type'] === 'composer')
      if (composer) {
        return composer['#text'] || 'Unknown Composer'
      }
    }
    return 'Unknown Composer'
  }

  private extractParts(scoreData: any): Part[] {
    const partList = scoreData['part-list']
    if (!partList || !partList['score-part']) {
      return []
    }

    const scoreParts = Array.isArray(partList['score-part'])
      ? partList['score-part']
      : [partList['score-part']]

    return scoreParts.map((scorePart: any) => ({
      id: scorePart['@_id'],
      name: scorePart['part-name'] || 'Part',
      instrument: this.detectInstrument(scorePart),
      staves: this.detectStaves(scorePart),
    }))
  }

  private detectInstrument(scorePart: any): string {
    if (scorePart['score-instrument']) {
      const instrument = scorePart['score-instrument']
      const name = instrument['instrument-name']
      if (name) {
        return name.toLowerCase().includes('piano') ? 'piano' : 'unknown'
      }
    }
    return 'piano' // Default to piano
  }

  private detectStaves(scorePart: any): string[] {
    // For piano, typically we have treble and bass staves
    return ['treble', 'bass']
  }

  private extractMeasures(scoreData: any, parts: Part[]): MultiVoiceMeasure[] {
    const partData = scoreData.part
    if (!partData) {
      return []
    }

    // For simplicity, we'll process the first part's measures
    const firstPart = Array.isArray(partData) ? partData[0] : partData
    const xmlMeasures = Array.isArray(firstPart.measure)
      ? firstPart.measure
      : [firstPart.measure]

    return xmlMeasures.map((xmlMeasure: any, index: number) =>
      this.convertMeasure(xmlMeasure, index + 1)
    )
  }

  private convertMeasure(
    xmlMeasure: any,
    measureNumber: number
  ): MultiVoiceMeasure {
    const attributes = xmlMeasure.attributes
    const notes = Array.isArray(xmlMeasure.note)
      ? xmlMeasure.note
      : xmlMeasure.note
        ? [xmlMeasure.note]
        : []

    // Group notes by staff and voice
    const trebleNotes: MultiVoiceNote[] = []
    const bassNotes: MultiVoiceNote[] = []

    notes.forEach((xmlNote: any) => {
      const staff = xmlNote.staff || 1
      const voice = xmlNote.voice || 1
      const note = this.convertNote(xmlNote, voice.toString())

      if (staff === 1) {
        trebleNotes.push(note)
      } else {
        bassNotes.push(note)
      }
    })

    const staves: Staff[] = []

    // Add treble staff if it has notes
    if (trebleNotes.length > 0) {
      staves.push({
        id: 'treble',
        clef: 'treble',
        voices: [
          {
            id: 'rightHand',
            name: 'Right Hand',
            notes: trebleNotes,
          },
        ],
      })
    }

    // Add bass staff if it has notes
    if (bassNotes.length > 0) {
      staves.push({
        id: 'bass',
        clef: 'bass',
        voices: [
          {
            id: 'leftHand',
            name: 'Left Hand',
            notes: bassNotes,
          },
        ],
      })
    }

    return {
      number: measureNumber,
      staves,
      timeSignature: attributes?.time
        ? `${attributes.time.beats}/${attributes.time['beat-type']}`
        : undefined,
      keySignature: attributes?.key
        ? this.convertKeySignature(attributes.key)
        : undefined,
      tempo: xmlMeasure.direction?.sound?.['@_tempo'] || undefined,
    }
  }

  private convertNote(xmlNote: any, voiceId: string): MultiVoiceNote {
    const pitch = xmlNote.pitch
    const isRest = !pitch && xmlNote.rest

    let keys: string[] = []
    if (pitch) {
      const step = pitch.step.toLowerCase()
      const octave = pitch.octave
      const alter = pitch.alter
      let noteString = step
      if (alter === 1) noteString += '#'
      else if (alter === -1) noteString += 'b'
      noteString += '/' + octave
      keys = [noteString]
    } else if (isRest) {
      keys = ['b/4'] // Default rest position
    }

    const duration = this.convertDuration(xmlNote.duration, xmlNote.type)

    return {
      keys,
      duration,
      time: 0, // Will be calculated later
      voiceId: voiceId === '1' ? 'rightHand' : 'leftHand',
      rest: isRest,
      dots: xmlNote.dot ? 1 : 0,
      stem: xmlNote.stem,
    }
  }

  private convertDuration(divisions: number, noteType: string): string {
    const durationMap: Record<string, string> = {
      whole: 'w',
      half: 'h',
      quarter: 'q',
      eighth: '8',
      '16th': '16',
      '32nd': '32',
    }
    return durationMap[noteType] || 'q'
  }

  private convertKeySignature(key: any): string {
    const fifths = key.fifths || 0
    const mode = key.mode || 'major'

    const keyMap: Record<number, Record<string, string>> = {
      0: { major: 'C major', minor: 'A minor' },
      1: { major: 'G major', minor: 'E minor' },
      2: { major: 'D major', minor: 'B minor' },
      3: { major: 'A major', minor: 'F# minor' },
      4: { major: 'E major', minor: 'C# minor' },
      5: { major: 'B major', minor: 'G# minor' },
      '-1': { major: 'F major', minor: 'D minor' },
      '-2': { major: 'Bb major', minor: 'G minor' },
      '-3': { major: 'Eb major', minor: 'C minor' },
      '-4': { major: 'Ab major', minor: 'F minor' },
      '-5': { major: 'Db major', minor: 'Bb minor' },
    }

    return keyMap[fifths]?.[mode] || 'C major'
  }
}

// Helper to read MXL (compressed MusicXML) files
async function readMXLFile(filepath: string): Promise<string> {
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

      let xmlContent = ''

      zipfile.on('entry', (entry: any) => {
        if (entry.fileName.endsWith('.xml')) {
          zipfile.openReadStream(
            entry,
            (streamErr: Error | null, readStream: any) => {
              if (streamErr) {
                reject(streamErr)
                return
              }

              let data = ''
              readStream.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              readStream.on('end', () => {
                xmlContent = data
                zipfile.close()
              })
            }
          )
        } else {
          zipfile.readEntry()
        }
      })

      zipfile.on('close', () => {
        resolve(xmlContent)
      })

      zipfile.on('error', (zipErr: Error) => {
        reject(zipErr)
      })

      zipfile.readEntry()
    })
  })
}

// Main conversion function
export async function convertMusicXMLToMultiVoice(
  inputPath: string,
  outputPath?: string
) {
  try {
    // Read the file
    let xmlContent: string

    if (inputPath.endsWith('.mxl')) {
      xmlContent = await readMXLFile(inputPath)
    } else if (inputPath.endsWith('.xml')) {
      xmlContent = readFileSync(inputPath, 'utf-8')
    } else {
      throw new Error('Input file must be .xml or .mxl')
    }

    // Convert to multi-voice format
    const converter = new MultiVoiceMusicXMLConverter(xmlContent)
    const score = converter.convert()

    // Generate output filename
    const baseName = basename(
      inputPath,
      inputPath.endsWith('.mxl') ? '.mxl' : '.xml'
    )
    const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    if (!outputPath) {
      outputPath = join(dirname(inputPath), `${cleanName}-multivoice.ts`)
    }

    // Generate TypeScript content
    const tsContent = generateTypeScriptFile(score, cleanName)

    // Write files
    writeFileSync(outputPath, tsContent)
    writeFileSync(
      outputPath.replace('.ts', '.json'),
      JSON.stringify(score, null, 2)
    )

    console.log(`✅ Converted ${inputPath} to ${outputPath}`)

    return score
  } catch (error) {
    console.error('Conversion error:', error)
    throw error
  }
}

function generateTypeScriptFile(score: Score, varName: string): string {
  return `/**
 * ${score.title}
 * Composer: ${score.composer}
 * Converted from MusicXML using multi-voice converter
 */

import type { Score } from '../../modules/sheetMusic/multiVoiceTypes'
import { Clef, NoteDuration, TimeSignature } from '../../modules/sheetMusic/types'

export const ${varName}_multivoice: Score = ${JSON.stringify(score, null, 2)};
`
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: node multiVoiceConverter.js <input-file> [output-file]')
    process.exit(1)
  }

  convertMusicXMLToMultiVoice(args[0], args[1]).catch(error => {
    console.error('Conversion failed:', error)
    process.exit(1)
  })
}
