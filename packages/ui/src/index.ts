// @mirubato/ui - Shared UI Component Library
// Re-exports all UI components and utilities

// Utilities
export { cn } from './utils/cn'
export { formatDuration, formatDurationLong } from './utils/dateUtils'

// Components
export { default as Autocomplete } from './components/Autocomplete'
export type { AutocompleteOption } from './components/Autocomplete'

export { default as Button } from './components/Button'
export type { ButtonProps } from './components/Button'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card'

export { default as ClockTimePicker } from './components/ClockTimePicker'

export { DateSeparator } from './components/DateSeparator'

export { DropdownMenu } from './components/DropdownMenu'
export type { DropdownMenuItem } from './components/DropdownMenu'

export { default as FormError } from './components/FormError'

export { Input, Textarea } from './components/Input'
export type { InputProps, TextareaProps } from './components/Input'

export { Loading, LoadingSkeleton, LoadingOverlay } from './components/Loading'

export { Modal, ModalBody, ModalFooter } from './components/Modal'

export { PeriodSelector } from './components/PeriodSelector'
export type {
  PeriodLevel,
  PeriodDate,
  PeriodStats,
} from './components/PeriodSelector'

export { default as ProgressiveImage } from './components/ProgressiveImage'

export { ResizableSplitView } from './components/ResizableSplitView'

export { SegmentedControl } from './components/SegmentedControl'
export type { SegmentOption } from './components/SegmentedControl'

export { Select, MultiSelect } from './components/Select'
export type { SelectOption } from './components/Select'

export { Tabs } from './components/Tabs'

export { default as Tag } from './components/Tag'

export { default as TimelineNav } from './components/TimelineNav'

export { default as TimePicker } from './components/TimePicker'

export { Toast, ToastContainer } from './components/Toast'
export type { ToastProps, UseToastReturn } from './components/Toast'

export {
  Typography,
  MusicTitle,
  MusicComposer,
  MusicMetadata,
  MusicTitleLarge,
  MusicComposerLarge,
} from './components/Typography'
export type { TypographyProps } from './components/Typography'
