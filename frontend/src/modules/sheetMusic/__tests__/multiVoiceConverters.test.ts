/**
 * Tests for Multi-Voice Converters
 */
import {
  sheetMusicToScore,
  scoreToSheetMusic,
  extractVoiceFromScore,
  mergeScores,
} from '../multiVoiceConverters'
import {
  SheetMusic,
  Clef,
  NoteDuration,
  TimeSignature,
  KeySignature,
  DynamicMarking,
} from '../types'
import { Score } from '../multiVoiceTypes'

describe('Multi-Voice Converters', () => {
  describe('sheetMusicToScore', () => {
    it('should convert single-voice sheet music to score', () => {
      const sheetMusic: SheetMusic = {
        id: 'test-1',
        title: 'Test Piece',
        composer: 'Test Composer',
        instrument: 'PIANO',
        difficulty: 'BEGINNER',
        difficultyLevel: 2,
        durationSeconds: 60,
        timeSignature: '4/4',
        keySignature: 'C major',
        suggestedTempo: 120,
        stylePeriod: 'CLASSICAL',
        tags: ['test'],
        measures: [
          {
            number: 1,
            notes: [
              { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
              { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 1 },
              { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
              { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 3 },
            ],
            clef: Clef.TREBLE,
          },
        ],
      }

      const score = sheetMusicToScore(sheetMusic)

      expect(score.title).toBe('Test Piece')
      expect(score.composer).toBe('Test Composer')
      expect(score.parts).toHaveLength(1)
      expect(score.parts[0].instrument).toBe('piano')
      expect(score.measures).toHaveLength(1)

      const measure = score.measures[0]
      expect(measure.staves).toHaveLength(1)
      expect(measure.staves[0].clef).toBe(Clef.TREBLE)
      expect(measure.staves[0].voices).toHaveLength(1)
      expect(measure.staves[0].voices[0].notes).toHaveLength(4)
    })

    it('should handle grand staff conversion', () => {
      const sheetMusic: SheetMusic = {
        id: 'test-2',
        title: 'Piano Piece',
        composer: 'Test Composer',
        instrument: 'PIANO',
        difficulty: 'INTERMEDIATE',
        difficultyLevel: 5,
        durationSeconds: 120,
        timeSignature: '3/4',
        keySignature: 'G major',
        suggestedTempo: 100,
        stylePeriod: 'ROMANTIC',
        tags: ['piano', 'grand-staff'],
        measures: [
          {
            number: 1,
            notes: [
              { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 0 }, // High note
              { keys: ['b/2'], duration: NoteDuration.QUARTER, time: 0 }, // Low note
              { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 1 },
              { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 1 },
            ],
            clef: Clef.GRAND_STAFF,
          },
        ],
      }

      const score = sheetMusicToScore(sheetMusic)

      expect(score.parts[0].staves).toEqual(['treble', 'bass'])
      expect(score.measures[0].staves).toHaveLength(2)

      const trebleStaff = score.measures[0].staves[0]
      const bassStaff = score.measures[0].staves[1]

      expect(trebleStaff.clef).toBe(Clef.TREBLE)
      expect(bassStaff.clef).toBe(Clef.BASS)

      // Check note distribution
      expect(trebleStaff.voices[0].notes).toHaveLength(2) // High notes
      expect(bassStaff.voices[0].notes).toHaveLength(2) // Low notes
    })

    it('should preserve measure attributes', () => {
      const sheetMusic: SheetMusic = {
        id: 'test-3',
        title: 'Test',
        composer: 'Test',
        instrument: 'PIANO',
        difficulty: 'BEGINNER',
        difficultyLevel: 1,
        durationSeconds: 30,
        timeSignature: '4/4',
        keySignature: 'C major',
        suggestedTempo: 120,
        stylePeriod: 'CONTEMPORARY',
        tags: [],
        measures: [
          {
            number: 1,
            notes: [],
            tempo: 120,
            dynamics: 'f' as DynamicMarking,
            rehearsalMark: 'A',
            barLine: 'double',
            repeatCount: 2,
          },
        ],
      }

      const score = sheetMusicToScore(sheetMusic)
      const measure = score.measures[0]

      expect(measure.tempo).toBe(120)
      expect(measure.dynamics).toBe('f')
      expect(measure.rehearsalMark).toBe('A')
      expect(measure.barLine).toBe('double')
      expect(measure.repeatCount).toBe(2)
    })
  })

  describe('scoreToSheetMusic', () => {
    it('should convert score back to sheet music', () => {
      const score: Score = {
        title: 'Test Score',
        composer: 'Test Composer',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble', 'bass'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'treble',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'rightHand',
                    notes: [
                      {
                        keys: ['c/5'],
                        duration: NoteDuration.QUARTER,
                        time: 0,
                        voiceId: 'rightHand',
                      },
                      {
                        keys: ['d/5'],
                        duration: NoteDuration.QUARTER,
                        time: 1,
                        voiceId: 'rightHand',
                      },
                    ],
                  },
                ],
              },
              {
                id: 'bass',
                clef: Clef.BASS,
                voices: [
                  {
                    id: 'leftHand',
                    notes: [
                      {
                        keys: ['c/3'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'leftHand',
                      },
                    ],
                  },
                ],
              },
            ],
            timeSignature: TimeSignature.FOUR_FOUR,
            keySignature: KeySignature.C_MAJOR,
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: ['test'],
          difficulty: 3,
          duration: 90,
        },
      }

      const sheetMusic = scoreToSheetMusic(score)

      expect(sheetMusic.title).toBe('Test Score')
      expect(sheetMusic.composer).toBe('Test Composer')
      expect(sheetMusic.instrument).toBe('PIANO')
      expect(sheetMusic.measures).toHaveLength(1)

      const measure = sheetMusic.measures[0]
      expect(measure.notes).toHaveLength(3) // All notes flattened
      expect(measure.clef).toBe(Clef.GRAND_STAFF) // Detected grand staff
      expect(measure.notes[0].time).toBe(0)
      expect(measure.notes[1].time).toBe(0)
      expect(measure.notes[2].time).toBe(1)
    })

    it('should handle single staff scores', () => {
      const score: Score = {
        title: 'Violin Piece',
        composer: 'Test',
        parts: [
          {
            id: 'violin',
            name: 'Violin',
            instrument: 'violin',
            staves: ['main'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'main',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'main',
                    notes: [
                      {
                        keys: ['g/4'],
                        duration: NoteDuration.WHOLE,
                        time: 0,
                        voiceId: 'main',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const sheetMusic = scoreToSheetMusic(score)

      expect(sheetMusic.instrument).toBe('GUITAR') // Default for non-piano
      expect(sheetMusic.measures[0].clef).toBe(Clef.TREBLE)
      expect(sheetMusic.measures[0].notes).toHaveLength(1)
    })
  })

  describe('extractVoiceFromScore', () => {
    it('should extract a single voice', () => {
      const score: Score = {
        title: 'SATB Piece',
        composer: 'Test',
        parts: [
          {
            id: 'choir',
            name: 'Choir',
            instrument: 'choir',
            staves: ['treble', 'bass'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'treble',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'soprano',
                    notes: [
                      {
                        keys: ['c/5'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'soprano',
                      },
                    ],
                  },
                  {
                    id: 'alto',
                    notes: [
                      {
                        keys: ['a/4'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'alto',
                      },
                    ],
                  },
                ],
              },
              {
                id: 'bass',
                clef: Clef.BASS,
                voices: [
                  {
                    id: 'tenor',
                    notes: [
                      {
                        keys: ['e/3'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'tenor',
                      },
                    ],
                  },
                  {
                    id: 'bass',
                    notes: [
                      {
                        keys: ['c/3'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'bass',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const sopranoScore = extractVoiceFromScore(score, 'soprano')

      expect(sopranoScore.title).toBe('SATB Piece - soprano')
      expect(sopranoScore.measures[0].staves).toHaveLength(1)
      expect(sopranoScore.measures[0].staves[0].voices).toHaveLength(1)
      expect(sopranoScore.measures[0].staves[0].voices[0].id).toBe('soprano')
    })

    it('should handle voice not found', () => {
      const score: Score = {
        title: 'Test',
        composer: 'Test',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'treble',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'main',
                    notes: [],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const extracted = extractVoiceFromScore(score, 'nonexistent')

      expect(extracted.measures[0].staves).toHaveLength(0)
    })
  })

  describe('mergeScores', () => {
    it('should merge multiple scores', () => {
      const score1: Score = {
        title: 'Violin Part',
        composer: 'Test',
        parts: [
          {
            id: 'violin',
            name: 'Violin',
            instrument: 'violin',
            staves: ['violin'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'violin',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'violin',
                    notes: [
                      {
                        keys: ['g/4'],
                        duration: NoteDuration.QUARTER,
                        time: 0,
                        voiceId: 'violin',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const score2: Score = {
        title: 'Cello Part',
        composer: 'Test',
        parts: [
          {
            id: 'cello',
            name: 'Cello',
            instrument: 'cello',
            staves: ['cello'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'cello',
                clef: Clef.BASS,
                voices: [
                  {
                    id: 'cello',
                    notes: [
                      {
                        keys: ['c/3'],
                        duration: NoteDuration.QUARTER,
                        time: 0,
                        voiceId: 'cello',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const merged = mergeScores([score1, score2], 'String Duet')

      expect(merged.title).toBe('String Duet')
      expect(merged.parts).toHaveLength(2)
      expect(merged.parts[0].id).toBe('part0')
      expect(merged.parts[1].id).toBe('part1')
      expect(merged.measures[0].staves).toHaveLength(2)
    })

    it('should handle empty array', () => {
      expect(() => mergeScores([])).toThrow(
        'Cannot merge empty array of scores'
      )
    })

    it('should return single score unchanged', () => {
      const score: Score = {
        title: 'Single',
        composer: 'Test',
        parts: [],
        measures: [],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      const merged = mergeScores([score])
      expect(merged).toBe(score)
    })
  })
})
