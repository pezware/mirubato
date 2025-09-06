# UI Design System Specification

## Overview

Mirubato's UI design system is built on a carefully crafted Morandi color palette, three-font typography system, and consistent component patterns. This specification defines the visual language and design principles used throughout the application.

## Design Principles

### 1. Minimalist Aesthetic

- Clean, uncluttered interfaces
- Generous white space
- Focus on content over decoration
- Subtle, muted colors from Morandi palette

### 2. Consistency

- Unified component library
- Predictable interaction patterns
- Consistent spacing and typography
- Platform-appropriate conventions

### 3. Accessibility First

- WCAG AA compliance minimum
- High contrast ratios
- Clear focus states
- Keyboard navigation support

### 4. Performance

- Lightweight components
- Optimized assets
- Lazy loading where appropriate
- Smooth animations (60fps)

## Color System

### Morandi Palette

The application uses a sophisticated Morandi-inspired color palette with muted, harmonious tones:

#### Primary Colors

```scss
// Sage - Primary actions, success states
$morandi-sage: {
  50: #f4f5f2,
  100: #e8ebe4,
  200: #d4d9cc,
  300: #b8c2a9,
  400: #9ca888,
  500: #818f6d,  // Primary
  600: #6b7857,
  700: #555e45
}

// Stone - Text, borders, neutral elements
$morandi-stone: {
  50: #f8f7f6,
  100: #f0efec,
  200: #e2dfd9,
  300: #ccc7bd,
  400: #b5afa1,
  500: #9e9789,
  600: #7a756b,
  700: #5c5850,  // Primary text
  900: #3a3632
}

// Sand - Warnings, featured content
$morandi-sand: {
  100: #f5f2ed,
  200: #e8e2d5,
  300: #d4c4b0,
  400: #c1a68b,
  500: #ad8866
}

// Navy - Links, information
$morandi-navy: {
  100: #e6f0f5,
  200: #c2d9e6,
  300: #9ec2d6,
  400: #7aacc7,
  500: #2c5282,
  600: #1e3a5b,
  700: #1a365d
}
```

#### Accent Colors

```scss
// Additional accent colors for specific use cases
$morandi-blush: { ... }  // Notifications, alerts
$morandi-sky: { ... }     // Information states
$morandi-purple: { ... }  // Special features
$morandi-rose: { ... }    // Errors, critical states
$morandi-peach: { ... }   // Warnings, attention
```

### Semantic Colors

```scss
// Applied semantic meaning to base colors
$colors: {
  primary: $morandi-sage-500,
  secondary: $morandi-stone-500,
  success: $morandi-sage-400,
  warning: $morandi-sand-400,
  error: $morandi-rose-400,
  info: $morandi-sky-400,

  // Text colors
  text-primary: $morandi-stone-700,
  text-secondary: $morandi-stone-600,
  text-muted: $morandi-stone-400,

  // Background colors
  bg-primary: #FAFAF8,
  bg-secondary: #F5F5F0,
  bg-tertiary: #EFEFEA,

  // Border colors
  border-light: $morandi-stone-200,
  border-medium: $morandi-stone-300,
  border-dark: $morandi-stone-400
}
```

## Typography System

### Font Families

Mirubato uses a three-font system optimized for readability and multilingual support:

```scss
// Typography hierarchy
$fonts: {
  // Music content - elegant serif
  serif: 'Noto Serif',      // Titles, composers

  // UI elements - clean sans-serif
  sans: 'Inter',             // Body text, UI elements

  // Headers - distinctive display font
  display: 'Lexend'          // Section headers, navigation
}
```

### Type Scale

```scss
// Font sizes following modular scale (1.25 ratio)
$font-sizes: {
  xs: 0.75rem,    // 12px
  sm: 0.875rem,   // 14px
  base: 1rem,     // 16px
  lg: 1.125rem,   // 18px
  xl: 1.25rem,    // 20px
  '2xl': 1.5rem,  // 24px
  '3xl': 1.875rem,// 30px
  '4xl': 2.25rem, // 36px
  '5xl': 3rem     // 48px
}

// Font weights
$font-weights: {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700
}

// Line heights
$line-heights: {
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2
}
```

### Typography Components

```tsx
// Semantic typography components
<MusicTitle>Moonlight Sonata</MusicTitle>       // Noto Serif, lg, medium
<MusicComposer>Ludwig van Beethoven</MusicComposer> // Noto Serif, base, normal
<MusicMetadata>Opus 27, No. 2</MusicMetadata>    // Inter, sm, normal

// General typography
<Typography variant="h1">Page Title</Typography>  // Lexend, 3xl, semibold
<Typography variant="h2">Section</Typography>     // Lexend, 2xl, medium
<Typography variant="body">Content</Typography>   // Inter, base, normal
<Typography variant="caption">Note</Typography>   // Inter, sm, normal
```

## Spacing System

### Base Unit

All spacing follows an 8px base unit system:

```scss
$spacing: {
  0: 0,
  1: 0.25rem,  // 4px
  2: 0.5rem,   // 8px
  3: 0.75rem,  // 12px
  4: 1rem,     // 16px
  5: 1.25rem,  // 20px
  6: 1.5rem,   // 24px
  8: 2rem,     // 32px
  10: 2.5rem,  // 40px
  12: 3rem,    // 48px
  16: 4rem,    // 64px
  20: 5rem,    // 80px
  24: 6rem     // 96px
}
```

### Component Spacing

```scss
// Consistent padding/margin for components
$component-spacing: {
  // Cards
  card-padding: $spacing-6,           // 24px desktop
  card-padding-mobile: $spacing-4,    // 16px mobile

  // Buttons
  button-padding-x: $spacing-6,       // 24px
  button-padding-y: $spacing-3,       // 12px

  // Forms
  input-padding-x: $spacing-3,        // 12px
  input-padding-y: $spacing-2,        // 8px

  // Layout
  container-padding: $spacing-6,      // 24px
  section-spacing: $spacing-12,       // 48px
  element-spacing: $spacing-4         // 16px
}
```

## Component Patterns

### Buttons

```scss
// Button variants
.btn-primary {
  @apply px-6 py-3 
    bg-morandi-sage-500 
    text-white 
    font-medium 
    rounded-lg 
    hover:bg-morandi-sage-400 
    transition-all duration-200
    disabled:opacity-50;
}

.btn-secondary {
  @apply px-6 py-3 
    border border-morandi-stone-300 
    text-morandi-stone-600 
    rounded-lg 
    hover:bg-morandi-stone-100;
}

.btn-ghost {
  @apply px-4 py-2 
    text-morandi-stone-600 
    hover:text-morandi-stone-700 
    hover:bg-morandi-stone-100 
    rounded-lg;
}
```

### Cards

```scss
.card {
  @apply p-6 
    bg-white 
    rounded-lg 
    shadow-sm 
    border border-morandi-stone-200;
}

.card-hover {
  @apply card 
    hover:shadow-md 
    transition-all duration-200;
}
```

### Form Elements

```scss
.input {
  @apply w-full px-3 py-2 
    bg-white 
    border border-morandi-stone-300 
    rounded-lg 
    focus:ring-2 
    focus:ring-morandi-sage-400 
    focus:border-transparent;
}

.textarea {
  @apply input 
    resize-none;
}

.select {
  @apply input 
    appearance-none 
    bg-no-repeat 
    bg-right 
    pr-10;
}
```

## Icons & Imagery

### Icon System

- **Library**: Lucide React (consistent, minimal icons)
- **Size**: 16px (sm), 20px (default), 24px (lg)
- **Color**: Inherit from text color
- **Style**: Outline (2px stroke)

### Image Guidelines

- **Format**: WebP with fallback to JPG/PNG
- **Loading**: Lazy load with blur-up placeholder
- **Aspect Ratios**: 16:9 (hero), 4:3 (cards), 1:1 (avatars)
- **Optimization**: Responsive images with srcset

## Animation & Transitions

### Timing Functions

```scss
$transitions: {
  fast: 150ms ease-in-out,
  base: 200ms ease-in-out,
  slow: 300ms ease-in-out,

  // Easing functions
  ease-in: cubic-bezier(0.4, 0, 1, 1),
  ease-out: cubic-bezier(0, 0, 0.2, 1),
  ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
}
```

### Animation Patterns

```scss
// Hover effects
.hover-lift {
  transition: transform 200ms ease-in-out;
  &:hover {
    transform: translateY(-2px);
  }
}

// Focus effects
.focus-ring {
  transition: box-shadow 150ms ease-in-out;
  &:focus {
    box-shadow: 0 0 0 3px rgba(129, 143, 109, 0.3);
  }
}

// Loading states
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  animation: pulse 2s ease-in-out infinite;
}
```

## Accessibility

### Color Contrast

- **Normal text**: 4.5:1 minimum ratio
- **Large text**: 3:1 minimum ratio
- **Interactive elements**: 3:1 minimum ratio
- **Focus indicators**: Visible with 3:1 ratio

### Focus Management

```scss
// Consistent focus styles
:focus-visible {
  outline: 2px solid $morandi-sage-500;
  outline-offset: 2px;
}

// Skip links
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  z-index: 100;

  &:focus {
    top: 0;
  }
}
```

### ARIA Support

- Semantic HTML elements preferred
- ARIA labels for icons and images
- Live regions for dynamic content
- Proper heading hierarchy

## Dark Mode (Future)

Currently, the application is light-mode only with infrastructure in place for future dark mode support:

```scss
// Dark mode preparation (not yet implemented)
:root {
  color-scheme: light;
}

// Future dark mode colors would use darker Morandi tones
// maintaining the same muted, sophisticated aesthetic
```

## Related Documentation

- [Component Library](./components.md) - Component implementation details
- [Layout Patterns](./layout-patterns.md) - Layout system and grid
- [Responsive Design](./responsive-design.md) - Breakpoints and mobile patterns
- [Architecture](./architecture.md) - Frontend architecture

---

_Last updated: December 2024 | Version 1.7.6_
