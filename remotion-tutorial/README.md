# Mirubato Tutorial Videos

Professional tutorial and introduction videos for Mirubato, built with Remotion.

## Video Overview

The main composition (`MirubatoIntro`) is a 2:23 minute video showcasing:

1. **Intro** (8s) - Logo reveal and tagline
2. **Overview** (15s) - What is Mirubato and key features
3. **Logbook Demo** (30s) - Practice tracking with heatmap and timer
4. **Scorebook Demo** (25s) - Sheet music library with AI metadata extraction
5. **Toolbox Demo** (25s) - Metronome, Circle of Fifths, practice counter
6. **Architecture** (30s) - Cloudflare edge infrastructure visualization
7. **Outro** (10s) - Call to action and links

## Setup

```bash
# Navigate to the remotion-tutorial directory
cd remotion-tutorial

# Install dependencies
pnpm install
# or
npm install
```

## Development

```bash
# Start Remotion Studio for preview
pnpm run dev
# or
npm run dev

# Open http://localhost:3000 to preview
```

## Rendering

```bash
# Render the full video
pnpm run render MirubatoIntro output.mp4

# Render with custom quality
npx remotion render src/index.ts MirubatoIntro output.mp4 --codec=h264 --quality=90

# Render a single frame for preview
pnpm run still MirubatoIntro --frame=500 --output=preview.png
```

## Project Structure

```
remotion-tutorial/
├── src/
│   ├── index.ts              # Entry point
│   ├── Root.tsx              # Composition registration
│   ├── MirubatoIntro.tsx     # Main video composition with sequencing
│   ├── scenes/               # Individual scene components
│   │   ├── Intro.tsx
│   │   ├── Overview.tsx
│   │   ├── LogbookDemo.tsx
│   │   ├── ScorebookDemo.tsx
│   │   ├── ToolboxDemo.tsx
│   │   ├── Architecture.tsx
│   │   └── Outro.tsx
│   ├── components/           # Reusable video components
│   │   ├── ChapterTitle.tsx
│   │   ├── Annotation.tsx
│   │   ├── Transition.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── Logo.tsx
│   │   └── ArchitectureBox.tsx
│   ├── utils/                # Animation helpers
│   │   └── animations.ts
│   └── theme/                # Design system
│       └── mirubato.ts
└── public/                   # Static assets
    ├── screenshots/
    └── audio/
```

## Customization

### Adding Screenshots

Place actual screenshots in `public/screenshots/` and reference them in scene components:

```tsx
import { Img, staticFile } from 'remotion'
;<Img src={staticFile('screenshots/logbook.png')} />
```

### Adding Audio

Place background music or narration in `public/audio/`:

```tsx
import { Audio } from 'remotion'
;<Audio src={staticFile('audio/background.mp3')} volume={0.3} />
```

### Modifying Timing

Adjust scene durations in `MirubatoIntro.tsx`:

```tsx
const scenes = {
  intro: 8, // seconds
  overview: 15,
  // ...
}
```

Remember to update `durationInFrames` in `Root.tsx` accordingly.

## Design System

The video uses Mirubato's typography and color system:

- **Fonts**: Noto Serif (music), Inter (UI), Lexend (headers)
- **Colors**: Dark slate background with indigo primary
- **Animations**: Spring-based for natural motion

See `src/theme/mirubato.ts` for the complete design tokens.

## Export Formats

```bash
# Standard HD (1080p)
npx remotion render src/index.ts MirubatoIntro output-1080p.mp4

# For social media (square)
# Modify width/height in Root.tsx to 1080x1080

# For mobile (vertical)
# Modify width/height in Root.tsx to 1080x1920
```

## Requirements

- Node.js 18+
- Remotion 4.x
- React 18.x
