# Mirubato Tutorial Videos

Professional tutorial and introduction videos for Mirubato, built with Remotion.

## Video Overview

The main composition (`MirubatoIntro`) is a **65-second** video (optimized for 1.5x-2x playback speed) showcasing:

1. **Intro** (5s) - Logo reveal and tagline
2. **Overview** (10s) - What is Mirubato and key features
3. **Logbook Demo** (18s) - Practice tracking with heatmap and analytics
4. **Toolbox Demo** (12s) - Metronome, Circle of Fifths, practice counter
5. **Architecture** (15s) - Cloudflare edge infrastructure visualization
6. **Outro** (5s) - Call to action and links

**Note**: Scorebook demo is temporarily excluded as it's in beta.

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

## Screenshot Capture Workflow

The tutorial video can use real screenshots from the Mirubato UI captured by Playwright:

### Quick Start (Capture + Render)

```bash
# One command to capture screenshots and render video
npm run generate

# Or use the shell script
./scripts/capture-and-render.sh
```

### Step-by-Step

1. **Start the frontend dev server** (if not running):

```bash
cd ../frontendv2
pnpm run dev
```

2. **Capture screenshots**:

```bash
npm run capture
# or from frontendv2:
cd ../frontendv2 && pnpm run test:screenshots
```

3. **Preview screenshots**:

```bash
ls -la public/screenshots/
```

4. **Render video**:

```bash
npm run render:video
```

### Screenshot Directory Structure

```
public/screenshots/
├── logbook/
│   ├── overview-full.png      # Main logbook overview
│   ├── data-view.png          # Entries list view
│   ├── repertoire-view.png    # Repertoire tab
│   └── practice-chart.png     # Analytics chart
├── toolbox/
│   ├── metronome-full.png     # Metronome tab
│   ├── counter-full.png       # Practice counter
│   └── circle-of-fifths-full.png
└── common/
    └── toolbox-tabs.png       # Navigation tabs
```

Screenshots are gitignored and regenerated from the actual UI.

## Rendering

```bash
# Render the full video
npm run render:video

# Or with custom options
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
│   │   ├── LogbookDemo.tsx           # Mock UI version
│   │   ├── LogbookScreenshots.tsx    # Real screenshot version
│   │   ├── ScorebookDemo.tsx
│   │   ├── ToolboxDemo.tsx           # Mock UI version
│   │   ├── ToolboxScreenshots.tsx    # Real screenshot version
│   │   ├── Architecture.tsx
│   │   └── Outro.tsx
│   ├── components/           # Reusable video components
│   │   ├── ChapterTitle.tsx
│   │   ├── Annotation.tsx
│   │   ├── Transition.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── Logo.tsx
│   │   ├── ScreenshotFrame.tsx   # Display screenshots with animations
│   │   └── ArchitectureBox.tsx
│   ├── utils/                # Animation helpers
│   │   └── animations.ts
│   └── theme/                # Design system
│       └── mirubato.ts
├── scripts/
│   └── capture-and-render.sh   # Full workflow script
└── public/                   # Static assets
    ├── screenshots/          # Captured UI screenshots (gitignored)
    └── audio/
```

## Scene Modes

The tutorial supports two rendering modes:

1. **Mock UI Mode** (default): Uses React components that simulate the Mirubato UI
   - `LogbookDemo.tsx`, `ToolboxDemo.tsx`
   - No screenshots required, works out of the box

2. **Real Screenshot Mode**: Uses actual screenshots captured from the running app
   - `LogbookScreenshots.tsx`, `ToolboxScreenshots.tsx`
   - More authentic representation of the actual UI
   - Requires running `npm run capture` first

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
