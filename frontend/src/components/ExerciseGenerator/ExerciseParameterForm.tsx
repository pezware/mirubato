import React, { useState, useCallback } from 'react'
import {
  ExerciseParameters,
  SightReadingExerciseParameters,
  KeySignature,
  TimeSignature,
  Clef,
  ExerciseType,
  ScaleType,
  TechnicalElement,
} from '../../modules/sheetMusic/types'
import { TechnicalExerciseParameters } from '../../modules/sheetMusic/generators/TechnicalExerciseGenerator'
import {
  validateAllParameters,
  hasValidationErrors,
  ValidationErrors,
} from './validation'

export interface ExerciseParameterFormProps {
  /** Callback when user generates an exercise */
  onGenerate: (
    params:
      | ExerciseParameters
      | SightReadingExerciseParameters
      | TechnicalExerciseParameters
  ) => void
  /** Whether the form is currently submitting */
  isLoading?: boolean
  /** Default values for the form */
  defaults?: Partial<ExerciseParameters>
}

interface FormState extends ExerciseParameters {
  // Exercise type selection
  exerciseType: ExerciseType

  // Sight-reading specific
  includeAccidentals: boolean
  melodicMotion: 'stepwise' | 'leaps' | 'mixed'
  includeDynamics: boolean
  includeArticulations: boolean
  phraseLength: 2 | 4 | 8 | 16

  // Technical exercise specific
  technicalType: 'scale' | 'arpeggio' | 'hanon' | 'mixed'
  scaleType: ScaleType
  arpeggioType: 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7'
  hanonPattern: number[]
  includeDescending: boolean
  octaves: number
}

const KEY_SIGNATURES = [
  { value: KeySignature.C_MAJOR, label: 'C Major' },
  { value: KeySignature.G_MAJOR, label: 'G Major' },
  { value: KeySignature.D_MAJOR, label: 'D Major' },
  { value: KeySignature.A_MAJOR, label: 'A Major' },
  { value: KeySignature.E_MAJOR, label: 'E Major' },
  { value: KeySignature.B_MAJOR, label: 'B Major' },
  { value: KeySignature.F_SHARP_MAJOR, label: 'F# Major' },
  { value: KeySignature.C_SHARP_MAJOR, label: 'C# Major' },
  { value: KeySignature.F_MAJOR, label: 'F Major' },
  { value: KeySignature.B_FLAT_MAJOR, label: 'Bb Major' },
  { value: KeySignature.E_FLAT_MAJOR, label: 'Eb Major' },
  { value: KeySignature.A_FLAT_MAJOR, label: 'Ab Major' },
  { value: KeySignature.D_FLAT_MAJOR, label: 'Db Major' },
  { value: KeySignature.G_FLAT_MAJOR, label: 'Gb Major' },
  { value: KeySignature.A_MINOR, label: 'A Minor' },
  { value: KeySignature.E_MINOR, label: 'E Minor' },
  { value: KeySignature.B_MINOR, label: 'B Minor' },
  { value: KeySignature.F_SHARP_MINOR, label: 'F# Minor' },
  { value: KeySignature.C_SHARP_MINOR, label: 'C# Minor' },
  { value: KeySignature.G_SHARP_MINOR, label: 'G# Minor' },
  { value: KeySignature.D_MINOR, label: 'D Minor' },
  { value: KeySignature.G_MINOR, label: 'G Minor' },
  { value: KeySignature.C_MINOR, label: 'C Minor' },
  { value: KeySignature.F_MINOR, label: 'F Minor' },
]

const TIME_SIGNATURES = [
  { value: TimeSignature.TWO_FOUR, label: '2/4' },
  { value: TimeSignature.THREE_FOUR, label: '3/4' },
  { value: TimeSignature.FOUR_FOUR, label: '4/4' },
  { value: TimeSignature.THREE_EIGHT, label: '3/8' },
  { value: TimeSignature.SIX_EIGHT, label: '6/8' },
  { value: TimeSignature.NINE_EIGHT, label: '9/8' },
  { value: TimeSignature.TWELVE_EIGHT, label: '12/8' },
  { value: TimeSignature.FIVE_FOUR, label: '5/4' },
  { value: TimeSignature.SEVEN_EIGHT, label: '7/8' },
]

const CLEFS = [
  { value: Clef.TREBLE, label: 'Treble' },
  { value: Clef.BASS, label: 'Bass' },
  { value: Clef.ALTO, label: 'Alto' },
  { value: Clef.TENOR, label: 'Tenor' },
  { value: Clef.GRAND_STAFF, label: 'Grand Staff' },
]

const EXERCISE_TYPES = [
  { value: ExerciseType.SIGHT_READING, label: 'Sight Reading' },
  { value: ExerciseType.TECHNICAL, label: 'Technical' },
  { value: ExerciseType.RHYTHM, label: 'Rhythm' },
  { value: ExerciseType.HARMONY, label: 'Harmony' },
]

const SCALE_TYPES = [
  { value: ScaleType.MAJOR, label: 'Major' },
  { value: ScaleType.NATURAL_MINOR, label: 'Natural Minor' },
  { value: ScaleType.HARMONIC_MINOR, label: 'Harmonic Minor' },
  { value: ScaleType.MELODIC_MINOR, label: 'Melodic Minor' },
  { value: ScaleType.PENTATONIC_MAJOR, label: 'Pentatonic Major' },
  { value: ScaleType.PENTATONIC_MINOR, label: 'Pentatonic Minor' },
  { value: ScaleType.BLUES, label: 'Blues' },
  { value: ScaleType.CHROMATIC, label: 'Chromatic' },
]

const TECHNICAL_ELEMENTS = [
  { value: TechnicalElement.SCALES, label: 'Scales' },
  { value: TechnicalElement.ARPEGGIOS, label: 'Arpeggios' },
  { value: TechnicalElement.THIRDS, label: 'Thirds' },
  { value: TechnicalElement.SIXTHS, label: 'Sixths' },
  { value: TechnicalElement.OCTAVES, label: 'Octaves' },
  { value: TechnicalElement.CHORDS, label: 'Chords' },
  { value: TechnicalElement.TRILLS, label: 'Trills' },
]

export const ExerciseParameterForm: React.FC<ExerciseParameterFormProps> = ({
  onGenerate,
  isLoading = false,
  defaults = {},
}) => {
  const [formState, setFormState] = useState<FormState>({
    // Basic parameters
    keySignature: defaults.keySignature || KeySignature.C_MAJOR,
    timeSignature: defaults.timeSignature || TimeSignature.FOUR_FOUR,
    clef: defaults.clef || Clef.TREBLE,
    range: defaults.range || { lowest: 'C4', highest: 'C6' },
    difficulty: defaults.difficulty || 5,
    measures: defaults.measures || 4,
    tempo: defaults.tempo || 120,
    technicalElements: defaults.technicalElements || [],
    rhythmicPatterns: defaults.rhythmicPatterns || [],
    dynamicRange: defaults.dynamicRange || [],
    scaleTypes: defaults.scaleTypes || [],
    intervalPatterns: defaults.intervalPatterns || [],
    includeFingerings: defaults.includeFingerings || false,
    instrumentParams: defaults.instrumentParams,

    // Exercise type
    exerciseType: ExerciseType.SIGHT_READING,

    // Sight-reading specific
    includeAccidentals: false,
    melodicMotion: 'mixed',
    includeDynamics: false,
    includeArticulations: false,
    phraseLength: 4,

    // Technical exercise specific
    technicalType: 'scale',
    scaleType: ScaleType.MAJOR,
    arpeggioType: 'major',
    hanonPattern: [1, 3, 5, 6, 5, 3],
    includeDescending: true,
    octaves: 1,
  })

  const [errors, setErrors] = useState<ValidationErrors>({})

  const updateFormState = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState(prev => ({ ...prev, [field]: value }))
      // Clear error when field is updated
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }))
      }
    },
    [errors]
  )

  const validateForm = useCallback((): boolean => {
    // Build the appropriate parameters object based on exercise type
    const baseParams: ExerciseParameters = {
      keySignature: formState.keySignature,
      timeSignature: formState.timeSignature,
      clef: formState.clef,
      range: formState.range,
      difficulty: formState.difficulty,
      measures: formState.measures,
      tempo: formState.tempo,
      technicalElements: formState.technicalElements,
      rhythmicPatterns: formState.rhythmicPatterns,
      dynamicRange: formState.dynamicRange,
      scaleTypes: formState.scaleTypes,
      intervalPatterns: formState.intervalPatterns,
      includeFingerings: formState.includeFingerings,
      instrumentParams: formState.instrumentParams,
    }

    let params:
      | ExerciseParameters
      | SightReadingExerciseParameters
      | TechnicalExerciseParameters

    if (formState.exerciseType === ExerciseType.SIGHT_READING) {
      params = {
        ...baseParams,
        includeAccidentals: formState.includeAccidentals,
        melodicMotion: formState.melodicMotion,
        includeDynamics: formState.includeDynamics,
        includeArticulations: formState.includeArticulations,
        phraseLength: formState.phraseLength,
      } as SightReadingExerciseParameters
    } else if (formState.exerciseType === ExerciseType.TECHNICAL) {
      params = {
        ...baseParams,
        technicalType: formState.technicalType,
        scaleType: formState.scaleType,
        arpeggioType: formState.arpeggioType,
        hanonPattern: formState.hanonPattern,
        includeDescending: formState.includeDescending,
        octaves: formState.octaves,
      } as TechnicalExerciseParameters
    } else {
      params = baseParams
    }

    // Use comprehensive validation
    const newErrors = validateAllParameters(params)
    setErrors(newErrors)
    return !hasValidationErrors(newErrors)
  }, [formState])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      // Build the appropriate parameters object based on exercise type
      const baseParams: ExerciseParameters = {
        keySignature: formState.keySignature,
        timeSignature: formState.timeSignature,
        clef: formState.clef,
        range: formState.range,
        difficulty: formState.difficulty,
        measures: formState.measures,
        tempo: formState.tempo,
        technicalElements: formState.technicalElements,
        rhythmicPatterns: formState.rhythmicPatterns,
        dynamicRange: formState.dynamicRange,
        scaleTypes: formState.scaleTypes,
        intervalPatterns: formState.intervalPatterns,
        includeFingerings: formState.includeFingerings,
        instrumentParams: formState.instrumentParams,
      }

      let params:
        | ExerciseParameters
        | SightReadingExerciseParameters
        | TechnicalExerciseParameters

      if (formState.exerciseType === ExerciseType.SIGHT_READING) {
        params = {
          ...baseParams,
          includeAccidentals: formState.includeAccidentals,
          melodicMotion: formState.melodicMotion,
          includeDynamics: formState.includeDynamics,
          includeArticulations: formState.includeArticulations,
          phraseLength: formState.phraseLength,
        } as SightReadingExerciseParameters
      } else if (formState.exerciseType === ExerciseType.TECHNICAL) {
        params = {
          ...baseParams,
          technicalType: formState.technicalType,
          scaleType: formState.scaleType,
          arpeggioType: formState.arpeggioType,
          hanonPattern: formState.hanonPattern,
          includeDescending: formState.includeDescending,
          octaves: formState.octaves,
        } as TechnicalExerciseParameters
      } else {
        params = baseParams
      }

      onGenerate(params)
    },
    [formState, validateForm, onGenerate]
  )

  const handleArrayToggle = useCallback(
    <T,>(field: keyof FormState, value: T, currentArray: T[]) => {
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      updateFormState(field, newArray as FormState[typeof field])
    },
    [updateFormState]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg"
      role="form"
      aria-label="Exercise Parameter Configuration Form"
    >
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Generate Exercise</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure parameters to generate a personalized practice exercise
        </p>
      </div>

      {/* Exercise Type Selection */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exercise Type
          </label>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
            role="radiogroup"
            aria-label="Exercise Type Selection"
          >
            {EXERCISE_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateFormState('exerciseType', value)}
                role="radio"
                aria-checked={formState.exerciseType === value}
                aria-label={`Select ${label} exercise type`}
                className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formState.exerciseType === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Basic Musical Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div>
          <label
            htmlFor="keySignature"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Key Signature
          </label>
          <select
            id="keySignature"
            value={formState.keySignature}
            onChange={e =>
              updateFormState('keySignature', e.target.value as KeySignature)
            }
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {KEY_SIGNATURES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="timeSignature"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Time Signature
          </label>
          <select
            id="timeSignature"
            value={formState.timeSignature}
            onChange={e =>
              updateFormState('timeSignature', e.target.value as TimeSignature)
            }
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_SIGNATURES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="clef"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Clef
          </label>
          <select
            id="clef"
            value={formState.clef}
            onChange={e => updateFormState('clef', e.target.value as Clef)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CLEFS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Range and Difficulty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div>
          <label
            htmlFor="rangeLowest"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Lowest Note
          </label>
          <input
            id="rangeLowest"
            type="text"
            value={formState.range.lowest}
            onChange={e =>
              updateFormState('range', {
                ...formState.range,
                lowest: e.target.value,
              })
            }
            placeholder="C4"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.rangeLowest || errors.rangeLogical || errors.rangeSize
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.rangeLowest && (
            <p className="mt-1 text-sm text-red-600">{errors.rangeLowest}</p>
          )}
          {errors.rangeLogical && (
            <p className="mt-1 text-sm text-red-600">{errors.rangeLogical}</p>
          )}
          {errors.rangeSize && (
            <p className="mt-1 text-sm text-red-600">{errors.rangeSize}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="rangeHighest"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Highest Note
          </label>
          <input
            id="rangeHighest"
            type="text"
            value={formState.range.highest}
            onChange={e =>
              updateFormState('range', {
                ...formState.range,
                highest: e.target.value,
              })
            }
            placeholder="C6"
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.rangeHighest || errors.rangeLogical || errors.rangeSize
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
          />
          {errors.rangeHighest && (
            <p className="mt-1 text-sm text-red-600">{errors.rangeHighest}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Difficulty (1-10)
          </label>
          <input
            id="difficulty"
            type="number"
            min="1"
            max="10"
            value={formState.difficulty}
            onChange={e =>
              updateFormState('difficulty', parseInt(e.target.value))
            }
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.difficulty ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.difficulty && (
            <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="measures"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Measures
          </label>
          <input
            id="measures"
            type="number"
            min="1"
            max="32"
            value={formState.measures}
            onChange={e =>
              updateFormState('measures', parseInt(e.target.value))
            }
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.measures ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.measures && (
            <p className="mt-1 text-sm text-red-600">{errors.measures}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label
            htmlFor="tempo"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tempo (BPM)
          </label>
          <input
            id="tempo"
            type="number"
            min="40"
            max="300"
            value={formState.tempo}
            onChange={e => updateFormState('tempo', parseInt(e.target.value))}
            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.tempo ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.tempo && (
            <p className="mt-1 text-sm text-red-600">{errors.tempo}</p>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formState.includeFingerings}
              onChange={e =>
                updateFormState('includeFingerings', e.target.checked)
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Include Fingerings
            </span>
          </label>
        </div>
      </div>

      {/* Sight-Reading Specific Options */}
      {formState.exerciseType === ExerciseType.SIGHT_READING && (
        <div className="border-t border-gray-200 pt-6">
          <h3
            className="text-lg font-medium text-gray-900 mb-4"
            id="sight-reading-options"
          >
            Sight-Reading Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.includeAccidentals}
                  onChange={e =>
                    updateFormState('includeAccidentals', e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include Accidentals
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.includeDynamics}
                  onChange={e =>
                    updateFormState('includeDynamics', e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include Dynamics
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.includeArticulations}
                  onChange={e =>
                    updateFormState('includeArticulations', e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include Articulations
                </span>
              </label>
            </div>

            <div>
              <label
                htmlFor="melodicMotion"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Melodic Motion
              </label>
              <select
                id="melodicMotion"
                value={formState.melodicMotion}
                onChange={e =>
                  updateFormState(
                    'melodicMotion',
                    e.target.value as 'stepwise' | 'leaps' | 'mixed'
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="stepwise">Stepwise</option>
                <option value="leaps">Leaps</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="phraseLength"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phrase Length
              </label>
              <select
                id="phraseLength"
                value={formState.phraseLength}
                onChange={e =>
                  updateFormState(
                    'phraseLength',
                    parseInt(e.target.value) as 2 | 4 | 8 | 16
                  )
                }
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phraseLength ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value={2}>2 measures</option>
                <option value={4}>4 measures</option>
                <option value={8}>8 measures</option>
                <option value={16}>16 measures</option>
              </select>
              {errors.phraseLength && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phraseLength}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technical Exercise Specific Options */}
      {formState.exerciseType === ExerciseType.TECHNICAL && (
        <div className="border-t border-gray-200 pt-6">
          <h3
            className="text-lg font-medium text-gray-900 mb-4"
            id="technical-options"
          >
            Technical Exercise Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label
                htmlFor="technicalType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Technical Type
              </label>
              <select
                id="technicalType"
                value={formState.technicalType}
                onChange={e =>
                  updateFormState(
                    'technicalType',
                    e.target.value as 'scale' | 'arpeggio' | 'hanon' | 'mixed'
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="scale">Scale</option>
                <option value="arpeggio">Arpeggio</option>
                <option value="hanon">Hanon</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            {(formState.technicalType === 'scale' ||
              formState.technicalType === 'mixed') && (
              <div>
                <label
                  htmlFor="scaleType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Scale Type
                </label>
                <select
                  id="scaleType"
                  value={formState.scaleType}
                  onChange={e =>
                    updateFormState('scaleType', e.target.value as ScaleType)
                  }
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.scaleType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {SCALE_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.scaleType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.scaleType}
                  </p>
                )}
              </div>
            )}

            {(formState.technicalType === 'arpeggio' ||
              formState.technicalType === 'mixed') && (
              <div>
                <label
                  htmlFor="arpeggioType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Arpeggio Type
                </label>
                <select
                  id="arpeggioType"
                  value={formState.arpeggioType}
                  onChange={e =>
                    updateFormState(
                      'arpeggioType',
                      e.target.value as
                        | 'major'
                        | 'minor'
                        | 'diminished'
                        | 'augmented'
                        | 'dominant7'
                    )
                  }
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.arpeggioType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="diminished">Diminished</option>
                  <option value="augmented">Augmented</option>
                  <option value="dominant7">Dominant 7th</option>
                </select>
                {errors.arpeggioType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.arpeggioType}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="octaves"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Octaves
              </label>
              <input
                id="octaves"
                type="number"
                min="1"
                max="4"
                value={formState.octaves}
                onChange={e =>
                  updateFormState('octaves', parseInt(e.target.value))
                }
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.octaves ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.octaves && (
                <p className="mt-1 text-sm text-red-600">{errors.octaves}</p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formState.includeDescending}
                  onChange={e =>
                    updateFormState('includeDescending', e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Include Descending
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Technical Elements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Technical Elements (Optional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TECHNICAL_ELEMENTS.map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formState.technicalElements?.includes(value) || false}
                onChange={() =>
                  handleArrayToggle(
                    'technicalElements',
                    value,
                    formState.technicalElements || []
                  )
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          aria-label={
            isLoading
              ? 'Generating exercise, please wait'
              : 'Generate new exercise with current parameters'
          }
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Exercise'}
        </button>
      </div>
    </form>
  )
}
