# Practice Page Design Document

## Design Philosophy

- **Minimalist**: Controls should not distract from sheet music reading
- **Responsive**: Elegant adaptation across laptop, tablet, and mobile
- **Accessible**: Easy to use while playing an instrument
- **Mode-aware**: Different control sets for different practice modes

## Control Inventory

### Primary Controls (Always Visible)

1. **Play/Pause/Stop** - Transport controls
2. **Volume** - Audio level adjustment
3. **Tempo** - BPM adjustment
4. **Mode Selector** - Practice/Sight-reading/Debug

### Secondary Controls (Mode-Dependent)

5. **Metronome** - Click track on/off
6. **Loop Section** - A-B repeat markers
7. **Note Feedback** - Visual/audio feedback toggle
8. **Progress Bar** - Current position in piece

### Tertiary Controls (Settings/Options)

9. **Instrument Selection** - Guitar/Piano
10. **Difficulty Level** - Beginner to Advanced
11. **Key Signature** - For sight-reading mode
12. **Time Signature** - For sight-reading mode

## Layout Strategy

### Desktop/Laptop (1024px+)

```
┌─────────────────────────────────────────────┐
│  [Logo]                   [Mode]  [Settings] │
├─────────────────────────────────────────────┤
│                                             │
│         Sheet Music Display (Page)          │
│                                             │
│     [<]    • • ● • •  (3/5)    [>]        │
├─────────────────────────────────────────────┤
│  [Play] [Stop]  ───Tempo───  ◉ Vol         │
│  ━━━━━━━━━━━━━━ Progress ━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────────────┘
```

### Tablet/iPad (768px - 1024px)

```
┌─────────────────────────────┐
│  [≡]  mirubato    [Settings]│
├─────────────────────────────┤
│                             │
│     Sheet Music Display     │
│                             │
├─────────────────────────────┤
│ [▶] ───Tempo─── ◉ [Mode]    │
│ ━━━━━━ Progress ━━━━━━━━━━ │
└─────────────────────────────┘
```

### Mobile (< 768px)

```
┌─────────────────┐
│  [≡]  mirubato  │
├─────────────────┤
│                 │
│   Sheet Music   │
│                 │
├─────────────────┤
│ [▶] ◉ ─Tempo─  │
│ ━━━ Progress ━━ │
└─────────────────┘
```

## Page Navigation Design

### Sheet Music Display

- **Fixed Height**: Always shows one "page" of music
- **Page Size**: 4 measures on desktop, 2 on mobile
- **Navigation**: Arrow buttons and swipe gestures
- **Page Indicator**: Dots showing current page and total
- **Transition**: Smooth fade between pages

### Navigation Controls

- **Arrow Buttons**: Semi-transparent circles with chevrons
- **Opacity**: 30% normal, 60% hover, 20% disabled
- **Position**: Overlaid on bottom of sheet music
- **Mobile**: Swipe gestures with hint on first load
- **Keyboard**: Arrow keys for page navigation

## Control Designs

### 1. Circular Volume Control (Primary Round Control)

- **Design**: Minimalist clock-face with single hand
- **Interaction**: Click and drag in circular motion
- **Visual**: Thin line indicating level, subtle shadow
- **Range**: -60db to 0db (mapped to 270° rotation)
- **Mobile**: Tap to show, then drag

### 2. Linear Tempo Slider

- **Design**: Thin horizontal track with pill-shaped thumb
- **Interaction**: Drag or click on track
- **Visual**: Subtle gradient fill showing current value
- **Range**: 30-180 BPM (practice), 60-200 BPM (performance)
- **Mobile**: Larger touch target when active

### 3. Mode Selector

- **Design**: Segmented control / Toggle group
- **Options**: Practice | Sight-read | Debug
- **Visual**: Subtle background shift, no harsh borders
- **Behavior**: Changes available controls

### 4. Transport Controls

- **Design**: Icon-based with subtle hover states
- **Play/Pause**: Single toggle button
- **Stop**: Separate button (resets to beginning)
- **Visual**: Soft shadows, minimal color

### 5. Progress Bar

- **Design**: Thin line with current position indicator
- **Interaction**: Click to jump to position
- **Visual**: Subtle pulse at current position
- **Mobile**: Slightly thicker for touch

## Mode-Specific Layouts

### Practice Mode

- Shows: Transport, Volume, Tempo, Progress, Loop controls
- Hides: Key/Time signature selectors
- Focus: Repetition and mastery

### Sight-Reading Mode

- Shows: Transport, Volume, Tempo, Difficulty selector
- Adds: "Next Piece" button, Key/Time options
- Focus: Continuous flow, no stopping

### Debug Mode

- Shows: All controls with labels
- Adds: Console output, MIDI monitor
- Focus: Development and testing

## Color Palette for Controls

Based on existing Mirubato design:

- **Primary**: mirubato-leaf (subtle green)
- **Secondary**: mirubato-wood (warm brown)
- **Background**: Near white (#FEFEFE)
- **Ghost Controls**: 5% opacity for hidden states
- **Active**: 80% opacity for engaged controls
- **Hover**: 60% opacity for available actions

## Responsive Behavior

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Adaptation Strategy

1. **Progressive Disclosure**: Show fewer controls on smaller screens
2. **Gesture Support**: Swipe for mode changes on mobile
3. **Touch Targets**: Minimum 44px on mobile
4. **Context Menus**: Long-press for additional options

## Interaction Patterns

### Desktop

- Hover states for all interactive elements
- Keyboard shortcuts (Space: play/pause, ↑/↓: tempo)
- Fine control with shift+drag for precision

### Touch Devices

- Larger hit areas around controls
- Momentum scrolling for tempo/volume
- Haptic feedback where supported

## Accessibility Considerations

1. **Keyboard Navigation**: Full keyboard support
2. **Screen Readers**: ARIA labels for all controls
3. **High Contrast**: Controls visible in high contrast mode
4. **Focus Indicators**: Clear focus states

## Implementation Priority

1. **Phase 1**: Core controls (Play, Volume, Tempo)
2. **Phase 2**: Mode selector and progress bar
3. **Phase 3**: Loop controls and metronome
4. **Phase 4**: Sight-reading specific features

## Mock Control Visibility

For testing, controls will be rendered at:

- 5% opacity during normal use
- 15% opacity on hover
- 100% opacity when active
- This allows testing layout without distraction
