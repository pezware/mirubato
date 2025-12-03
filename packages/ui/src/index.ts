// @mirubato/ui - Shared UI Component Library
// Re-exports all UI components and utilities

// Utilities
export { cn } from './utils/cn'
export {
  useClickOutside,
  useModal,
  useModals,
  useFormValidation,
} from './utils/hooks'
export type {
  UseModalReturn,
  UseModalsReturn,
  UseFormValidationOptions,
  UseFormValidationReturn,
} from './utils/hooks'
export {
  formatDuration,
  formatDurationLong,
  formatDate,
  formatTime,
  formatDateTime,
  formatDateForInput,
  formatDateSeparator,
  formatFullDate,
  getDayOfWeek,
  getMonthYear,
  formatMonthGroup,
  formatRelativeTime,
  capitalizeTimeString,
  checkIsToday,
  checkIsYesterday,
  formatTimeOnly,
  getDateLocale,
  // Timer utilities (for raw seconds)
  formatTimerDisplay,
  formatTimerCompact,
} from './utils/dateUtils'

// Components
export { default as Autocomplete } from './components/Autocomplete'
export type {
  AutocompleteMetadata,
  AutocompleteOption,
  AutocompleteProps,
} from './components/Autocomplete'

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
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './components/Card'

export { default as Checkbox } from './components/Checkbox'
export type { CheckboxProps } from './components/Checkbox'

export { default as ClockTimePicker } from './components/ClockTimePicker'
export type {
  ClockTimePickerProps,
  ClockTimePickerLabels,
} from './components/ClockTimePicker'

export { DateSeparator } from './components/DateSeparator'
export type { DateSeparatorProps } from './components/DateSeparator'

export { DropdownMenu } from './components/DropdownMenu'
export type {
  DropdownMenuItem,
  DropdownMenuProps,
} from './components/DropdownMenu'

export { default as FormError } from './components/FormError'
export type { FormErrorProps } from './components/FormError'

export { Input, Textarea } from './components/Input'
export type { InputProps, TextareaProps } from './components/Input'

export { Loading, LoadingSkeleton, LoadingOverlay } from './components/Loading'
export type {
  LoadingProps,
  LoadingSkeletonProps,
  LoadingOverlayProps,
} from './components/Loading'

export { Modal, ModalBody, ModalFooter } from './components/Modal'
export type {
  ModalProps,
  ModalBodyProps,
  ModalFooterProps,
} from './components/Modal'

export { PeriodSelector } from './components/PeriodSelector'
export type {
  PeriodLevel,
  PeriodDate,
  PeriodStats,
  PeriodSelectorProps,
  PeriodSelectorLabels,
} from './components/PeriodSelector'

export { default as ProgressiveImage } from './components/ProgressiveImage'
export type { ProgressiveImageProps } from './components/ProgressiveImage'

export { RadioGroup, Radio } from './components/RadioGroup'
export type { RadioGroupProps, RadioProps } from './components/RadioGroup'

export { ResizableSplitView } from './components/ResizableSplitView'
export type { ResizableSplitViewProps } from './components/ResizableSplitView'

export { SegmentedControl } from './components/SegmentedControl'
export type {
  SegmentOption,
  SegmentedControlProps,
} from './components/SegmentedControl'

export { Select, MultiSelect } from './components/Select'
export type {
  SelectOption,
  SelectProps,
  MultiSelectProps,
} from './components/Select'

export { Tabs } from './components/Tabs'
export type { Tab, TabsProps } from './components/Tabs'

export { default as Tag } from './components/Tag'
export type { TagProps } from './components/Tag'

export { default as TimelineNav } from './components/TimelineNav'
export type { TimelineLevel, TimelineNavProps } from './components/TimelineNav'

// TimePicker is an alias for ClockTimePicker (for backward compatibility)
export { default as TimePicker } from './components/ClockTimePicker'

export { Toast, ToastContainer } from './components/Toast'
export type {
  ToastProps,
  ToastContainerProps,
  UseToastReturn,
} from './components/Toast'

export {
  Typography,
  MusicTitle,
  MusicComposer,
  MusicMetadata,
  MusicTitleLarge,
  MusicComposerLarge,
} from './components/Typography'
export type { TypographyProps } from './components/Typography'
