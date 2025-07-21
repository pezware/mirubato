# Unified Layout Patterns for Mirubato

## Overview

Based on the focused UI design approach, this document outlines how to implement a consistent layout across all sections of Mirubato: Logbook, Scorebook, Toolbox, and Data Tables.

## Core Layout Structure

### Desktop Layout

```
┌─────────────────────────────────────────────────────────┐
│                      Top Bar                             │
│  [Search Box]              [Quick Actions] [User Avatar] │
├────────────┬────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │               Main Content                  │
│            │                                             │
│  - Logo    │  ┌─────────────────────────────────────┐  │
│  - Nav     │  │      Section-Specific Content       │  │
│    Links   │  │                                     │  │
│            │  └─────────────────────────────────────┘  │
│            │                                             │
└────────────┴────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────────────────┐
│           Top Bar                    │
│  [Search]              [User Avatar] │
├─────────────────────────────────────┤
│                                     │
│        Main Content                 │
│                                     │
│                                     │
├─────────────────────────────────────┤
│        Bottom Tab Bar               │
│  [Home] [Log] [Music] [Tools] [Me]  │
└─────────────────────────────────────┘
```

## Common Components

### 1. Sidebar Navigation (Desktop Only)

- **Width**: 240px fixed
- **Background**: #fafafa
- **Items**: Icon + Label, 14px font
- **Active State**: #e8e8e8 background, bold text
- **Completely hidden on mobile** (no hamburger menu)

### 2. Top Bar

- **Height**: 64px desktop, 56px mobile
- **Contents**:
  - Search box (expandable on mobile)
  - Quick actions (desktop only)
  - User authentication section
- **Background**: White with bottom border

### 3. Bottom Tab Bar (Mobile Only)

- **Fixed position** at bottom
- **5 main tabs**: Home, Logbook, Music, Tools, Profile
- **Icon + Label** format
- **Active state** with color change

## Section-Specific Implementations

### 1. Logbook Section

**Desktop View:**

```
- Sidebar: Overview, Analytics, Data, Repertoire links
- Main Content:
  - Summary stats bar at top
  - Tab navigation (Overview/Analytics/Data/Repertoire)
  - List/Grid toggle
  - Practice entry cards
```

**Mobile View:**

```
- Full-width cards
- Swipeable tabs
- Floating action button for new entry
```

### 2. Scorebook Section

**Desktop View:**

```
- Sidebar: Scores, Collections, Favorites, Recent
- Main Content:
  - Filter chips (Instrument, Difficulty, Genre)
  - Grid/List toggle
  - Score cards with thumbnails
  - Search integrated in top bar
```

**Mobile View:**

```
- Single column grid
- Collapsible filter section
- Pull-to-refresh
```

### 3. Toolbox Section

**Desktop View:**

```
- Sidebar: All Tools, Metronome, Tuner, Counter, Theory
- Main Content:
  - Tool cards in responsive grid
  - Each tool opens in modal or inline
  - Quick access to recent tools
```

**Mobile View:**

```
- Full-width tool cards
- Tools open as full-screen modals
- Swipe to navigate between tools
```

### 4. Data Tables (Reports/Analytics)

**Desktop View:**

```
- Sidebar: Report types, Saved views, Export options
- Main Content:
  - Date range picker in action bar
  - Sortable table headers
  - Inline actions per row
  - Pagination at bottom
```

**Mobile View:**

```
- Horizontal scroll for tables
- Card view alternative for complex data
- Sticky column headers
```

## Design Tokens

### Colors

```css
:root {
  --sidebar-bg: #fafafa;
  --sidebar-border: #e5e5e5;
  --sidebar-text: #666666;
  --sidebar-active-bg: #e8e8e8;
  --sidebar-active-text: #1a1a1a;

  --topbar-bg: #ffffff;
  --topbar-border: #e5e5e5;

  --content-bg: #fafafa;
  --card-bg: #ffffff;
  --card-border: #e5e5e5;

  --primary: #22c55e;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
}
```

### Spacing

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  --sidebar-width: 240px;
  --topbar-height: 64px;
  --topbar-height-mobile: 56px;
  --bottom-tabs-height: 56px;
}
```

### Typography

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 15px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
}
```

## Responsive Breakpoints

```css
/* Mobile First Approach */
/* Phones: 0-767px */
/* Tablets/iPads: 768px+ (show desktop layout) */
@media (min-width: 768px) {
  /* Tablet/iPad and desktop styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}

@media (min-width: 1440px) {
  /* Large desktop styles */
}

/* For hiding desktop elements on mobile */
@media (max-width: 767px) {
  /* Phone-only styles */
}
```

## Implementation Guidelines

### 1. Navigation Consistency

- **Desktop**: Always use sidebar for section navigation
- **Mobile**: Use bottom tabs for main sections, top tabs for subsections
- **Search**: Always accessible in top bar
- **User menu**: Top-right on all devices

### 2. Content Layout

- **Cards**: Consistent padding (20px desktop, 16px mobile)
- **Lists**: Hover states on desktop, tap feedback on mobile
- **Empty states**: Centered icon + message + action
- **Loading states**: Skeleton screens matching layout

### 3. Interactive Elements

- **Buttons**: Minimum 44px touch target on mobile
- **Links**: Underline on hover (desktop only)
- **Forms**: Labels above inputs, clear error states
- **Modals**: Centered on desktop, full-screen on mobile

### 4. Performance Considerations

- **Lazy load**: Images and heavy components
- **Virtual scrolling**: For long lists
- **Debounce**: Search inputs (300ms)
- **Optimistic updates**: For better perceived performance

## Migration Strategy

1. **Phase 1**: Update navigation structure
   - Implement new sidebar and top bar
   - Add bottom tabs for mobile

2. **Phase 2**: Update individual sections
   - Start with Logbook (most used)
   - Then Scorebook, Toolbox, Data Tables

3. **Phase 3**: Polish and optimize
   - Add transitions and micro-interactions
   - Optimize for performance
   - User testing and feedback

## Example Component Structure

```typescript
// Layout wrapper component
interface LayoutProps {
  sidebar: 'logbook' | 'scorebook' | 'toolbox' | 'reports'
  children: React.ReactNode
}

function AppLayout({ sidebar, children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar type={sidebar} />
      <div className="main-container">
        <TopBar />
        <main className="content">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
```

## Accessibility Requirements

- **Keyboard Navigation**: Full support for tab/arrow keys
- **Screen Readers**: Proper ARIA labels and landmarks
- **Color Contrast**: WCAG AA compliance minimum
- **Focus Indicators**: Visible focus states for all interactive elements
- **Mobile**: Touch targets minimum 44x44px

## Next Steps

1. Review and approve these patterns
2. Create shared layout components
3. Update each section incrementally
4. Test on various devices
5. Gather user feedback
6. Iterate and refine

This unified approach will create a consistent, professional experience across all of Mirubato while maintaining the clean, focused aesthetic users prefer.
