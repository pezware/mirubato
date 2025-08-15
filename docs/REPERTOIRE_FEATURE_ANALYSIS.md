# Repertoire Feature Analysis & Recommendations

## Executive Summary

After analyzing the current implementation and requirements, I recommend building the Repertoire system as an extension of the existing Logbook rather than a separate service. This approach leverages existing infrastructure, reduces complexity, and provides a more cohesive user experience.

## Features to Prioritize (High Value, Easy Implementation)

### 1. **Repertoire Status Tracking** ✅ MUST HAVE

- Transform Pieces tab into Repertoire view
- Add status badges (Planned, Learning, Working, Polished, Performance Ready)
- Leverage existing PiecesView component and data
- **Why**: Core feature that provides immediate value with minimal backend changes

### 2. **Goal Integration** ✅ MUST HAVE

- Activate existing unused goals infrastructure
- Link goals to specific pieces
- Track progress automatically via practice sessions
- **Why**: Database and types already exist, just needs frontend implementation

### 3. **Personal Notes & Links** ✅ MUST HAVE

- Add notes field to repertoire items
- Support markdown for rich formatting
- Allow reference links (YouTube, recordings, etc.)
- **Why**: Simple to implement, high user value

### 4. **Practice Time Analytics** ✅ MUST HAVE

- Show total time per piece (already tracked)
- Add time-based goal tracking
- Visualize practice patterns
- **Why**: Data already collected, just needs visualization

### 5. **Measure-Specific Practice Lists** ✅ SHOULD HAVE

- Create daily practice focus sections
- Track time per measure group
- Link to score viewing
- **Why**: Supports deliberate practice methodology

## Features to Implement Later (High Value, Complex)

### 1. **Basic PDF Annotations** 🔄 NICE TO HAVE

- Start with simple highlighting and text notes
- Use react-pdf-highlighter for MVP
- **Why**: Valuable but complex, can be added incrementally

### 2. **Advanced Drawing Tools** 🔄 FUTURE

- Pen, shapes, fingering annotations
- **Why**: Requires significant frontend work, not critical for MVP

### 3. **Collaborative Features** 🔄 FUTURE

- Teacher assignments and feedback
- Shared annotations
- **Why**: Requires new user roles and permissions system

## Features to Reconsider (Low ROI)

### 1. **Separate Goals Worker** ❌ NOT RECOMMENDED

- **Why**: Over-engineering for current needs
- **Alternative**: Use existing API with new endpoints

### 2. **Complex AI-Powered Goals** ❌ DEFER

- **Why**: Adds complexity without proven user need
- **Alternative**: Start with template-based goals

### 3. **Real-time Measure Tracking** ❌ DEFER

- **Why**: Requires audio analysis or manual input
- **Alternative**: Manual measure selection is sufficient

## Recommended Implementation Approach

### Phase 1: Core Repertoire (Week 1)

1. Extend existing Pieces tab with repertoire features
2. Add status tracking and personal notes
3. Implement basic goal creation/tracking
4. Reuse existing components and stores

### Phase 2: Enhanced Goals (Week 2)

1. Create goal templates for common scenarios
2. Add milestone tracking
3. Integrate with auto-logging for automatic progress
4. Add goal visualization components

### Phase 3: Basic Annotations (Week 3)

1. Implement highlighting on PDFs
2. Add text note overlays
3. Save annotations per user/score
4. Focus on measure selection for practice

### Phase 4: Polish & Launch (Week 4)

1. Add i18n translations
2. Mobile optimization
3. User testing and feedback
4. Performance optimization

## Technical Recommendations

### 1. **Database Changes** - Minimal

```sql
-- Only essential new tables
CREATE TABLE user_repertoire (minimal fields)
CREATE TABLE score_annotations (start simple)
-- Reuse existing goals table
```

### 2. **API Design** - RESTful Extensions

```typescript
// Extend existing API patterns
/api/repertoire - CRUD operations
/api/goals - Activate unused endpoints
/api/annotations - Start simple
```

### 3. **Frontend Architecture** - Incremental

- Extend PiecesView → RepertoireView
- Add new tabs to existing structure
- Reuse UI component library
- Leverage existing stores

### 4. **PDF Annotation Library**

- Start with `react-pdf-highlighter` (open source, lightweight)
- Only implement highlighting and text notes initially
- Defer complex drawing tools

## Risk Mitigation

1. **Complexity Creep**: Start minimal, add features based on user feedback
2. **Performance**: Lazy load annotation features
3. **Mobile Support**: Design mobile-first for annotations
4. **Data Migration**: Auto-create repertoire entries from existing practice data

## Success Metrics

- **Week 1**: 50% of users view repertoire tab
- **Week 2**: 30% create at least one goal
- **Week 4**: 20% add personal notes
- **Month 2**: 10% use annotation features

## Conclusion

The Repertoire feature should be built as an evolution of the existing Pieces tab, leveraging the current infrastructure. Focus on status tracking, goals, and notes first. Add annotations incrementally. This approach delivers value quickly while maintaining system simplicity.
