# Enhanced Practice Reporting UI Design

## Overview

This document outlines the design and implementation plan for the enhanced practice reporting UI in Mirubato. The new system will provide flexible filtering, sorting, and grouping capabilities with rich data visualizations including charts and advanced tables.

## Goals

1. **Flexible Data Analysis**: Enable users to combine multiple criteria for filtering, sorting, and grouping
2. **Rich Visualizations**: Provide multiple chart types (bar, pie, line, heatmap) for different insights
3. **Advanced Tables**: Support hierarchical grouping and multi-level sorting
4. **Better UX**: Intuitive filter builder with preset management
5. **Performance**: Fast rendering even with large datasets
6. **Accessibility**: WCAG 2.1 AA compliant charts and tables

## User Stories

### As a music student, I want to:

- See my practice trends over time with interactive charts
- Filter my practice sessions by multiple criteria (e.g., pieces by Bach practiced on weekends)
- Group my practice data by composer, then by piece to see patterns
- Export my filtered reports with charts for sharing with my teacher
- Save my favorite report configurations for quick access

### As a music teacher, I want to:

- Compare practice patterns across different time periods
- See distribution of practice time across different techniques
- Identify which pieces need more attention based on practice frequency
- Create custom reports for student progress meetings

## Architecture

### Data Flow

```
User Input → Filter Builder → Analytics Engine → Visualization Layer
     ↓                             ↓                      ↓
   Presets                    Grouped Data          Charts/Tables
     ↓                             ↓                      ↓
   Storage                    Export Layer          Interaction
```

### Component Structure

```
components/practice-reports/
├── advanced/
│   ├── FilterBuilder/
│   │   ├── FilterBuilder.tsx         # Main filter UI
│   │   ├── FilterCriteria.tsx        # Individual filter row
│   │   ├── FilterPresets.tsx         # Save/load presets
│   │   └── types.ts                  # Filter types
│   ├── GroupingPanel/
│   │   ├── GroupingPanel.tsx         # Grouping configuration
│   │   ├── GroupLevel.tsx            # Single group level
│   │   └── types.ts                  # Grouping types
│   └── SortingPanel/
│       ├── SortingPanel.tsx          # Sorting configuration
│       └── SortField.tsx             # Sort field selector
├── visualizations/
│   ├── charts/
│   │   ├── PracticeTrendChart.tsx    # Time series line/area
│   │   ├── DistributionPie.tsx       # Category distribution
│   │   ├── ProgressBar.tsx           # Horizontal bars
│   │   ├── HeatmapCalendar.tsx       # Daily practice heatmap
│   │   ├── ComparativeChart.tsx      # Multi-series comparison
│   │   └── ChartContainer.tsx        # Wrapper with controls
│   ├── tables/
│   │   ├── GroupedDataTable.tsx      # Hierarchical grouping
│   │   ├── SummaryTable.tsx          # Aggregated summaries
│   │   └── TableControls.tsx         # Export, pagination
│   └── common/
│       ├── ChartTooltip.tsx          # Unified tooltips
│       ├── ChartLegend.tsx           # Interactive legends
│       └── NoDataMessage.tsx         # Empty states
├── dashboard/
│   ├── ReportDashboard.tsx           # Main dashboard container
│   ├── WidgetGrid.tsx                # Drag-drop grid layout
│   ├── WidgetConfig.tsx              # Widget settings modal
│   └── DashboardPresets.tsx          # Dashboard templates
└── stores/
    ├── reportingStore.ts             # Main reporting state
    ├── filterStore.ts                # Filter state management
    └── visualizationStore.ts         # Chart preferences
```

## Data Models

### Filter System

```typescript
interface FilterCriteria {
  id: string
  field: FilterField
  operator: FilterOperator
  value: FilterValue
  logic?: 'AND' | 'OR'
}

type FilterField =
  | 'date'
  | 'duration'
  | 'piece'
  | 'composer'
  | 'instrument'
  | 'type'
  | 'mood'
  | 'techniques'
  | 'scoreId'
  | 'autoTracked'

type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'greaterThan'
  | 'lessThan'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty'

type FilterValue = string | number | Date | string[] | DateRange

interface DateRange {
  start: Date
  end: Date
}

interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: FilterCriteria[]
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}
```

### Grouping System

```typescript
interface GroupingConfig {
  field: GroupField
  order: 'asc' | 'desc'
  collapsed?: boolean
  showAggregates?: boolean
}

type GroupField =
  | 'date:day'
  | 'date:week'
  | 'date:month'
  | 'date:year'
  | 'piece'
  | 'composer'
  | 'instrument'
  | 'type'
  | 'mood'
  | 'duration:range' // e.g., 0-15min, 15-30min, etc.

interface GroupedData {
  key: string
  label: string
  count: number
  totalDuration: number
  avgDuration: number
  children?: GroupedData[]
  entries: LogbookEntry[]
  aggregates: {
    uniquePieces: number
    uniqueComposers: number
    techniques: string[]
    moodDistribution: Record<string, number>
  }
}
```

### Sorting System

```typescript
interface SortConfig {
  field: SortField
  direction: 'asc' | 'desc'
  priority: number // For multi-level sorting
}

type SortField =
  | 'date'
  | 'duration'
  | 'piece'
  | 'composer'
  | 'practiceCount' // For grouped data
  | 'totalDuration' // For grouped data
  | 'lastPracticed'
```

### Visualization Configuration

```typescript
interface ChartConfig {
  type: ChartType
  dataKey: string
  options: ChartOptions
}

type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'horizontalBar'
  | 'pie'
  | 'donut'
  | 'heatmap'
  | 'scatter'

interface ChartOptions {
  title?: string
  showLegend?: boolean
  showTooltips?: boolean
  colors?: string[]
  stacked?: boolean
  showDataLabels?: boolean
  aspectRatio?: number
}

interface DashboardWidget {
  id: string
  type: 'chart' | 'table' | 'summary' | 'custom'
  config: ChartConfig | TableConfig | SummaryConfig
  layout: {
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
  }
}
```

## UI Mockups

### Filter Builder

```
┌─────────────────────────────────────────────────────────────┐
│ Filters                                          [+ Add] [⚙] │
├─────────────────────────────────────────────────────────────┤
│ [Date] [between ▼] [Jan 1, 2025] - [Jan 31, 2025]     [×]  │
│ AND                                                          │
│ [Composer] [equals ▼] [Bach ▼]                        [×]  │
│ AND                                                          │
│ [Duration] [greater than ▼] [30] minutes              [×]  │
├─────────────────────────────────────────────────────────────┤
│ Presets: [My Daily Practice ▼] [Save] [Save As]            │
└─────────────────────────────────────────────────────────────┘
```

### Grouping Panel

```
┌─────────────────────────────────────────────────────────────┐
│ Group By                                                     │
├─────────────────────────────────────────────────────────────┤
│ Level 1: [Composer ▼] [Ascending ▼]                   [×]  │
│ Level 2: [Piece ▼] [By Practice Count ▼]             [×]  │
│                                            [+ Add Level]     │
└─────────────────────────────────────────────────────────────┘
```

### Chart Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Practice Reports Dashboard              [Edit Layout] [Export]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐           │
│ │ Practice Trend      │ │ Time Distribution   │           │
│ │ [Line Chart]        │ │ [Pie Chart]         │           │
│ │                     │ │                     │           │
│ └─────────────────────┘ └─────────────────────┘           │
│ ┌─────────────────────────────────────────────┐           │
│ │ Practice Heatmap                             │           │
│ │ [Calendar View with intensity]               │           │
│ └─────────────────────────────────────────────┘           │
│ ┌─────────────────────────────────────────────┐           │
│ │ Grouped Practice Data                        │           │
│ │ ▼ Bach (120 min total)                      │           │
│ │   ▶ Invention No. 1 (45 min)                │           │
│ │   ▶ Invention No. 8 (75 min)                │           │
│ │ ▶ Mozart (95 min total)                     │           │
│ └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Data Layer (Days 1-3)

- Extend `usePracticeAnalytics` hook
- Create filter/grouping/sorting engines
- Implement data transformation utilities
- Add caching layer for performance

### Phase 2: Core Components (Days 4-7)

- Build FilterBuilder component
- Create GroupingPanel
- Implement SortingPanel
- Add preset management

### Phase 3: Visualizations (Days 8-12)

- Implement all chart components
- Create grouped data table
- Add interactive features
- Ensure accessibility

### Phase 4: Dashboard (Days 13-15)

- Build dashboard layout system
- Implement widget configuration
- Add drag-and-drop functionality
- Create dashboard presets

### Phase 5: Integration & Polish (Days 16-20)

- Connect all components
- Add loading/error states
- Implement export functionality
- Performance optimization
- Comprehensive testing

## Technical Considerations

### Performance Optimizations

1. **Data Processing**
   - Use Web Workers for heavy calculations
   - Implement virtual scrolling for large tables
   - Memoize expensive computations
   - Progressive data loading

2. **Rendering**
   - Lazy load chart components
   - Use React.memo for pure components
   - Implement chart data sampling for large datasets
   - Debounce filter changes

3. **State Management**
   - Normalize data structures
   - Use immer for immutable updates
   - Implement undo/redo for filters
   - Sync state with URL for shareable reports

### Accessibility Requirements

1. **Charts**
   - Provide text alternatives for all visualizations
   - Ensure keyboard navigation
   - Use ARIA labels and descriptions
   - Support high contrast mode
   - Include data tables as alternatives

2. **Interactive Elements**
   - Focus management for modals
   - Keyboard shortcuts for common actions
   - Screen reader announcements for updates
   - Proper heading structure

### Export Features

1. **Data Export**
   - CSV with full filtered/grouped data
   - JSON with metadata and configuration
   - Excel with multiple sheets

2. **Visual Export**
   - PDF with embedded charts
   - PNG/SVG for individual charts
   - Print-friendly layouts

## Migration Strategy

1. **Feature Flag**
   - Add `enableEnhancedReporting` flag
   - Gradual rollout to users
   - A/B testing for UX improvements

2. **Backward Compatibility**
   - Keep existing reporting functional
   - Migrate saved filters/preferences
   - Provide UI toggle between old/new

3. **Data Migration**
   - No changes to data model needed
   - Preserve existing logbook entries
   - Add new metadata fields optionally

## Success Metrics

1. **User Engagement**
   - Time spent in reports section
   - Number of custom filters created
   - Export usage frequency
   - Preset adoption rate

2. **Performance**
   - Initial load time < 2s
   - Filter application < 100ms
   - Chart render time < 500ms
   - Memory usage < 200MB

3. **User Satisfaction**
   - Survey feedback score > 4.5/5
   - Support ticket reduction
   - Feature request completion
   - User retention improvement

## Future Enhancements

1. **AI-Powered Insights**
   - Automatic pattern detection
   - Practice recommendations
   - Anomaly detection
   - Predictive analytics

2. **Social Features**
   - Share reports with teachers
   - Compare with peers (anonymized)
   - Practice challenges
   - Progress celebrations

3. **Advanced Analytics**
   - Machine learning for piece difficulty
   - Technique progression tracking
   - Optimal practice time suggestions
   - Fatigue detection

4. **Integration**
   - Calendar sync
   - Export to practice apps
   - Teacher portal access
   - Student progress API

---

This design provides a comprehensive framework for implementing the enhanced reporting UI while maintaining performance, accessibility, and user experience standards.
