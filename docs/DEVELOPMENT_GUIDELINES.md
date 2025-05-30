# Development Guidelines

## Table of Contents
- [Code Style and Standards](#code-style-and-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Requirements](#testing-requirements)
- [Music-Specific Development](#music-specific-development)
- [Performance Standards](#performance-standards)
- [Security Guidelines](#security-guidelines)
- [Accessibility Requirements](#accessibility-requirements)
- [Code Review Process](#code-review-process)
- [Git Workflow](#git-workflow)
- [Documentation Standards](#documentation-standards)

## Code Style and Standards

### TypeScript Standards
```typescript
// ✅ Good: Use descriptive interfaces and proper typing
interface PracticeSessionConfig {
  instrument: 'guitar' | 'piano';
  difficulty: DifficultyLevel;
  duration: number; // in minutes
  focusAreas: FocusArea[];
}

// ✅ Good: Use async/await with proper error handling
async function generateExercise(config: PracticeSessionConfig): Promise<Exercise> {
  try {
    const exercise = await exerciseGenerator.create(config);
    return exercise;
  } catch (error) {
    logger.error('Exercise generation failed', { config, error });
    throw new ExerciseGenerationError('Unable to generate exercise', { cause: error });
  }
}

// ❌ Bad: Avoid any types and unclear variable names
async function genEx(cfg: any): Promise<any> {
  const ex = await someService.doStuff(cfg);
  return ex;
}
```

### React Component Standards
```typescript
// ✅ Good: Functional components with proper props typing
interface NotationDisplayProps {
  exercise: Exercise;
  instrument: Instrument;
  onNoteClick: (note: Note) => void;
  className?: string;
}

export const NotationDisplay: React.FC<NotationDisplayProps> = ({
  exercise,
  instrument,
  onNoteClick,
  className = ''
}) => {
  const { renderNotation } = useNotation();
  
  useEffect(() => {
    renderNotation(exercise, instrument);
  }, [exercise, instrument, renderNotation]);

  return (
    <div 
      className={`notation-container ${className}`}
      role="img"
      aria-label={`Musical exercise for ${instrument}`}
    >
      {/* VexFlow rendering target */}
    </div>
  );
};

// ❌ Bad: Class components without proper typing
class BadComponent extends React.Component {
  render() {
    return <div>{this.props.data}</div>;
  }
}
```

### CSS/Tailwind Standards
```css
/* ✅ Good: Use CSS custom properties for theming */
:root {
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --spacing-staff: 120px;
  --font-size-notation: 16px;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-secondary: #a78bfa;
}

/* ✅ Good: Semantic class names */
.practice-session {
  @apply flex flex-col h-screen bg-white dark:bg-gray-900;
}

.notation-staff {
  height: var(--spacing-staff);
  @apply w-full border-2 border-gray-200 rounded-lg;
}

/* ❌ Bad: Unclear class names and inline styles */
.div1 {
  width: 500px;
  height: 300px;
  background: blue;
}
```

## Architecture Guidelines

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── atoms/           # Basic building blocks
│   ├── molecules/       # Combinations of atoms
│   ├── organisms/       # Complex components
│   └── templates/       # Page layouts
├── hooks/               # Custom React hooks
├── services/            # Business logic and API calls
├── utils/               # Pure utility functions
├── types/               # TypeScript type definitions
├── constants/           # Application constants
├── stores/              # State management (Zustand)
├── assets/              # Static assets
└── pages/               # Route components
```

### Component Architecture
```typescript
// ✅ Good: Separation of concerns
// hooks/usePracticeSession.ts
export const usePracticeSession = (instrument: Instrument) => {
  const [session, setSession] = useState<PracticeSession | null>(null);
  
  const startSession = useCallback(async (config: SessionConfig) => {
    const newSession = await practiceService.createSession(config);
    setSession(newSession);
  }, []);

  return { session, startSession, endSession };
};

// components/organisms/PracticeArea.tsx
export const PracticeArea = ({ instrument }: { instrument: Instrument }) => {
  const { session, startSession } = usePracticeSession(instrument);
  const { currentExercise, submitAnswer } = useExercise(session);
  
  return (
    <div className="practice-area">
      <NotationDisplay exercise={currentExercise} instrument={instrument} />
      <AnswerInput onSubmit={submitAnswer} />
    </div>
  );
};
```

### State Management
```typescript
// ✅ Good: Use Zustand for global state
interface AppStore {
  user: User | null;
  currentInstrument: Instrument;
  practiceSettings: PracticeSettings;
  setUser: (user: User | null) => void;
  setInstrument: (instrument: Instrument) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  currentInstrument: 'guitar',
  practiceSettings: defaultSettings,
  setUser: (user) => set({ user }),
  setInstrument: (instrument) => set({ currentInstrument: instrument }),
}));

// ❌ Bad: Prop drilling for global state
function App() {
  const [user, setUser] = useState(null);
  return <DeepComponent user={user} setUser={setUser} />; // Passed through many levels
}
```

## Testing Requirements

### Unit Testing Standards
```typescript
// ✅ Good: Comprehensive unit tests
describe('NoteGenerator', () => {
  let generator: NoteGenerator;

  beforeEach(() => {
    generator = new NoteGenerator();
  });

  describe('generateGuitarExercise', () => {
    it('should generate notes within specified position range', () => {
      const exercise = generator.generateGuitarExercise({
        position: 1,
        stringSet: ['E', 'A', 'D'],
        noteCount: 8
      });

      expect(exercise.notes).toHaveLength(8);
      expect(exercise.notes.every(note => note.fret >= 0 && note.fret <= 4)).toBe(true);
    });

    it('should respect key signature constraints', () => {
      const exercise = generator.generateGuitarExercise({
        keySignature: 'G',
        noteCount: 12
      });

      const hasCorrectAccidentals = exercise.notes.every(note => 
        isValidInKey(note, 'G')
      );
      expect(hasCorrectAccidentals).toBe(true);
    });
  });
});

// Component testing
describe('NotationDisplay', () => {
  it('should render guitar tablature when instrument is guitar', () => {
    const exercise = createMockExercise();
    render(
      <NotationDisplay 
        exercise={exercise} 
        instrument="guitar" 
        onNoteClick={jest.fn()} 
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label', 
      'Musical exercise for guitar'
    );
  });
});
```

### Integration Testing
```typescript
// ✅ Good: End-to-end practice session testing
describe('Practice Session Flow', () => {
  it('should complete a full practice session', async () => {
    const user = await createTestUser();
    await loginAs(user);

    // Start practice session
    await page.click('[data-testid="start-practice"]');
    await page.selectOption('[data-testid="instrument-select"]', 'guitar');
    
    // Complete exercise
    const noteElements = await page.$$('[data-testid="note-answer"]');
    for (const element of noteElements) {
      await element.click();
    }

    // Verify results
    await expect(page.locator('[data-testid="session-results"]')).toBeVisible();
    const accuracy = await page.textContent('[data-testid="accuracy-score"]');
    expect(parseFloat(accuracy!)).toBeGreaterThan(0);
  });
});
```

### Testing Coverage Requirements
- **Minimum Coverage**: 80% overall, 90% for critical paths
- **Critical Functions**: Authentication, exercise generation, progress tracking
- **Music Logic**: All note generation and validation functions
- **User Interactions**: All practice session workflows

## Music-Specific Development

### Musical Accuracy Standards
```typescript
// ✅ Good: Validate musical content
interface Note {
  pitch: string; // 'C', 'D', 'E', etc.
  octave: number; // 0-8
  accidental?: 'sharp' | 'flat' | 'natural';
  duration: NoteDuration;
}

function validateNote(note: Note): boolean {
  const validPitches = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const validOctaves = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  
  return validPitches.includes(note.pitch) && 
         validOctaves.includes(note.octave);
}

// ✅ Good: Instrument-specific validation
function validateGuitarNote(note: Note, string: GuitarString): boolean {
  const fretNumber = calculateFretNumber(note, string);
  return fretNumber >= 0 && fretNumber <= 24; // Standard guitar range
}
```

### VexFlow Integration Standards
```typescript
// ✅ Good: Proper VexFlow usage with cleanup
class NotationRenderer {
  private renderer: Vex.Flow.Renderer | null = null;
  private context: Vex.Flow.Context | null = null;

  public render(containerElement: HTMLElement, exercise: Exercise): void {
    this.cleanup(); // Always cleanup before rendering
    
    this.renderer = new Vex.Flow.Renderer(
      containerElement, 
      Vex.Flow.Renderer.Backends.SVG
    );
    
    this.context = this.renderer.getContext();
    this.context.setFont('Arial', 10);
    
    const stave = new Vex.Flow.Stave(10, 40, 400);
    stave.addClef(exercise.clef);
    stave.addKeySignature(exercise.keySignature);
    stave.setContext(this.context).draw();
    
    // Render notes...
  }

  public cleanup(): void {
    this.renderer = null;
    this.context = null;
  }
}
```

### Audio Implementation Standards
```typescript
// ✅ Good: Robust audio handling
class AudioManager {
  private initialized = false;
  private instruments: Map<Instrument, Tone.Sampler> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await Tone.start();
      await this.loadInstruments();
      this.initialized = true;
    } catch (error) {
      logger.error('Audio initialization failed', error);
      throw new AudioInitializationError('Failed to initialize audio system');
    }
  }

  async playNote(note: string, instrument: Instrument): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sampler = this.instruments.get(instrument);
    if (!sampler) {
      throw new Error(`Instrument ${instrument} not loaded`);
    }

    sampler.triggerAttackRelease(note, '4n');
  }
}
```

## Performance Standards

### Loading Performance
- **Initial Load**: < 2 seconds on 3G connection
- **Audio Samples**: Progressive loading, < 500ms for first note
- **Notation Rendering**: < 100ms for typical exercise
- **Bundle Size**: Main bundle < 500KB, instrument-specific chunks < 200KB

### Runtime Performance
```typescript
// ✅ Good: Optimize expensive operations
const generateExercise = useMemo(() => {
  return createExerciseGenerator(instrument, difficulty);
}, [instrument, difficulty]);

const debouncedNoteInput = useMemo(
  () => debounce(handleNoteInput, 100),
  [handleNoteInput]
);

// ✅ Good: Efficient event handlers
const handleNoteClick = useCallback((note: Note) => {
  // Avoid recreating function on every render
  onNoteSelect(note);
}, [onNoteSelect]);
```

### Memory Management
```typescript
// ✅ Good: Proper cleanup
useEffect(() => {
  const renderer = new NotationRenderer();
  
  return () => {
    renderer.cleanup(); // Always cleanup resources
  };
}, []);

// ✅ Good: Audio resource management
useEffect(() => {
  const loadAudioSamples = async () => {
    const sampler = new Tone.Sampler(sampleUrls);
    await sampler.loaded;
    return sampler;
  };

  return () => {
    // Dispose audio resources
    sampler?.dispose();
  };
}, []);
```

## Security Guidelines

### CRITICAL: Secret Management

**NEVER commit secrets, API keys, or sensitive data to the codebase**

```typescript
// ❌ NEVER DO THIS - Secrets in code
const API_KEY = 'sk_live_abc123xyz'; // NEVER hardcode secrets
const DATABASE_URL = 'postgres://user:password@host:5432/db'; // NEVER hardcode credentials
const JWT_SECRET = 'my-secret-key'; // NEVER hardcode secrets

// ✅ ALWAYS DO THIS - Use environment variables
const API_KEY = process.env.API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Good: Type-safe environment variable access
interface EnvConfig {
  API_KEY: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  SENTRY_DSN?: string; // Optional
}

function getEnvVar(key: keyof EnvConfig, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

// Usage
const apiKey = getEnvVar('API_KEY');
const sentryDsn = getEnvVar('SENTRY_DSN', false); // Optional
```

### Environment Variable Best Practices

#### 1. Use .env Files for Local Development
```bash
# .env.local (NEVER commit this file)
VITE_API_BASE_URL=http://localhost:8787
VITE_ENVIRONMENT=development
DATABASE_URL=your_local_database_url
JWT_SECRET=your_local_jwt_secret
RESEND_API_KEY=your_resend_api_key

# .env.example (COMMIT this file as a template)
VITE_API_BASE_URL=
VITE_ENVIRONMENT=
DATABASE_URL=
JWT_SECRET=
RESEND_API_KEY=
```

#### 2. Frontend Environment Variables (Vite)
```typescript
// ✅ Good: Access Vite environment variables
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
};

// ✅ Good: Validate environment variables at startup
function validateEnv() {
  const required = [
    'VITE_API_BASE_URL',
    'VITE_ENVIRONMENT'
  ];
  
  const missing = required.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

#### 3. Backend Environment Variables (Cloudflare Workers)
```typescript
// ✅ Good: Type-safe Workers environment
interface Env {
  DATABASE: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Access environment variables through the env parameter
    const jwtSecret = env.JWT_SECRET;
    const database = env.DATABASE;
    
    // NEVER log sensitive values
    console.log('Environment:', env.ENVIRONMENT); // OK
    // console.log('JWT Secret:', env.JWT_SECRET); // NEVER DO THIS
    
    return handleRequest(request, env);
  },
};
```

#### 4. Git Configuration
```bash
# .gitignore - MUST include these entries
.env
.env.local
.env.*.local
.env.production
*.pem
*.key
wrangler.toml
```

### Authentication Security
```typescript
// ✅ Good: Secure token handling with environment variables
class AuthService {
  private readonly TOKEN_KEY = 'rubato_auth_token';
  
  async authenticateWithMagicLink(token: string): Promise<User> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': await this.getCSRFToken()
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new AuthenticationError('Invalid token');
      }

      const { user, accessToken } = await response.json();
      this.securelyStoreToken(accessToken);
      return user;
    } catch (error) {
      logger.error('Authentication failed', error);
      throw error;
    }
  }

  private securelyStoreToken(token: string): void {
    // Use httpOnly cookies in production
    if (import.meta.env.VITE_ENVIRONMENT === 'production') {
      // Token should be set as httpOnly cookie by server
    } else {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }
}
```

### Data Validation
```typescript
// ✅ Good: Validate all inputs
import { z } from 'zod';

const PracticeSessionSchema = z.object({
  instrument: z.enum(['guitar', 'piano']),
  difficulty: z.number().min(1).max(10),
  duration: z.number().min(5).max(120), // 5-120 minutes
  exerciseTypes: z.array(z.enum(['notes', 'rhythm', 'chords']))
});

async function createPracticeSession(data: unknown): Promise<PracticeSession> {
  const validData = PracticeSessionSchema.parse(data);
  return await practiceService.create(validData);
}
```

## Accessibility Requirements

### Keyboard Navigation
```typescript
// ✅ Good: Comprehensive keyboard support
const NotationInput: React.FC<NotationInputProps> = ({ onNoteSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const noteButtons = useRef<HTMLButtonElement[]>([]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        break;
      case 'ArrowRight':
        setSelectedIndex(Math.min(noteButtons.current.length - 1, selectedIndex + 1));
        break;
      case 'Enter':
      case ' ':
        noteButtons.current[selectedIndex]?.click();
        break;
    }
  }, [selectedIndex]);

  return (
    <div role="radiogroup" aria-label="Note selection">
      {notes.map((note, index) => (
        <button
          key={note.id}
          ref={el => el && (noteButtons.current[index] = el)}
          role="radio"
          aria-checked={selectedIndex === index}
          aria-label={`Note ${note.pitch}${note.octave}`}
          onClick={() => onNoteSelect(note)}
        >
          {note.display}
        </button>
      ))}
    </div>
  );
};
```

### Screen Reader Support
```typescript
// ✅ Good: Descriptive ARIA labels for musical content
const ExerciseDisplay: React.FC<ExerciseDisplayProps> = ({ exercise }) => {
  const description = useMemo(() => {
    const noteNames = exercise.notes.map(note => `${note.pitch}${note.octave}`);
    return `Exercise with ${exercise.notes.length} notes: ${noteNames.join(', ')}`;
  }, [exercise]);

  return (
    <div 
      role="img"
      aria-label={description}
      aria-describedby="exercise-instructions"
    >
      <VexFlowRenderer exercise={exercise} />
      <div id="exercise-instructions" className="sr-only">
        Click on the correct note names below the staff to match the displayed notation
      </div>
    </div>
  );
};
```

## Code Review Process

### Review Checklist

#### Technical Review
- [ ] **TypeScript**: Proper typing, no `any` types
- [ ] **React**: Functional components, proper hooks usage
- [ ] **Performance**: No unnecessary re-renders, efficient algorithms
- [ ] **Error Handling**: Comprehensive error handling and user feedback
- [ ] **Testing**: Adequate test coverage, tests passing
- [ ] **Security**: Input validation, secure authentication handling

#### Musical Review
- [ ] **Accuracy**: Musical content is theoretically correct
- [ ] **Pedagogy**: Exercises follow sound educational principles
- [ ] **Instrument Specific**: Appropriate for guitar/piano techniques
- [ ] **Progression**: Difficulty scaling is appropriate
- [ ] **Notation**: Standard music notation conventions followed

#### UX/Accessibility Review
- [ ] **Mobile**: Responsive design, touch-friendly
- [ ] **Keyboard**: Full keyboard navigation support
- [ ] **Screen Reader**: Proper ARIA labels and descriptions
- [ ] **Performance**: Loading times within standards
- [ ] **Visual**: Clear visual hierarchy, sufficient contrast
- [ ] **Error States**: Helpful error messages and recovery options

#### Educational Review
- [ ] **Learning Objectives**: Features support sight-reading improvement
- [ ] **User Feedback**: Clear, immediate, and constructive feedback
- [ ] **Progress Tracking**: Meaningful progress indicators
- [ ] **Motivation**: Features encourage continued practice
- [ ] **Content Quality**: Exercises are pedagogically sound

### Review Process
1. **Author Self-Review**: Complete checklist before requesting review
2. **Automated Checks**: All CI/CD checks must pass
3. **Peer Review**: At least one developer review required
4. **Music Expert Review**: Musical content changes require music educator review
5. **Accessibility Review**: UI changes require accessibility expert review

## Git Workflow

### Branch Naming Convention
```bash
# Feature branches
feature/guitar-tablature-rendering
feature/piano-grand-staff-support
feature/adaptive-difficulty-algorithm

# Bug fixes
fix/audio-latency-mobile-safari
fix/notation-rendering-firefox

# Documentation
docs/api-reference-update
docs/contributing-guidelines

# Refactoring
refactor/audio-manager-class
refactor/practice-session-state
```

### Commit Message Format
```bash
# Format: <type>(<scope>): <description>
# Types: feat, fix, docs, style, refactor, test, chore

feat(guitar): add position-based exercise generation
fix(audio): resolve Safari audio context initialization
docs(api): update authentication endpoint documentation
test(practice): add integration tests for session flow
refactor(notation): extract VexFlow rendering to service class
```

### Pull Request Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Musical Content Review
- [ ] Musical theory accuracy verified
- [ ] Pedagogical approach validated
- [ ] Instrument-specific considerations addressed

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing done

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast requirements met
- [ ] Mobile accessibility validated

## Performance
- [ ] No performance regressions introduced
- [ ] Bundle size impact assessed
- [ ] Audio latency tested
- [ ] Memory usage profiled
```

## Documentation Standards

### Code Documentation
```typescript
/**
 * Generates sight-reading exercises based on instrument-specific parameters.
 * 
 * @param instrument - Target instrument ('guitar' | 'piano')
 * @param config - Exercise configuration including difficulty and focus areas
 * @returns Promise resolving to generated exercise
 * 
 * @example
 * ```typescript
 * const exercise = await generateExercise('guitar', {
 *   difficulty: 3,
 *   position: 1,
 *   focusAreas: ['rhythm', 'accidentals']
 * });
 * ```
 * 
 * @throws {ExerciseGenerationError} When exercise cannot be generated with given parameters
 */
async function generateExercise(
  instrument: Instrument,
  config: ExerciseConfig
): Promise<Exercise> {
  // Implementation...
}

/**
 * Custom hook for managing practice session state and interactions.
 * 
 * Handles session creation, exercise progression, answer submission,
 * and statistics tracking for the current practice session.
 * 
 * @param instrument - Primary instrument for the session
 * @returns Object containing session state and control functions
 * 
 * @example
 * ```typescript
 * const { session, startSession, submitAnswer, currentExercise } = 
 *   usePracticeSession('guitar');
 * ```
 */
export const usePracticeSession = (instrument: Instrument) => {
  // Implementation...
};
```

### API Documentation
```typescript
/**
 * @api {POST} /api/practice/sessions Create Practice Session
 * @apiName CreatePracticeSession
 * @apiGroup Practice
 * @apiVersion 1.0.0
 * 
 * @apiDescription Creates a new practice session for the authenticated user.
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * @apiHeader {String} Content-Type application/json
 * 
 * @apiParam {String="guitar","piano"} instrument Target instrument
 * @apiParam {Number{1-10}} difficulty Difficulty level
 * @apiParam {Number{5-120}} duration Session duration in minutes
 * @apiParam {String[]} focusAreas Array of focus areas for the session
 * 
 * @apiSuccess {String} id Session ID
 * @apiSuccess {String} instrument Selected instrument
 * @apiSuccess {Number} difficulty Session difficulty level
 * @apiSuccess {Object} currentExercise First exercise in the session
 * 
 * @apiError {String} error Error message
 * @apiError {Number} code Error code
 * 
 * @apiExample {curl} Example Request:
 * curl -X POST \
 *   https://api.mirubato.com/api/practice/sessions \
 *   -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "instrument": "guitar",
 *     "difficulty": 3,
 *     "duration": 15,
 *     "focusAreas": ["notes", "rhythm"]
 *   }'
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 201 Created
 * {
 *   "id": "sess_1234567890",
 *   "instrument": "guitar",
 *   "difficulty": 3,
 *   "currentExercise": {
 *     "id": "ex_1234567890",
 *     "notes": [...],
 *     "timeSignature": "4/4"
 *   }
 * }
 */
```

### README Documentation Structure
```markdown
# Component/Module Name

## Overview
Brief description of the component's purpose and functionality.

## Installation
```bash
npm install package-name
```

## Usage
```typescript
import { ComponentName } from './ComponentName';

const Example = () => {
  return <ComponentName prop1="value" prop2={42} />;
};
```

## Props/Parameters
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Examples
Comprehensive examples showing common use cases.

## Accessibility
Notes about accessibility features and considerations.

## Browser Support
List of supported browsers and any known limitations.

## Contributing
Guidelines for contributing to this component.
```

## Development Environment Setup

### Required Tools
```bash
# Node.js (use version specified in .nvmrc)
nvm use

# Install dependencies
pnpm install

# Development tools
npm install -g typescript
npm install -g @cloudflare/wrangler
```

### Environment Variables
```bash
# .env.example (This file SHOULD be committed)
# Copy this to .env.local and fill in your values
# NEVER commit .env.local or any file with actual secrets

# Frontend Environment Variables (Vite)
VITE_API_BASE_URL=
VITE_AUDIO_SAMPLES_URL=
VITE_ENVIRONMENT=
VITE_SENTRY_DSN=

# Backend Environment Variables (Cloudflare Workers)
# These are configured in Cloudflare dashboard or wrangler.toml
# DATABASE_URL=
# JWT_SECRET=
# RESEND_API_KEY=
# CLOUDFLARE_API_TOKEN=
```

#### Setting Up Environment Variables

1. **Local Development**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Edit .env.local with your actual values
   # NEVER commit this file
   ```

2. **Cloudflare Workers (Production)**
   ```bash
   # Use wrangler to set secrets
   wrangler secret put JWT_SECRET
   wrangler secret put RESEND_API_KEY
   wrangler secret put DATABASE_URL
   ```

3. **GitHub Actions (CI/CD)**
   ```yaml
   # Set secrets in GitHub repository settings
   # Settings > Secrets and variables > Actions
   # Add: CLOUDFLARE_API_TOKEN, etc.
   ```

### Development Commands
```bash
# Start development server
pnpm run dev

# Run tests
pnpm test
pnpm run test:watch
pnpm run test:coverage

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Lint and format code
pnpm run lint
pnpm run lint:fix
pnpm run format

# Type checking
pnpm run type-check

# Deploy to staging
pnpm run deploy:staging

# Deploy to production
pnpm run deploy:production
```

## Troubleshooting Common Issues

### VexFlow Rendering Issues
```typescript
// ✅ Solution: Proper container sizing and cleanup
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  // Ensure container has dimensions before rendering
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    console.warn('Container has no dimensions, delaying render');
    return;
  }

  const renderer = new NotationRenderer();
  renderer.render(container, exercise);

  return () => {
    renderer.cleanup();
    // Clear container content
    container.innerHTML = '';
  };
}, [exercise]);
```

### Audio Context Issues
```typescript
// ✅ Solution: Handle user gesture requirements
const AudioManager = {
  async initializeWithUserGesture(): Promise<void> {
    try {
      // Resume audio context on user interaction
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      }
      await Tone.start();
    } catch (error) {
      logger.error('Audio initialization failed', error);
      // Provide fallback or user guidance
      showAudioTroubleshootingHelp();
    }
  }
};
```

### Performance Issues
```typescript
// ✅ Solution: Optimize heavy operations
const generateExercise = useMemo(() => {
  return createMemoizedExerciseGenerator(instrument, difficulty);
}, [instrument, difficulty]);

const debouncedSearch = useMemo(
  () => debounce(performSearch, 300),
  []
);
```

### Mobile Audio Problems
```typescript
// ✅ Solution: Handle mobile-specific audio requirements
class MobileAudioHandler {
  private audioUnlocked = false;

  async unlockAudio(): Promise<void> {
    if (this.audioUnlocked) return;

    try {
      // Create silent audio to unlock context
      const buffer = Tone.context.createBuffer(1, 1, 22050);
      const source = Tone.context.createBufferSource();
      source.buffer = buffer;
      source.connect(Tone.context.destination);
      source.start(0);
      
      this.audioUnlocked = true;
    } catch (error) {
      console.warn('Failed to unlock audio context', error);
    }
  }

  async playWithFallback(note: string): Promise<void> {
    try {
      await this.unlockAudio();
      // Play audio normally
    } catch (error) {
      // Show visual feedback instead
      this.showVisualFeedback(note);
    }
  }
}
```

### TypeScript Configuration Issues
```json
// tsconfig.json - Common configuration problems
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Quality Assurance

### Definition of Done
A feature is considered complete when:
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] Accessibility requirements met
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed
- [ ] Musical accuracy verified (for music features)
- [ ] Deployed to staging and tested

### Code Quality Metrics
```typescript
// Example quality gates in CI/CD
const qualityGates = {
  coverage: {
    minimum: 80,
    critical_paths: 90
  },
  performance: {
    bundle_size_kb: 500,
    initial_load_ms: 2000,
    audio_latency_ms: 100
  },
  accessibility: {
    wcag_level: 'AA',
    color_contrast: 4.5,
    keyboard_navigation: true
  },
  security: {
    vulnerabilities: 0,
    secrets_detection: true,
    dependency_check: true
  }
};
```

### Performance Benchmarks
```typescript
// Performance testing utilities
export const performanceBenchmarks = {
  // Notation rendering performance
  notationRender: {
    maxTime: 200, // ms
    test: async (exercise: Exercise) => {
      const start = performance.now();
      await renderNotation(exercise);
      return performance.now() - start;
    }
  },

  // Audio latency testing
  audioLatency: {
    maxTime: 100, // ms
    test: async () => {
      const start = performance.now();
      await audioManager.playNote('C4', 'piano');
      return performance.now() - start;
    }
  },

  // Bundle size monitoring
  bundleSize: {
    maxSize: 500 * 1024, // bytes
    test: () => {
      // Automated bundle analysis
      return getBundleSize();
    }
  }
};
```

### Automated Testing Strategy
```typescript
// Test categories and their purposes
export const testStrategy = {
  unit: {
    purpose: 'Test individual functions and components',
    coverage: '>90% for utilities, >80% for components',
    tools: ['Vitest', 'React Testing Library']
  },

  integration: {
    purpose: 'Test component interactions and API flows',
    coverage: 'All critical user paths',
    tools: ['Vitest', 'MSW for API mocking']
  },

  e2e: {
    purpose: 'Test complete user workflows',
    coverage: 'All major features and browser compatibility',
    tools: ['Playwright', 'Cross-browser testing']
  },

  accessibility: {
    purpose: 'Ensure WCAG 2.1 AA compliance',
    coverage: 'All user-facing components',
    tools: ['axe-core', 'Pa11y', 'Manual testing']
  },

  performance: {
    purpose: 'Validate speed and resource usage',
    coverage: 'Critical paths and heavy operations',
    tools: ['Lighthouse CI', 'Web Vitals', 'Custom benchmarks']
  }
};
```

### Release Criteria
A release is ready when:
- [ ] All planned features completed
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Accessibility audit completed (WCAG 2.1 AA)
- [ ] Cross-browser testing completed
- [ ] User acceptance testing completed
- [ ] Documentation updated (API, user guides, changelog)
- [ ] Release notes prepared
- [ ] Rollback plan prepared
- [ ] Monitoring and alerting configured
- [ ] Educational effectiveness validated (for music features)

### Continuous Improvement Process
```typescript
// Metrics collection for continuous improvement
export const improvementMetrics = {
  // Development velocity
  velocity: {
    story_points_per_sprint: 'target',
    cycle_time: 'lead_time_from_commit_to_deploy',
    deployment_frequency: 'deploys_per_week'
  },

  // Quality metrics
  quality: {
    bug_escape_rate: 'bugs_found_in_production',
    test_coverage_trend: 'coverage_over_time',
    code_review_effectiveness: 'defects_caught_in_review'
  },

  // User experience
  ux: {
    practice_session_completion: 'percentage_completing_sessions',
    user_retention: 'weekly_active_users',
    educational_effectiveness: 'sight_reading_improvement_rate'
  },

  // Technical health
  technical: {
    performance_trends: 'load_time_regression_detection',
    security_posture: 'vulnerability_discovery_rate',
    maintainability: 'time_to_implement_features'
  }
};
```

### Post-Release Monitoring
```typescript
// Monitoring checklist for new releases
export const postReleaseMonitoring = {
  immediate: {
    timeframe: '15 minutes',
    checks: [
      'Deployment successful',
      'Health checks passing',
      'Error rates normal',
      'Performance metrics stable'
    ]
  },

  short_term: {
    timeframe: '2 hours',
    checks: [
      'User registration working',
      'Practice sessions starting',
      'Audio playback functional',
      'Cross-browser compatibility'
    ]
  },

  medium_term: {
    timeframe: '24 hours',
    checks: [
      'User engagement metrics',
      'Educational effectiveness',
      'Performance under load',
      'Mobile user experience'
    ]
  },

  long_term: {
    timeframe: '1 week',
    checks: [
      'User retention rates',
      'Feature adoption',
      'Support ticket trends',
      'Community feedback'
    ]
  }
};
```

## Educational Quality Assurance

### Musical Content Validation
```typescript
// Musical accuracy validation
export const musicalValidation = {
  // Theory validation
  theory: {
    intervals: validateIntervals,
    chords: validateChordConstruction,
    scales: validateScaleStructure,
    keySignatures: validateKeySignatureLogic
  },

  // Instrument-specific validation
  guitar: {
    positions: validateGuitarPositions,
    fingerings: validateFingeringLogic,
    stringRanges: validateStringRanges
  },

  piano: {
    handPositions: validatePianoHandPositions,
    fingerings: validatePianoFingerings,
    voiceLeading: validateVoiceLeading
  },

  // Pedagogical validation
  pedagogy: {
    progression: validateDifficultyProgression,
    exerciseLength: validateExerciseLength,
    cognitiveLoad: validateCognitiveLoad
  }
};
```

### User Testing with Musicians
```typescript
// Structured user testing approach
export const userTestingProtocol = {
  participants: {
    beginners: 'new_to_sight_reading',
    intermediate: '1-3_years_experience',
    advanced: '5+_years_experience',
    educators: 'music_teachers_and_professors'
  },

  scenarios: [
    'first_time_user_onboarding',
    'daily_practice_session',
    'difficulty_progression',
    'multi_instrument_switching',
    'mobile_vs_desktop_experience'
  ],

  metrics: {
    usability: 'task_completion_rate',
    engagement: 'session_duration_and_retention',
    effectiveness: 'learning_outcome_measurement',
    satisfaction: 'user_feedback_scores'
  }
};
```

These comprehensive development guidelines ensure that Rubato maintains the highest standards of code quality, educational effectiveness, and user experience while supporting sustainable open-source development practices. The guidelines balance technical excellence with the unique requirements of educational software and musical content.**: Clear visual hierarchy, sufficient contrast
- [ ] **Error States**: Helpful error messages and recovery options

#### Educational Review
- [ ] **Learning Objectives**: Features support sight-reading improvement
- [ ] **User Feedback**: Clear, immediate, and constructive feedback
- [ ] **Progress Tracking**: Meaningful progress indicators
- [ ] **Motivation**: Features encourage continued practice
- [ ] **Content Quality**: Exercises are pedagogically sound

### Review Process
1. **Author Self-Review**: Complete checklist before requesting review
2. **Automated Checks**: All CI/CD checks must pass
3. **Peer Review**: At least one developer review required
4. **Music Expert Review**: Musical content changes require music educator review
5. **Accessibility Review**: UI changes require accessibility expert review

## Git Workflow

### Branch Naming Convention
```bash
# Feature branches
feature/guitar-tablature-rendering
feature/piano-grand-staff-support
feature/adaptive-difficulty-algorithm

# Bug fixes
fix/audio-latency-mobile-safari
fix/notation-rendering-firefox

# Documentation
docs/api-reference-update
docs/contributing-guidelines

# Refactoring
refactor/audio-manager-class
refactor/practice-session-state
```

### Commit Message Format
```bash
# Format: <type>(<scope>): <description>
# Types: feat, fix, docs, style, refactor, test, chore

feat(guitar): add position-based exercise generation
fix(audio): resolve Safari audio context initialization
docs(api): update authentication endpoint documentation
test(practice): add integration tests for session flow
refactor(notation): extract VexFlow rendering to service class
```

### Pull Request Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Musical Content Review
- [ ] Musical theory accuracy verified
- [ ] Pedagogical approach validated
- [ ] Instrument-specific considerations addressed

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing done

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast requirements met
- [ ] Mobile accessibility validated

## Performance
- [ ] No performance regressions introduced
- [ ] Bundle size impact assessed
- [ ] Audio latency tested
- [ ] Memory usage profiled
```

## Documentation Standards

### Code Documentation
```typescript
/**
 * Generates sight-reading exercises based on instrument-specific parameters.
 * 
 * @param instrument - Target instrument ('guitar' | 'piano')
 * @param config - Exercise configuration including difficulty and focus areas
 * @returns Promise resolving to generated exercise
 * 
 * @example
 * ```typescript
 * const exercise = await generateExercise('guitar', {
 *   difficulty: 3,
 *   position: 1,
 *   focusAreas: ['rhythm', 'accidentals']
 * });
 * ```
 * 
 * @throws {ExerciseGenerationError} When exercise cannot be generated with given parameters
 */
async function generateExercise(
  instrument: Instrument,
  config: ExerciseConfig
): Promise<Exercise> {
  // Implementation...
}

/**
 * Custom hook for managing practice session state and interactions.
 * 
 * Handles session creation, exercise progression, answer submission,
 * and statistics tracking for the current practice session.
 * 
 * @param instrument - Primary instrument for the session
 * @returns Object containing session state and control functions
 * 
 * @example
 * ```typescript
 * const { session, startSession, submitAnswer, currentExercise } = 
 *   usePracticeSession('guitar');
 * ```
 */
export const usePracticeSession = (instrument: Instrument) => {
  // Implementation...
};
```

### API Documentation
```typescript
/**
 * @api {POST} /api/practice/sessions Create Practice Session
 * @apiName CreatePracticeSession
 * @apiGroup Practice
 * @apiVersion 1.0.0
 * 
 * @apiDescription Creates a new practice session for the authenticated user.
 * 
 * @apiHeader {String} Authorization Bearer token for authentication
 * @apiHeader {String} Content-Type application/json
 * 
 * @apiParam {String="guitar","piano"} instrument Target instrument
 * @apiParam {Number{1-10}} difficulty Difficulty level
 * @apiParam {Number{5-120}} duration Session duration in minutes
 * @apiParam {String[]} focusAreas Array of focus areas for the session
 * 
 * @apiSuccess {String} id Session ID
 * @apiSuccess {String} instrument Selected instrument
 * @apiSuccess {Number} difficulty Session difficulty level
 * @apiSuccess {Object} currentExercise First exercise in the session
 * 
 * @apiError {String} error Error message
 * @apiError {Number} code Error code
 * 
 * @apiExample {curl} Example Request:
 * curl -X POST \
 *   https://api.mirubato.com/api/practice/sessions \
 *   -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "instrument": "guitar",
 *     "difficulty": 3,
 *     "duration": 15,
 *     "focusAreas": ["notes", "rhythm"]
 *   }'
 * 
 * @apiSuccessExample {json} Success Response:
 * HTTP/1.1 201 Created
 * {
 *   "id": "sess_1234567890",
 *   "instrument": "guitar",
 *   "difficulty": 3,
 *   "currentExercise": {
 *     "id": "ex_1234567890",
 *     "notes": [...],
 *     "timeSignature": "4/4"
 *   }
 * }
 */
```

### README Documentation Structure
```markdown
# Component/Module Name

## Overview
Brief description of the component's purpose and functionality.

## Installation
```bash
npm install package-name
```

## Usage
```typescript
import { ComponentName } from './ComponentName';

const Example = () => {
  return <ComponentName prop1="value" prop2={42} />;
};
```

## Props/Parameters
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Examples
Comprehensive examples showing common use cases.

## Accessibility
Notes about accessibility features and considerations.

## Browser Support
List of supported browsers and any known limitations.

## Contributing
Guidelines for contributing to this component.
```

## Development Environment Setup

### Required Tools
```bash
# Node.js (use version specified in .nvmrc)
nvm use

# Install dependencies
npm install

# Development tools
npm install -g typescript
npm install -g @cloudflare/wrangler
```

### Environment Variables
```bash
# .env.example (This file SHOULD be committed)
# Copy this to .env.local and fill in your values
# NEVER commit .env.local or any file with actual secrets

# Frontend Environment Variables (Vite)
VITE_API_BASE_URL=
VITE_AUDIO_SAMPLES_URL=
VITE_ENVIRONMENT=
VITE_SENTRY_DSN=

# Backend Environment Variables (Cloudflare Workers)
# These are configured in Cloudflare dashboard or wrangler.toml
# DATABASE_URL=
# JWT_SECRET=
# RESEND_API_KEY=
# CLOUDFLARE_API_TOKEN=
```

#### Setting Up Environment Variables

1. **Local Development**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Edit .env.local with your actual values
   # NEVER commit this file
   ```

2. **Cloudflare Workers (Production)**
   ```bash
   # Use wrangler to set secrets
   wrangler secret put JWT_SECRET
   wrangler secret put RESEND_API_KEY
   wrangler secret put DATABASE_URL
   ```

3. **GitHub Actions (CI/CD)**
   ```yaml
   # Set secrets in GitHub repository settings
   # Settings > Secrets and variables > Actions
   # Add: CLOUDFLARE_API_TOKEN, etc.
   ```

### Development Commands
```bash
# Start development server
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview

# Lint and format code
npm run lint
npm run lint:fix
npm run format

# Type checking
npm run type-check

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Troubleshooting Common Issues

### VexFlow Rendering Issues
```typescript
// ✅ Solution: Proper container sizing and cleanup
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  // Ensure container has dimensions before rendering
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    console.warn('Container has no dimensions, delaying render');
    return;
  }

  const renderer = new NotationRenderer();
  renderer.render(container, exercise);

  return () => {
    renderer.cleanup();
    // Clear container content
    container.innerHTML = '';
  };
}, [exercise]);
```

### Audio Context Issues
```typescript
// ✅ Solution: Handle user gesture requirements
const AudioManager = {
  async initializeWithUserGesture(): Promise<void> {
    try {
      // Resume audio context on user interaction
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      }
      await Tone.start();
    } catch (error) {
      logger.error('Audio initialization failed', error);
      // Provide fallback or user guidance
      showAudioTroubleshootingHelp();
    }
  }
};
```

### Performance Issues
```typescript
// ✅ Solution: Optimize heavy operations
const generateExercise = useMemo(() => {
  return createMemoizedExerciseGenerator(instrument, difficulty);
}, [instrument, difficulty]);

const debouncedSearch = useMemo(
  () => debounce(performSearch, 300),
  []
);
```

## Quality Assurance

### Definition of Done
A feature is considered complete when:
- [ ] All acceptance criteria met
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] Accessibility requirements met
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed
- [ ] Musical accuracy verified (for music features)
- [ ] Deployed to staging and tested

### Release Criteria
A release is ready when:
- [ ] All planned features completed
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Accessibility audit completed
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Rollback plan prepared

These guidelines ensure consistent, high-quality development practices that support Mirubato's educational mission while maintaining technical excellence and accessibility standards.