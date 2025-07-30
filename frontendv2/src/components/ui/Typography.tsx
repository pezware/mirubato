import React from 'react'
import { cn } from '../../utils/cn'

// Typography variant types
type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'music-title'
  | 'music-composer'
  | 'music-metadata'

// Font family types
type FontFamily = 'inter' | 'lexend' | 'serif'

export interface TypographyProps {
  variant: TypographyVariant
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
  fontFamily?: FontFamily
}

// Typography variant mappings based on design system
const variantStyles: Record<TypographyVariant, string> = {
  // Headers (use Lexend for section headers)
  h1: 'font-lexend text-4xl sm:text-5xl font-light text-mirubato-wood-800',
  h2: 'font-lexend text-3xl sm:text-4xl font-light text-mirubato-wood-800',
  h3: 'font-lexend text-2xl sm:text-3xl font-normal text-mirubato-wood-800',
  h4: 'font-lexend text-xl sm:text-2xl font-normal text-mirubato-wood-800',
  h5: 'font-lexend text-lg sm:text-xl font-medium text-mirubato-wood-800',
  h6: 'font-lexend text-base sm:text-lg font-medium text-mirubato-wood-800',

  // Body text (use Inter for UI content)
  'body-lg': 'font-inter text-lg leading-relaxed text-morandi-stone-700',
  body: 'font-inter text-base leading-relaxed text-morandi-stone-700',
  'body-sm': 'font-inter text-sm leading-relaxed text-morandi-stone-600',
  caption: 'font-inter text-xs leading-tight text-morandi-stone-500',

  // Music-specific typography (use Noto Serif for musical content)
  'music-title':
    'font-serif text-lg sm:text-xl font-medium text-gray-900 leading-tight',
  'music-composer': 'font-serif text-base text-gray-700',
  'music-metadata': 'font-inter text-sm text-gray-600',
}

// Default HTML elements for each variant
const defaultElements: Record<TypographyVariant, keyof JSX.IntrinsicElements> =
  {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    'body-lg': 'p',
    body: 'p',
    'body-sm': 'p',
    caption: 'span',
    'music-title': 'h3',
    'music-composer': 'p',
    'music-metadata': 'span',
  }

export function Typography({
  variant,
  children,
  className,
  as,
  fontFamily,
  ...props
}: TypographyProps) {
  const Component = as || defaultElements[variant]

  // Override font family if specified
  let styles = variantStyles[variant]
  if (fontFamily) {
    // Remove existing font-family class and add new one
    styles = styles.replace(/font-(inter|lexend|serif)/, `font-${fontFamily}`)
  }

  return (
    <Component className={cn(styles, className)} {...props}>
      {children}
    </Component>
  )
}

// Convenience components for common use cases
export const MusicTitle = ({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="music-title" className={className} {...props}>
    {children}
  </Typography>
)

export const MusicComposer = ({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="music-composer" className={className} {...props}>
    {children}
  </Typography>
)

export const MusicMetadata = ({
  children,
  className,
  ...props
}: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="music-metadata" className={className} {...props}>
    {children}
  </Typography>
)
