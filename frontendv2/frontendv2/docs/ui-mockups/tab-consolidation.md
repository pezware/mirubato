# Tab Consolidation Mockup (#262)

## Issue

Data Table and Analytics tabs serve advanced users and could be consolidated to simplify the UI for common users.

## Current Implementation

5 tabs: Overview | Add New Entry | Pieces | Data Table | Analytics

## Proposed Solution: Consolidate into "Advanced" Tab

### Before (Current)

```
┌─────────────────────────────────────────────────────────┐
│  📊 Overview | ➕ Add Entry | 🎵 Pieces | 📋 Data | 📈 Analytics │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    [Tab Content]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### After (Proposed)

```
┌─────────────────────────────────────────────────────────┐
│     📊 Overview | ➕ Add Entry | 🎵 Pieces | ⚙️ Advanced     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  View: [ Data Table ▼ ] │ Analytics             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│                 [Selected View Content]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Detailed Advanced Tab Design

```
┌─────────────────────────────────────────────────────────┐
│              ⚙️ Advanced Practice Insights              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  View Mode:  ● Data Table  ○ Analytics                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🔍 Search: [_____________]  📥 Export ▼         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Shared Filtering Controls]                           │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Date Range: [Last 30 days ▼]                    │  │
│  │ Pieces: [All ▼]  Composers: [All ▼]            │  │
│  │ ➕ Add Filter                                    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [View-Specific Content Area]                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  │  (Data Table OR Analytics View)                 │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Mobile View (Bottom Navigation)

```
┌─────────────┐
│   Mirubato  │
├─────────────┤
│             │
│   Content   │
│             │
├─────────────┤
│ 📊  ➕  🎵  ⚙️ │
└─────────────┘
```

### Benefits

1. **Simplified Navigation**
   - Reduced from 5 to 4 tabs
   - Cleaner interface for new users
   - Advanced features still accessible

2. **Shared Controls**
   - Unified filtering between views
   - Single export location
   - Consistent user experience

3. **Mobile Friendly**
   - 4 icons fit better on mobile
   - Less horizontal scrolling
   - Clear iconography

4. **Progressive Disclosure**
   - Basic users see simple interface
   - Power users can access advanced features
   - Learning curve reduced

### Implementation

```tsx
// ReportsTabs.tsx changes
const tabs = [
  {
    id: 'overview',
    label: t('reports:tabs.overview'),
    icon: <TrendingUp size={20} />,
  },
  {
    id: 'newEntry',
    label: t('reports:tabs.addEntry'), // Changed from "Add New Entry"
    icon: <Plus size={20} />,
  },
  {
    id: 'repertoire',
    label: t('reports:tabs.pieces'),
    icon: <Music size={20} />,
  },
  {
    id: 'advanced',
    label: t('reports:tabs.advanced'),
    icon: <Settings size={20} />, // New consolidated tab
  },
]

// AdvancedView.tsx - New component
function AdvancedView() {
  const [viewMode, setViewMode] = useState<'data' | 'analytics'>('data')

  return (
    <div>
      <ViewToggle mode={viewMode} onChange={setViewMode} />
      <SharedFilters />
      {viewMode === 'data' ? <DataTableView /> : <AnalyticsView />}
    </div>
  )
}
```

### Migration Path

1. **Phase 1**: Add new Advanced tab alongside existing tabs
2. **Phase 2**: Monitor usage patterns
3. **Phase 3**: Deprecate individual tabs
4. **Phase 4**: Remove old tabs after user adjustment

### User Communication

- In-app tooltip: "Data Table and Analytics have moved to Advanced!"
- Help documentation update
- Gradual transition with both options available initially

## Alternatives Considered

1. **Dropdown in Overview**: Too hidden
2. **Side navigation**: Breaks mobile pattern
3. **Keep all 5 tabs**: Cluttered on mobile

## Next Steps

1. Create working prototype
2. User testing with both layouts
3. Measure task completion times
4. Gather feedback on discoverability
