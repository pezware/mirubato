// Central export for all components
export { default as LandingPage } from './LandingPage'
export { default as PianoKey } from './PianoKey'
export { default as PianoChord } from './PianoChord'
export { CircularControl } from './CircularControl'
export { ProtectedRoute } from './ProtectedRoute'
export { UserStatusIndicator } from './UserStatusIndicator'
export { SaveProgressPrompt } from './SaveProgressPrompt'
export { AuthModal } from './AuthModal'
export { ErrorBoundary, SheetMusicErrorBoundary } from './ErrorBoundary'
export { PracticeHeader } from './PracticeHeader'
export type { PracticeMode } from './PracticeHeader'
export { MultiVoiceSheetMusicDisplay } from './MultiVoiceSheetMusicDisplay'
export { MultiVoicePlayer } from './MultiVoicePlayer'

// Phase 5 Multi-Voice UI Components
export { VoiceControl } from './VoiceControl'
export type { VoiceControlProps } from './VoiceControl'

export { StaffDisplayOptions } from './StaffDisplayOptions'
export { defaultDisplayOptions, displayPresets } from './staffDisplayConfig'
export type {
  StaffDisplayOptions as StaffDisplayOptionsType,
  StaffDisplayOptionsProps,
} from './StaffDisplayOptions'

export { PracticeModeSelector } from './PracticeModeSelector'
export { practiceModePresets } from './practiceModePresets'
export { PracticeMode as MultiVoicePracticeMode } from './practiceModeTypes'
export type { PracticeModeConfig } from './practiceModeTypes'
export type { PracticeModeSelectorProps } from './PracticeModeSelector'

export { MultiVoicePracticeView } from './MultiVoicePracticeView'
export type { MultiVoicePracticeViewProps } from './MultiVoicePracticeView'

// Logbook Components
export { default as ManualEntryForm } from './ManualEntryForm'
export { default as LogbookEntryList } from './LogbookEntryList'
