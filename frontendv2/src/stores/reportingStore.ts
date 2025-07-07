import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import {
  FilterCriteria,
  FilterPreset,
  GroupingConfig,
  SortConfig,
  DashboardWidget,
  ChartType,
} from '../types/reporting'

interface ReportingState {
  // Filter state
  filters: FilterCriteria[]
  filterPresets: FilterPreset[]
  activePresetId: string | null

  // Grouping state
  groupBy: GroupingConfig[]

  // Sorting state
  sortBy: SortConfig[]

  // View state
  viewType: 'table' | 'charts' | 'hybrid'
  selectedCharts: ChartType[]

  // Dashboard state
  dashboardWidgets: DashboardWidget[]
  dashboardLayout: 'grid' | 'list'

  // Date range
  dateRange: {
    start: Date | null
    end: Date | null
    preset?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'
  }

  // Actions
  addFilter: (filter: Omit<FilterCriteria, 'id'>) => void
  updateFilter: (id: string, updates: Partial<FilterCriteria>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void

  saveFilterPreset: (name: string, description?: string) => void
  loadFilterPreset: (presetId: string) => void
  deleteFilterPreset: (presetId: string) => void
  updateFilterPreset: (presetId: string, updates: Partial<FilterPreset>) => void

  setGroupBy: (groupBy: GroupingConfig[]) => void
  addGroupLevel: (config: GroupingConfig) => void
  removeGroupLevel: (index: number) => void
  updateGroupLevel: (index: number, updates: Partial<GroupingConfig>) => void

  setSortBy: (sortBy: SortConfig[]) => void
  addSortField: (config: SortConfig) => void
  removeSortField: (index: number) => void
  updateSortField: (index: number, updates: Partial<SortConfig>) => void

  setViewType: (viewType: 'table' | 'charts' | 'hybrid') => void
  toggleChart: (chartType: ChartType) => void

  addDashboardWidget: (widget: Omit<DashboardWidget, 'id'>) => void
  updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => void
  removeDashboardWidget: (id: string) => void
  setDashboardLayout: (layout: 'grid' | 'list') => void

  setDateRange: (range: {
    start: Date | null
    end: Date | null
    preset?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'
  }) => void

  // Helper methods
  getActiveFilters: () => FilterCriteria[]
  getActivePreset: () => FilterPreset | null
  hasActiveFilters: () => boolean
}

export const useReportingStore = create<ReportingState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      filters: [],
      filterPresets: [],
      activePresetId: null,
      groupBy: [],
      sortBy: [{ field: 'date', direction: 'desc', priority: 0 }],
      viewType: 'hybrid',
      selectedCharts: ['line', 'pie'],
      dashboardWidgets: [],
      dashboardLayout: 'grid',
      dateRange: {
        start: null,
        end: null,
        preset: 'month',
      },

      // Filter actions
      addFilter: filter =>
        set(state => {
          state.filters.push({
            ...filter,
            id: nanoid(),
          })
        }),

      updateFilter: (id, updates) =>
        set(state => {
          const index = state.filters.findIndex(f => f.id === id)
          if (index !== -1) {
            Object.assign(state.filters[index], updates)
          }
        }),

      removeFilter: id =>
        set(state => {
          state.filters = state.filters.filter(f => f.id !== id)
        }),

      clearFilters: () =>
        set(state => {
          state.filters = []
          state.activePresetId = null
        }),

      // Preset actions
      saveFilterPreset: (name, description) =>
        set(state => {
          const preset: FilterPreset = {
            id: nanoid(),
            name,
            description,
            filters: [...state.filters],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          state.filterPresets.push(preset)
          state.activePresetId = preset.id
        }),

      loadFilterPreset: presetId =>
        set(state => {
          const preset = state.filterPresets.find(p => p.id === presetId)
          if (preset) {
            state.filters = [...preset.filters]
            state.activePresetId = presetId
          }
        }),

      deleteFilterPreset: presetId =>
        set(state => {
          state.filterPresets = state.filterPresets.filter(
            p => p.id !== presetId
          )
          if (state.activePresetId === presetId) {
            state.activePresetId = null
          }
        }),

      updateFilterPreset: (presetId, updates) =>
        set(state => {
          const index = state.filterPresets.findIndex(p => p.id === presetId)
          if (index !== -1) {
            Object.assign(state.filterPresets[index], {
              ...updates,
              updatedAt: new Date().toISOString(),
            })
          }
        }),

      // Grouping actions
      setGroupBy: groupBy =>
        set(state => {
          state.groupBy = groupBy
        }),

      addGroupLevel: config =>
        set(state => {
          state.groupBy.push(config)
        }),

      removeGroupLevel: index =>
        set(state => {
          state.groupBy.splice(index, 1)
        }),

      updateGroupLevel: (index, updates) =>
        set(state => {
          if (state.groupBy[index]) {
            Object.assign(state.groupBy[index], updates)
          }
        }),

      // Sorting actions
      setSortBy: sortBy =>
        set(state => {
          state.sortBy = sortBy
        }),

      addSortField: config =>
        set(state => {
          state.sortBy.push({
            ...config,
            priority: state.sortBy.length,
          })
        }),

      removeSortField: index =>
        set(state => {
          state.sortBy.splice(index, 1)
          // Update priorities
          state.sortBy.forEach((sort, i) => {
            sort.priority = i
          })
        }),

      updateSortField: (index, updates) =>
        set(state => {
          if (state.sortBy[index]) {
            Object.assign(state.sortBy[index], updates)
          }
        }),

      // View actions
      setViewType: viewType =>
        set(state => {
          state.viewType = viewType
        }),

      toggleChart: chartType =>
        set(state => {
          const index = state.selectedCharts.indexOf(chartType)
          if (index === -1) {
            state.selectedCharts.push(chartType)
          } else {
            state.selectedCharts.splice(index, 1)
          }
        }),

      // Dashboard actions
      addDashboardWidget: widget =>
        set(state => {
          state.dashboardWidgets.push({
            ...widget,
            id: nanoid(),
          })
        }),

      updateDashboardWidget: (id, updates) =>
        set(state => {
          const index = state.dashboardWidgets.findIndex(w => w.id === id)
          if (index !== -1) {
            Object.assign(state.dashboardWidgets[index], updates)
          }
        }),

      removeDashboardWidget: id =>
        set(state => {
          state.dashboardWidgets = state.dashboardWidgets.filter(
            w => w.id !== id
          )
        }),

      setDashboardLayout: layout =>
        set(state => {
          state.dashboardLayout = layout
        }),

      // Date range actions
      setDateRange: range =>
        set(state => {
          state.dateRange = range
        }),

      // Helper methods
      getActiveFilters: () => get().filters,

      getActivePreset: () => {
        const state = get()
        return (
          state.filterPresets.find(p => p.id === state.activePresetId) || null
        )
      },

      hasActiveFilters: () => get().filters.length > 0,
    })),
    {
      name: 'mirubato-reporting',
      partialize: state => ({
        filterPresets: state.filterPresets,
        dashboardWidgets: state.dashboardWidgets,
        dashboardLayout: state.dashboardLayout,
        viewType: state.viewType,
        selectedCharts: state.selectedCharts,
      }),
    }
  )
)
