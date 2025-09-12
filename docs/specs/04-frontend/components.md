# UI Components Specification

Status: ✅ Active

## What

Reusable React UI components (TypeScript + Tailwind) used across the app, exported from `frontendv2/src/components/ui`. The spec documents intent, usage patterns, and code references — not duplicated code.

## Why

- Consistent, accessible UI with a single design language
- Reduce duplication by composing small, well-typed primitives
- Keep docs stable by linking to code instead of copying it

## How

- Import from the index: `import { Button, Modal, ... } from '@/components/ui'`
- Design tokens: Tailwind + Morandi palette; details live in `ui-design-system.md`
- Accessibility: Headless UI where appropriate; custom components add ARIA/keyboard support
- Do not copy prop interfaces here; link to source files for truth

---

## Components

Below are usage-focused notes and accurate imports. For full props and styles, see Code References for each component.

### Button

- Variants: `primary | secondary | ghost | danger | icon`
- Sizes: `sm | md | lg | icon-sm | icon-md | icon-lg`
- Loading disables the button and shows a spinner; no `data-testid` is set by default

Usage:

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="lg" leftIcon={<SaveIcon />}>Save</Button>
<Button variant="ghost" loading>Loading…</Button>
```

Code: `frontendv2/src/components/ui/Button.tsx`

### Typography (incl. Music variants)

- Variants include headings, body, and music-specific: `music-title`, `music-title-large`, `music-composer`, `music-composer-large`, `music-metadata`
- Optional `fontFamily` override: `inter | lexend | serif`

Usage:

```tsx
import { Typography, MusicTitle, MusicComposer, MusicMetadata } from '@/components/ui'

<Typography variant="h2">Repertoire</Typography>
<MusicTitle>Moonlight Sonata</MusicTitle>
<MusicComposer>Ludwig van Beethoven</MusicComposer>
<MusicMetadata>Key: C# minor</MusicMetadata>
```

Code: `frontendv2/src/components/ui/Typography.tsx`

### Input & Textarea

- Common props: `label`, `error`, `helperText`, `fullWidth`, optional `leftIcon/rightIcon` for `Input`
- Textarea does not implement `showCharCount` in code

Usage:

```tsx
import { Input, Textarea } from '@/components/ui'

<Input id="duration" label="Duration (minutes)" type="number" />
<Textarea id="notes" label="Notes" rows={4} />
```

Code: `frontendv2/src/components/ui/Input.tsx`

### Select & MultiSelect

- Values are `string | number`; not generic over `T`
- No `maxItems` prop; mobile friendliness is handled with Tailwind (`max-h-[45dvh]`, `overscroll-contain`)

Usage:

```tsx
import { Select, MultiSelect } from '@/components/ui'

const options = [ { value: 'piano', label: 'Piano' }, { value: 'guitar', label: 'Guitar' } ]
<Select label="Instrument" value={instrument} onChange={setInstrument} options={options} />
<MultiSelect label="Techniques" value={techniques} onChange={setTechniques} options={techniqueOptions} />
```

Code: `frontendv2/src/components/ui/Select.tsx`

### Card

- Variants: `default | bordered | elevated | ghost`; optional `padding`, `hoverable`, `onClick`

Usage:

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui'
;<Card variant="elevated" padding="md">
  <CardHeader>
    <CardTitle>Practice Session</CardTitle>
    <CardDescription>45 minutes • Piano</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

Code: `frontendv2/src/components/ui/Card.tsx`

### Modal

- Props: `isOpen`, `onClose`, `title?`, `size`, `showCloseButton?`, `closeOnOverlayClick?`, `isMobileOptimized?`
- Focus handling and ARIA via Headless UI `Dialog`

Usage:

```tsx
import { Modal, ModalBody, ModalFooter, Button } from '@/components/ui'
;<Modal
  isOpen={isOpen}
  onClose={close}
  title="Edit Practice Entry"
  size="lg"
  isMobileOptimized
>
  <ModalBody>…</ModalBody>
  <ModalFooter>
    <Button variant="ghost" onClick={close}>
      Cancel
    </Button>
    <Button variant="primary">Save</Button>
  </ModalFooter>
</Modal>
```

Code: `frontendv2/src/components/ui/Modal.tsx`

### Loading

- `Loading` (spinner/dots/pulse), `LoadingSkeleton`, `LoadingOverlay`

Usage:

```tsx
import { Loading, LoadingSkeleton, LoadingOverlay } from '@/components/ui'

<Loading size="lg" text="Loading scores…" />
<LoadingSkeleton className="h-20 w-full" />
<LoadingOverlay isLoading={isBusy}><Card>…</Card></LoadingOverlay>
```

Code: `frontendv2/src/components/ui/Loading.tsx`

### Toasts

- Provider: `ToastProvider` (no props). Use `showToast(message, type?, title?, duration?)` or `toast.success(message, title?)`

Usage:

```tsx
// App root
import { ToastProvider } from '@/components/ui'
;<ToastProvider />

// Anywhere
import { showToast, toast } from '@/utils/toastManager'
showToast('Saved!', 'success', undefined, 4000)
toast.error('Something went wrong')
```

Code: `frontendv2/src/components/ui/Toast.tsx`, `frontendv2/src/components/ui/ToastProvider.tsx`, `frontendv2/src/utils/toastManager.ts`

### Tabs

- Props: `tabs: { id, label, icon?, shortLabel?, mobileIconOnly? }[]`, `activeTab`, `onTabChange`
- No `badge` support today

Usage:

```tsx
import { Tabs } from '@/components/ui'
;<Tabs
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
  ]}
  activeTab={active}
  onTabChange={setActive}
/>
```

Code: `frontendv2/src/components/ui/Tabs.tsx`

### SegmentedControl

- Options with `value`, `label`, optional `icon`; supports sizes and `fullWidth`

Usage:

```tsx
import { SegmentedControl } from '@/components/ui'
;<SegmentedControl
  options={[
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
  ]}
  value={mode}
  onChange={setMode}
/>
```

Code: `frontendv2/src/components/ui/SegmentedControl.tsx`

### DropdownMenu

- Controlled component: `isOpen`, `onToggle`, `onClose`. Items support `label`, `onClick`, optional `icon`, `variant: 'default' | 'danger'`
- Dividers are auto-inserted between differing variants; there is no `divider` flag

Usage:

```tsx
import { DropdownMenu } from '@/components/ui'

const [open, setOpen] = useState(false)
<DropdownMenu
  items={[{ label: 'Edit', onClick: onEdit }, { label: 'Delete', onClick: onDelete, variant: 'danger' }]}
  isOpen={open}
  onToggle={() => setOpen(o => !o)}
  onClose={() => setOpen(false)}
/>
```

Code: `frontendv2/src/components/ui/DropdownMenu.tsx`

### Tag

- Variants: `default | primary | success | warning | danger`; optional `onRemove`, `onClick`, `icon`

Usage:

```tsx
import { Tag } from '@/components/ui'
;<Tag variant="primary" onRemove={() => {}}>
  Piano
</Tag>
```

Code: `frontendv2/src/components/ui/Tag.tsx`

### CompactEntryRow

- Displays logbook entries compactly; supports `onClick`, optional `notes` toggle, type/instrument tags
- `mood` is currently a free-form string; `entryId`, `hidePieceInfo`, and `children` are supported

Usage:

```tsx
import { CompactEntryRow, MusicTitle, MusicComposer } from '@/components/ui'
;<CompactEntryRow
  time="2:30 PM"
  duration={45}
  pieces={[{ title: 'Moonlight Sonata', composer: 'Beethoven' }]}
  notes="Worked on dynamics"
  onClick={() => setSelected(id)}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

Code: `frontendv2/src/components/ui/CompactEntryRow.tsx`

### ProgressiveImage

- Progressive loading with optional placeholder, blur, and skeleton

Usage:

```tsx
import { ProgressiveImage } from '@/components/ui'
;<ProgressiveImage src={src} alt="Score page" placeholderSrc={thumb} />
```

Code: `frontendv2/src/components/ui/ProgressiveImage.tsx`

### ClockTimePicker

- Time picker with clock UI (HH:MM). Default export in UI index

Usage:

```tsx
import { ClockTimePicker } from '@/components/ui'
;<ClockTimePicker value={value} onChange={setValue} />
```

Code: `frontendv2/src/components/ui/ClockTimePicker.tsx`

---

## Operational Limits

- Dropdowns/menus may close on scroll for tablet UX; large containers can clip non-portal menus
- Mobile: selects and modals use `dvh`/Tailwind to constrain heights; test on iOS/Android
- Toasts queue in memory; no persistence across reloads

## Failure Modes

- Missing/invalid props → visual fallback or no-op (e.g., empty select options)
- Off-screen menus on constrained containers → `DropdownMenu` switches to portal mode
- Modal overlay click handling uses `closeOnOverlayClick`; set to `false` for destructive flows

## Code References

- `frontendv2/src/components/ui/Button.tsx`
- `frontendv2/src/components/ui/Typography.tsx`
- `frontendv2/src/components/ui/Input.tsx`
- `frontendv2/src/components/ui/Select.tsx`
- `frontendv2/src/components/ui/Card.tsx`
- `frontendv2/src/components/ui/Modal.tsx`
- `frontendv2/src/components/ui/Loading.tsx`
- `frontendv2/src/components/ui/Toast.tsx`
- `frontendv2/src/components/ui/ToastProvider.tsx`
- `frontendv2/src/utils/toastManager.ts`
- `frontendv2/src/components/ui/Tabs.tsx`
- `frontendv2/src/components/ui/SegmentedControl.tsx`
- `frontendv2/src/components/ui/DropdownMenu.tsx`
- `frontendv2/src/components/ui/Tag.tsx`
- `frontendv2/src/components/ui/CompactEntryRow.tsx`
- `frontendv2/src/components/ui/ProgressiveImage.tsx`
- `frontendv2/src/components/ui/ClockTimePicker.tsx`
- `frontendv2/src/utils/cn.ts` (class merging helper)

## Related Documentation

- [UI Design System](./ui-design-system.md)
- [Frontend Architecture](./architecture.md)
- [State Management](./state-management.md)
- [Responsive Design](./responsive-design.md)

---

_Last updated: 2025-09-09 | Version 1.7.6_
