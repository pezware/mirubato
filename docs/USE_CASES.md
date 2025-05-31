# Mirubato Use Cases

## Overview

This document outlines the primary use cases for mirubato, covering both beginner and professional musicians. The platform supports two main user personas with different needs and workflows.

## User Personas

### 1. Beginner Student
- **Goal**: Develop sight-reading proficiency through daily practice
- **Time commitment**: 15 minutes daily
- **Needs**: Structured progression, clear feedback, motivation through progress tracking

### 2. Professional Musician / Advanced Student
- **Goal**: Maintain and improve sight-reading skills, warm-up, practice logging
- **Time commitment**: Variable (5-60 minutes per session)
- **Needs**: Flexibility, detailed practice logs, variety of materials

## Detailed Use Cases

### Beginner Use Cases

#### 1.1 Daily Sight-Reading Practice
- User opens mirubato for their daily 15-minute session
- System presents graded exercises based on current level
- User plays through exercises with real-time feedback
- Session automatically saves progress and updates statistics

#### 1.2 Progress Review
- User views weekly/monthly progress reports
- Charts show accuracy trends, time practiced, pieces completed
- System highlights achievements and milestones
- Recommendations for next practice session

#### 1.3 Level Progression
- System automatically adjusts difficulty based on performance
- User receives notification when ready for next grade level
- Option to preview harder materials without affecting progression
- Clear indicators of current proficiency level

#### 1.4 Practice History
- User browses all completed sheet music
- Can replay previous exercises to see improvement
- Star/bookmark favorite pieces for future practice
- Export practice certificates for teachers/parents

### Professional Use Cases

#### 2.1 Quick Warm-Up Session
- User selects "Warm-up" mode
- Choose from:
  - Random sight-reading excerpts
  - Technical patterns (scales, arpeggios)
  - Chord progressions
- Set duration (5, 10, 15 minutes)
- No scoring pressure, focus on flow

#### 2.2 Targeted Sight-Reading Practice
- User requests specific parameters:
  - Key signature (C major, G minor, etc.)
  - Time signature (4/4, 3/4, 6/8, etc.)
  - Style period (Baroque, Classical, Romantic, Contemporary)
  - Technical focus (leaps, accidentals, rhythm patterns)
- System generates or selects appropriate material
- Full pieces or excerpts based on preference

#### 2.3 Professional Practice Logging
- **Quick Start/Stop Timer**:
  1. Press "Start Practice" button
  2. Select activity type from quick menu
  3. Begin practice (timer runs in background)
  4. Press "Stop" when finished
  5. Fill quick details form

- **Activity Types** (Common musician activities):
  - **Sight-reading**: First-time reading of new material
  - **Scales & Technical Work**: Major/minor scales, modes, arpeggios
  - **Études**: Technical studies (Czerny, Hanon, Sor, etc.)
  - **Repertoire**: Working on performance pieces
  - **Memorization**: Playing without sheet music
  - **Slow Practice**: Tempo-reduced technical work
  - **Mental Practice**: Score study without instrument
  - **Ensemble Reading**: Chamber music or accompaniment
  - **Transposition**: Reading in different keys
  - **Score Reduction**: Piano reduction of orchestral scores

#### 2.4 Detailed Practice Entry
- **Log Fields**:
  - Date/Time (auto-filled)
  - Duration (auto-calculated from timer)
  - Activity Type (dropdown)
  - Piece/Exercise:
    - Composer (e.g., "Beethoven")
    - Work (e.g., "Symphony No. 9, Op. 125")
    - Movement/Section (e.g., "4th movement, measures 12-47")
    - For études: "Sor Op. 60, No. 20"
  - Tempo practiced (BPM)
  - Focus areas (multiple select):
    - Technical accuracy
    - Rhythm precision
    - Dynamic control
    - Articulation
    - Phrasing
    - Memorization
    - Performance preparation
  - Self-assessment (1-10 scale)
  - Notes (free text)

#### 2.5 Practice Analytics
- **Time Analysis**:
  - Total practice time by day/week/month
  - Time distribution across activities
  - Peak practice hours
  - Consistency streaks

- **Repertoire Analysis**:
  - Most practiced composers
  - Technical area distribution
  - Progress on specific pieces over time
  - Self-assessment trends

- **Export Options**:
  - PDF practice reports for teachers
  - CSV data for personal analysis
  - Practice certificates for auditions/applications

### Shared Use Cases

#### 3.1 Instrument Selection
- User selects primary instrument (piano/guitar)
- Option to practice both instruments
- Instrument-specific exercises and notation
- Separate progress tracking per instrument

#### 3.2 Offline Practice
- Download exercises for offline use
- Sync progress when reconnected
- Local storage of recent sessions
- Works on mobile devices without connection

#### 3.3 Social Features (Future)
- Share progress milestones
- Challenge friends to sight-reading duels
- Teacher-student assignment system
- Practice group leaderboards

#### 3.4 Customization
- Adjust notation size for visibility
- Choose color themes (including high contrast)
- Set practice reminders
- Customize which metrics to track

## Practice Session Flows

### Beginner Flow
1. Open app → Today's Practice
2. Complete 3-5 graded exercises
3. Receive immediate feedback
4. View session summary
5. See tomorrow's plan

### Professional Quick Log Flow
1. Tap "Start Practice" + activity type
2. Practice (app can be minimized)
3. Tap "End Practice"
4. Quick form:
   - Piece/exercise (autocomplete from history)
   - Tempo (optional)
   - Self-score (1-10 slider)
   - Quick note (optional)
5. Save and continue

### Professional Detailed Log Flow
1. "New Practice Entry" → Detailed form
2. Fill all relevant fields
3. Option to start timer from form
4. Save as template for recurring practice
5. View in practice journal

## Musical Terminology Used

- **Tempo markings**: Grave, Largo, Adagio, Andante, Moderato, Allegro, Presto
- **Dynamics**: pp, p, mp, mf, f, ff
- **Articulations**: legato, staccato, marcato, tenuto, accent
- **Practice tempos**: Usually 50-75% of performance tempo for slow practice
- **Standard metronome markings**: ♩ = 60-208

## Success Metrics

### For Beginners
- Daily practice streak
- Accuracy improvement over time
- Pieces completed per week
- Time to advance levels

### For Professionals
- Practice time goals met
- Repertoire diversity
- Self-assessment improvements
- Consistency of practice schedule

## Implementation Priority

1. **Phase 1**: Basic sight-reading with progress tracking (current MVP)
2. **Phase 2**: Beginner progression system and reports
3. **Phase 3**: Professional practice timer and basic logging
4. **Phase 4**: Detailed practice journal and analytics
5. **Phase 5**: Social features and advanced customization