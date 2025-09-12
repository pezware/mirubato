# Analytics Feature Specification

Status: ✅ Active

## Purpose

The Analytics system transforms raw practice data into actionable insights, helping musicians understand their practice patterns, identify areas for improvement, and celebrate progress. It answers the critical question: "Am I practicing effectively?"

## Why Analytics Matter for Musicians

Practice without reflection is just repetition. Musicians need to understand:

- **Time allocation**: Where practice time actually goes
- **Progress trends**: Whether improvement is happening
- **Practice quality**: Consistency vs. intensity trade-offs
- **Behavioral patterns**: When and how they practice best
- **Goal alignment**: Whether practice supports objectives

## Core Analytics Principles

### 1. Actionable Over Vanity Metrics

**Good Metrics**:

- Practice consistency (streak tracking)
- Time distribution across repertoire
- Progress velocity by piece difficulty
- Mood correlation with productivity

**Avoid**:

- Total hours without context
- Arbitrary point systems
- Meaningless achievements
- Comparison with others

### 2. Progressive Disclosure

**Why**: Overwhelming users with data reduces engagement.

**Information Hierarchy**:

1. **Glanceable**: Today's practice, current streak
2. **Summary**: Weekly overview, trending patterns
3. **Detailed**: Monthly analysis, custom reports
4. **Advanced**: Data export, custom visualizations

### 3. Contextual Insights

**Why**: Raw numbers need interpretation to drive behavior change.

**Insight Examples**:

- "You practice 40% more on weekends"
- "Your morning sessions average 15 minutes longer"
- "Difficult pieces get 60% less practice time"
- "Your streak breaks typically happen on Wednesdays"

## Key Analytics Features

### 1. Practice Overview Dashboard

**Purpose**: Immediate understanding of recent practice patterns.

**Critical Metrics**:

- **Today's Practice**: Duration, pieces, mood
- **Current Streak**: Consecutive days practiced
- **Weekly Total**: Compared to goal and average
- **Trending**: Up/down from previous period

**Visual Design Principles**:

```
┌─────────────────────────────────┐
│ Today: 45 min ↑15 min vs avg    │
│ ████████████░░░ 75% of goal     │
├─────────────────────────────────┤
│ 🔥 7 day streak (best: 15)      │
├─────────────────────────────────┤
│ This Week: 4h 30m               │
│ [M][T][W][T][F][S][S]           │
│ ██ ██ ░░ ██ ██ ██ ░░           │
└─────────────────────────────────┘
```

**Implementation Considerations**:

- Cache calculations aggressively
- Update in real-time during practice
- Show comparisons, not just absolutes
- Use color sparingly for emphasis

### 2. Practice Patterns Analysis

**Purpose**: Identify when and how users practice most effectively.

**Time-Based Patterns**:

- **Daily Distribution**: Heat map by hour
- **Weekly Rhythm**: Patterns across weekdays
- **Monthly Trends**: Long-term consistency
- **Seasonal Variations**: Year-over-year comparisons

**Quality Indicators**:

- **Session Length Distribution**: Short vs. long sessions
- **Focus Time**: Continuous vs. interrupted practice
- **Piece Rotation**: How many pieces per session
- **Technique vs. Repertoire**: Practice type balance

**Proper Visualization**:

```typescript
interface PracticePattern {
  timeOfDay: HourDistribution // 24-hour heat map
  dayOfWeek: WeekdayDistribution // Mon-Sun bars
  sessionLength: {
    average: number
    median: number
    distribution: Histogram
  }
  consistency: {
    streakHistory: Streak[]
    missedDays: Date[]
    recoveryTime: number // Days to restart after break
  }
}
```

### 3. Repertoire Analytics

**Purpose**: Understand progress across different pieces.

**Per-Piece Metrics**:

- **Total Investment**: Cumulative practice time
- **Recent Activity**: Last 7/30 days
- **Progress Velocity**: Status changes over time
- **Practice Efficiency**: Time to reach milestones

**Comparative Analysis**:

- **By Difficulty**: Time investment vs. piece difficulty
- **By Composer**: Preferences and strengths
- **By Status**: Time spent in each learning phase
- **By Period**: Classical vs. Romantic vs. Modern

**Visualization Best Practices**:

- Use bubble charts for multi-dimensional data
- Color-code by status or mood
- Allow filtering and drill-down
- Show trends with sparklines

### 4. Goal Progress Tracking

**Purpose**: Connect practice activity to concrete objectives.

**Goal Visualization Types**:

- **Linear Progress**: Simple progress bars
- **Burndown Charts**: Remaining work over time
- **Milestone Tracking**: Checkpoints achieved
- **Projection Lines**: Estimated completion date

**Proper Goal Analytics**:

```typescript
interface GoalAnalytics {
  goalId: string
  targetDate: Date
  currentProgress: number
  targetProgress: number

  // Calculated metrics
  progressRate: number // Units per day
  projectedCompletion: Date
  confidenceLevel: 'on-track' | 'at-risk' | 'behind'

  // Historical data
  progressHistory: DataPoint[]
  practiceCorrelation: number // How practice affects progress

  // Recommendations
  suggestedDailyTarget: number
  catchUpRequired: boolean
  adjustmentNeeded: string // "Increase practice by 15 min/day"
}
```

### 5. Mood and Productivity Correlation

**Purpose**: Understand emotional patterns in practice.

**Mood Tracking Integration**:

- Correlate mood with practice duration
- Identify optimal emotional states
- Track mood progression through session
- Recognize fatigue patterns

**Insights to Surface**:

- "You practice 25% longer when starting 'satisfied'"
- "Your mood improves 80% of the time after 20+ minutes"
- "Difficult pieces affect mood more on tired days"

### 6. Custom Reports

**Purpose**: Allow power users to explore their data deeply.

**Report Types**:

- **Period Comparison**: Month vs. month, year vs. year
- **Piece Deep Dive**: Complete history for one piece
- **Technique Analysis**: Scales vs. pieces vs. études
- **Performance Preparation**: Pre-performance practice patterns

**Export Capabilities**:

- CSV for spreadsheet analysis
- JSON for programmatic access
- PDF (🔄 Planned)
- API access for third-party tools

## Visualization Guidelines

### Chart Selection Matrix

| Data Type    | Best Chart         | Why                      |
| ------------ | ------------------ | ------------------------ |
| Time series  | Line/Area chart    | Shows trends clearly     |
| Distribution | Histogram/Box plot | Reveals patterns         |
| Comparison   | Bar chart          | Easy mental comparison   |
| Correlation  | Scatter plot       | Shows relationships      |
| Composition  | Pie/Donut chart    | Part-to-whole clarity    |
| Intensity    | Heat map           | Dense data visualization |

### Color Usage

**Semantic Colors**:

- **Green**: Positive trends, goals met
- **Amber**: Attention needed, warnings
- **Red**: Negative trends, missed goals
- **Blue**: Neutral information
- **Purple**: Achievements, milestones

**Accessibility Requirements**:

- Never rely on color alone
- Provide patterns/textures as alternatives
- Ensure 4.5:1 contrast ratios
- Test with color blindness simulators

### Mobile Considerations

**Responsive Visualizations**:

- Simplify charts on small screens
- Use swipe for time navigation
- Provide tap-to-reveal details
- Portrait-optimized layouts
- Reduce data density appropriately

## Performance Optimization

### Data Aggregation Strategy

**Pre-calculate Common Queries**:

```typescript
// Daily aggregates
interface DailyAggregate {
  date: string
  totalDuration: number
  sessionCount: number
  uniquePieces: string[]
  averageMood: number
  streakActive: boolean
}

// Cache these at session end
async function updateDailyAggregate(date: Date, session: PracticeSession) {
  const aggregate = await getOrCreateAggregate(date)
  aggregate.totalDuration += session.duration
  aggregate.sessionCount += 1
  aggregate.uniquePieces = [
    ...new Set([...aggregate.uniquePieces, ...session.pieces]),
  ]
  await saveAggregate(aggregate)
}
```

### Progressive Loading

**Load Strategy**:

1. Show cached data immediately
2. Load current period in background
3. Fetch historical data on demand
4. Paginate large datasets
5. Use virtual scrolling for lists

### Calculation Caching

**What to Cache**:

- Streak calculations (expensive)
- Statistical aggregates
- Trend calculations
- Report generations

**Cache Invalidation**:

- On new practice session
- On data edits
- Daily for historical data
- Never for immutable reports

## Privacy and Data Ethics

### User Data Principles

1. **Data Ownership**: Users own their practice data
2. **Transparency**: Clear about what's tracked
3. **Control**: Easy export and deletion
4. **No Comparison**: Never compare users without consent
5. **No Selling**: Practice data never sold/shared

### Anonymized Insights

**Acceptable Aggregations**:

- Average practice duration by instrument
- Popular repertoire pieces
- Common practice times
- General mood patterns

**Never Share**:

- Individual practice habits
- Personal progress rates
- Specific repertoire choices
- Mood/productivity correlations

## Implementation Best Practices

### For Developers

1. **Batch Calculations**: Process analytics in background
2. **Use Indexes**: Optimize database queries properly
3. **Cache Aggressively**: Most data is historical
4. **Progressive Enhancement**: Basic stats work offline
5. **Test with Scale**: Simulate years of practice data

### For Designers

1. **Information Hierarchy**: Most important metrics first
2. **Consistent Scales**: Use same axes across charts
3. **Annotation Support**: Allow users to add context
4. **Responsive Design**: Charts must work on all screens
5. **Print Friendly**: Reports should print well

## Success Metrics

**Engagement Metrics**:

- Daily active users viewing analytics
- Average time spent in analytics
- Report generation frequency
- Export usage rates

**Value Metrics**:

- Correlation between analytics use and practice consistency
- Goal achievement rates for analytics users
- User feedback on insight usefulness
- Behavior changes after viewing insights

## Common Pitfalls to Avoid

1. **Information Overload**: Too many metrics confuse users
2. **Vanity Metrics**: Impressive but not actionable
3. **Poor Performance**: Slow analytics discourage use
4. **Missing Context**: Numbers without interpretation
5. **Rigid Timeframes**: Allow custom date ranges

## Related Documentation

- [Logbook](./logbook.md) - Data source for analytics
- [03‑API](../03-api/rest-api.md) - Goals endpoints and contracts
- [Repertoire](./repertoire.md) - Piece-specific analytics
- Practice Reports (UI): see code references below

## Code References

- Views: `frontendv2/src/components/practice-reports/views/{OverviewView,AnalyticsView,DataTableView}.tsx`
- Tabs & container: `frontendv2/src/components/practice-reports/ReportsTabs.tsx`
- Charts: `frontendv2/src/components/practice-reports/visualizations/charts/*`
- Advanced filters/presets: `frontendv2/src/components/practice-reports/advanced/{PeriodPresets,FilterBuilder,GroupingPanel,SortingPanel}.tsx`
- CSV/JSON Export: `frontendv2/src/components/practice-reports/views/DataTableView.tsx`

---

_Last updated: 2025-09-09 | Version 1.7.6_

## Operational Limits

- Analytics computed client-side; very large histories may be slower on first render.
- Caching: derived data cached in-memory; invalidated on data changes.

## Failure Modes

- Missing data windows: charts adapt gracefully; tooltips note “no data”.
- Export errors: client warns when no data available for CSV/JSON.
