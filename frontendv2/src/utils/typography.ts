import { typography } from '../constants/design-system'
import { cn } from './cn'

/**
 * Typography utility functions for consistent font application
 */

// Pre-built class combinations for common use cases
export const typographyClasses = {
  // Music-related content (use Noto Serif)
  musicTitle: cn(typography.hierarchy.music, typography.scale.musicTitle),
  musicComposer: cn(typography.hierarchy.music, typography.scale.musicComposer),
  musicMetadata: cn(typography.hierarchy.ui, typography.scale.musicMetadata),

  // UI content (use Inter)
  sectionHeader: cn(
    typography.hierarchy.header,
    typography.scale.sectionHeader
  ),
  cardTitle: cn(typography.hierarchy.ui, typography.scale.cardTitle),
  bodyText: cn(typography.hierarchy.ui, typography.scale.bodyText),
  caption: cn(typography.hierarchy.ui, typography.scale.caption),
  small: cn(typography.hierarchy.ui, typography.scale.small),
} as const

/**
 * Get typography classes for music content
 * @param type - The type of music content
 * @returns Combined class string
 */
export function getMusicTypography(
  type: 'title' | 'composer' | 'metadata'
): string {
  switch (type) {
    case 'title':
      return typographyClasses.musicTitle
    case 'composer':
      return typographyClasses.musicComposer
    case 'metadata':
      return typographyClasses.musicMetadata
    default:
      return typographyClasses.bodyText
  }
}

/**
 * Get typography classes for UI content
 * @param type - The type of UI content
 * @returns Combined class string
 */
export function getUITypography(
  type: 'header' | 'title' | 'body' | 'caption' | 'small'
): string {
  switch (type) {
    case 'header':
      return typographyClasses.sectionHeader
    case 'title':
      return typographyClasses.cardTitle
    case 'body':
      return typographyClasses.bodyText
    case 'caption':
      return typographyClasses.caption
    case 'small':
      return typographyClasses.small
    default:
      return typographyClasses.bodyText
  }
}

/**
 * Validate font consistency across the app
 * @returns Array of validation results
 */
export function validateTypographyUsage() {
  // This would be used in tests to ensure consistent font application
  return {
    rules: [
      'Musical titles and composers should use font-serif (Noto Serif)',
      'UI elements should use font-inter (Inter)',
      'Section headers should use font-lexend (Lexend)',
      'Metadata should use font-inter with appropriate sizing',
    ],
    validationPatterns: {
      musicContent: /font-serif.*text-(lg|xl|base)/,
      uiContent: /font-inter.*text-(sm|base|lg)/,
      headers: /font-lexend.*text-(xl|2xl|3xl)/,
    },
  }
}
