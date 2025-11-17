# Remotion API Quick Reference

Quick reference for commonly used Remotion APIs and patterns.

## Core Hooks

### useCurrentFrame()
Returns the current frame number of the video.

```tsx
import {useCurrentFrame} from 'remotion';

const frame = useCurrentFrame();
// frame is 0-indexed (0, 1, 2, 3, ...)
```

### useVideoConfig()
Returns video configuration (fps, width, height, durationInFrames).

```tsx
import {useVideoConfig} from 'remotion';

const {fps, width, height, durationInFrames} = useVideoConfig();
```

## Animation Functions

### interpolate()
Maps input range to output range (like a lerp function).

```tsx
import {interpolate} from 'remotion';

const opacity = interpolate(
  frame,              // Input value
  [0, 30],           // Input range
  [0, 1],            // Output range
  {
    extrapolateLeft: 'clamp',    // or 'extend', 'identity'
    extrapolateRight: 'clamp'    // or 'extend', 'identity'
  }
);
```

**Common use cases:**
- Fade in/out: `interpolate(frame, [0, 30], [0, 1])`
- Slide: `interpolate(frame, [0, 30], [-100, 0])`
- Scale: `interpolate(frame, [0, 30], [0.5, 1])`

### spring()
Creates natural spring-based animations.

```tsx
import {spring} from 'remotion';

const scale = spring({
  frame,              // Current frame
  fps,                // Frames per second
  config: {
    damping: 100,     // Lower = more bouncy (default: 10)
    stiffness: 200,   // Higher = faster (default: 100)
    mass: 0.5,        // Higher = slower (default: 1)
    overshootClamping: false  // Prevent overshoot if true
  }
});
```

**Preset configs:**
```tsx
import {SpringConfig} from 'remotion';

// Built-in presets
const config: SpringConfig = {
  // Gentle spring
  damping: 200,
  stiffness: 90,
  mass: 1.2,

  // Bouncy spring
  damping: 50,
  stiffness: 300,
  mass: 0.5,

  // Quick spring
  damping: 100,
  stiffness: 400,
  mass: 0.3
};
```

### Easing
Use easing functions with interpolate for smoother animations.

```tsx
import {Easing, interpolate} from 'remotion';

const x = interpolate(
  frame,
  [0, 100],
  [0, 1],
  {
    easing: Easing.bezier(0.42, 0, 0.58, 1),  // ease-in-out
    extrapolateRight: 'clamp'
  }
);

// Common easing functions:
Easing.linear          // No easing
Easing.ease            // Default ease
Easing.ease-in         // Slow start
Easing.ease-out        // Slow end
Easing.ease-in-out     // Slow start and end
Easing.bezier(x1, y1, x2, y2)  // Custom cubic bezier
```

## Layout Components

### AbsoluteFill
Fills the entire parent container with absolute positioning.

```tsx
import {AbsoluteFill} from 'remotion';

<AbsoluteFill style={{backgroundColor: 'blue'}}>
  Content fills entire parent
</AbsoluteFill>
```

### Sequence
Time-shifts child components to specific frames.

```tsx
import {Sequence} from 'remotion';

// Start at frame 0, last 60 frames
<Sequence durationInFrames={60}>
  <Scene1 />
</Sequence>

// Start at frame 60, last 90 frames
<Sequence from={60} durationInFrames={90}>
  <Scene2 />
</Sequence>

// Start at frame 150, no end
<Sequence from={150}>
  <Scene3 />
</Sequence>
```

**Nested Sequences** (times cascade):
```tsx
<Sequence from={30}>
  {/* This starts at frame 30 */}
  <Sequence from={10}>
    {/* This actually starts at frame 40 (30 + 10) */}
    <Content />
  </Sequence>
</Sequence>
```

### Series
Automatically arranges sequences one after another.

```tsx
import {Series} from 'remotion';

<Series>
  <Series.Sequence durationInFrames={60}>
    <Scene1 />
  </Series.Sequence>
  <Series.Sequence durationInFrames={90}>
    <Scene2 />
  </Series.Sequence>
  <Series.Sequence durationInFrames={120}>
    <Scene3 />
  </Series.Sequence>
</Series>
```

## Media Components

### Audio
Add audio to your video.

```tsx
import {Audio} from 'remotion';

<Audio
  src="/audio/music.mp3"
  volume={0.5}              // 0 to 1
  startFrom={30}            // Start from frame 30
  endAt={180}               // End at frame 180
  playbackRate={1.0}        // Speed multiplier
/>
```

### Video
Embed video files.

```tsx
import {Video} from 'remotion';

<Video
  src="/video/clip.mp4"
  volume={1}
  startFrom={0}
  endAt={300}
  playbackRate={1.0}
  style={{width: '100%', height: '100%'}}
/>
```

### Img
Display images with preloading.

```tsx
import {Img} from 'remotion';

<Img
  src="/images/logo.png"
  style={{width: 200, height: 200}}
/>
```

### OffthreadVideo
Use for better performance with video files.

```tsx
import {OffthreadVideo} from 'remotion';

<OffthreadVideo
  src="/video/background.mp4"
  style={{width: '100%', height: '100%'}}
/>
```

## Composition Registration

### Composition
Register a video composition in Root.tsx.

```tsx
import {Composition} from 'remotion';
import {MyVideo} from './MyVideo';

<Composition
  id="MyVideo"                    // Unique ID
  component={MyVideo}             // React component
  durationInFrames={300}          // Total frames (300 frames = 10 sec at 30fps)
  fps={30}                        // Frames per second
  width={1920}                    // Width in pixels
  height={1080}                   // Height in pixels
  defaultProps={{                 // Default props passed to component
    title: 'My Video'
  }}
/>
```

### Folder
Organize compositions into folders.

```tsx
import {Folder} from 'remotion';

<Folder name="Tutorials">
  <Composition id="Intro" component={Intro} {...config} />
  <Composition id="Overview" component={Overview} {...config} />
</Folder>
```

## Time Calculations

### Common Frame Calculations

```typescript
// Convert seconds to frames
const frames = (seconds: number, fps: number) => seconds * fps;

// Convert frames to seconds
const seconds = (frames: number, fps: number) => frames / fps;

// At 30 fps:
frames(1, 30);    // 30 frames = 1 second
frames(0.5, 30);  // 15 frames = 0.5 seconds
frames(2, 30);    // 60 frames = 2 seconds

// Common durations at 30fps:
const SHORT = 15;      // 0.5 seconds
const MEDIUM = 30;     // 1 second
const LONG = 60;       // 2 seconds
const VERY_LONG = 90;  // 3 seconds
```

## Color Helpers

### continueRender() and delayRender()
Handle async operations during render.

```tsx
import {continueRender, delayRender} from 'remotion';

const [handle] = useState(() => delayRender());

useEffect(() => {
  // Do async work
  fetchData().then(() => {
    continueRender(handle);
  });
}, [handle]);
```

## Text Animation Patterns

### Typewriter Effect
```tsx
const text = "Hello World";
const charsToShow = Math.floor(interpolate(
  frame,
  [0, 60],
  [0, text.length],
  {extrapolateRight: 'clamp'}
));

<div>{text.slice(0, charsToShow)}</div>
```

### Word-by-word Reveal
```tsx
const words = "Hello world from Remotion".split(' ');
const wordsToShow = Math.floor(interpolate(
  frame,
  [0, 60],
  [0, words.length],
  {extrapolateRight: 'clamp'}
));

<div>{words.slice(0, wordsToShow).join(' ')}</div>
```

### Staggered Animation
```tsx
const items = ['Item 1', 'Item 2', 'Item 3'];

{items.map((item, i) => {
  const delay = i * 10;  // 10 frames between each
  const opacity = spring({
    frame: frame - delay,
    fps,
    config: {damping: 100}
  });

  return (
    <div key={i} style={{opacity}}>
      {item}
    </div>
  );
})}
```

## Performance Tips

1. **Use `useMemo` for expensive calculations**
```tsx
const data = useMemo(() => expensiveOperation(), []);
```

2. **Lazy load components**
```tsx
import {lazyComponent} from 'remotion';
const HeavyScene = lazyComponent(() => import('./HeavyScene'));
```

3. **Optimize images**
- Use appropriate formats (WebP, PNG, JPEG)
- Compress images before importing
- Use correct dimensions (don't scale down large images)

4. **Limit active sequences**
- Components outside their sequence time range aren't rendered
- Use `durationInFrames` to unmount components when not needed

## Rendering Commands

```bash
# Development mode (preview)
npm run dev

# Render still frame
npx remotion still src/index.ts MyVideo --frame=150 --output=frame.png

# Render video
npx remotion render src/index.ts MyVideo output.mp4

# Render with options
npx remotion render src/index.ts MyVideo output.mp4 \
  --codec=h264 \
  --quality=90 \
  --scale=1 \
  --concurrency=4

# Available codecs
# h264, h265, vp8, vp9, prores (Mac only)

# Render with custom props
npx remotion render src/index.ts MyVideo output.mp4 \
  --props='{"title":"Custom Title","color":"#ff0000"}'
```

## Common Video Specs

### Resolution Presets
```typescript
// HD (720p)
width: 1280, height: 720

// Full HD (1080p)
width: 1920, height: 1080

// 2K
width: 2560, height: 1440

// 4K (UHD)
width: 3840, height: 2160

// Square (Instagram)
width: 1080, height: 1080

// Vertical (Stories/Reels)
width: 1080, height: 1920

// Widescreen 21:9
width: 2560, height: 1080
```

### Frame Rate Standards
```typescript
24 fps  // Cinematic (film)
25 fps  // PAL (Europe)
30 fps  // Standard (North America, web)
60 fps  // Smooth (gaming, high motion)
```

## Troubleshooting

### Video doesn't update in preview
- Refresh browser (Cmd/Ctrl + R)
- Check console for errors
- Verify all Sequences have correct `from` and `durationInFrames`

### Audio out of sync
- Ensure sequence timing matches audio duration
- Check playback rate settings
- Verify audio file isn't corrupted

### Slow rendering
- Reduce resolution for testing
- Lower FPS during development
- Use `--concurrency` flag to increase parallel renders
- Optimize images and assets

### Component not visible
- Check if current frame is within Sequence range
- Verify opacity/transform values
- Check z-index stacking
- Look for parent container overflow hidden

## Resources

- Official Docs: https://remotion.dev/docs
- API Reference: https://remotion.dev/docs/api
- Community Showcase: https://remotion.dev/showcase
- Discord: https://remotion.dev/discord
