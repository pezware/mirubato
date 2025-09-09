# Repertoire Feature Specification

## Purpose

The Repertoire system tracks a musician's journey with each piece of music, from initial interest through mastery and performance. It provides structured progression tracking, intelligent practice suggestions, and comprehensive performance history.

## Why Repertoire Management Matters

Musicians often work on multiple pieces simultaneously, each at different stages of mastery. Without systematic tracking:

- Progress gets lost or forgotten
- Practice time is inefficiently distributed
- Performance readiness is unclear
- Long-term musical development lacks structure

The Repertoire feature solves these problems by providing a structured, data-driven approach to managing musical progress.

## Core Concepts

### Status Progression Model

**Purpose**: Reflect the natural learning curve of mastering a musical piece.

```
Planned → Learning → Working → Polished → Performance Ready
```

**Why this progression?**

- **Planned**: Pieces you intend to learn (wishlist/curriculum)
- **Learning**: Initial exploration and note learning
- **Working**: Active refinement and technique development
- **Polished**: Technically secure, focusing on musicality
- **Performance Ready**: Concert-ready with full confidence

**Status Change Rules**:

- Forward progression is encouraged but not enforced
- Backward movement is allowed (e.g., piece needs more work)
- Each status change is logged with timestamp for history
- Automatic notes added to track progression reasoning

### Intelligent Practice Distribution

**Purpose**: Ensure balanced practice across repertoire based on goals and deadlines.

**Key Principles**:

1. **Spaced Repetition**: Pieces not practiced recently get priority
2. **Deadline Awareness**: Upcoming performances influence suggestions
3. **Difficulty Balancing**: Mix challenging and comfortable pieces
4. **Status-Based Allocation**: Different stages need different attention

**Suggestion Algorithm Priorities**:

```
Priority = Base Priority × Recency Factor × Deadline Factor × Difficulty Factor

Where:
- Base Priority: Performance Ready (1.0), Polished (0.8), Working (0.9), Learning (0.7), Planned (0.3)
- Recency Factor: Days since last practice (exponential decay)
- Deadline Factor: Days until performance (inverse relationship)
- Difficulty Factor: Balances session difficulty
```

## Key Features

### 1. Repertoire Item Management

**What**: Comprehensive tracking for each piece in repertoire.

**Why**: Musicians need detailed context for each piece to make informed practice decisions.

**Proper Implementation**:

- **Normalize composer names** for consistent grouping
- **Link to score** for immediate access to sheet music
- **Track practice sessions** automatically from logbook
- **Maintain status history** for progress visualization
- **Support custom notes** for personal reminders

**Data to Track**:

- Musical metadata (title, composer, opus, key)
- Learning metadata (difficulty, target tempo, current tempo)
- Progress metadata (status, practice count, total time)
- Performance metadata (performance date, venue, program notes)

### 2. Progress Tracking

**What**: Automated tracking of improvement over time.

**Why**: Objective progress measurement motivates continued practice and identifies plateaus.

**Proper Tracking Methods**:

- **Tempo progression**: Current BPM vs target BPM
- **Practice frequency**: Sessions per week/month
- **Duration trends**: Average session length changes
- **Status velocity**: Time spent in each status
- **Problem areas**: Recurring notes about specific sections

**Visual Indicators**:

- Progress bars for tempo achievement
- Streak indicators for consistent practice
- Timeline view of status changes
- Heat map of practice intensity

### 3. Smart Practice Suggestions

**What**: AI-driven recommendations for what to practice next.

**Why**: Optimize practice time by focusing on pieces that need attention most.

**Suggestion Factors**:

- **Staleness**: Pieces not practiced recently
- **Performance proximity**: Upcoming performance dates
- **Goal alignment**: Pieces linked to active goals
- **Difficulty variety**: Balance challenge and comfort
- **Time available**: Match suggestions to session length

**Proper Implementation**:

```typescript
interface PracticeSuggestion {
  piece: RepertoireItem
  reason: string // "Haven't practiced in 5 days"
  suggestedDuration: number // minutes
  focusAreas: string[] // ["Dynamics in development", "Tempo stability"]
  priority: 'urgent' | 'high' | 'medium' | 'low'
}
```

### 4. Performance Preparation

**What**: Specialized tracking for pieces being prepared for performance.

**Why**: Performance preparation requires different focus than general practice.

**Performance Tracking**:

- **Performance date** and venue
- **Program order** for recitals
- **Memory status** (memorized sections)
- **Run-through history** (complete performances)
- **Performance anxiety notes**
- **Dress rehearsal feedback**

**Pre-Performance Checklist**:

- Technical security confirmed
- Memorization complete
- Performance tempo achieved
- Multiple successful run-throughs
- Recovery strategies practiced
- Program notes written

### 5. Historical Analysis

**What**: Long-term view of repertoire development.

**Why**: Understanding learning patterns improves future piece selection and practice strategies.

**Analytics to Provide**:

- **Learning velocity**: Average time from Planned → Performance Ready
- **Repertoire diversity**: Distribution by period, composer, difficulty
- **Abandonment patterns**: Which pieces get dropped and why
- **Success patterns**: Characteristics of quickly-mastered pieces
- **Seasonal trends**: Practice patterns throughout the year

## User Experience Design

### Desktop Repertoire View

**Layout Philosophy**: Information density with visual hierarchy.

```
Primary View: Status-grouped cards
┌─────────────────────────────────────────────┐
│ Performance Ready (2)                       │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎵 Moonlight Sonata - Beethoven         │ │
│ │ Last: 2 days ago | Total: 45 hours      │ │
│ │ Performance: Dec 15 | [Practice][Edit]  │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Working (3)                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠️ Nocturne Op.9 No.2 - Chopin          │ │
│ │ Last: 5 days ago | Needs attention      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Visual Indicators**:

- 🎵 Ready for performance
- ⚠️ Needs attention (not practiced recently)
- 📈 Improving rapidly
- 🎯 Linked to active goal
- 📅 Performance scheduled

### Mobile Experience

**Design Principles**:

- **Swipe gestures** for status changes
- **Quick actions** accessible via long-press
- **Compact cards** with expandable details
- **Bottom sheet** for editing
- **Pull-to-refresh** for sync

### Practice Mode Integration

**Seamless Workflow**:

1. Select piece from repertoire
2. Auto-load sheet music if linked
3. Start practice timer automatically
4. Capture practice notes in context
5. Update repertoire stats on session end

## Data Architecture

### Core Data Model

**Why this structure?**

- **Denormalized for performance**: Avoid joins for common queries
- **History tracking built-in**: Status changes are immutable log
- **Flexible metadata**: JSON fields for piece-specific data

```typescript
interface RepertoireItem {
  // Identity
  id: string
  userId: string

  // Musical reference
  scoreId?: string // Optional link to Scorebook
  scoreTitle: string
  scoreComposer: string
  normalizedComposer: string // For grouping

  // Progress tracking
  status: RepertoireStatus
  statusHistory: StatusChange[] // Immutable log
  difficulty: 1-10

  // Practice metrics
  practiceCount: number
  totalPracticeTime: number // seconds
  lastPracticedAt?: number
  averageSessionLength: number

  // Performance planning
  targetTempo?: number
  currentTempo?: number
  performanceDate?: number
  performanceVenue?: string

  // Personal data
  notes: string // Markdown supported
  tags: string[]
  goalIds: string[] // Linked goals

  // Metadata
  addedAt: number
  updatedAt: number
}

interface StatusChange {
  from: RepertoireStatus
  to: RepertoireStatus
  timestamp: number
  reason?: string // "Ready for December recital"
}
```

### Proper Indexing Strategy

**Indexes needed for performance**:

- `userId + status` - Filter by status
- `userId + lastPracticedAt` - Find stale pieces
- `userId + performanceDate` - Upcoming performances
- `normalizedComposer` - Group by composer
- `userId + addedAt` - Recent additions

## Integration Points

### With Logbook

**Automatic Updates**:

- Practice sessions link to repertoire items
- Duration and frequency update repertoire stats
- Practice notes can update repertoire notes
- Mood tracking influences status suggestions

### With Goals

**Goal Types for Repertoire**:

- Learn X new pieces by date
- Achieve performance ready status
- Maintain practice streak for piece
- Reach target tempo

### With Analytics

**Repertoire-Specific Reports**:

- Status distribution over time
- Practice time per status
- Composer diversity analysis
- Difficulty progression tracking

## Best Practices

### For Users

1. **Regular Status Updates**: Review and update status weekly
2. **Detailed Notes**: Document specific challenges and breakthroughs
3. **Realistic Difficulty**: Accurate difficulty helps suggestions
4. **Goal Linking**: Connect pieces to concrete goals
5. **Performance Planning**: Add dates early for better preparation

### For Implementation

1. **Preserve History**: Never delete status changes
2. **Normalize Consistently**: Use canonical composer names
3. **Cache Calculations**: Practice suggestions are expensive
4. **Batch Updates**: Group multiple status changes
5. **Validate Transitions**: Some status changes need confirmation

## Success Metrics

**User Engagement**:

- Average pieces in active repertoire
- Status change frequency
- Practice suggestion acceptance rate
- Performance completion rate

**Learning Efficiency**:

- Time to reach each status
- Abandonment rate by difficulty
- Practice distribution evenness
- Goal achievement correlation

## Common Pitfalls to Avoid

1. **Over-automation**: Don't change status automatically
2. **Rigid progression**: Allow flexible status movement
3. **Information overload**: Progressive disclosure of details
4. **Suggestion fatigue**: Limit daily suggestions
5. **Data loss**: Always preserve historical data

## Related Documentation

- [Logbook](./logbook.md) - Practice session tracking
- [Goals](./goals.md) - Goal setting and tracking
- [Analytics](./analytics.md) - Progress visualization
- [Scorebook](./scorebook.md) - Sheet music management

---

_Last updated: 2025-09-09 | Version 1.7.6_
