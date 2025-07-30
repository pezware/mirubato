# Mirubato UI Component Library

A collection of reusable React components following consistent design patterns and accessibility standards.

## Components

### Button

A versatile button component with multiple variants and states.

```tsx
import { Button } from '@/components/ui'

// Primary button
<Button variant="primary">Click me</Button>

// With loading state
<Button loading={loading}>Save</Button>

// Icon button
<Button variant="icon" size="icon-md">
  <Settings className="w-5 h-5" />
</Button>

// With icons
<Button leftIcon={<Play />}>Play</Button>
```

**Props:**

- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
- `size`: 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg'
- `loading`: boolean
- `fullWidth`: boolean
- `leftIcon`/`rightIcon`: ReactNode

### Modal

Accessible modal dialog with backdrop and animations.

```tsx
import { Modal, ModalBody, ModalFooter } from '@/components/ui'
;<Modal isOpen={isOpen} onClose={handleClose} title="Settings">
  <ModalBody>Content goes here</ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={handleClose}>
      Cancel
    </Button>
    <Button onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>
```

**Props:**

- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `closeOnOverlayClick`: boolean

### Card

Container component with multiple style variants.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
;<Card variant="elevated">
  <CardHeader>
    <CardTitle>Practice Stats</CardTitle>
  </CardHeader>
  <CardContent>Your content here</CardContent>
</Card>
```

**Props:**

- `variant`: 'default' | 'bordered' | 'elevated' | 'ghost'
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `hoverable`: boolean
- `onClick`: () => void

### Input & Textarea

Form input components with consistent styling.

```tsx
import { Input, Textarea } from '@/components/ui'

<Input
  label="Email"
  type="email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  error={errors.email}
  helperText="We'll never share your email"
/>

<Textarea
  label="Notes"
  value={notes}
  onChange={e => setNotes(e.target.value)}
  rows={4}
/>
```

**Props:**

- `label`: string
- `error`: string
- `helperText`: string
- `leftIcon`/`rightIcon`: ReactNode
- `fullWidth`: boolean

### Select

Accessible dropdown select with single and multi-select support.

```tsx
import { Select, MultiSelect } from '@/components/ui'

const options = [
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' }
]

<Select
  label="Instrument"
  value={instrument}
  onChange={setInstrument}
  options={options}
/>

<MultiSelect
  label="Techniques"
  value={selectedTechniques}
  onChange={setSelectedTechniques}
  options={techniqueOptions}
/>
```

### Loading

Various loading states and skeletons.

```tsx
import { Loading, LoadingSkeleton, LoadingOverlay } from '@/components/ui'

// Spinner
<Loading size="lg" text="Loading scores..." />

// Skeleton
<LoadingSkeleton className="h-20 w-full mb-4" />

// Overlay
<LoadingOverlay isLoading={isLoading}>
  <YourContent />
</LoadingOverlay>
```

### Toast

Notification system for user feedback.

```tsx
import { ToastContainer } from '@/components/ui'

// In your app root
;<ToastContainer toasts={toasts} onClose={hideToast} />

// Show a toast
showToast({
  type: 'success',
  title: 'Success!',
  message: 'Your changes have been saved.',
})
```

## Design System

### Colors

The component library uses the Morandi color palette defined in tailwind.config.js:

- `morandi-sage`: Primary green tones
- `morandi-sand`: Warm neutral tones
- `morandi-stone`: Cool neutral tones
- `morandi-blush`: Accent pink tones
- `morandi-sky`: Blue tones

### Spacing

Consistent spacing scale from 0 to 96 (0rem to 24rem).

### Typography System

Mirubato uses a sophisticated three-font system designed for optimal multilingual support and clear information hierarchy:

#### Font Families

- **Noto Serif** (`font-serif`): Music content (titles, composers) - Excellent CJK character support
- **Inter** (`font-inter`): UI elements, metadata, body text - Clean, modern sans-serif
- **Lexend** (`font-lexend`): Headers and section titles - Reading proficiency optimized

#### Typography Components

Use semantic typography components instead of manual font classes:

```tsx
import { Typography, MusicTitle, MusicComposer, MusicMetadata } from '@/components/ui'

// Semantic music content components
<MusicTitle>{score.title}</MusicTitle>
<MusicComposer>{score.composer}</MusicComposer>
<MusicMetadata>Duration: 4:30</MusicMetadata>

// General typography with variants
<Typography variant="h1">Page Title</Typography>
<Typography variant="body">Regular text content</Typography>
<Typography variant="music-title">Sonata No. 14</Typography>
```

#### Typography Hierarchy

1. **Music Titles**: `font-serif text-lg font-medium` - Noto Serif for musical pieces
2. **Music Composers**: `font-serif text-base text-gray-700` - Noto Serif for composers
3. **Section Headers**: `font-lexend text-xl font-light` - Lexend for UI headers
4. **UI Text**: `font-inter text-sm text-gray-600` - Inter for interface elements
5. **Metadata**: `font-inter text-xs text-gray-500` - Inter for supplementary info

#### Typography Constants

For advanced use cases, import typography class combinations:

```tsx
import { TYPOGRAPHY_CLASSES } from '@/constants/typography'
;<div className={TYPOGRAPHY_CLASSES.musicTitle}>Symphony No. 9</div>
```

#### Best Practices

1. **Always use Typography components** for music-related content
2. **Use semantic HTML elements** (`h1`, `h2`, `p`) with Typography components
3. **Maintain font hierarchy** - don't mix serif fonts in UI elements
4. **Test with different languages** - especially Chinese characters
5. **Check ESLint warnings** for typography consistency

#### ESLint Rules

The codebase includes custom ESLint rules to enforce typography consistency:

- Warns against generic `font-sans` usage
- Suggests Typography components for music content
- Enforces proper font family usage

Font sizes from 'xs' to '9xl' with appropriate line heights.

### Shadows

Elevation levels from 'sm' to '2xl' for depth hierarchy.

## Accessibility

All components follow WCAG 2.1 AA standards:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliance

## Best Practices

1. **Import from index**: Use `@/components/ui` for all imports
2. **Consistent variants**: Use the same variant names across components
3. **Composition**: Build complex UIs by composing simple components
4. **Responsive**: All components are mobile-first and responsive
5. **Dark mode**: Components support dark mode automatically
6. **Typography consistency**:
   - Use `MusicTitle` and `MusicComposer` for music content
   - Use `Typography` component with semantic variants
   - Never use generic `font-sans` or `font-mono`
   - Follow the three-font hierarchy (Noto Serif, Inter, Lexend)
