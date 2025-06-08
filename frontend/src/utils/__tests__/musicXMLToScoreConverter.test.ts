/**
 * Tests for MusicXML to Score Converter
 */

import { MusicXMLToScoreConverter } from '../musicXMLToScoreConverter'
import {
  Clef,
  KeySignature,
  TimeSignature,
  NoteDuration,
} from '../../modules/sheetMusic/types'

describe('MusicXMLToScoreConverter', () => {
  describe('Basic Conversion', () => {
    it('should convert a simple single-voice MusicXML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <work>
            <work-title>Test Piece</work-title>
          </work>
          <identification>
            <creator type="composer">Test Composer</creator>
          </identification>
          <part-list>
            <score-part id="P1">
              <part-name>Piano</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <attributes>
                <divisions>1</divisions>
                <key>
                  <fifths>0</fifths>
                </key>
                <time>
                  <beats>4</beats>
                  <beat-type>4</beat-type>
                </time>
                <clef>
                  <sign>G</sign>
                  <line>2</line>
                </clef>
              </attributes>
              <note>
                <pitch>
                  <step>C</step>
                  <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.title).toBe('Test Piece')
      expect(score.composer).toBe('Test Composer')
      expect(score.parts).toHaveLength(1)
      expect(score.parts[0].name).toBe('Piano')
      expect(score.measures).toHaveLength(1)

      const measure = score.measures[0]
      expect(measure.timeSignature).toBe(TimeSignature.FOUR_FOUR)
      expect(measure.keySignature).toBe(KeySignature.C_MAJOR)
      expect(measure.staves).toHaveLength(1)
      expect(measure.staves[0].clef).toBe(Clef.TREBLE)
    })

    it('should handle multi-voice MusicXML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <work>
            <work-title>Two Voice Test</work-title>
          </work>
          <identification>
            <creator type="composer">Test Composer</creator>
          </identification>
          <part-list>
            <score-part id="P1">
              <part-name>Piano</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <attributes>
                <divisions>1</divisions>
                <key>
                  <fifths>0</fifths>
                </key>
                <time>
                  <beats>4</beats>
                  <beat-type>4</beat-type>
                </time>
                <clef>
                  <sign>G</sign>
                  <line>2</line>
                </clef>
              </attributes>
              <note>
                <pitch>
                  <step>E</step>
                  <octave>5</octave>
                </pitch>
                <duration>1</duration>
                <voice>1</voice>
                <type>quarter</type>
                <stem>up</stem>
              </note>
              <note>
                <pitch>
                  <step>C</step>
                  <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <voice>2</voice>
                <type>quarter</type>
                <stem>down</stem>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      const staff = score.measures[0].staves[0]
      expect(staff.voices).toHaveLength(2)
      expect(staff.voices[0].id).toBe('P1-voice1')
      expect(staff.voices[1].id).toBe('P1-voice2')
      expect(staff.voices[0].notes[0].keys).toEqual(['e/5'])
      expect(staff.voices[1].notes[0].keys).toEqual(['c/4'])
    })

    it('should handle grand staff (piano) MusicXML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <work>
            <work-title>Piano Piece</work-title>
          </work>
          <identification>
            <creator type="composer">Test Composer</creator>
          </identification>
          <part-list>
            <score-part id="P1">
              <part-name>Piano</part-name>
              <score-instrument id="P1-I1">
                <instrument-name>Piano</instrument-name>
              </score-instrument>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <attributes>
                <divisions>1</divisions>
                <key>
                  <fifths>0</fifths>
                </key>
                <time>
                  <beats>4</beats>
                  <beat-type>4</beat-type>
                </time>
                <staves>2</staves>
                <clef number="1">
                  <sign>G</sign>
                  <line>2</line>
                </clef>
                <clef number="2">
                  <sign>F</sign>
                  <line>4</line>
                </clef>
              </attributes>
              <note>
                <pitch>
                  <step>C</step>
                  <octave>5</octave>
                </pitch>
                <duration>1</duration>
                <voice>1</voice>
                <type>quarter</type>
                <staff>1</staff>
              </note>
              <note>
                <pitch>
                  <step>C</step>
                  <octave>3</octave>
                </pitch>
                <duration>1</duration>
                <voice>2</voice>
                <type>quarter</type>
                <staff>2</staff>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.parts[0].staves).toHaveLength(2)
      expect(score.measures[0].staves).toHaveLength(2)

      const trebleStaff = score.measures[0].staves.find(
        s => s.id === 'P1-staff1'
      )
      const bassStaff = score.measures[0].staves.find(s => s.id === 'P1-staff2')

      expect(trebleStaff?.clef).toBe(Clef.TREBLE)
      expect(bassStaff?.clef).toBe(Clef.BASS)
      expect(trebleStaff?.voices[0].notes[0].keys).toEqual(['c/5'])
      expect(bassStaff?.voices[0].notes[0].keys).toEqual(['c/3'])
    })
  })

  describe('Musical Elements', () => {
    it('should handle different note durations', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <pitch><step>C</step><octave>4</octave></pitch>
                <duration>4</duration>
                <type>whole</type>
              </note>
              <note>
                <pitch><step>D</step><octave>4</octave></pitch>
                <duration>2</duration>
                <type>half</type>
              </note>
              <note>
                <pitch><step>E</step><octave>4</octave></pitch>
                <duration>1</duration>
                <type>quarter</type>
              </note>
              <note>
                <pitch><step>F</step><octave>4</octave></pitch>
                <duration>0.5</duration>
                <type>eighth</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      const notes = score.measures[0].staves[0].voices[0].notes
      expect(notes[0].duration).toBe(NoteDuration.WHOLE)
      expect(notes[1].duration).toBe(NoteDuration.HALF)
      expect(notes[2].duration).toBe(NoteDuration.QUARTER)
      expect(notes[3].duration).toBe(NoteDuration.EIGHTH)
    })

    it('should handle accidentals', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <pitch>
                  <step>C</step>
                  <alter>1</alter>
                  <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <accidental>sharp</accidental>
              </note>
              <note>
                <pitch>
                  <step>B</step>
                  <alter>-1</alter>
                  <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
                <accidental>flat</accidental>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      const notes = score.measures[0].staves[0].voices[0].notes
      expect(notes[0].keys).toEqual(['c#/4'])
      expect(notes[0].accidental).toBe('sharp')
      expect(notes[1].keys).toEqual(['bb/4'])
      expect(notes[1].accidental).toBe('flat')
    })

    it('should handle rests', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      const note = score.measures[0].staves[0].voices[0].notes[0]
      expect(note.rest).toBe(true)
      expect(note.duration).toBe(NoteDuration.QUARTER)
    })

    it('should handle ties', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <pitch><step>C</step><octave>4</octave></pitch>
                <duration>2</duration>
                <type>half</type>
                <tie type="start"/>
              </note>
            </measure>
            <measure number="2">
              <note>
                <pitch><step>C</step><octave>4</octave></pitch>
                <duration>2</duration>
                <type>half</type>
                <tie type="stop"/>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.measures[0].staves[0].voices[0].notes[0].tie).toBe('start')
      expect(score.measures[1].staves[0].voices[0].notes[0].tie).toBe('stop')
    })

    it('should handle dotted notes', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <pitch><step>C</step><octave>4</octave></pitch>
                <duration>3</duration>
                <type>half</type>
                <dot/>
              </note>
              <note>
                <pitch><step>D</step><octave>4</octave></pitch>
                <duration>1.75</duration>
                <type>quarter</type>
                <dot/>
                <dot/>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      const notes = score.measures[0].staves[0].voices[0].notes
      expect(notes[0].dots).toBe(1)
      expect(notes[1].dots).toBe(2)
    })
  })

  describe('Measure Attributes', () => {
    it('should handle different key signatures', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <attributes>
                <key><fifths>2</fifths></key>
              </attributes>
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
            <measure number="2">
              <attributes>
                <key><fifths>-3</fifths></key>
              </attributes>
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.measures[0].keySignature).toBe(KeySignature.D_MAJOR)
      expect(score.measures[1].keySignature).toBe(KeySignature.E_FLAT_MAJOR)
    })

    it('should handle tempo markings', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <sound tempo="120"/>
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.measures[0].tempo).toBe(120)
    })

    it('should handle repeat signs', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Test</part-name>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <barline location="left">
                <repeat direction="forward"/>
              </barline>
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
            <measure number="2">
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
              <barline location="right">
                <repeat direction="backward"/>
              </barline>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.measures[0].barLine).toBe('repeat-start')
      expect(score.measures[1].barLine).toBe('repeat-end')
    })
  })

  describe('Error Handling', () => {
    it('should throw error for invalid XML', () => {
      const invalidXml = '<invalid>not valid xml'
      expect(() => new MusicXMLToScoreConverter(invalidXml)).toThrow()
    })

    it('should throw error for missing score-partwise', () => {
      const xml = '<?xml version="1.0"?><score></score>'
      const converter = new MusicXMLToScoreConverter(xml)
      expect(() => converter.convert()).toThrow(
        'Invalid MusicXML: missing score-partwise element'
      )
    })

    it('should throw error for missing part-list', () => {
      const xml = '<?xml version="1.0"?><score-partwise></score-partwise>'
      const converter = new MusicXMLToScoreConverter(xml)
      expect(() => converter.convert()).toThrow(
        'Invalid MusicXML: missing part-list'
      )
    })
  })

  describe('MIDI Information', () => {
    it('should extract MIDI program and volume', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="3.1">
          <part-list>
            <score-part id="P1">
              <part-name>Piano</part-name>
              <midi-instrument id="P1-I1">
                <midi-program>1</midi-program>
                <volume>80</volume>
                <pan>50</pan>
              </midi-instrument>
            </score-part>
          </part-list>
          <part id="P1">
            <measure number="1">
              <note>
                <rest/>
                <duration>1</duration>
                <type>quarter</type>
              </note>
            </measure>
          </part>
        </score-partwise>`

      const converter = new MusicXMLToScoreConverter(xml)
      const score = converter.convert()

      expect(score.parts[0].midiProgram).toBe(0) // MusicXML uses 1-128, we use 0-127
      expect(score.parts[0].volume).toBe(102) // 80% of 127
      expect(score.parts[0].pan).toBe(-32) // Centered
    })
  })
})
