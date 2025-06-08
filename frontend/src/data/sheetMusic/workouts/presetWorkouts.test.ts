/**
 * Tests for preset workout exercises
 * Following TDD principles - tests define the expected behavior
 */

import {
  dailySightReadingEasy,
  scalePracticeMajor,
  rhythmTraining4_4,
  intervalRecognition,
} from './index'
import { getPresetWorkouts, getAllSheetMusic } from '../curatedPieces'
import { NoteDuration, KeySignature } from '../../../modules/sheetMusic/types'

describe('Preset Workouts', () => {
  describe('Daily Sight-Reading (Easy)', () => {
    it('should have correct basic properties', () => {
      expect(dailySightReadingEasy.id).toBe('workout-daily-sight-reading-easy')
      expect(dailySightReadingEasy.title).toBe('Daily Sight-Reading (Easy)')
      expect(dailySightReadingEasy.keySignature).toBe('C major')
      expect(dailySightReadingEasy.timeSignature).toBe('4/4')
      expect(dailySightReadingEasy.difficulty).toBe('BEGINNER')
    })

    it('should have 8 measures as specified', () => {
      expect(dailySightReadingEasy.measures).toHaveLength(8)
    })

    it('should use only C major scale notes', () => {
      const cMajorNotes = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
      dailySightReadingEasy.measures.forEach(measure => {
        measure.notes.forEach(note => {
          if (!note.rest) {
            const noteName = note.keys[0].split('/')[0].replace('#', '')
            expect(cMajorNotes).toContain(noteName)
          }
        })
      })
    })

    it('should follow I-IV-V chord progression', () => {
      // Measure 1 should have C major chord notes (C, E, G)
      const measure1Notes = dailySightReadingEasy.measures[0].notes.map(
        n => n.keys[0]
      )
      expect(measure1Notes).toContain('c/4')
      expect(measure1Notes).toContain('e/4')
      expect(measure1Notes).toContain('g/4')

      // Measure 3 should have F major chord notes (F, A, C)
      const measure3Notes = dailySightReadingEasy.measures[2].notes.map(
        n => n.keys[0]
      )
      expect(measure3Notes).toContain('f/4')
      expect(measure3Notes).toContain('a/4')
      expect(measure3Notes).toContain('c/5')
    })
  })

  describe('Scale Practice (Major Keys)', () => {
    it('should have correct basic properties', () => {
      expect(scalePracticeMajor.id).toBe('workout-scale-practice-major')
      expect(scalePracticeMajor.title).toBe('Scale Practice (Major Keys)')
      expect(scalePracticeMajor.difficulty).toBe('BEGINNER')
    })

    it('should contain ascending and descending scales', () => {
      // Check C major scale ascending in measure 1
      const measure1 = scalePracticeMajor.measures[0]
      expect(measure1.notes[0].keys[0]).toBe('c/4')
      expect(measure1.notes[7].keys[0]).toBe('c/5')

      // Check descending in measure 2
      const measure2 = scalePracticeMajor.measures[1]
      expect(measure2.notes[0].keys[0]).toBe('b/4')
      expect(measure2.notes[6].keys[0]).toBe('c/4')
    })

    it('should include multiple key signatures', () => {
      // Check for key signature changes
      const keySignatures = scalePracticeMajor.measures
        .map(m => m.keySignature)
        .filter(Boolean)

      expect(keySignatures).toContain(KeySignature.C_MAJOR)
      expect(keySignatures).toContain(KeySignature.G_MAJOR)
      expect(keySignatures).toContain(KeySignature.D_MAJOR)
    })

    it('should use eighth notes for scales', () => {
      const scaleNotes = scalePracticeMajor.measures[0].notes
      scaleNotes.forEach(note => {
        expect(note.duration).toBe(NoteDuration.EIGHTH)
      })
    })
  })

  describe('Rhythm Training (4/4 Time)', () => {
    it('should have correct basic properties', () => {
      expect(rhythmTraining4_4.id).toBe('workout-rhythm-training-4-4')
      expect(rhythmTraining4_4.title).toBe('Rhythm Training (4/4 Time)')
      expect(rhythmTraining4_4.timeSignature).toBe('4/4')
      expect(rhythmTraining4_4.suggestedTempo).toBe(80)
    })

    it('should include various note durations', () => {
      const allDurations = rhythmTraining4_4.measures.flatMap(m =>
        m.notes.map(n => n.duration)
      )

      expect(allDurations).toContain(NoteDuration.WHOLE)
      expect(allDurations).toContain(NoteDuration.HALF)
      expect(allDurations).toContain(NoteDuration.QUARTER)
      expect(allDurations).toContain(NoteDuration.EIGHTH)
    })

    it('should include rests', () => {
      const hasRests = rhythmTraining4_4.measures.some(measure =>
        measure.notes.some(note => note.rest === true)
      )
      expect(hasRests).toBe(true)
    })

    it('should include dotted rhythms', () => {
      const hasDottedNotes = rhythmTraining4_4.measures.some(measure =>
        measure.notes.some(note => note.dots === 1)
      )
      expect(hasDottedNotes).toBe(true)
    })
  })

  describe('Interval Recognition', () => {
    it('should have correct basic properties', () => {
      expect(intervalRecognition.id).toBe('workout-interval-recognition')
      expect(intervalRecognition.title).toBe('Interval Recognition')
      expect(intervalRecognition.keySignature).toBe('C major')
    })

    it('should include major thirds', () => {
      // Measure 1 should have C-E (major third)
      const measure1 = intervalRecognition.measures[0]
      expect(measure1.notes[0].keys[0]).toBe('c/4')
      expect(measure1.notes[1].keys[0]).toBe('e/4')
    })

    it('should include perfect fifths', () => {
      // Measure 3 should have C-G (perfect fifth)
      const measure3 = intervalRecognition.measures[2]
      expect(measure3.notes[0].keys[0]).toBe('c/4')
      expect(measure3.notes[1].keys[0]).toBe('g/4')
    })

    it('should include octaves', () => {
      // Measure 5 should have C-C octave
      const measure5 = intervalRecognition.measures[4]
      expect(measure5.notes[0].keys[0]).toBe('c/4')
      expect(measure5.notes[1].keys[0]).toBe('c/5')
    })

    it('should include harmonic intervals (played together)', () => {
      // Measure 8 should have notes played together
      const harmonicMeasure = intervalRecognition.measures[7]
      const hasChords = harmonicMeasure.notes.some(note => note.keys.length > 1)
      expect(hasChords).toBe(true)
    })
  })

  describe('Workout Collection Functions', () => {
    it('should return all 4 preset workouts', () => {
      const workouts = getPresetWorkouts()
      expect(workouts).toHaveLength(4)

      const workoutIds = workouts.map(w => w.id)
      expect(workoutIds).toContain('workout-daily-sight-reading-easy')
      expect(workoutIds).toContain('workout-scale-practice-major')
      expect(workoutIds).toContain('workout-rhythm-training-4-4')
      expect(workoutIds).toContain('workout-interval-recognition')
    })

    it('should include workouts in getAllSheetMusic', () => {
      const allMusic = getAllSheetMusic()
      expect(allMusic.length).toBeGreaterThanOrEqual(14) // 10 curated + 4 workouts

      const workoutPiece = allMusic.find(
        p => p.id === 'workout-daily-sight-reading-easy'
      )
      expect(workoutPiece).toBeDefined()
    })

    it('all workouts should have workout tag', () => {
      const workouts = getPresetWorkouts()
      workouts.forEach(workout => {
        expect(workout.tags).toContain('workout')
      })
    })

    it('all workouts should have proper metadata', () => {
      const workouts = getPresetWorkouts()
      workouts.forEach(workout => {
        expect(workout.metadata).toBeDefined()
        expect(workout.metadata?.source).toBe('Generated')
        expect(workout.metadata?.license).toBe('CC BY 4.0')
      })
    })
  })

  describe('Data Quality for Workouts', () => {
    it('all workouts should have valid measures', () => {
      const workouts = getPresetWorkouts()
      workouts.forEach(workout => {
        expect(workout.measures.length).toBeGreaterThan(0)
        workout.measures.forEach((measure, index) => {
          expect(measure.number).toBe(index + 1)
          expect(measure.notes.length).toBeGreaterThan(0)
        })
      })
    })

    it('all workouts should have reasonable durations', () => {
      const workouts = getPresetWorkouts()
      workouts.forEach(workout => {
        expect(workout.durationSeconds).toBeGreaterThan(30)
        expect(workout.durationSeconds).toBeLessThan(120) // 2 minutes max for workouts
      })
    })

    it('all workouts should have appropriate tempo markings', () => {
      const workouts = getPresetWorkouts()
      workouts.forEach(workout => {
        expect(workout.suggestedTempo).toBeGreaterThan(60)
        expect(workout.suggestedTempo).toBeLessThan(120)
        expect(workout.tempoMarking).toBeDefined()
      })
    })
  })
})
