# Mirubato UI Component Library

## Overview

The Mirubato UI Component Library provides a consistent set of reusable React components following the Morandi design system. All components are built with accessibility in mind and support the application's light theme.

## Design System

### Color Palette (Morandi)

```typescript
// Primary colors
sage: {
  50: '#f6f7f5',
  100: '#e8ebe4',
  200: '#d5dccb',
  300: '#b7c2a7',
  400: '#98a883',
  500: '#798e61',  // Primary
  600: '#5f714c',
  700: '#4c5a3e',
  800: '#3f4934',
  900: '#363f2e',
}

// Accent colors
stone: { /* Neutral grays */ }
peach: { /* Warm accents */ }
rose: { /* Error/danger states */ }

// Semantic colors
primary: sage-500
secondary: stone-400
danger: rose-500
success: sage-600
warning: peach-500
```

### Typography

```typescript
// Font families
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}

// Font sizes
text-xs: 0.75rem    // 12px
text-sm: 0.875rem   // 14px
text-base: 1rem     // 16px
text-lg: 1.125rem   // 18px
text-xl: 1.25rem    // 20px
text-2xl: 1.5rem    // 24px
```

### Spacing

```typescript
// Consistent spacing scale
0: 0
1: 0.25rem  // 4px
2: 0.5rem   // 8px
3: 0.75rem  // 12px
4: 1rem     // 16px
5: 1.25rem  // 20px
6: 1.5rem   // 24px
8: 2rem     // 32px
10: 2.5rem  // 40px
12: 3rem    // 48px
16: 4rem    // 64px
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui/button'

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="danger">Danger Action</Button>
<Button variant="icon" aria-label="Settings">
  <SettingsIcon />
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// With icons
<Button leftIcon={<SaveIcon />}>Save</Button>
<Button rightIcon={<ArrowRightIcon />}>Next</Button>
```

**Props:**

- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `loading`: boolean
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode
- `fullWidth`: boolean
- All standard button HTML attributes

### Modal

Accessible modal dialog using @headlessui/react.

```tsx
import { Modal } from '@/components/ui/modal'

;<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </div>
</Modal>
```

**Props:**

- `isOpen`: boolean (required)
- `onClose`: () => void (required)
- `title`: string
- `description`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `children`: ReactNode

### Card

A flexible container component with multiple style variants.

```tsx
import { Card } from '@/components/ui/card'

// Default card
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// With variants
<Card variant="bordered">Bordered Card</Card>
<Card variant="elevated">Elevated with shadow</Card>
<Card variant="ghost">Ghost variant</Card>

// Interactive
<Card hover clickable onClick={handleClick}>
  Clickable card with hover effect
</Card>
```

**Props:**

- `variant`: 'default' | 'bordered' | 'elevated' | 'ghost'
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `hover`: boolean
- `clickable`: boolean
- All standard div HTML attributes

### Input

Form input component with consistent styling and error states.

```tsx
import { Input } from '@/components/ui/input'

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error="Please enter a valid email"
  required
/>

// With icon
<Input
  label="Search"
  leftIcon={<SearchIcon />}
  placeholder="Search..."
/>

// Textarea variant
<Input
  as="textarea"
  label="Notes"
  rows={4}
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

**Props:**

- `label`: string
- `error`: string
- `hint`: string
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode
- `as`: 'input' | 'textarea'
- All standard input/textarea HTML attributes

### Select

Dropdown select component with single and multi-select support.

```tsx
import { Select, MultiSelect } from '@/components/ui/select'

// Single select
<Select
  label="Instrument"
  options={[
    { value: 'piano', label: 'Piano' },
    { value: 'guitar', label: 'Guitar' },
  ]}
  value={instrument}
  onChange={setInstrument}
/>

// Multi-select
<MultiSelect
  label="Tags"
  options={tagOptions}
  value={selectedTags}
  onChange={setSelectedTags}
  placeholder="Select tags..."
/>
```

**Props:**

- `label`: string
- `options`: Array<{ value: string, label: string }>
- `value`: string | string[]
- `onChange`: (value: string | string[]) => void
- `placeholder`: string
- `error`: string
- `disabled`: boolean

### Loading

Various loading indicators for different use cases.

```tsx
import { Loading } from '@/components/ui/loading'

// Spinner (default)
<Loading />

// Different types
<Loading type="spinner" size="lg" />
<Loading type="dots" />
<Loading type="pulse" />

// Skeleton loader
<Loading type="skeleton" className="h-4 w-32" />
<Loading type="skeleton" className="h-12 w-full rounded" />

// With text
<Loading text="Loading data..." />
```

**Props:**

- `type`: 'spinner' | 'dots' | 'pulse' | 'skeleton'
- `size`: 'sm' | 'md' | 'lg'
- `text`: string
- `className`: string

### Toast

Notification system for user feedback.

```tsx
import { toast } from '@/components/ui/toast'

// Success toast
toast.success('Changes saved successfully!')

// Error toast
toast.error('Something went wrong. Please try again.')

// Warning toast
toast.warning('Your session will expire in 5 minutes.')

// Info toast
toast.info('New features are available!')

// Custom duration
toast.success('Saved!', { duration: 2000 })

// With action
toast.success('File uploaded', {
  action: {
    label: 'View',
    onClick: () => console.log('View clicked'),
  },
})
```

**Options:**

- `duration`: number (milliseconds)
- `position`: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
- `action`: { label: string, onClick: () => void }

### TimePicker

Custom time picker with brand-consistent styling (desktop) and native fallback (mobile).

```tsx
import { TimePicker } from '@/components/ui/time-picker'

;<TimePicker
  value={duration} // in seconds
  onChange={setDuration}
  min={0}
  max={7200} // 2 hours
  step={300} // 5-minute increments
/>
```

**Props:**

- `value`: number (seconds)
- `onChange`: (value: number) => void
- `min`: number
- `max`: number
- `step`: number
- `label`: string

## Best Practices

### 1. Accessibility

- Always provide proper ARIA labels for icon-only buttons
- Use semantic HTML elements
- Ensure keyboard navigation works properly
- Maintain proper focus management in modals

### 2. Consistency

- Use the provided variants instead of custom styling
- Follow the established color palette
- Maintain consistent spacing using the spacing scale
- Use the same component for similar UI patterns

### 3. Performance

- Import only the components you need
- Use lazy loading for heavy components
- Avoid inline styles; use Tailwind classes
- Memoize expensive computations

### 4. Responsive Design

- All components are mobile-first
- Test on various screen sizes
- Use responsive variants where available
- Consider touch targets for mobile (minimum 44x44px)

## Examples

### Form Example

```tsx
import { Card, Input, Select, Button } from '@/components/ui'

function PracticeEntryForm() {
  const [duration, setDuration] = useState('')
  const [instrument, setInstrument] = useState('piano')
  const [notes, setNotes] = useState('')

  return (
    <Card variant="bordered">
      <h2 className="text-xl font-semibold mb-4">Log Practice Session</h2>

      <div className="space-y-4">
        <Input
          label="Duration (minutes)"
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          required
        />

        <Select
          label="Instrument"
          options={[
            { value: 'piano', label: 'Piano' },
            { value: 'guitar', label: 'Guitar' },
          ]}
          value={instrument}
          onChange={setInstrument}
        />

        <Input
          as="textarea"
          label="Notes"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How did the practice go?"
        />

        <div className="flex gap-2">
          <Button variant="ghost" fullWidth>
            Cancel
          </Button>
          <Button variant="primary" fullWidth>
            Save Entry
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

### Modal Dialog Example

```tsx
import { Modal, Button } from '@/components/ui'

function DeleteConfirmation({ isOpen, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Practice Entry"
      description="Are you sure you want to delete this entry? This action cannot be undone."
      size="sm"
    >
      <div className="flex gap-2 mt-6">
        <Button variant="ghost" onClick={onClose} fullWidth>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} fullWidth>
          Delete Entry
        </Button>
      </div>
    </Modal>
  )
}
```

## Migration Guide

If you're updating existing code to use the component library:

1. **Replace native HTML elements:**

   ```tsx
   // Before
   <button className="px-4 py-2 bg-sage-500 text-white rounded">
     Click me
   </button>

   // After
   <Button variant="primary">Click me</Button>
   ```

2. **Update form inputs:**

   ```tsx
   // Before
   <input
     type="text"
     className="border rounded px-3 py-2"
     placeholder="Enter text"
   />

   // After
   <Input placeholder="Enter text" />
   ```

3. **Replace custom modals:**

   ```tsx
   // Before
   {
     showModal && (
       <div className="fixed inset-0 bg-black/50">
         <div className="bg-white p-6 rounded">{/* modal content */}</div>
       </div>
     )
   }

   // After
   ;<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
     {/* modal content */}
   </Modal>
   ```

## Contributing

When adding new components to the library:

1. Follow the established patterns and prop interfaces
2. Ensure full TypeScript typing
3. Add comprehensive documentation
4. Include usage examples
5. Test across different screen sizes
6. Verify accessibility compliance
7. Add unit tests for complex logic

For questions or suggestions, please refer to the main project documentation or create an issue in the repository.
