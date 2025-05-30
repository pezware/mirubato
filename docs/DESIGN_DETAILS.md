# mirubato Design Details

## Overview
This document captures key architectural decisions and implementation details for mirubato, focusing on our local-first approach and progressive enhancement strategy.

## Local-First Architecture

### Core Philosophy
mirubato follows a local-first approach where users can immediately start practicing sight-reading without any signup or authentication. All practice data is stored locally in the browser, with optional cloud sync available when users choose to create an account.

### Benefits
1. **Zero Friction Start**: Users can begin practicing immediately
2. **Privacy by Default**: No data leaves the device until explicitly authorized
3. **Offline Capability**: Full functionality without internet connection
4. **Performance**: No network latency during practice sessions
5. **Progressive Enhancement**: Add cloud features without breaking local functionality

## Data Storage Strategy

### Client-Side Storage Layers

#### 1. LocalStorage (Quick Access Layer)
Used for user preferences and session summaries:
```typescript
interface LocalStorageData {
  preferences: {
    instrument: 'guitar' | 'piano';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    soundEnabled: boolean;
    volume: number;
    theme: 'light' | 'dark' | 'auto';
  };
  recentSessions: SessionSummary[]; // Last 10 sessions
  statistics: {
    totalSessions: number;
    totalNotesPlayed: number;
    averageAccuracy: number;
    lastPracticeDate: string;
  };
}
```

#### 2. IndexedDB (Detailed Data Layer)
Used for complete practice session data:
```typescript
interface PracticeSession {
  id: string;
  timestamp: Date;
  instrument: 'guitar' | 'piano';
  difficulty: string;
  duration: number; // seconds
  exercises: Exercise[];
  performance: {
    notesAttempted: number;
    notesCorrect: number;
    accuracy: number; // percentage
    averageReactionTime: number; // milliseconds
  };
  noteDetails: NoteAttempt[]; // Detailed per-note data
}

interface NoteAttempt {
  note: string;
  timestamp: number;
  correct: boolean;
  reactionTime: number;
  attempt: number; // Which attempt (for retry tracking)
}
```

### Storage Implementation

```typescript
class StorageManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'mirubato';
  private readonly DB_VERSION = 1;
  
  async initialize() {
    this.db = await this.openDatabase();
    this.migrateOldData();
  }
  
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { 
            keyPath: 'id' 
          });
          sessionStore.createIndex('timestamp', 'timestamp');
          sessionStore.createIndex('instrument', 'instrument');
        }
        
        // Exercises store (for custom exercises)
        if (!db.objectStoreNames.contains('exercises')) {
          const exerciseStore = db.createObjectStore('exercises', { 
            keyPath: 'id' 
          });
          exerciseStore.createIndex('difficulty', 'difficulty');
          exerciseStore.createIndex('instrument', 'instrument');
        }
      };
    });
  }
  
  async saveSession(session: PracticeSession) {
    // Save to IndexedDB
    const transaction = this.db!.transaction(['sessions'], 'readwrite');
    await transaction.objectStore('sessions').add(session);
    
    // Update localStorage summary
    this.updateLocalStorageSummary(session);
    
    // Cleanup old data (keep last 30 days)
    this.cleanupOldSessions();
  }
}
```

## Authentication & Sync Strategy

### Email-Only Authentication
- No passwords stored or managed
- Email used solely as identifier for cross-device sync
- OTP (One-Time Password) sent via Cloudflare Email Workers

### Authentication Flow
```typescript
interface AuthFlow {
  // 1. User requests login
  requestLogin(email: string): Promise<void>;
  
  // 2. Verify OTP
  verifyOTP(email: string, otp: string): Promise<AuthToken>;
  
  // 3. Sync local data (optional)
  syncLocalData(token: AuthToken): Promise<SyncResult>;
}
```

### Data Sync Process
1. **Initial Sync Offer**
   ```typescript
   // After successful authentication
   const localSessions = await storageManager.getLocalSessions();
   if (localSessions.length > 0) {
     const shouldSync = await ui.confirmSync({
       message: `You have ${localSessions.length} practice sessions saved locally. Would you like to sync them to your account?`,
       options: ['Sync All', 'View Details', 'Skip']
     });
   }
   ```

2. **Incremental Sync**
   ```typescript
   // Background sync for logged-in users
   class SyncManager {
     async syncSession(session: PracticeSession) {
       if (!this.isAuthenticated()) {
         return; // Only sync for authenticated users
       }
       
       try {
         await this.api.uploadSession(session);
         session.syncedAt = new Date();
         await this.storageManager.updateSession(session);
       } catch (error) {
         // Queue for retry
         await this.queueForSync(session);
       }
     }
   }
   ```

3. **Conflict Resolution**
   - Last-write-wins for preferences
   - Merge strategy for practice sessions (never lose data)
   - User choice for conflicts in custom exercises

## MVP Sight-Reading Page Architecture

### Component Structure
```
src/
├── pages/
│   └── Practice.tsx          # Main practice page
├── components/
│   ├── NotationDisplay.tsx   # VexFlow wrapper
│   ├── InstrumentSelector.tsx
│   ├── DifficultySelector.tsx
│   ├── PracticeControls.tsx  # Start/stop, tempo
│   ├── FeedbackDisplay.tsx   # Real-time accuracy
│   └── SessionSummary.tsx    # Post-practice results
├── services/
│   ├── StorageManager.ts     # Local storage handling
│   ├── ExerciseGenerator.ts  # Note generation logic
│   ├── MidiManager.ts        # MIDI input/output
│   └── AudioEngine.ts        # Tone.js wrapper
└── hooks/
    ├── usePracticeSession.ts
    ├── useLocalStorage.ts
    └── useMidiInput.ts
```

### Exercise Generation Strategy
```typescript
interface ExerciseGenerator {
  generateExercise(options: {
    instrument: 'guitar' | 'piano';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    length: number; // Number of measures
    focus?: 'rhythm' | 'pitch' | 'both';
  }): Exercise;
}

// Beginner: Simple patterns, limited range
// Intermediate: Wider range, more complex rhythms
// Advanced: Full range, complex patterns, key changes
```

### Real-Time Feedback System
```typescript
interface FeedbackSystem {
  // Visual feedback
  highlightNote(noteId: string, status: 'correct' | 'incorrect' | 'missed');
  
  // Audio feedback
  playFeedbackSound(type: 'success' | 'error');
  
  // Statistics tracking
  updateAccuracy(correct: boolean, reactionTime: number);
  
  // Adaptive difficulty
  suggestDifficultyAdjustment(): 'increase' | 'decrease' | 'maintain';
}
```

## Performance Considerations

### Audio Latency Optimization
- Preload audio samples on page load
- Use Web Audio API scheduling for precise timing
- Implement lookahead scheduling for smooth playback

### Rendering Optimization
- Use React.memo for notation components
- Implement virtual scrolling for long exercises
- Cache rendered notation as SVG

### Storage Optimization
- Compress session data before storing
- Implement data retention policies (30 days local, unlimited cloud)
- Use Web Workers for heavy computations

## Security & Privacy

### Local Data
- All local storage encrypted using Web Crypto API
- No PII stored without explicit consent
- Clear data option in settings

### Cloud Sync
- JWT tokens with short expiration (1 hour)
- Refresh tokens stored securely
- All API calls over HTTPS
- Rate limiting on all endpoints

## Future Enhancements

### Planned Features
1. **MIDI Keyboard Support**: Direct input from MIDI devices
2. **Custom Exercise Creation**: Teachers can create and share exercises
3. **Multiplayer Mode**: Practice with friends in real-time
4. **AI Difficulty Adjustment**: ML-based difficulty adaptation
5. **Progress Analytics**: Detailed learning curves and insights

### Technical Debt Items
1. Migrate from Canvas to full VexFlow implementation
2. Add comprehensive error boundaries
3. Implement service worker for true offline mode
4. Add E2E tests for critical user flows

## Decision Log

### 2025-05-30: Local-First Approach
- **Decision**: Implement local-first storage with optional cloud sync
- **Rationale**: Reduces friction for new users, respects privacy, enables offline use
- **Trade-offs**: More complex sync logic, potential data loss if not synced

### 2025-05-30: Email-Only Authentication
- **Decision**: Use email OTP instead of passwords
- **Rationale**: Simpler UX, no password management, better security
- **Trade-offs**: Requires email access for each login, no instant login

### 2025-05-30: IndexedDB + LocalStorage Hybrid
- **Decision**: Use both storage mechanisms for different purposes
- **Rationale**: Best of both worlds - quick access and unlimited storage
- **Trade-offs**: More complex implementation, need to maintain consistency

---

This document is a living guide and will be updated as the project evolves and new decisions are made.