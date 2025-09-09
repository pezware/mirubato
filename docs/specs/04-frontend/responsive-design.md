# Responsive Design Specification

## Overview

Mirubato follows a mobile-first responsive design approach, ensuring optimal user experience across all device sizes from phones to large desktop displays.

## Design Philosophy

### Mobile-First Approach

- Start with mobile layout and enhance for larger screens
- Progressive enhancement over graceful degradation
- Touch-first interactions with mouse/keyboard enhancements
- Performance optimization for mobile networks

### Adaptive vs Responsive

- **Responsive**: Fluid layouts that adapt to any screen size
- **Adaptive**: Specific layouts for key breakpoints
- Mirubato uses a hybrid approach with responsive grids and adaptive navigation

## Breakpoint System

### Core Breakpoints

```scss
// Tailwind breakpoints used throughout the application
$breakpoints: {
  // Mobile devices (default, no prefix needed)
  base: 0px,      // All sizes

  // Small devices
  sm: 640px,      // Large phones, small tablets in portrait

  // Medium devices (Layout switch point)
  md: 768px,      // Tablets, small laptops

  // Large devices
  lg: 1024px,     // Desktops, large tablets in landscape

  // Extra large devices
  xl: 1280px,     // Large desktops

  // 2X Extra large devices
  '2xl': 1536px   // Ultra-wide monitors
}
```

### Breakpoint Usage

```tsx
// Tailwind responsive utilities
<div className="
  w-full           // Mobile: full width
  md:w-1/2         // Tablet: half width
  lg:w-1/3         // Desktop: third width
  xl:w-1/4         // Large desktop: quarter width
">
```

## Layout Transitions

### Navigation System

| Screen Size | Navigation Type | Visibility          |
| ----------- | --------------- | ------------------- |
| < 768px     | Bottom tabs     | Always visible      |
| ≥ 768px     | Sidebar         | Collapsible         |
| ≥ 1024px    | Sidebar         | Expanded by default |

### Content Layout

| Screen Size | Layout Type | Columns | Padding |
| ----------- | ----------- | ------- | ------- |
| < 640px     | Stack       | 1       | 16px    |
| 640-767px   | Stack       | 1       | 20px    |
| 768-1023px  | Grid        | 2       | 24px    |
| 1024-1279px | Grid        | 3       | 32px    |
| ≥ 1280px    | Grid        | 4       | 32px    |

## Component Responsive Behavior

### Cards

```tsx
// Responsive card grid
<div className="
  grid
  grid-cols-1        // Mobile: single column
  sm:grid-cols-2     // Small: 2 columns
  lg:grid-cols-3     // Desktop: 3 columns
  xl:grid-cols-4     // Large: 4 columns
  gap-4              // Mobile: 16px gap
  md:gap-6           // Desktop: 24px gap
">
```

### Forms

```tsx
// Responsive form layout
<form
  className="
  space-y-4          // Mobile: stacked with spacing
  md:space-y-6       // Desktop: larger spacing
"
>
  <div
    className="
    flex 
    flex-col         // Mobile: stack labels and inputs
    md:flex-row      // Desktop: side-by-side
    md:items-center
    gap-2
    md:gap-4
  "
  >
    <label className="md:w-1/3">Label</label>
    <input className="flex-1" />
  </div>
</form>
```

### Tables

```tsx
// Mobile: Card view, Desktop: Table view
function ResponsiveTable({ data }) {
  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden">
        {data.map(item => (
          <Card key={item.id}>
            <CardContent item={item} />
          </Card>
        ))}
      </div>

      {/* Desktop table view */}
      <table className="hidden md:table">
        <thead>...</thead>
        <tbody>...</tbody>
      </table>
    </>
  )
}
```

## Mobile-Specific Patterns

### Touch Interactions

```scss
// Touch target sizes
.touch-target {
  min-height: 44px; // iOS recommendation
  min-width: 44px; // Android recommendation
}

// Touch feedback
.touchable {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  touch-action: manipulation; // Prevent zoom on double tap
}
```

### Swipe Gestures

```tsx
// Swipeable tabs for mobile
import { useSwipeable } from 'react-swipeable'

function SwipeableTabs() {
  const handlers = useSwipeable({
    onSwipedLeft: () => nextTab(),
    onSwipedRight: () => prevTab(),
  })

  return (
    <div {...handlers}>
      <TabContent />
    </div>
  )
}
```

### Mobile Modals

```tsx
// Full-screen modals on mobile
<Modal className="
  fixed inset-0           // Mobile: full screen
  md:inset-auto          // Desktop: centered
  md:max-w-2xl
  md:mx-auto
  md:my-8
  md:rounded-lg
">
```

## Desktop-Specific Patterns

### Hover States

```scss
// Only show hover states on devices with hover capability
@media (hover: hover) {
  .hoverable:hover {
    background-color: rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
  }
}
```

### Multi-Column Layouts

```tsx
// Desktop split view
<div
  className="
  flex 
  flex-col           // Mobile: stack
  lg:flex-row        // Desktop: side-by-side
"
>
  <aside
    className="
    w-full           // Mobile: full width
    lg:w-64          // Desktop: fixed width
    xl:w-80
  "
  >
    <Filters />
  </aside>
  <main
    className="
    flex-1
    mt-4             // Mobile: spacing
    lg:mt-0          // Desktop: no top margin
    lg:ml-6          // Desktop: left margin
  "
  >
    <Content />
  </main>
</div>
```

## Typography Responsiveness

### Font Sizes

```scss
// Responsive typography scale
.text-responsive {
  // Mobile
  font-size: 14px;
  line-height: 1.5;

  @media (min-width: 768px) {
    font-size: 16px;
    line-height: 1.6;
  }

  @media (min-width: 1024px) {
    font-size: 18px;
    line-height: 1.7;
  }
}
```

### Heading Hierarchy

```tsx
// Responsive heading sizes
<h1 className="
  text-2xl           // Mobile: 24px
  md:text-3xl        // Tablet: 30px
  lg:text-4xl        // Desktop: 36px
  font-semibold
">
```

## Image Responsiveness

### Responsive Images

```tsx
// Picture element for art direction
<picture>
  <source media="(min-width: 1024px)" srcSet="/hero-desktop.webp" />
  <source media="(min-width: 768px)" srcSet="/hero-tablet.webp" />
  <img src="/hero-mobile.webp" alt="Hero" className="w-full h-auto" />
</picture>
```

### Aspect Ratios

```tsx
// Maintain aspect ratios across breakpoints
<div
  className="
  aspect-w-16 aspect-h-9    // 16:9 on all sizes
  md:aspect-w-4 md:aspect-h-3  // 4:3 on desktop
"
>
  <img src={url} className="object-cover" />
</div>
```

## Performance Considerations

### Viewport Meta Tag

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

### CSS Containment

```scss
// Optimize reflow/repaint
.card {
  contain: layout style;
}

.list-item {
  contain: size layout;
}
```

### Responsive Loading

```tsx
// Load different components based on screen size
const DynamicComponent = dynamic(() => {
  if (window.innerWidth < 768) {
    return import('./MobileComponent')
  }
  return import('./DesktopComponent')
})
```

## Testing Responsive Design

### Device Testing Matrix

| Device Category  | Viewport Sizes         | Priority |
| ---------------- | ---------------------- | -------- |
| Mobile Portrait  | 320px, 375px, 414px    | High     |
| Mobile Landscape | 568px, 667px, 736px    | Medium   |
| Tablet Portrait  | 768px, 834px           | High     |
| Tablet Landscape | 1024px, 1194px         | Medium   |
| Desktop          | 1280px, 1440px, 1920px | High     |

### Browser DevTools

```javascript
// Chrome DevTools device presets to test
const devices = [
  'iPhone SE',
  'iPhone 12 Pro',
  'Pixel 5',
  'iPad Air',
  'iPad Pro',
  'Desktop 1080p',
  'Desktop 4K',
]
```

## Accessibility in Responsive Design

### Focus Management

```scss
// Ensure focus indicators work across all sizes
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

// Skip to content link
.skip-link {
  position: absolute;
  top: -40px;

  &:focus {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 9999;
  }
}
```

### Zoom Support

```scss
// Don't disable zoom
// Bad: user-scalable=no
// Good: Allow pinch-to-zoom

// Ensure text remains readable when zoomed
html {
  font-size: 100%; // Use relative units
}
```

## Common Responsive Patterns

### Container Queries (Future)

```scss
// Prepare for container queries
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

### Responsive Utilities

```tsx
// Custom hooks for responsive behavior
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)

    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Usage
const isMobile = useMediaQuery('(max-width: 767px)')
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
```

## Migration Guidelines

### From Desktop-First to Mobile-First

1. Start with mobile styles as default
2. Add tablet styles with `md:` prefix
3. Add desktop styles with `lg:` prefix
4. Remove unnecessary desktop-first overrides
5. Test on real devices

### Progressive Enhancement

1. Core functionality works on all devices
2. Enhanced features for capable devices
3. Graceful fallbacks for older browsers
4. Performance budgets for mobile

## Related Documentation

- [Layout Patterns](./layout-patterns.md) - Layout system and structure
- [UI Design System](./ui-design-system.md) - Visual design specifications
- [Components](./components.md) - Component implementation
- [Performance](../07-operations/performance.md) - Performance optimization

---

_Last updated: 2025-09-09 | Version 1.7.6_
