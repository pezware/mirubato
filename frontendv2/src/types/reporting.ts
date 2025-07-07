// Advanced reporting types for the enhanced reporting UI

import { LogbookEntry } from '../api/logbook'

// Filter System Types
export interface FilterCriteria {
  id: string
  field: FilterField
  operator: FilterOperator
  value: FilterValue
  logic?: 'AND' | 'OR'
}

export type FilterField =
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

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty'

export interface DurationRange {
  min: number
  max: number
}

export type FilterValue =
  | string
  | number
  | Date
  | string[]
  | DateRange
  | DurationRange
  | boolean
  | null

export interface DateRange {
  start: Date
  end: Date
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: FilterCriteria[]
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

// Grouping System Types
export interface GroupingConfig {
  field: GroupField
  order: 'asc' | 'desc'
  collapsed?: boolean
  showAggregates?: boolean
}

export type GroupField =
  | 'date:day'
  | 'date:week'
  | 'date:month'
  | 'date:year'
  | 'piece'
  | 'composer'
  | 'instrument'
  | 'type'
  | 'mood'
  | 'duration:range'

export interface GroupedData {
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

// Sorting System Types
export interface SortConfig {
  field: SortField
  direction: 'asc' | 'desc'
  priority: number
}

export type SortField =
  | 'date'
  | 'duration'
  | 'piece'
  | 'composer'
  | 'practiceCount'
  | 'totalDuration'
  | 'lastPracticed'

// Visualization Types
export interface ChartConfig {
  type: ChartType
  dataKey: string
  options: ChartOptions
}

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'horizontalBar'
  | 'pie'
  | 'donut'
  | 'heatmap'
  | 'scatter'

export interface ChartOptions {
  title?: string
  showLegend?: boolean
  showTooltips?: boolean
  colors?: string[]
  stacked?: boolean
  showDataLabels?: boolean
  aspectRatio?: number
  plugins?: Record<string, unknown>
  indexAxis?: 'x' | 'y'
  scales?: Record<string, unknown>
  cutout?: string | number
}

export interface DashboardWidget {
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

export interface TableConfig {
  columns: string[]
  groupBy?: string[]
  sortBy?: SortConfig[]
  showAggregates?: boolean
  pageSize?: number
}

export interface SummaryConfig {
  metrics: string[]
  period?: 'day' | 'week' | 'month' | 'year' | 'all'
  compareWith?: 'previous' | 'average'
}

// Enhanced Analytics Data
export interface EnhancedAnalyticsData {
  // Original analytics
  todayTotal: number
  todayCount: number
  weekTotal: number
  weekCount: number
  currentStreak: number
  practiceByDay: Map<string, number>
  uniqueComposers: number
  uniquePieces: number
  pieceStats: Map<
    string,
    {
      count: number
      totalDuration: number
      lastPracticed: string
      techniques: Set<string>
    }
  >

  // New analytics for enhanced reporting
  groupedData?: GroupedData[]
  timeSeriesData?: TimeSeriesData[]
  distributionData?: DistributionData[]
  comparativeData?: ComparativeData[]
}

export interface TimeSeriesData {
  date: string
  value: number
  label?: string
  metadata?: Record<string, unknown>
}

export interface DistributionData {
  category: string
  value: number
  percentage: number
  color?: string
}

export interface ComparativeData {
  category: string
  current: number
  previous?: number
  target?: number
  change?: number
  changePercent?: number
}
