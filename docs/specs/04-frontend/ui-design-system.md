# UI Design System Specification

Status: ✅ Active

## What

Visual language for Mirubato: Morandi palette via Tailwind tokens, three‑font typography, and consistent component patterns.

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

### Morandi Palette via Tailwind

- Defined in `frontendv2/tailwind.config.js` under `theme.extend.colors.morandi.*`
- Usage examples:
  - Text: `text-morandi-stone-700`, Muted: `text-morandi-stone-500`
  - Backgrounds: `bg-morandi-sage-100`, `bg-morandi-stone-50`
  - Borders: `border-morandi-stone-200`
  - Accents: `bg-morandi-blush-100`, `text-morandi-navy-600`

### Semantic Usage

- Primary action: `bg-morandi-sage-500 text-white hover:bg-morandi-sage-400`
- Destructive: `bg-red-600 text-white hover:bg-red-700`
- Informational: `text-morandi-navy-600`

## Typography System

### Font Families

- Tailwind font families: `font-inter` (UI), `font-lexend` (headers), `font-serif` (music content)
- Declared in `tailwind.config.js` (`theme.extend.fontFamily`)

### Variants and Components

- Use `Typography` component variants for consistency (`h1..h6`, `body`, `caption`, music variants)
- Responsive sizing with Tailwind: e.g., `text-sm md:text-base lg:text-lg`

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

- Tailwind spacing scale (4px base): `p-4` (16px), `p-6` (24px), `gap-4`, etc.
- Use responsive variants (`sm:p-6`, `md:gap-6`) for larger screens

## Component Patterns

### Buttons

- Use `Button` component variants: `primary`, `secondary`, `ghost`, `danger`, `icon`
- Example: `<Button variant="primary">Save</Button>`

### Cards

- Use `Card` composition (`CardHeader`, `CardTitle`, `CardContent`, `CardFooter`)

### Form Elements

- Use `Input`, `Textarea`, `Select`, `MultiSelect` from the UI library

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

- Tailwind transitions: `transition`, `duration-200`, `ease-in-out`
- Skeletons: `animate-pulse`
- Custom keyframes/live in Tailwind config where needed

## Accessibility

### Color Contrast

- **Normal text**: 4.5:1 minimum ratio
- **Large text**: 3:1 minimum ratio
- **Interactive elements**: 3:1 minimum ratio
- **Focus indicators**: Visible with 3:1 ratio

### Focus Management

- Visible focus indicators; use `focus:ring-2` and accessible outlines in components
- Provide skip links as needed for long pages

### ARIA Support

- Semantic HTML elements preferred
- ARIA labels for icons and images
- Live regions for dynamic content
- Proper heading hierarchy

## Dark Mode

- Tailwind is configured with `darkMode: 'class'`
- Components include `dark:` styles, but no global toggle is exposed today

## Code References

- Tailwind config: `frontendv2/tailwind.config.js`
- Typography component: `frontendv2/src/components/ui/Typography.tsx`
- UI library overview: `frontendv2/src/components/ui/README.md`

## Related Documentation

- [Component Library](./components.md) — Component primitives
- [Layout Patterns](./layout-patterns.md) — Layout & grid
- [Responsive Design](./responsive-design.md) — Breakpoints and mobile patterns
- [Architecture](./architecture.md) — Frontend overview

---

_Last updated: 2025-09-09 | Version 1.7.6_
