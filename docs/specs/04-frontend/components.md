# Components Library Specification

## Overview

Mirubato's component library provides a comprehensive set of reusable React components built with TypeScript, Tailwind CSS, and accessibility best practices. All components follow the Morandi design aesthetic with muted colors and sophisticated typography.

## Component Architecture

### Core Principles

1. **Type Safety**: Full TypeScript support with strict typing
2. **Accessibility**: WCAG 2.1 AA compliance
3. **Mobile-First**: Responsive design with touch optimization
4. **Performance**: Code splitting and lazy loading support
5. **Consistency**: Unified design language across all components

### File Structure

```
components/
├── ui/                  # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Typography.tsx
│   └── ...
├── logbook/            # Feature-specific components
├── scorebook/
├── repertoire/
└── shared/             # Cross-feature components
```

## Base UI Components

### Button

**Purpose**: Primary interactive element for actions

```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg'
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}
```

**Implementation**:

```tsx
<Button
  variant="primary"
  size="lg"
  loading={isSubmitting}
  leftIcon={<SaveIcon />}
>
  Save Changes
</Button>
```

**Styling Classes**:

```tsx
const variants = {
  primary: 'bg-morandi-sage-500 text-white hover:bg-morandi-sage-400',
  secondary: 'border border-morandi-stone-300 hover:bg-morandi-stone-100',
  ghost: 'text-morandi-stone-600 hover:bg-morandi-stone-100',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  icon: 'p-0 hover:bg-morandi-stone-100 rounded-full',
}
```

### Typography

**Purpose**: Consistent text rendering with three-font system

```typescript
// Main Typography component
interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' |
           'body-lg' | 'body' | 'body-sm' | 'caption'
  as?: keyof JSX.IntrinsicElements
  className?: string
  children: React.ReactNode
}

// Music-specific components
export const MusicTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="font-serif text-lg sm:text-xl font-medium text-morandi-stone-700">
    {children}
  </span>
)

export const MusicComposer: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="font-serif text-base font-normal text-morandi-stone-600">
    {children}
  </span>
)

export const MusicMetadata: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="font-inter text-sm text-morandi-stone-500">
    {children}
  </span>
)
```

### Input & Form Controls

#### Input

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}
```

**Implementation**:

```tsx
<Input
  label="Duration (minutes)"
  type="number"
  value={duration}
  onChange={e => setDuration(e.target.value)}
  error={errors.duration}
  helperText="Enter practice duration"
  leftIcon={<ClockIcon />}
/>
```

#### Textarea

```typescript
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  rows?: number
  maxLength?: number
  showCharCount?: boolean
}
```

### Card System

**Purpose**: Content containers with structured sections

```typescript
// Compound component pattern
<Card variant="elevated" padding="lg" hoverable>
  <CardHeader>
    <CardTitle as="h2">Practice Session</CardTitle>
    <CardDescription>45 minutes • Piano</CardDescription>
  </CardHeader>
  <CardContent>
    <MusicTitle>Moonlight Sonata</MusicTitle>
    <MusicComposer>Ludwig van Beethoven</MusicComposer>
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Edit</Button>
    <Button variant="primary">Complete</Button>
  </CardFooter>
</Card>
```

**Variants**:

- `default`: Basic white background with border
- `bordered`: Emphasized border color
- `elevated`: Shadow for depth
- `ghost`: Transparent background

### Modal

**Purpose**: Overlays for focused interactions

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  isMobileOptimized?: boolean
  closeOnBackdropClick?: boolean
  showCloseButton?: boolean
}
```

**Implementation**:

```tsx
<Modal
  isOpen={isEditModalOpen}
  onClose={closeModal}
  title="Edit Practice Entry"
  size="lg"
  isMobileOptimized
>
  <ModalBody>
    <ManualEntryForm entry={selectedEntry} />
  </ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={closeModal}>
      Cancel
    </Button>
    <Button variant="primary" type="submit">
      Save Changes
    </Button>
  </ModalFooter>
</Modal>
```

### Select Components

#### Single Select

```typescript
interface SelectProps<T> {
  label?: string
  options: Array<{ value: T; label: string; disabled?: boolean }>
  value: T | null
  onChange: (value: T) => void
  placeholder?: string
  error?: string
  fullWidth?: boolean
}
```

#### Multi-Select

```typescript
interface MultiSelectProps<T> {
  label?: string
  options: Array<{ value: T; label: string }>
  value: T[]
  onChange: (values: T[]) => void
  placeholder?: string
  maxItems?: number
}
```

**Mobile Optimization**:

```css
/* Touch-optimized heights */
.select-option {
  min-height: 44px; /* iOS touch target */
  padding: 12px 16px;
}

/* Mobile dropdown positioning */
@media (max-width: 640px) {
  .select-dropdown {
    max-height: 45dvh;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }
}
```

## Loading & Feedback Components

### Loading States

```typescript
// Loading spinner
<Loading variant="spinner" size="md" text="Loading practice data..." />

// Skeleton placeholder
<LoadingSkeleton className="h-16 w-full rounded-lg" />

// Loading overlay
<LoadingOverlay isLoading={isLoading}>
  <Card>Content that might be loading</Card>
</LoadingOverlay>
```

### Toast Notifications

```typescript
// Setup in app root
import { ToastProvider } from '@/components/ui/Toast'
<ToastProvider position="top-right" />

// Usage
import { showToast } from '@/utils/toastManager'

showToast({
  type: 'success',
  title: 'Entry Saved',
  message: 'Your practice session has been logged.',
  duration: 5000,
})
```

**Toast Types**:

- `success`: Green with checkmark icon
- `error`: Red with X icon
- `warning`: Amber with alert icon
- `info`: Blue with info icon

## Navigation Components

### Tabs

```typescript
interface Tab {
  id: string
  label: string
  shortLabel?: string // Mobile version
  icon?: React.ReactNode
  badge?: number
}

<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { id: 'analytics', label: 'Analytics', shortLabel: 'Stats' },
    { id: 'data', label: 'Data Export', shortLabel: 'Export' },
  ]}
  activeTab={currentTab}
  onTabChange={setCurrentTab}
/>
```

### Segmented Control

```typescript
<SegmentedControl
  options={[
    { value: 'list', label: 'List', icon: <ListIcon /> },
    { value: 'grid', label: 'Grid', icon: <GridIcon /> },
    { value: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
  ]}
  value={viewMode}
  onChange={setViewMode}
  fullWidth
/>
```

## Data Display Components

### CompactEntryRow

**Purpose**: Display logbook entries in a compact format

```typescript
interface CompactEntryRowProps {
  time: string
  duration: number
  pieces?: Array<{ title: string; composer: string }>
  notes?: string
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  isSelected?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSelect?: () => void
}
```

**Implementation**:

```tsx
<CompactEntryRow
  time="2:30 PM"
  duration={45}
  pieces={[{ title: 'Moonlight Sonata', composer: 'Beethoven' }]}
  notes="Worked on dynamics in the development section"
  mood="satisfied"
  onEdit={() => editEntry(entry.id)}
  onDelete={() => deleteEntry(entry.id)}
/>
```

### Tag

```typescript
interface TagProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onRemove?: () => void
  icon?: React.ReactNode
}
```

## Advanced Components

### DropdownMenu

```typescript
interface DropdownMenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: 'default' | 'danger'
  divider?: boolean
  disabled?: boolean
}

<DropdownMenu
  trigger={<Button variant="icon"><MoreIcon /></Button>}
  items={[
    { label: 'Edit', onClick: handleEdit, icon: <EditIcon /> },
    { divider: true },
    { label: 'Delete', onClick: handleDelete, variant: 'danger', icon: <TrashIcon /> },
  ]}
/>
```

### ProgressiveImage

**Purpose**: Optimized image loading for sheet music

```typescript
<ProgressiveImage
  src="/scores/moonlight-sonata.jpg"
  placeholderSrc="/scores/moonlight-sonata-thumb.jpg"
  alt="Moonlight Sonata page 1"
  className="w-full h-auto"
  blurAmount={20}
  onLoad={() => trackImageLoad()}
/>
```

### ClockTimePicker

**Purpose**: Intuitive time selection

```typescript
<ClockTimePicker
  value={practiceTime} // "14:30"
  onChange={setPracticeTime}
  label="Practice Start Time"
  min="06:00"
  max="23:00"
  step={15} // 15-minute increments
/>
```

## Utility Functions

### Class Name Merging (cn)

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  className // User-provided classes
)} />
```

### Focus Management

```typescript
// Focus trap for modals
export function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement

    firstElement?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    element.addEventListener('keydown', handleTab)
    return () => element.removeEventListener('keydown', handleTab)
  }, [ref])
}
```

## Testing Patterns

### Component Testing

```typescript
// Button.test.tsx
describe('Button', () => {
  it('renders with correct variant classes', () => {
    const { container } = render(
      <Button variant="primary">Test Button</Button>
    )
    expect(container.firstChild).toHaveClass('bg-morandi-sage-500')
  })

  it('shows loading state', () => {
    const { getByTestId } = render(
      <Button loading data-testid="btn">Loading</Button>
    )
    expect(getByTestId('btn')).toHaveAttribute('disabled')
    expect(getByTestId('btn-spinner')).toBeInTheDocument()
  })
})
```

### Accessibility Testing

```typescript
describe('Modal Accessibility', () => {
  it('traps focus when open', () => {
    const { getByRole } = render(
      <Modal isOpen onClose={() => {}}>
        <button>First</button>
        <button>Last</button>
      </Modal>
    )

    expect(document.activeElement).toBe(getByRole('button', { name: 'First' }))
  })

  it('restores focus on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(<Modal isOpen onClose={() => {}} />)
    rerender(<Modal isOpen={false} onClose={() => {}} />)

    expect(document.activeElement).toBe(trigger)
  })
})
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const PDFViewer = lazy(() => import('./components/PDFViewer'))
const ChartView = lazy(() => import('./components/ChartView'))

// Usage with Suspense
<Suspense fallback={<LoadingSkeleton className="h-96" />}>
  <PDFViewer scoreId={scoreId} />
</Suspense>
```

### Memo and Callbacks

```typescript
// Memoize expensive components
export const ExpensiveList = memo(({ items }: { items: Item[] }) => {
  return items.map(item => <ItemCard key={item.id} {...item} />)
})

// Stable callbacks
const handleClick = useCallback((id: string) => {
  // Handle click
}, [dependencies])
```

## Accessibility Guidelines

### ARIA Attributes

```typescript
// Required ARIA labels
<Button
  aria-label="Delete practice entry"
  aria-describedby="delete-warning"
>
  <TrashIcon />
</Button>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {entries.length} entries found
</div>
```

### Keyboard Navigation

- All interactive elements accessible via Tab
- Escape closes modals and dropdowns
- Arrow keys navigate menus and selects
- Enter/Space activate buttons
- Shift+Tab for reverse navigation

## Related Documentation

- [UI Design System](./ui-design-system.md) - Colors, typography, spacing
- [Frontend Architecture](./architecture.md) - Component organization
- [State Management](./state-management.md) - Component state patterns
- [Responsive Design](./responsive-design.md) - Mobile optimization

---

_Last updated: December 2024 | Version 1.7.6_
