import React, { useState } from 'react'
import type { LogbookEntry, PieceReference } from '../modules/logger/types'
import { LogbookEntryType, Mood, Instrument } from '../modules/logger/types'
import { useAuth } from '../hooks/useAuth'

interface ManualEntryFormProps {
  onSave: (
    entry: Omit<LogbookEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => void
  onCancel: () => void
  initialData?: Partial<LogbookEntry>
}

type PracticeType = 'repertoire' | 'technical' | 'sight-reading' | 'warmup'

const ManualEntryForm: React.FC<ManualEntryFormProps> = ({
  onSave,
  onCancel,
  initialData,
}) => {
  const { user } = useAuth()

  // Form state
  const [entryType, setEntryType] = useState<LogbookEntry['type']>(
    initialData?.type || LogbookEntryType.PRACTICE
  )
  const [instrument, setInstrument] = useState<LogbookEntry['instrument']>(
    initialData?.instrument ||
      (user?.primaryInstrument as Instrument) ||
      Instrument.PIANO
  )
  const [practiceType, setPracticeType] = useState<PracticeType>('repertoire')
  const [date, setDate] = useState(
    initialData?.timestamp
      ? new Date(initialData.timestamp).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [time, setTime] = useState(
    initialData?.timestamp
      ? new Date(initialData.timestamp).toTimeString().slice(0, 5)
      : new Date().toTimeString().slice(0, 5)
  )
  const [duration, setDuration] = useState(
    initialData?.duration ? Math.floor(initialData.duration / 60) : 30
  )
  const [pieces, setPieces] = useState<PieceReference[]>(
    initialData?.pieces || []
  )
  const [newPiece, setNewPiece] = useState('')
  const [techniques, setTechniques] = useState<string[]>(
    initialData?.techniques || []
  )
  const [mood, setMood] = useState<LogbookEntry['mood']>(
    initialData?.mood || Mood.NEUTRAL
  )
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')

  // Common technique options
  const commonTechniques = [
    'Scales',
    'Arpeggios',
    'Sight-reading',
    'Rhythm',
    'Dynamics',
    'Articulation',
    'Pedaling',
    'Fingering',
    'Phrasing',
    'Tempo',
    'Memorization',
    'Interpretation',
  ]

  const handleAddPiece = () => {
    if (newPiece.trim()) {
      const piece: PieceReference = {
        id: `custom-${Date.now()}`,
        title: newPiece.trim(),
      }
      setPieces([...pieces, piece])
      setNewPiece('')
    }
  }

  const handleRemovePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index))
  }

  const handleToggleTechnique = (technique: string) => {
    if (techniques.includes(technique)) {
      setTechniques(techniques.filter(t => t !== technique))
    } else {
      setTechniques([...techniques, technique])
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Combine date and time to create ISO timestamp
    const dateTime = new Date(`${date}T${time}`)
    const timestamp = dateTime.toISOString()

    // Convert duration to seconds
    const durationInSeconds = duration * 60

    // Add practice type to tags if it's a practice session
    const finalTags = [...tags]
    if (entryType === LogbookEntryType.PRACTICE) {
      finalTags.push(practiceType)
    }

    const entry: Omit<
      LogbookEntry,
      'id' | 'userId' | 'createdAt' | 'updatedAt'
    > = {
      timestamp,
      duration: durationInSeconds,
      type: entryType,
      instrument,
      pieces,
      techniques,
      goalIds: [], // TODO: Implement goal linking
      notes,
      mood,
      tags: finalTags,
      sessionId: null,
      metadata: {
        source: 'manual',
        practiceType:
          entryType === LogbookEntryType.PRACTICE ? practiceType : undefined,
      },
    }

    onSave(entry)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Entry Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Entry Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.values(LogbookEntryType).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setEntryType(type)}
              className={`px-4 py-2 rounded-lg border capitalize transition-colors ${
                entryType === type
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Instrument Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instrument
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setInstrument(Instrument.PIANO)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
              instrument === Instrument.PIANO
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            🎹 Piano
          </button>
          <button
            type="button"
            onClick={() => setInstrument(Instrument.GUITAR)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
              instrument === Instrument.GUITAR
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            🎸 Classical Guitar
          </button>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label
            htmlFor="time"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Time
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label
          htmlFor="duration"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Duration (minutes)
        </label>
        <input
          id="duration"
          type="number"
          min="1"
          max="480"
          value={duration}
          onChange={e => setDuration(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Practice Type (only for practice entries) */}
      {entryType === LogbookEntryType.PRACTICE && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What did you work on?
          </label>
          <div className="space-y-2">
            {(
              [
                { id: 'repertoire', label: 'Repertoire Pieces' },
                { id: 'technical', label: 'Technical Exercises' },
                { id: 'sight-reading', label: 'Sight-reading' },
                { id: 'warmup', label: 'Warm-up/Fundamentals' },
              ] as const
            ).map(option => (
              <label
                key={option.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="practiceType"
                  value={option.id}
                  checked={practiceType === option.id}
                  onChange={e =>
                    setPracticeType(e.target.value as PracticeType)
                  }
                  className="text-blue-600"
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pieces/Exercises */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pieces/Exercises
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPiece}
              onChange={e => setNewPiece(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddPiece()
                }
              }}
              placeholder="+ Add piece or exercise..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddPiece}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          {pieces.length > 0 && (
            <ul className="space-y-1">
              {pieces.map((piece, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                >
                  <span className="text-gray-700">{piece.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePiece(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Techniques */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Techniques Worked On
        </label>
        <div className="flex flex-wrap gap-2">
          {commonTechniques.map(technique => (
            <button
              key={technique}
              type="button"
              onClick={() => handleToggleTechnique(technique)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                techniques.includes(technique)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {technique}
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How did it go?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: Mood.FRUSTRATED, emoji: '😤', label: 'Frustrated' },
            { value: Mood.NEUTRAL, emoji: '😐', label: 'Neutral' },
            { value: Mood.SATISFIED, emoji: '😊', label: 'Satisfied' },
            { value: Mood.EXCITED, emoji: '😃', label: 'Excited' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMood(option.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                mood === option.value
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="What did you work on? Any breakthroughs or challenges?"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Entry
        </button>
      </div>
    </form>
  )
}

export default ManualEntryForm
