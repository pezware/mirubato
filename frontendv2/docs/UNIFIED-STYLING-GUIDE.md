# Unified Styling Guide

This guide ensures consistent UI implementation across the Mirubato frontend.

## Core Principles

1. **Component-First**: Always use UI components from `/components/ui/` instead of native HTML elements
2. **Mobile-First**: Design for mobile, enhance for desktop
3. **Accessibility**: Minimum 44px touch targets, proper ARIA labels
4. **Consistency**: Use design system tokens for spacing, colors, typography

## Component Usage

### Buttons

**Always use the Button component** instead of native `<button>` elements:

```tsx
// ❌ Don't use native buttons
<button className="px-4 py-2 bg-morandi-sage-500...">Click me</button>

// ✅ Use Button component
<Button variant="primary" size="md">Click me</Button>
```

#### Button Variants:

- `primary`: Main actions (sage green background)
- `secondary`: Secondary actions (stone background)
- `ghost`: Text-only buttons
- `danger`: Destructive actions (red)
- `icon`: Icon-only buttons

#### Button Sizes:

- `sm`: Small buttons (mobile-friendly)
- `md`: Default size
- `lg`: Large buttons
- `icon-sm/md/lg`: Icon button sizes

### Icons

Use lucide-react icons consistently:

```tsx
import { Menu, X, Cloud, HardDrive } from 'lucide-react'

// Icon sizes
<Menu className="w-5 h-5" />  // Standard size
<Menu className="w-4 h-4" />  // Small size
```

### Responsive Design

Use Tailwind's responsive prefixes:

```tsx
// Mobile-first approach
className = 'text-sm sm:text-base' // Small on mobile, base on desktop
className = 'px-3 sm:px-4' // Smaller padding on mobile
className = 'hidden sm:block' // Hide on mobile, show on desktop
```

### Color Palette

Use our Morandi color system:

```tsx
// Primary colors
'morandi-sage-500' // Primary actions
'morandi-stone-200' // Borders, dividers
'morandi-stone-600' // Text
'morandi-sky-100' // Highlights

// Text colors
'text-morandi-stone-800' // Primary text
'text-morandi-stone-600' // Secondary text
'text-morandi-stone-500' // Muted text
```

### Spacing

Use consistent spacing from design system:

```tsx
// From constants/design-system.ts
spacing: {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
}
```

## Migration Checklist

When updating existing components:

1. **Replace native elements**:
   - `<button>` → `<Button>`
   - `<input>` → `<Input>`
   - `<select>` → `<Select>`
   - `<textarea>` → `<Textarea>`

2. **Update icon usage**:
   - Remove inline SVGs
   - Use lucide-react icons
   - Apply consistent sizing

3. **Apply responsive patterns**:
   - Mobile-first classes
   - Touch-friendly targets (min 44px)
   - Proper breakpoints (sm:)

4. **Use design tokens**:
   - Replace hardcoded colors
   - Use spacing constants
   - Apply typography scale

## Internationalization

Always use translation keys:

```tsx
// ❌ Don't hardcode text
<Button>Sign In</Button>

// ✅ Use translations
<Button>{t('auth:signIn')}</Button>
```

## Caching Strategy

For auth and user state:

- Use Zustand stores with persist middleware
- Cache auth tokens in localStorage
- Implement proper cache invalidation on logout

## Examples

### Before (PR #201 style):

```tsx
<button
  onClick={onSignInClick}
  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-morandi-sage-500 text-white text-xs sm:text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
>
  {t('auth:signIn')}
</button>
```

### After (Unified style):

```tsx
<Button onClick={onSignInClick} variant="primary" size="sm">
  {t('auth:signIn')}
</Button>
```

## Testing

When refactoring UI components:

1. Run component tests: `npm test`
2. Check TypeScript: `npm run type-check`
3. Verify mobile responsiveness
4. Test with different languages
5. Ensure accessibility (ARIA labels, keyboard navigation)

## Next Steps

1. Continue refactoring remaining components with native buttons (~150 files)
2. Update all icon usage to lucide-react
3. Apply consistent spacing and typography
4. Ensure all text uses i18n translations
