# Layout Patterns Specification

Status: ✅ Active

## What

Layout structure and navigation patterns for desktop and mobile, using Tailwind utilities and shared layout components.

## Why

- Provide a predictable shell across pages
- Keep mobile UX first-class while retaining efficient desktop navigation
- Avoid duplication: reference real components/APIs instead of pseudo‑CSS

## Core Layout Structure

### Desktop Layout (≥768px)

```
┌─────────────────────────────────────────────────────────┐
│                   (No global Top Bar)                    │
│  Sidebar provides brand + quick actions; pages add any   │
│  per‑page headers as needed                              │
├────────────┬────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │               Main Content                  │
│  (224px)   │   overflow-y-auto; sticky sections optional │
│            │  ┌─────────────────────────────────────┐  │
│  - Home    │  │      Section-Specific Content       │  │
│  - Logbook │  │                                     │  │
│  - Music   │  └─────────────────────────────────────┘  │
│  - Tools   │                                             │
│  - Profile │                                             │
│            │                                             │
└────────────┴────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌─────────────────────────────────────┐
│           Optional page header       │
├─────────────────────────────────────┤
│                                     │
│        Main Content                 │
│       (Full Width)                  │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│     Bottom Tabs (56px)              │
│  Home  Log  Music  Tools  Profile   │
└─────────────────────────────────────┘
```

## Layout Components

### AppLayout Component

- Main shell used by pages. Provides desktop `Sidebar` and mobile `BottomTabs`.
- Props: `children`, `onNewEntry?`, `onTimerClick?`, `onImportScore?`, `onToolboxAdd?`, `showQuickActions?`

Usage:

```tsx
import AppLayout from '@/components/layout/AppLayout'
;<AppLayout showQuickActions>
  <SectionContent />
</AppLayout>
```

### Component Hierarchy

```
AppLayout
├── (Optional) Per‑page header within page content
├── Sidebar (Desktop only)
│   ├── Navigation
│   ├── Collapse Toggle
│   └── Footer Links
├── MainContent
│   └── {children}
└── BottomTabs (Mobile only)
    └── TabItems
```

## Navigation Patterns

### Desktop Navigation

#### Sidebar

- **Width**: 224px (`w-56`) expanded, 64px (`w-16`) collapsed
- **Position**: Fixed left
- **Background**: White with border
- **State Persistence**: LocalStorage for collapse state

```typescript
// Sidebar navigation structure
const navigation = [
  { id: 'home', icon: Home, label: 'Home', path: '/' },
  { id: 'logbook', icon: BookOpen, label: 'Logbook', path: '/logbook' },
  { id: 'scorebook', icon: Music, label: 'Music', path: '/scorebook' },
  { id: 'toolbox', icon: Wrench, label: 'Tools', path: '/toolbox' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
]
```

#### Sub-navigation

Each main section can have sub-navigation:

```typescript
// Logbook sub-navigation
const logbookNav = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'data', label: 'Data' },
  { id: 'repertoire', label: 'Repertoire' },
]
```

### Mobile Navigation

#### Bottom Tabs

- **Position**: Fixed bottom
- **Height**: 56px (`min-h-[56px]`)
- **Icons**: 20–24px with labels
- **Active State**: color emphasis; running timer shows live badge

```typescript
// Bottom tab configuration
const tabs = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'logbook', icon: BookOpen, label: 'Log' },
  { id: 'scorebook', icon: Music2, label: 'Music' },
  { id: 'toolbox', icon: Wrench, label: 'Tools' },
  { id: 'profile', icon: User, label: 'Me' },
]
```

## Section-Specific Layouts

### Logbook Layout

```tsx
// Desktop: Tabs + scrollable content
<div className="flex flex-col h-full">
  <Tabs tabs={tabs} activeTab={active} onTabChange={setActive} />
  <div className="flex-1 overflow-y-auto p-4 sm:p-6">
    {active === 'overview' && <LogbookEntryList />}
    {active === 'analytics' && <AnalyticsView />}
    {active === 'data' && <DataTableView />}
    {active === 'repertoire' && <RepertoireView />}
  </div>
  {/* BottomTabs are provided by AppLayout on mobile */}
</div>
```

### Scorebook Layout

```typescript
// Grid layout responsive to screen size
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {scores.map(score => (
    <ScoreCard key={score.id} score={score} />
  ))}
</div>
```

### Toolbox Layout

```typescript
// Tool cards in responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <ToolCard title="Metronome" icon={Metronome} />
  <ToolCard title="Circle of Fifths" icon={Circle} />
  <ToolCard title="Practice Counter" icon={Counter} />
</div>
```

## Layout Dimensions

- Sidebar: `w-56` (224px) expanded, `w-16` (64px) collapsed
- BottomTabs: `min-h-[56px]`
- Containers: Tailwind spacing (`p-4`, `p-6`) with responsive variants (`sm:`, `md:`)

## Responsive Breakpoints

- Tailwind defaults: `sm=640`, `md=768` (sidebar appears), `lg=1024`, `xl=1280`, `2xl=1536`
- Mobile-first utilities with `md:`/`lg:` variants control layout shifts

### Layout Behavior by Breakpoint

| Breakpoint | Navigation  | Layout       | Columns |
| ---------- | ----------- | ------------ | ------- |
| < 768px    | Bottom tabs | Stack        | 1       |
| ≥ 768px    | Sidebar     | Side-by-side | 2       |
| ≥ 1024px   | Sidebar     | Side-by-side | 2-3     |
| ≥ 1280px   | Sidebar     | Side-by-side | 3-4     |

## Content Layout Patterns

### Card Grid

```tsx
// Responsive card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### List View

```tsx
// Stacked list with separators
<div className="divide-y divide-morandi-stone-200">
  {entries.map(entry => (
    <EntryRow key={entry.id} {...entry} />
  ))}
</div>
```

### Split View

```tsx
// Desktop: side-by-side, Mobile: stacked
<div className="flex flex-col md:flex-row gap-6">
  <div className="md:w-1/3">
    <Sidebar />
  </div>
  <div className="md:w-2/3">
    <MainContent />
  </div>
</div>
```

## Scroll Behavior

### Desktop

- Main content scrolls independently
- Sidebar fixed in viewport
- Top bar sticky on scroll

### Mobile

- Full page scroll
- Top bar can hide on scroll down
- Bottom tabs always visible

```tsx
// Scroll container setup
<div className="flex flex-col h-screen">
  <TopBar className="sticky top-0 z-50" />
  <div className="flex flex-1 overflow-hidden">
    <Sidebar className="hidden md:block" />
    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
  <BottomTabs className="md:hidden" />
</div>
```

## Z-Index Hierarchy

- Layering via Tailwind utilities; components set appropriate `z-*` values
- Typical order: dropdown < sticky < fixed < modal-backdrop < modal < toast

## Accessibility Considerations

### Keyboard Navigation

- Tab order follows visual hierarchy
- Skip links to main content
- Escape key closes modals/dropdowns
- Arrow keys for menu navigation

### Screen Reader Support

- Semantic HTML structure
- ARIA landmarks for regions
- Descriptive labels for navigation
- Announce route changes

### Touch Targets

- Minimum 44x44px on mobile
- Adequate spacing between targets
- Swipe gestures for mobile navigation

## Performance Optimizations

### Layout Shifts

- Fixed dimensions for stable layout
- Skeleton screens during loading
- Placeholder space for async content

### Virtualization

- Virtual scrolling for long lists
- Intersection Observer for lazy loading
- Debounced resize handlers

## Implementation Notes

- Use `AppLayout` for page shells; do not re‑implement bottom tabs or sidebar
- Keep main content scrollable with `overflow-y-auto`; avoid full‑page scroll on desktop

## Code References

- `frontendv2/src/components/layout/AppLayout.tsx`
- `frontendv2/src/components/layout/Sidebar.tsx`
- `frontendv2/src/components/layout/BottomTabs.tsx`

## Related Documentation

- [UI Design System](./ui-design-system.md) — Colors, typography, components
- [Responsive Design](./responsive-design.md) — Mobile-first approach
- [Components](./components.md) — Component primitives
- [Architecture](./architecture.md) — Frontend overview

---

_Last updated: 2025-09-09 | Version 1.7.6_
