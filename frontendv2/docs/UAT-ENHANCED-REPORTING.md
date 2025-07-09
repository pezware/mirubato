# UAT Guide: Enhanced Reporting UI

## Overview

The Enhanced Reporting UI provides comprehensive data visualization and filtering for practice data. This guide helps testers validate the new features.

## Access

### Main Access (Within Logbook)

- **Production**: https://mirubato.com/logbook
- **Staging**: https://staging.mirubato.com/logbook
- **Local**: http://www-mirubato.localhost:4000/logbook

### Demo Mode (Development/Staging Only)

- **Staging**: https://staging.mirubato.com/reports-demo
- **Local**: http://www-mirubato.localhost:4000/reports-demo

The demo mode provides isolated access to the Enhanced Reporting UI for focused testing.

## Test Scenarios

### 1. Overview Tab Testing

#### Filters

- [ ] Date range picker works (select different date ranges)
- [ ] Duration filter applies correctly (e.g., 30-60 minutes)
- [ ] Piece/Composer autocomplete shows suggestions
- [ ] Instrument filter (Piano/Guitar) works
- [ ] Clear filters button resets all filters

#### Calendar Heatmap

- [ ] Shows practice intensity by color
- [ ] Navigate between months using arrows
- [ ] Navigate between years using dropdown
- [ ] Click on a date shows practice details
- [ ] Today is highlighted

#### Practice Trend Chart

- [ ] Line chart displays practice duration over time
- [ ] Toggle moving average on/off
- [ ] Add goal line (e.g., 60 minutes)
- [ ] Hover shows tooltips with duration
- [ ] Export chart as PNG works

#### Distribution Charts

- [ ] Pie chart shows practice distribution by piece
- [ ] Switch between pie and donut view
- [ ] Toggle percentage display
- [ ] Click legend items to hide/show segments

#### Comparative Charts

- [ ] Bar chart compares current vs previous period
- [ ] Shows change indicators (+/- minutes and percentage)
- [ ] Switch between bar and line view

### 2. Pieces Tab Testing

#### Piece Statistics

- [ ] Lists all practiced pieces
- [ ] Shows total duration per piece
- [ ] Displays practice count
- [ ] Last practiced date is correct
- [ ] Composer information displayed

#### Sorting & Filtering

- [ ] Sort by practice time (ascending/descending)
- [ ] Sort by last practiced date
- [ ] Filter by composer works
- [ ] Search for specific pieces

### 3. Data Export

- [ ] Export individual charts as PNG
- [ ] Charts include proper titles and legends
- [ ] Exported images are high quality

### 4. Responsiveness

#### Desktop (>1024px)

- [ ] All charts display side-by-side
- [ ] Filters are in sidebar layout
- [ ] Calendar shows full month view

#### Tablet (768px-1024px)

- [ ] Charts stack vertically
- [ ] Filters collapse to accordion
- [ ] Calendar remains usable

#### Mobile (<768px)

- [ ] Single column layout
- [ ] Charts are scrollable
- [ ] Touch interactions work
- [ ] Filters in collapsible menu

### 5. Performance

- [ ] Initial load time < 3 seconds
- [ ] Chart rendering is smooth
- [ ] Filtering updates < 500ms
- [ ] No memory leaks after extended use

### 6. Edge Cases

- [ ] No practice data: Shows empty state
- [ ] Single practice session: Charts render correctly
- [ ] 1000+ sessions: Performance remains good
- [ ] Invalid date ranges: Shows appropriate message

### 7. Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader announces chart data
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible

## Bug Reporting

When reporting issues, please include:

1. **Environment**: Production/Staging/Local
2. **Browser**: Chrome/Firefox/Safari/Edge + version
3. **Device**: Desktop/Tablet/Mobile
4. **Steps to reproduce**
5. **Expected behavior**
6. **Actual behavior**
7. **Screenshots** (if applicable)
8. **Console errors** (F12 → Console tab)

## Known Limitations

1. **Chart.js borderDash**: Some browsers may not render dashed lines perfectly
2. **Mobile tooltips**: Touch-and-hold required on some devices
3. **Export quality**: PNG export limited to screen resolution

## Test Data

For testing with sample data:

1. Create practice sessions with varied:
   - Durations (5-120 minutes)
   - Pieces (at least 10 different)
   - Instruments (Piano and Guitar)
   - Dates (spread over 3+ months)

2. Use the manual entry form in logbook to create test data quickly

## Success Criteria

- [ ] All charts render without errors
- [ ] Filtering works as expected
- [ ] Data is accurate and matches logbook entries
- [ ] Performance is acceptable on all devices
- [ ] No TypeScript or console errors
- [ ] Accessibility standards met

## Contact

Report issues to: [GitHub Issues](https://github.com/pezware/mirubato/issues)
