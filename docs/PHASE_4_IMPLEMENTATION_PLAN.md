# Phase 4.1: Advanced Sheet Music Module - Implementation Plan

## Overview

This implementation plan is based on analysis of real musician practice patterns and the existing Rubato data architecture. The plan focuses on creating an intelligent music library that adapts to user progress and generates personalized exercises.

## Strategic Priorities

Based on successful music education platforms, our implementation prioritizes:

1. **Exercise Generation as Core Differentiator**: Following OSME's parameter-based approach for unlimited practice material
2. **Engagement Through Gamification**: Progress tracking, achievements, and visual progress representations
3. **Bite-sized Practice Sessions**: Supporting 5-15 minute focused practice segments
4. **Real-time Feedback**: <50ms latency for immediate practice validation
5. **Spaced Repetition Adapted for Music**: Modified SM-2 algorithm accounting for muscle memory vs. cognitive retention

## Key Insights from Practice Data Analysis

### 1. Practice Pattern Observations

From analyzing the practice logs:

- **Repertoire Rotation**: Musicians practice pieces with varying frequencies (Day1, Day2, Day4, Day8, Week2, Month2, etc.)
- **Progressive Difficulty**: Clear progression through RCM grades (5-10) over multiple years
- **Status Tracking**: Pieces are marked as "Memorized", "Forgotten", "Dropped", or with completion dates
- **Duration Tracking**: Practice sessions range from 30 minutes to 3.5 hours per piece
- **Technical Work**: Regular scales, arpeggios, and Hanon exercises alongside repertoire

### 2. Learning Journey Patterns

- **Composer Preferences**: Bach inventions and preludes are foundational
- **Style Period Progression**: Baroque → Classical → Romantic → Modern
- **Memory Retention**: Pieces need regular review to maintain (Forgotten status is common)
- **Practice Consistency**: Daily practice with 1.5-3 hour sessions typical

## Implementation Architecture

### 1. Database Schema Extensions

```sql
-- Extend sheet_music table with learning metrics
ALTER TABLE sheet_music ADD COLUMN learning_curve_data TEXT; -- JSON
ALTER TABLE sheet_music ADD COLUMN prerequisite_pieces TEXT; -- JSON array of IDs
ALTER TABLE sheet_music ADD COLUMN technical_focus TEXT; -- JSON array

-- New table for user's repertoire status
CREATE TABLE user_repertoire (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sheet_music_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('LEARNING', 'MEMORIZED', 'FORGOTTEN', 'DROPPED', 'WISHLIST')),
  date_started DATE,
  date_memorized DATE,
  date_last_played DATE,
  total_practice_minutes INTEGER DEFAULT 0,
  review_schedule TEXT, -- JSON with spaced repetition data
  personal_notes TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id),
  UNIQUE(user_id, sheet_music_id)
);

-- Algorithm-generated exercises
CREATE TABLE generated_exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  base_sheet_music_id TEXT,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('SIGHT_READING', 'TECHNICAL', 'RHYTHM', 'HARMONY')),
  difficulty_level INTEGER NOT NULL,
  measures_data TEXT NOT NULL, -- JSON
  generation_params TEXT NOT NULL, -- JSON
  focus_areas TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (base_sheet_music_id) REFERENCES sheet_music(id)
);

-- Recommendation tracking
CREATE TABLE music_recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sheet_music_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('SIMILAR', 'NEXT_LEVEL', 'REVIEW', 'TECHNICAL_PREP')),
  score REAL NOT NULL,
  reasoning TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acted_on BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id)
);
```

### 2. Core Module Structure

```typescript
// src/modules/sheetMusic/SheetMusicLibraryModule.ts
export class SheetMusicLibraryModule implements ModuleInterface {
  private eventBus: EventBus
  private storage: EventDrivenStorage

  // Core features
  async searchMusic(criteria: MusicSearchCriteria): Promise<SheetMusic[]>
  async generateExercise(
    params: ExerciseGenerationParams
  ): Promise<GeneratedExercise>
  async assessDifficulty(
    sheetMusicId: string,
    userId: string
  ): Promise<DifficultyAssessment>
  async getRecommendations(userId: string): Promise<MusicRecommendation[]>
  async importMusicXML(file: File): Promise<SheetMusic>
  async exportMusicXML(sheetMusicId: string): Promise<Blob>
}
```

### 3. Algorithmic Exercise Generation (OSME Pattern)

```typescript
interface ExerciseGenerationParams {
  userId: string
  type: 'SIGHT_READING' | 'TECHNICAL' | 'RHYTHM' | 'HARMONY'
  // Form-based parameters following OSME approach
  parameters: {
    keySignature: string
    timeSignature: string
    clef: string
    range: { lowest: string; highest: string }
    difficulty: number // 1-10
    technicalElements?: string[] // ['scales', 'arpeggios', 'thirds', 'octaves']
    rhythmicPatterns?: string[] // ['eighth-notes', 'syncopation', 'triplets']
    dynamicRange?: string[] // ['pp', 'ff', 'crescendo']
  }
  targetDuration: number // seconds
  basedOn?: string // sheet_music_id to use as template
}

class ExerciseGenerator {
  // Pattern-based generation using music theory rules
  generateSightReadingExercise(params: ExerciseGenerationParams): Measure[] {
    // 1. Analyze user's current skill level from practice history
    // 2. Select appropriate key signatures (following circle of fifths progression)
    // 3. Generate melodic patterns based on:
    //    - Scale degrees
    //    - Interval patterns from repertoire
    //    - Rhythmic patterns from current pieces
    // 4. Add appropriate fingerings and dynamics
    // 5. Output as MusicXML for compatibility
  }

  generateTechnicalExercise(params: ExerciseGenerationParams): Measure[] {
    // Generate Hanon-style exercises based on:
    // - User's weak technical areas
    // - Patterns from current repertoire
    // - Progressive difficulty
    // - Hierarchical skill modeling (component → complex)
  }

  // Adaptive difficulty adjustment
  adjustDifficulty(
    exercise: Measure[],
    performance: PerformanceMetrics
  ): Measure[] {
    // Dynamically modify exercise based on real-time performance
  }
}
```

### 4. AI-Powered Difficulty Assessment

```typescript
interface DifficultyAssessment {
  overallScore: number // 1-10
  technicalFactors: {
    handSpan: number
    fingerIndependence: number
    rhythmicComplexity: number
    harmonicDensity: number
    tempoRequirements: number
  }
  estimatedLearningTime: number // hours
  prerequisites: string[] // piece IDs
  recommendedPracticeApproach: string
}

class DifficultyAnalyzer {
  async analyze(
    sheetMusic: SheetMusic,
    userProfile: UserProfile
  ): Promise<DifficultyAssessment> {
    // 1. Analyze note density and hand positions
    // 2. Check for technical patterns (scales, arpeggios, octaves)
    // 3. Compare with user's completed repertoire
    // 4. Factor in tempo and dynamic requirements
    // 5. Consider musical period and style
  }
}
```

### 5. Personalized Recommendation System

```typescript
class RecommendationEngine {
  async generateRecommendations(
    userId: string
  ): Promise<MusicRecommendation[]> {
    // 1. Analyze practice history and preferences
    const userProfile = await this.analyzeUserProfile(userId)

    // 2. Identify patterns in successful pieces
    const successPatterns = await this.findSuccessPatterns(userProfile)

    // 3. Generate recommendations based on:
    //    - Spaced repetition for memorized pieces
    //    - Next difficulty level pieces
    //    - Similar style/composer pieces
    //    - Technical preparation pieces

    // 4. Score and rank recommendations
    return this.rankRecommendations(recommendations, userProfile)
  }

  private spacedRepetitionSchedule(piece: UserRepertoire): Date {
    // Implement SM-2 algorithm adapted for music
    // Key adaptations for music learning:
    // - Muscle memory decays differently than cognitive memory
    // - Within-session massed practice vs between-session spacing
    // - Technical difficulty affects retention curves
    // - Performance anxiety considerations

    const intervals = {
      MEMORIZED: [1, 2, 4, 8, 14, 30, 60], // days
      FORGOTTEN: [1, 1, 2, 4, 8, 14, 30],
      TECHNICAL: [1, 2, 3, 5, 8, 14, 21], // for technical exercises
    }
  }
}
```

### 6. Music Search and Filtering

```typescript
interface AdvancedSearchCriteria extends SheetMusicFilterInput {
  composer?: string
  opus?: string
  yearComposed?: { min?: number; max?: number }
  technicalElements?: string[] // ['scales', 'arpeggios', 'octaves']
  musicalElements?: string[] // ['fugue', 'sonata-form', 'waltz']
  RCMGrade?: number
  estimatedLearningTime?: { min?: number; max?: number }
}

class MusicSearchEngine {
  async search(criteria: AdvancedSearchCriteria): Promise<SearchResults> {
    // 1. Full-text search on title, composer, opus
    // 2. Filter by technical and musical elements
    // 3. Match difficulty to user's current level
    // 4. Sort by relevance score
  }
}
```

### 7. MusicXML Import/Export with Cloudflare Workers

```typescript
class MusicXMLProcessor {
  async import(file: File): Promise<SheetMusic> {
    // Cloudflare Worker-compatible implementation
    // 1. Parse MusicXML using browser-compatible parser (no server-side dependencies)
    // 2. Extract measures, notes, dynamics, articulations
    // 3. Auto-detect difficulty factors using WebAssembly for performance
    // 4. Generate thumbnail preview using Canvas API
    // 5. Store in D1 database with R2 for large assets
  }

  async export(
    sheetMusicId: string,
    format: 'musicxml' | 'midi'
  ): Promise<Blob> {
    // 1. Retrieve from D1/R2
    // 2. Convert internal format to MusicXML
    // 3. Include user's annotations and fingerings
    // 4. Use Cloudflare's edge caching for frequently exported pieces
  }
}
```

### 8. IMSLP Integration (Future)

```typescript
interface IMSLPIntegration {
  searchIMSLP(query: string): Promise<IMSLPResult[]>
  importFromIMSLP(workId: string): Promise<SheetMusic>
  // Note: Respect IMSLP's API usage policies
}
```

## Implementation Phases

### Phase 1: Exercise Generation Core (Week 1-2) - PRIORITY

- [ ] Implement OSME-pattern parameter-based exercise generator
- [ ] Create form-based UI for exercise parameters
- [ ] Build sight-reading and technical exercise templates
- [ ] Add real-time exercise preview with VexFlow
- [ ] Implement exercise save/load functionality

### Phase 2: Music Library & Search (Week 3-4)

- [ ] Implement advanced search with Cloudflare D1 full-text search
- [ ] Create music library UI with filtering and pagination
- [ ] Add repertoire status tracking (Learning/Memorized/Forgotten)
- [ ] Build basic difficulty assessment algorithm
- [ ] Integrate initial public domain content from IMSLP

### Phase 3: Engagement & Gamification (Week 5-6)

- [ ] Implement progress tracking with visual heatmaps
- [ ] Add achievement system and level progression
- [ ] Create practice session quality ratings
- [ ] Build spaced repetition scheduling for repertoire
- [ ] Add bite-sized practice session support (5-15 min)

### Phase 4: Advanced Features (Week 7-8)

- [ ] Implement recommendation engine with collaborative filtering
- [ ] Add MusicXML import with WebAssembly parser
- [ ] Create MIDI export for practice playback
- [ ] Build performance analytics dashboard
- [ ] Add community sharing features (future plugin)

## Success Metrics

1. **Search Performance**: <100ms for complex queries
2. **Exercise Quality**: 80%+ user satisfaction with generated exercises
3. **Recommendation Accuracy**: 70%+ of recommendations marked as helpful
4. **Import Success Rate**: 95%+ for standard MusicXML files
5. **User Engagement**: 50%+ increase in practice session duration

## Technical Considerations

### Cloudflare Workers Architecture

1. **Edge Computing**: Leverage Cloudflare's global edge for low latency
2. **D1 Database**: Use for structured data with full-text search capabilities
3. **R2 Storage**: Store MusicXML files and generated exercises
4. **Durable Objects**: Consider for real-time practice session state
5. **WebAssembly**: Use for CPU-intensive music analysis tasks

### Performance Optimizations

1. **IndexedDB**: Client-side caching for offline music library
2. **Progressive Loading**: Lazy load sheet music measures
3. **Edge Caching**: Cache popular exercises and repertoire
4. **WebWorkers**: Offload exercise generation from main thread

### Frontend Stack (Aligned with Existing)

1. **VexFlow + OpenSheetMusicDisplay**: Notation rendering
2. **Tone.js**: Audio synthesis and MIDI playback
3. **React + TypeScript**: UI components
4. **Event-Driven Architecture**: Module communication via EventBus

## Integration Points

1. **ProgressAnalyticsModule**: Feed difficulty assessments and learning curves
2. **CurriculumModule**: Use recommendations for learning path generation
3. **PracticeSessionModule**: Provide exercises and repertoire for sessions
4. **VisualizationModule**: Display difficulty analysis and progress charts

## Initial Content Strategy

Based on practice data analysis and public domain availability:

### Piano Repertoire Priority

1. **Foundation**: Bach Inventions, Notebook for Anna Magdalena
2. **Classical**: Mozart Sonatas K.331, K.545, early sonatas
3. **Romantic**: Chopin Waltzes, Mazurkas, easier Nocturnes
4. **Technical**: Czerny Op.599, Hanon exercises
5. **RCM Grades 5-8**: Aligned pieces from practice logs

### Guitar Repertoire Priority

1. **Beginner**: Carulli Op.241, Sor Op.60
2. **Intermediate**: Carcassi 25 Études, Giuliani Op.48
3. **Advanced**: Villa-Lobos Études, Sor Op.6 & Op.29

### Exercise Templates

1. **Sight-reading**: Progressive key signatures, common time signatures
2. **Technical**: Scales, arpeggios, thirds, octaves
3. **Rhythm**: From simple to complex syncopation
4. **Style-specific**: Baroque counterpoint, Classical alberti bass

## Plugin Architecture Design

Following the general system design recommendation:

```typescript
interface SheetMusicPlugin {
  name: string
  version: string

  // Extension points
  exerciseGenerators?: ExerciseGenerator[]
  difficultyAnalyzers?: DifficultyAnalyzer[]
  importers?: MusicImporter[]
  exporters?: MusicExporter[]

  // Lifecycle
  initialize(): Promise<void>
  destroy(): Promise<void>
}
```

## Future Enhancements

1. **Community Features**: User-submitted exercises and arrangements
2. **Teacher Tools**: Custom exercise creation and assignment
3. **Performance Analysis**: Compare user performance to reference recordings
4. **Collaborative Learning**: Ensemble piece recommendations and practice
5. **AI Integration Preparation**: Python microservice architecture ready for ML

---

This implementation plan provides a comprehensive roadmap for building an intelligent sheet music library that adapts to each user's learning journey, based on real practice patterns and proven pedagogical principles from successful platforms like IMSLP, flowkey, and MuseScore.
