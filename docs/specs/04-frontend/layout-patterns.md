# Layout Patterns Specification

## Overview

This specification defines the layout patterns and structure used throughout Mirubato, including desktop and mobile layouts, navigation patterns, and responsive behavior.

## Core Layout Structure

### Desktop Layout (≥768px)

```
┌─────────────────────────────────────────────────────────┐
│                      Top Bar (64px)                      │
│  Logo    Search                    Actions  User Avatar  │
├────────────┬────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │               Main Content                  │
│  (240px)   │                                             │
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
│        Top Bar (56px)                │
│  Logo               Actions  Avatar  │
├─────────────────────────────────────┤
│                                     │
│        Main Content                 │
│       (Full Width)                  │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│     Bottom Tab Bar (56px)           │
│  Home  Log  Music  Tools  Profile   │
└─────────────────────────────────────┘
```

## Layout Components

### AppLayout Component

The main layout wrapper that provides consistent structure:

```typescript
interface AppLayoutProps {
  children: React.ReactNode
  onNewEntry?: () => void
  onTimerClick?: () => void
  onImportScore?: () => void
  onToolboxAdd?: () => void
  showQuickActions?: boolean
}

// Usage
<AppLayout showQuickActions={true}>
  <SectionContent />
</AppLayout>
```

### Component Hierarchy

```
AppLayout
├── TopBar (Desktop) / MobileHeader (Mobile)
│   ├── Logo / Brand
│   ├── Search (Desktop only)
│   ├── QuickActions
│   └── UserMenu
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

- **Width**: 240px (expanded), 64px (collapsed)
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

#### Bottom Tab Bar

- **Position**: Fixed bottom
- **Height**: 56px
- **Icons**: 24px with labels
- **Active State**: Color change + scale

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

```typescript
// Desktop
<div className="flex flex-col h-full">
  <SummaryBar stats={stats} />
  <TabNavigation tabs={['Overview', 'Analytics', 'Data', 'Repertoire']} />
  <div className="flex-1 overflow-auto p-6">
    {activeTab === 'overview' && <LogbookEntryList />}
    {activeTab === 'analytics' && <AnalyticsView />}
    {/* ... */}
  </div>
</div>

// Mobile
<div className="flex flex-col h-full">
  <SwipeableTabs tabs={tabs} />
  <ScrollView>
    <Content />
  </ScrollView>
  <FloatingActionButton onClick={onNewEntry} />
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

### Fixed Dimensions

```scss
// Desktop
$sidebar-width: 240px;
$sidebar-collapsed-width: 64px;
$topbar-height: 64px;

// Mobile
$mobile-header-height: 56px;
$bottom-tabs-height: 56px;

// Common
$container-max-width: 1280px;
$content-max-width: 960px;
```

### Spacing

```scss
// Container padding
$container-padding: {
  mobile: 16px,
  tablet: 24px,
  desktop: 32px
}

// Section spacing
$section-spacing: {
  mobile: 24px,
  tablet: 32px,
  desktop: 48px
}

// Card spacing
$card-padding: {
  mobile: 16px,
  desktop: 24px
}
```

## Responsive Breakpoints

```scss
// Breakpoint definitions
$breakpoints: {
  sm: 640px,   // Small devices
  md: 768px,   // Tablets (layout switch point)
  lg: 1024px,  // Desktops
  xl: 1280px,  // Large desktops
  '2xl': 1536px // Extra large screens
}

// Usage with Tailwind
// Mobile first: default styles
// md: Tablet and up (show sidebar)
// lg: Desktop optimizations
// xl: Large screen optimizations
```

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

```scss
$z-index: {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal-backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080
}
```

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

## Implementation Examples

### Complete Layout Implementation

```tsx
function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <BottomTabs />
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

## Related Documentation

- [UI Design System](./ui-design-system.md) - Colors, typography, components
- [Responsive Design](./responsive-design.md) - Mobile-first approach
- [Components](./components.md) - Component implementation
- [Architecture](./architecture.md) - Frontend architecture

---

_Last updated: December 2024 | Version 1.7.6_
