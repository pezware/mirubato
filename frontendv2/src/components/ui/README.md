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

### Typography

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
