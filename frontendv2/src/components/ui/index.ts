// UI Component Library - Re-exports from @mirubato/ui plus frontendv2-specific components
// This file maintains backward compatibility while transitioning to the shared package

// Re-export all shared components from @mirubato/ui
export {
  // Utilities
  cn,
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
  // Components
  Autocomplete,
  Button,
  Card,
  Checkbox,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ClockTimePicker,
  DateSeparator,
  DropdownMenu,
  FormError,
  Input,
  Textarea,
  Loading,
  LoadingSkeleton,
  LoadingOverlay,
  Modal,
  ModalBody,
  ModalFooter,
  PeriodSelector,
  ProgressiveImage,
  RadioGroup,
  Radio,
  ResizableSplitView,
  SegmentedControl,
  Select,
  MultiSelect,
  Tabs,
  Tag,
  TimelineNav,
  TimePicker,
  Toast,
  ToastContainer,
  Typography,
  MusicTitle,
  MusicComposer,
  MusicMetadata,
  MusicTitleLarge,
  MusicComposerLarge,
} from '@mirubato/ui'

// Re-export types from @mirubato/ui
export type {
  AutocompleteOption,
  ButtonProps,
  CheckboxProps,
  DropdownMenuItem,
  InputProps,
  TextareaProps,
  PeriodLevel,
  PeriodDate,
  PeriodStats,
  RadioGroupProps,
  RadioProps,
  SegmentOption,
  SelectOption,
  ToastProps,
  UseToastReturn,
  TypographyProps,
} from '@mirubato/ui'

// Frontendv2-specific components (have business logic dependencies)
export { EntryDetailPanel } from './EntryDetailPanel'
export { CompactEntryRow } from './CompactEntryRow'
export { ToastProvider } from './ToastProvider'

// Protected button components (prevent double-clicks/submissions)
export { default as ProtectedButton } from './ProtectedButton'
export {
  createProtectedButton,
  LogPracticeButton,
  SubmitButton,
} from './ProtectedButtonFactory'
