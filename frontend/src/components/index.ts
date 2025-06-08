// Central export for all components
export { default as LandingPage } from './LandingPage'
export { default as PianoKey } from './PianoKey'
export { default as PianoChord } from './PianoChord'
export { MusicPlayer } from './MusicPlayer'
export type { PlayableNote } from './MusicPlayer'
export { CircularControl } from './CircularControl'
export { SheetMusicDisplay } from './SheetMusicDisplay'
export { ProtectedRoute } from './ProtectedRoute'
export { UserStatusIndicator } from './UserStatusIndicator'
export { SaveProgressPrompt } from './SaveProgressPrompt'
export { AuthModal } from './AuthModal'
export { ErrorBoundary, SheetMusicErrorBoundary } from './ErrorBoundary'
export { PracticeHeader } from './PracticeHeader'
export type { PracticeMode } from './PracticeHeader'
export { PracticeControls } from './PracticeControls'
export { PracticeNotation } from './PracticeNotation'
export * from './ExerciseGenerator'
export { MultiVoiceSheetMusicDisplay } from './MultiVoiceSheetMusicDisplay'
export { MultiVoicePlayer } from './MultiVoicePlayer'

// Phase 5 Multi-Voice UI Components
export { VoiceControl } from './VoiceControl'
export type { VoiceControlProps } from './VoiceControl'

export {
  StaffDisplayOptions,
  defaultDisplayOptions,
  displayPresets,
} from './StaffDisplayOptions'
export type {
  StaffDisplayOptions as StaffDisplayOptionsType,
  StaffDisplayOptionsProps,
} from './StaffDisplayOptions'

export {
  PracticeModeSelector,
  PracticeMode as MultiVoicePracticeMode,
  practiceModePresets,
} from './PracticeModeSelector'
export type {
  PracticeModeConfig,
  PracticeModeSelectorProps,
} from './PracticeModeSelector'

export { MultiVoicePracticeView } from './MultiVoicePracticeView'
export type { MultiVoicePracticeViewProps } from './MultiVoicePracticeView'
