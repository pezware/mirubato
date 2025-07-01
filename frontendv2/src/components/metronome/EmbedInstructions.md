# Mirubato Metronome - Embed Instructions

## Overview

The Mirubato Metronome can be embedded in external websites as either an iframe or a web component.

## Method 1: iframe Embed (Easiest)

```html
<!-- Basic embed -->
<iframe
  src="https://mirubato.com/tools/metronome/embed"
  width="400"
  height="600"
  frameborder="0"
  allow="autoplay"
></iframe>

<!-- Responsive embed -->
<div
  style="position: relative; padding-bottom: 150%; height: 0; overflow: hidden;"
>
  <iframe
    src="https://mirubato.com/tools/metronome/embed"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="autoplay"
  ></iframe>
</div>
```

### URL Parameters

- `?bpm=120` - Set initial tempo
- `?pattern=waltz` - Set initial pattern
- `?minimal=true` - Start in minimal mode
- `?theme=dark` - Use dark theme (future feature)

Example: `https://mirubato.com/tools/metronome/embed?bpm=140&pattern=shuffle`

## Method 2: Web Component (Advanced)

```html
<!-- Include the script -->
<script src="https://mirubato.com/widgets/metronome.js"></script>

<!-- Use the component -->
<mirubato-metronome
  bpm="120"
  pattern="basic"
  position="corner"
></mirubato-metronome>
```

### Component Attributes

- `bpm` - Initial tempo (40-240)
- `pattern` - Pattern ID from preset list
- `position` - Widget position: 'side' or 'corner'
- `minimal` - Start collapsed: 'true' or 'false'

## Method 3: NPM Package (For React Apps)

```bash
npm install @mirubato/metronome
```

```jsx
import { MirubatoMetronome } from '@mirubato/metronome'

function MyApp() {
  return (
    <MirubatoMetronome
      initialBpm={120}
      position="corner"
      onBpmChange={bpm => console.log('BPM:', bpm)}
    />
  )
}
```

## Implementation Requirements

### For iframe Embed:

1. Create `/tools/metronome/embed` route with minimal UI
2. Add CSP headers to allow embedding
3. PostMessage API for parent-child communication
4. Remove unnecessary UI elements (header/footer)

### For Web Component:

1. Build standalone bundle with dependencies
2. Create custom element wrapper
3. Shadow DOM for style isolation
4. Event system for communication

### For NPM Package:

1. Extract metronome as separate package
2. Bundle with minimal dependencies
3. Publish to NPM registry
4. TypeScript definitions

## Security Considerations

- CORS headers for asset loading
- Content Security Policy configuration
- API rate limiting for embed usage
- Domain whitelist (optional)

## Analytics

Track embed usage with:

- Referrer domain
- Usage patterns
- Feature adoption
- Performance metrics

## Customization Options

Sites can customize:

- Colors (via CSS variables)
- Size and position
- Available features
- Sound preferences
