# Practice Page Controls Visual Guide

## Control States & Behavior

### 1. Circular Volume Control

- **Normal State**: 5% opacity (almost invisible)
- **Hover State**: 15% opacity (slightly visible)
- **Active/Dragging**: 100% opacity
- **Design Inspiration**: Vintage car dashboard / minimal clock face
- **Interaction**: Click and drag in circular motion
- **Mobile**: Tap to activate, then drag

### 2. Mode Selector (Desktop/Tablet only)

- **States**: Practice | Sight-read | Debug
- **Visual**: Pill-shaped segmented control
- **Behavior**: Changes available controls
- **Mobile**: Accessed via hamburger menu

### 3. Progress Bar

- **Design**: Thin horizontal line
- **Interaction**: Click to jump to position
- **Visual Feedback**: Subtle pulse at current position
- **Responsive**: Slightly thicker on mobile

### 4. Page Navigation

- **Full-Side Tap Areas**: Left 1/3 and right 1/3 of sheet music are clickable
- **Visual Indicators**: Small arrow buttons at bottom (20% opacity)
- **Page Dots**: Center bottom showing current page
- **Hover Effect**: Subtle darkening (5% opacity) on desktop
- **Mobile Portrait**: Vertical scroll instead of pages
- **Mobile Landscape**: Swipe gestures + tap areas
- **Keyboard**: Arrow keys for page navigation

### 5. Ghost Controls (Future Features)

- **Opacity**: 5% in normal mode
- **Purpose**: Test layout without visual distraction
- **Examples**:
  - Loop A-B button
  - Metronome toggle
  - Note hints toggle
  - Difficulty selector

## Responsive Breakpoints

### Mobile Portrait (< 640px, vertical)

- **Vertical Scroll**: All measures in one scrollable view
- **Full-Size Notation**: No shrinking, natural reading size
- **Compact Controls**: Below sheet music
- Single circular control (volume)
- Tempo inline with transport
- Mode selector in menu

### Mobile Landscape (< 640px, horizontal)

- **Page-Based**: 2 measures per page
- **Swipe Navigation**: Left/right swipe to turn pages
- **Tap Areas**: Full-side taps for page turning
- Compact controls
- Larger touch targets

### Tablet (640px - 1024px)

- Balanced layout
- Circular volume at 60px
- Horizontal control arrangement
- Mode selector visible

### Desktop (> 1024px)

- Full layout with all controls
- Circular volume at 70px
- Mode selector in header
- Ghost controls visible

## Color & Opacity Guide

```css
/* Control Visibility States */
.ghost-control {
  opacity: 0.05; /* Normal - barely visible */
}

.ghost-control:hover {
  opacity: 0.15; /* Hover - slightly visible */
}

.ghost-control:active,
.ghost-control.dragging {
  opacity: 1; /* Active - fully visible */
}

/* Control Colors */
.control-primary {
  color: var(--mirubato-leaf-400); /* Active elements */
}

.control-secondary {
  color: var(--mirubato-wood-600); /* Inactive elements */
}

.control-track {
  color: var(--mirubato-wood-100); /* Background tracks */
}
```

## Testing the Design

1. **View at `/practice-redesign`** to see the new design
2. **Toggle Debug Mode** to see all controls at full opacity
3. **Resize Browser** to test responsive behavior
4. **Test Touch** on mobile devices or Chrome DevTools

## Design Principles Applied

1. **Minimal Distraction**: Controls fade into background when not needed
2. **Progressive Disclosure**: Show only essential controls on smaller screens
3. **Consistent Interaction**: Similar gestures across all controls
4. **Visual Hierarchy**: Primary actions prominent, secondary actions subtle
5. **Accessibility**: All controls keyboard navigable with proper ARIA labels

## Future Enhancements

1. **Haptic Feedback**: Subtle vibration on control changes (mobile)
2. **Gesture Support**: Swipe to change modes, pinch for zoom
3. **Customization**: User preference for control visibility
4. **Animations**: Smooth transitions between states
5. **Themes**: Dark mode support (future consideration)
