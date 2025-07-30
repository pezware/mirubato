/**
 * Typography Constants
 *
 * Centralized typography class combinations for consistent usage across components.
 * These constants are designed to work with our three-font system:
 * - Noto Serif: Music content (titles, composers)
 * - Inter: UI elements, metadata, body text
 * - Lexend: Headers and section titles
 */

export const TYPOGRAPHY_CLASSES = {
  // Music-specific typography (Noto Serif)
  musicTitle:
    'font-serif text-lg sm:text-xl font-medium text-gray-900 leading-tight',
  musicComposer: 'font-serif text-base text-gray-700',
  musicTitleSmall: 'font-serif text-base font-medium text-gray-900',
  musicComposerSmall: 'font-serif text-sm text-gray-700',

  // Section headers (Lexend)
  sectionHeader: 'font-lexend text-xl font-light text-mirubato-wood-800',
  sectionHeaderLarge: 'font-lexend text-2xl font-light text-mirubato-wood-800',
  sectionHeaderSmall: 'font-lexend text-lg font-normal text-mirubato-wood-800',

  // UI Text (Inter)
  uiText: 'font-inter text-sm text-gray-600',
  uiTextLarge: 'font-inter text-base text-gray-700',
  uiLabel: 'font-inter text-sm font-medium text-gray-700',

  // Metadata and captions (Inter)
  metadata: 'font-inter text-xs text-gray-500',
  caption: 'font-inter text-sm text-gray-600',

  // Navigation and buttons (Inter)
  navText: 'font-inter text-sm font-medium text-gray-700',
  buttonText: 'font-inter text-sm font-medium',

  // Form elements (Inter)
  formLabel: 'font-inter text-sm font-medium text-gray-700',
  formHelperText: 'font-inter text-xs text-gray-500',
  formErrorText: 'font-inter text-xs text-red-600',

  // Page titles and headers (Lexend)
  pageTitle: 'font-lexend text-3xl font-light text-mirubato-wood-800',
  pageSubtitle: 'font-lexend text-xl font-light text-gray-600',

  // Card and component titles (Lexend)
  cardTitle: 'font-lexend text-lg font-normal text-mirubato-wood-800',
  modalTitle: 'font-lexend text-xl font-light text-mirubato-wood-800',
} as const

/**
 * Typography size variants for responsive design
 */
export const TYPOGRAPHY_SIZES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
} as const

/**
 * Font weight variants
 */
export const FONT_WEIGHTS = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

/**
 * Color variants for text
 */
export const TEXT_COLORS = {
  primary: 'text-gray-900',
  secondary: 'text-gray-700',
  muted: 'text-gray-600',
  subtle: 'text-gray-500',
  error: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  brand: 'text-mirubato-wood-800',
} as const

/**
 * Helper function to combine typography classes
 */
export function combineTypographyClasses(
  base: keyof typeof TYPOGRAPHY_CLASSES,
  overrides?: string
): string {
  const baseClasses = TYPOGRAPHY_CLASSES[base]
  return overrides ? `${baseClasses} ${overrides}` : baseClasses
}

/**
 * Type definitions for better TypeScript support
 */
export type TypographyClass = keyof typeof TYPOGRAPHY_CLASSES
export type TypographySize = keyof typeof TYPOGRAPHY_SIZES
export type FontWeight = keyof typeof FONT_WEIGHTS
export type TextColor = keyof typeof TEXT_COLORS
