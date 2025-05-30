# Rubato Development Setup

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
│   └── PianoKey.tsx
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
│   ├── audioManager.ts
│   └── theme.ts
├── styles/         # Global styles
│   └── index.css
├── types/          # TypeScript type definitions
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Design System

The project uses a nature-inspired color palette extracted from the rubato-cover.jpeg image:

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
   - Full-screen background image from rubato-cover.jpeg
   - Elegant title and subtitle with fade-in animations
   - Glass-morphism effect on content panels

2. **Interactive Piano Key**
   - Plays F# note when clicked
   - Visual feedback on interaction
   - Touch-friendly for mobile devices
   - Powered by Tone.js audio synthesis
   - Audio initializes on first user interaction (browser requirement)

3. **Design Flexibility**
   - Centralized theme configuration
   - CSS custom properties for easy theming
   - Tailwind CSS for rapid development
   - Component-based architecture for reusability

## Next Steps

- Add more interactive musical elements
- Implement user authentication
- Create practice session components
- Add VexFlow for music notation
- Set up Cloudflare Workers for backend