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
  // Timer utilities (for raw seconds)
  formatTimerDisplay,
  formatTimerCompact,
  // Hooks
  useClickOutside,
  useClickProtection,
  useModal,
  useModals,
  useFormValidation,
  // Components
  Autocomplete,
  Button,
  ProtectedButton,
  createProtectedButton,
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
  // Hooks
  UseClickProtectionReturn,
  UseModalReturn,
  UseModalsReturn,
  UseFormValidationOptions,
  UseFormValidationReturn,
  // Autocomplete
  AutocompleteOption,
  AutocompleteProps,
  // Button
  ButtonProps,
  // ProtectedButton
  ProtectedButtonProps,
  // Card
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
  // Checkbox
  CheckboxProps,
  // ClockTimePicker
  ClockTimePickerProps,
  ClockTimePickerLabels,
  // DateSeparator
  DateSeparatorProps,
  // DropdownMenu
  DropdownMenuItem,
  DropdownMenuProps,
  // FormError
  FormErrorProps,
  // Input
  InputProps,
  TextareaProps,
  // Loading
  LoadingProps,
  LoadingSkeletonProps,
  LoadingOverlayProps,
  // Modal
  ModalProps,
  ModalBodyProps,
  ModalFooterProps,
  // PeriodSelector
  PeriodLevel,
  PeriodDate,
  PeriodStats,
  PeriodSelectorProps,
  PeriodSelectorLabels,
  // ProgressiveImage
  ProgressiveImageProps,
  // RadioGroup
  RadioGroupProps,
  RadioProps,
  // ResizableSplitView
  ResizableSplitViewProps,
  // SegmentedControl
  SegmentOption,
  SegmentedControlProps,
  // Select
  SelectOption,
  SelectProps,
  MultiSelectProps,
  // Tabs
  Tab,
  TabsProps,
  // Tag
  TagProps,
  // TimelineNav
  TimelineLevel,
  TimelineNavProps,
  // Toast
  ToastProps,
  ToastContainerProps,
  UseToastReturn,
  // Typography
  TypographyProps,
} from '@mirubato/ui'

// Frontendv2-specific components (have business logic dependencies)
export { EntryDetailPanel } from './EntryDetailPanel'
export type { EntryDetailPanelProps } from './EntryDetailPanel'

export { CompactEntryRow } from './CompactEntryRow'
export type { CompactEntryRowProps } from './CompactEntryRow'

export { ToastProvider } from './ToastProvider'

// Pre-configured protected button variants (app-specific configurations)
export { LogPracticeButton, SubmitButton } from './ProtectedButtonFactory'
