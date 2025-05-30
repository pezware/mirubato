# Mirubato Development Setup

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm run dev
   ```

   The app will open at http://localhost:3000

## Project Structure

```
src/
├── components/      # React components
│   ├── LandingPage.tsx
│   ├── PianoKey.tsx
│   └── PianoChord.tsx
├── data/           # Sheet music and exercise data
│   └── sheetMusic/
│       ├── index.ts
│       └── moonlightSonata3rd.ts
├── hooks/          # Custom React hooks
├── pages/          # Page components
│   └── Practice.tsx
├── types/          # TypeScript type definitions
│   └── sheetMusic.ts
├── utils/          # Utility functions
│   ├── audioManager.ts
│   ├── notationRenderer.ts
│   └── theme.ts
├── styles/         # Global styles
│   └── index.css
├── App.tsx         # Main app component with routing
└── main.tsx        # Entry point
```

## Design System

The project uses a nature-inspired color palette extracted from the mirubato-cover.jpeg image:

- **Primary (Leaf Green)**: `#a3e635` - Used for interactive elements
- **Secondary (Wood Gray)**: `#d4d4d8` - Used for backgrounds and panels
- **Text**: Various shades of gray from the wood palette

The design system is configured in:
- `tailwind.config.js` - Tailwind CSS configuration
- `src/utils/theme.ts` - TypeScript theme configuration
- `src/styles/index.css` - Global styles and CSS custom properties

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Key Features Implemented

1. **Landing Page**
   - Full-screen background image from mirubato-cover.jpeg
   - Elegant title and subtitle with fade-in animations
   - Glass-morphism effect on content panels
   - Interactive piano chord demonstration

2. **Practice Page**
   - Full music notation rendering with VexFlow
   - 20 measures of Beethoven's Moonlight Sonata 3rd Movement
   - Real piano sounds using Salamander Grand Piano samples
   - Adjustable tempo control (30-180 BPM)
   - Responsive design for desktop, tablet, and mobile
   - Measure tracking and progress display

3. **Audio System**
   - Real piano samples via Tone.js Sampler
   - audioManager utility for centralized audio handling
   - Support for multiple instruments (piano implemented, guitar ready)
   - Mobile audio context handling

4. **Sheet Music System**
   - Organized data structure in `src/data/sheetMusic/`
   - TypeScript interfaces for type safety
   - Reusable NotationRenderer for any sheet music
   - Easy to add new pieces

## Dependencies

Key packages used:
- `react` & `react-dom` - UI framework
- `react-router-dom` - Page routing
- `vexflow` - Music notation rendering
- `tone` - Audio synthesis and scheduling
- `tailwindcss` - Styling
- `typescript` - Type safety
- `vite` - Build tool

## Next Steps

- Fix tempo speed-up bug after pause/play
- Add volume control
- Implement instrument selection (guitar/piano toggle)
- Add visual feedback for currently playing notes
- Implement user authentication
- Set up Cloudflare Workers for backend