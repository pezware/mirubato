# Unified Layout Patterns for Mirubato

## Overview

This document provides a high-level overview of Mirubato's layout patterns and design system. For detailed technical specifications, please refer to the modular documentation in the specs folder.

> **📚 Detailed Specifications**:
>
> - **[UI Design System](./specs/04-frontend/ui-design-system.md)** - Colors, typography, and component patterns
> - **[Layout Patterns](./specs/04-frontend/layout-patterns.md)** - Layout structure and navigation
> - **[Responsive Design](./specs/04-frontend/responsive-design.md)** - Breakpoints and mobile patterns

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

## Current Implementation (v1.7.6)

### Design System

Mirubato uses a sophisticated **Morandi color palette** with muted, harmonious tones:

- **Primary**: Sage green for actions and success states
- **Neutral**: Stone colors for text and borders
- **Accent**: Sand, blush, and sky tones for various UI states

### Typography

Three-font system optimized for multilingual support:

- **Noto Serif**: Music content (titles, composers)
- **Inter**: UI elements and body text
- **Lexend**: Headers and navigation

For complete design token specifications, see **[UI Design System](./specs/04-frontend/ui-design-system.md)**.

## Responsive Design

### Breakpoint System

Mirubato uses Tailwind CSS breakpoints with mobile-first approach:

- **Base**: < 640px (Mobile)
- **sm**: ≥ 640px (Large phones)
- **md**: ≥ 768px (Tablets - layout switch point)
- **lg**: ≥ 1024px (Desktops)
- **xl**: ≥ 1280px (Large desktops)

**Key transition at 768px**: Switch from bottom tabs to sidebar navigation.

For detailed responsive patterns, see **[Responsive Design](./specs/04-frontend/responsive-design.md)**.

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

## Implementation Status

### ✅ Completed

- Desktop sidebar navigation with collapse state
- Mobile bottom tab navigation
- Responsive layout switching at 768px
- Morandi color palette implementation
- Three-font typography system
- Consistent spacing using 8px base unit

### 🚧 In Progress

- Component library standardization
- Dark mode preparation (infrastructure in place)
- Performance optimizations

### 📋 Planned

- Container queries for component-level responsiveness
- Advanced animation patterns
- Accessibility audit and improvements

## Key Implementation Files

### Layout Components

- `frontendv2/src/components/layout/AppLayout.tsx` - Main layout wrapper
- `frontendv2/src/components/layout/Sidebar.tsx` - Desktop navigation
- `frontendv2/src/components/layout/BottomTabs.tsx` - Mobile navigation
- `frontendv2/src/components/layout/TopBar.tsx` - Header component

### Configuration

- `frontendv2/tailwind.config.js` - Design tokens and theme
- `frontendv2/src/styles/index.css` - Global styles and utilities

For implementation details, see **[Layout Patterns](./specs/04-frontend/layout-patterns.md)**.

## Accessibility Requirements

- **Keyboard Navigation**: Full support for tab/arrow keys
- **Screen Readers**: Proper ARIA labels and landmarks
- **Color Contrast**: WCAG AA compliance minimum
- **Focus Indicators**: Visible focus states for all interactive elements
- **Mobile**: Touch targets minimum 44x44px

## Quick Reference

### Layout Dimensions

```scss
// Desktop
$sidebar-width: 240px;
$topbar-height: 64px;

// Mobile
$mobile-header-height: 56px;
$bottom-tabs-height: 56px;
```

### Common Patterns

```tsx
// Responsive grid
className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

// Mobile-first spacing
className = 'p-4 md:p-6 lg:p-8'

// Conditional display
className = 'hidden md:block' // Desktop only
className = 'md:hidden' // Mobile only
```

## Related Documentation

- **[Technical Specifications](./specs/README.md)** - Complete documentation index
- **[Frontend Architecture](./specs/04-frontend/architecture.md)** - React architecture
- **[Component Library](./specs/04-frontend/components.md)** - Component documentation
- **[Feature Specifications](./specs/05-features/)** - Feature-specific layouts

---

> **Note**: This document serves as a quick reference. For detailed specifications and implementation guidelines, please refer to the linked documentation in the specs folder.

_Last updated: December 2024 | Version 1.7.6_
