# CLAUDE.md - Programming Agent Guidelines

## CRITICAL DEPLOYMENT INFORMATION (As of 2025)

**IMPORTANT**: Both Frontend and Backend are deployed as Cloudflare Workers. Cloudflare Pages is being phased out in favor of Workers with static assets support.

### Deployment Architecture:

- **Frontend**: Deployed as a Cloudflare Worker with static assets (NOT Cloudflare Pages)
- **Backend**: Deployed as a Cloudflare Worker with GraphQL API
- **Build Process**: Handled directly by Cloudflare Workers (NOT GitHub Actions)
- **Configuration**: Two separate Workers configured in Cloudflare dashboard

### Key Points:

1. DO NOT use Cloudflare Pages configurations or references
2. Both frontend and backend use `wrangler.json` or `wrangler.toml` for Workers configuration
3. Builds are triggered automatically by Cloudflare when pushing to GitHub
4. No GitHub Actions workflow is needed for deployment

## Project Overview

Mirubato is an open-source sight-reading practice platform for classical guitar and piano. This document provides essential context and principles to guide AI programming agents working on this project.

## Core Architecture Principles

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite build system, Tailwind CSS, deployed as Cloudflare Worker
- **Backend**: Cloudflare Workers (serverless functions) with GraphQL API
- **Database**: Cloudflare D1 (SQLite-based)
- **Authentication**: Magic link email authentication with JWT tokens
- **Music Notation**: VexFlow.js for rendering staff notation and tablature
- **Audio**: Tone.js for high-quality instrument samples and audio processing
- **Deployment**: Two Cloudflare Workers (frontend + backend) with automated builds

### Design Philosophy

1. **Education-First**: Every feature should enhance musical learning and sight-reading development
2. **Open Source**: MIT license, community-driven development, transparent practices
3. **Multi-Instrument**: Support both classical guitar and piano with instrument-specific optimizations
4. **Mobile-First**: Responsive design optimized for practice on any device
5. **Performance**: Fast loading, low audio latency, smooth user experience
6. **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support

## Musical Education Context

### Sight-Reading Pedagogy

- **Progressive Difficulty**: Start with simple exercises, gradually increase complexity
- **Instrument-Specific**: Respect the unique challenges of guitar vs. piano sight-reading
- **"Keep Going" Method**: Emphasize continuous reading without stopping for mistakes
- **Real Repertoire**: Connect exercises to actual classical music literature
- **Position/Hand Awareness**: Guitar positions and piano hand positions are crucial

### Content Sources

- **Licensed Content**: Sight-Reading for Guitar: The Keep Going Method (CC BY 4.0)
- **Public Domain**: IMSLP classical repertoire for both instruments
- **Attribution**: Always properly credit sources according to their licenses
- **Quality**: Ensure musical accuracy and pedagogical effectiveness

## Key Development Principles

### Code Quality Standards

```typescript
// Example of good TypeScript practices for Mirubato
interface NoteExercise {
  id: string
  instrument: 'guitar' | 'piano'
  difficulty: number
  clef: 'treble' | 'bass' | 'alto'
  notes: Note[]
  timeSignature: TimeSignature
  keySignature: KeySignature
}

// Use proper error handling
try {
  const exercise = await generateExercise(difficulty, instrument)
  await renderNotation(exercise)
} catch (error) {
  logger.error('Exercise generation failed', { error, difficulty, instrument })
  showUserFriendlyError('Unable to create exercise. Please try again.')
}
```

### Component Architecture

- **Atomic Design**: Build reusable components (atoms, molecules, organisms)
- **Separation of Concerns**: Separate business logic from UI components
- **Custom Hooks**: Extract complex logic into reusable hooks
- **TypeScript**: Strong typing for all props, state, and function parameters

### Audio Implementation Guidelines

```typescript
// Audio should be implemented with proper error handling and mobile support
class AudioManager {
  private toneInitialized = false

  async initializeAudio(): Promise<void> {
    if (!this.toneInitialized) {
      await Tone.start()
      this.toneInitialized = true
    }
  }

  async playNote(note: string, instrument: 'guitar' | 'piano'): Promise<void> {
    await this.initializeAudio()
    const synth = this.getSynth(instrument)
    synth.triggerAttackRelease(note, '4n')
  }
}
```

### Database Patterns

```sql
-- Use proper foreign keys and indexing
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL CHECK (instrument IN ('guitar', 'piano')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  accuracy_percentage REAL,
  notes_attempted INTEGER DEFAULT 0,
  notes_correct INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_instrument ON practice_sessions(user_id, instrument);
```

## Musical Implementation Guidelines

### VexFlow Integration

```typescript
// Proper VexFlow usage for multi-instrument support
class NotationRenderer {
  private renderer: Vex.Flow.Renderer

  renderStaff(instrument: 'guitar' | 'piano'): void {
    const stave = new Vex.Flow.Stave(10, 40, 400)

    if (instrument === 'guitar') {
      stave.addClef('treble')
      // Add guitar-specific elements like position markers
    } else if (instrument === 'piano') {
      // Render grand staff for piano
      const trebleStave = new Vex.Flow.Stave(10, 40, 400)
      const bassStave = new Vex.Flow.Stave(10, 120, 400)
      trebleStave.addClef('treble')
      bassStave.addClef('bass')
    }
  }
}
```

### Guitar-Specific Considerations

- **Positions**: Track and display fretboard positions (I-XIX)
- **String Indication**: Show which string notes should be played on
- **Tablature**: Optional tab notation below standard notation
- **Fingering**: Classical guitar fingering indications (p, i, m, a)

### Piano-Specific Considerations

- **Grand Staff**: Proper treble and bass clef coordination
- **Hand Independence**: Separate tracking for left and right hand accuracy
- **Pedaling**: Support for pedal markings in advanced exercises
- **Fingering**: Piano fingering numbers (1-5) for both hands

## User Experience Principles

### Practice Session Flow

1. **Instrument Selection**: Clear choice between guitar and piano
2. **Difficulty Assessment**: Adaptive difficulty based on performance
3. **Exercise Generation**: Contextually appropriate exercises
4. **Real-time Feedback**: Immediate visual and audio feedback
5. **Progress Tracking**: Clear visualization of improvement over time

### Mobile Optimization

```css
/* Use CSS custom properties for responsive design */
:root {
  --staff-height: 120px;
  --note-size: 16px;
}

@media (max-width: 768px) {
  :root {
    --staff-height: 100px;
    --note-size: 14px;
  }
}

.notation-container {
  height: var(--staff-height);
  font-size: var(--note-size);
}
```

### Accessibility Requirements

- **Keyboard Navigation**: All functionality accessible via keyboard
- **Screen Readers**: Proper ARIA labels for musical notation
- **High Contrast**: Support for high contrast mode
- **Font Scaling**: Respect user font size preferences

## Testing Requirements

### Unit Testing

```typescript
// Example test structure
describe('NoteGenerator', () => {
  test('generates appropriate notes for guitar first position', () => {
    const generator = new NoteGenerator('guitar')
    const exercise = generator.generateExercise({
      position: 1,
      difficulty: 'beginner',
    })

    expect(exercise.notes).toHaveLength(8)
    expect(exercise.notes.every(note => note.fret <= 4)).toBe(true)
  })

  test('generates grand staff exercises for piano', () => {
    const generator = new NoteGenerator('piano')
    const exercise = generator.generateExercise({
      hands: 'both',
      difficulty: 'intermediate',
    })

    expect(exercise.trebleNotes).toBeDefined()
    expect(exercise.bassNotes).toBeDefined()
  })
})
```

### Integration Testing

- Test complete practice session workflows
- Verify audio playback across browsers
- Test database operations and data integrity
- Validate API endpoints with various inputs

## Performance Considerations

### Loading Optimization

- **Code Splitting**: Lazy load instrument-specific features
- **Audio Samples**: Compress and progressively load audio samples
- **Images**: Optimize all graphics and use modern formats (WebP, AVIF)
- **Caching**: Implement proper caching strategies for static assets

### Audio Latency

- **Buffer Sizes**: Optimize audio buffer sizes for each platform
- **Sample Management**: Preload frequently used samples
- **Context Management**: Properly handle audio context across page loads

## Security & Privacy

### Data Protection

- **Minimal Collection**: Only collect necessary data for educational functionality
- **Encryption**: Encrypt sensitive data at rest and in transit
- **Anonymization**: Support anonymous practice sessions
- **Export**: Allow users to export their practice data

### Authentication Security

- **Magic Links**: Secure token generation with proper expiration
- **Session Management**: Implement secure session handling
- **Rate Limiting**: Prevent abuse of authentication endpoints

## Open Source Considerations

### License Compliance

- **MIT License**: Ensure all code follows MIT license requirements
- **Attribution**: Properly attribute all open educational resources
- **Dependencies**: Only use compatible open source dependencies
- **Documentation**: Maintain clear license and attribution documentation

### Community Guidelines

- **Code Style**: Consistent formatting and naming conventions
- **Documentation**: Comprehensive inline and external documentation
- **Testing**: Maintain high test coverage for all contributions
- **Accessibility**: All new features must meet accessibility standards

## Common Pitfalls to Avoid

### Technical Pitfalls

1. **Audio Context Issues**: Always handle audio context properly for mobile browsers
2. **Memory Leaks**: Properly dispose of VexFlow renderers and audio objects
3. **Race Conditions**: Handle async operations carefully in practice sessions
4. **Cross-Browser Issues**: Test audio and rendering across all major browsers

### Musical Pitfalls

1. **Theory Errors**: Verify all musical theory implementation with music experts
2. **Pedagogical Issues**: Ensure exercises follow proper sight-reading pedagogy
3. **Instrument Specificity**: Don't assume piano techniques work for guitar
4. **Notation Standards**: Follow standard music notation conventions

### User Experience Pitfalls

1. **Cognitive Overload**: Don't overwhelm users with too many features at once
2. **Inconsistent Feedback**: Ensure feedback is immediate and consistent
3. **Mobile Usability**: Test thoroughly on actual mobile devices
4. **Accessibility Oversights**: Consider users with disabilities from the start

## Development Workflow

### Git Practices

- **Conventional Commits**: Use conventional commit message format
- **Feature Branches**: Create feature branches for all new work
- **Pull Requests**: All changes must go through code review
- **Testing**: All tests must pass before merging
- **Pre-commit Hooks**: NEVER bypass pre-commit hooks with `--no-verify`
  - Always fix linting errors, type errors, and failing tests
  - Pre-commit hooks ensure code quality and prevent broken commits
  - If hooks fail, fix the issues rather than skipping verification
  - The project uses husky and lint-staged for automated quality checks

### Code Review Checklist

- [ ] Musical accuracy verified
- [ ] Accessibility standards met
- [ ] Performance impact assessed
- [ ] Mobile compatibility tested
- [ ] Tests written and passing
- [ ] Documentation updated

## Additional Documentation

For comprehensive project information, see the following documentation:

- **[Development Setup](docs/DEVELOPMENT_SETUP.md)** - Environment setup and getting started
- **[Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md)** - Code standards, testing, and best practices
- **[Infrastructure](docs/INFRASTRUCTURE.md)** - Architecture, deployment, and infrastructure setup
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
- **[Roadmap](docs/ROADMAP.md)** - Development phases and feature planning
- **[License](docs/LICENSE.md)** - MIT license and content attribution
- **[Documentation Updates](docs/DOCUMENTATION_UPDATES.md)** - Recent changes and updates

This document serves as the foundational guide for any AI programming agent working on Mirubato. Always prioritize educational effectiveness, code quality, and user experience in every implementation decision.
