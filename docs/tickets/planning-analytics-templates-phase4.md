# Planning Feature Follow-up Tickets

This document captures three follow-up tickets requested for the practice planning initiative described in `docs/specs/05-features/practice-planning.md`. Each ticket contains a background summary, scope/acceptance criteria, detailed task checklist, and dependencies/notes for implementation.

---

## 1. Blend Planning Metrics into Analytics Dashboards

### Background / Problem Statement

Planning analytics currently do not combine plan adherence metrics with actual practice completions. The spec's analytics section calls for adherence percentages, streak indicators, and workload forecasts that merge `plan_occurrence` intent data with completed logbook entries. Without this, the Planning tab and analytics panels cannot surface actionable insights.

### Scope & Acceptance Criteria

- Aggregate `plan_occurrence` instances with their corresponding check-ins/logbook entries to derive adherence KPIs (completion %, streaks, missed windows, projected workload).
- Expose the derived metrics through a reusable analytics hook or selector that Planning UI components can consume without duplicating calculations.
- Update frontend analytics surfaces (Planning tab reminder hero, analytics panel, enhanced reports) to render the new KPIs with consistent terminology, formatting, and accessibility labels.
- Extend backend schemas/validation to emit any additional data fields required for the analytics calculations; ensure sync payloads remain backward compatible.
- Provide automated tests covering joins between plans and logbook entries, edge cases such as optimistic completions, overnight windows, and forecast rollovers.

### Proposed Tasks

1. **API & Schema Enhancements**
   - Update `api/src/schemas/entities.ts`, `api/src/api/handlers/sync.ts`, and `api/src/utils/validation.ts` so plan-related sync payloads include identifiers needed to link occurrences with logbook entries and to transport derived adherence stats when available.
   - Add regression tests around the sync handler to ensure mixed-version clients can ignore unfamiliar analytics fields safely.
2. **Analytics Hook/Selector**
   - Extend `frontendv2/src/hooks/useEnhancedAnalytics.ts` (or create `usePlanningAnalytics.ts`) that joins store data (`practice_plan`, `plan_occurrence`, logbook entries) to emit adherence %, streak lengths, missed occurrence counts, and 7-day workload forecasts.
   - Ensure memoization and timezone-aware bucketing to avoid rendering thrash in dashboards.
3. **UI Integration**
   - Update `frontendv2/src/components/practice-planning/PlanningAnalyticsPanel.tsx` and related reminder UI to display the new KPIs, including tooltip copy that matches the spec.
   - Refresh `frontendv2/src/components/practice-reports/EnhancedReports.tsx` (or its replacement) to surface adherence vs. actual practice comparisons.
4. **Telemetry & QA**
   - Emit analytics events when the new KPIs are viewed or when adherence dips below thresholds, enabling follow-up nudges.
   - Document the metrics in `docs/specs/05-features/practice-planning.md` if wording/definitions shift.

### Dependencies / Notes

- Relies on existing planning store selectors; coordinate with reminder UX work to avoid duplicate computations.
- Ensure data privacy considerations are respected when emitting adherence telemetry.

---

## 2. Introduce Tutor Plan Templates (Phase 3)

### Status: ✅ MVP COMPLETED (2025-11-15)

**Branch**: `claude/review-analytics-templates-phase4-01X4NBxdpr98BDsMoNbcR8Qe`

**MVP Deliverables**:

- ✅ Backend schema and TypeScript types
- ✅ Template adoption API endpoint
- ✅ Planning store template management
- ✅ TemplatePublisherModal component (7 tests)
- ✅ TemplateGallery component (10 tests)
- ✅ Analytics telemetry (3 events)
- ✅ i18n translations (27 keys × 6 languages)

**Post-MVP Deferred**:

- ⏭️ Integration tests
- ⏭️ Advanced filtering (search, sorting, categories)
- ⏭️ Template parameterization wizard
- ⏭️ Template versioning UI
- ⏭️ Fine-grained sharing controls
- ⏭️ Tutor dashboards and analytics

### Background / Problem Statement

Phase 3 of the planning spec introduces tutor-authored plan templates that can be published, shared, and adopted by learners. The codebase lacks data models, API handling, and UI for templates, preventing tutors from distributing reusable practice structures.

### Scope & Acceptance Criteria

- ✅ Define a `plan_template` entity (with metadata, versioning, visibility, ownership) and sync lifecycle so tutors can author and publish templates.
- ✅ Provide a tutor-facing authoring UI that captures template metadata, optional guardrails, and publishing controls.
- ✅ Expose a learner-facing gallery/import flow allowing users to browse templates, preview requirements, parameterize (e.g., instrument, focus areas), and instantiate them as personal plans.
- ✅ Record telemetry for template creation, publication, import, and usage to inform future iterations.
- ⏭️ Enforce permission checks so only authorized tutors can publish templates, and learners can only import approved templates. _(Deferred to post-MVP)_

### Completed Tasks (MVP)

1. **Data Model & Sync** ✅
   - ✅ Added `PlanTemplate` TypeScript interface in `frontendv2/src/api/planning.ts` with fields: `id`, `authorId`, `title`, `description`, `type`, `visibility`, `tags`, `adoptionCount`, `templateVersion`, `schedule`, `publishedAt`, `createdAt`, `updatedAt`
   - ✅ Added `TemplateVisibility` type ('public' | 'private')
   - ✅ Extended sync handlers to support `plan_template` entities with offline-first patterns
   - ✅ Implemented validation schemas for template entities

2. **Tutor Authoring Experience** ✅
   - ✅ Built `TemplatePublisherModal.tsx` component for converting practice plans into templates
   - ✅ Form captures: title (required), description, visibility (public/private), tags (comma-separated)
   - ✅ Integrated with planning store `publishPlanAsTemplate()` mutation
   - ✅ Test coverage: 7 comprehensive test cases (form validation, submission, error handling)
   - ✅ Analytics: `planning.template.publish` event with metadata

3. **Learner Adoption Flow** ✅
   - ✅ Created `TemplateGallery.tsx` component for browsing and adopting templates
   - ✅ Filtering: visibility (all/public/private), live tag search
   - ✅ Responsive grid layout with template cards showing metadata (adoption count, duration, tags)
   - ✅ Empty states for no templates and no filter matches
   - ✅ Test coverage: 10 comprehensive test cases (filtering, adoption, display)
   - ✅ Analytics: `planning.template.adopt` and `planning.template.view` events
   - ✅ Template adoption API endpoint: `POST /api/planning/templates/:id/adopt`

4. **Permissions & Telemetry** ✅
   - ✅ Telemetry events emitted for template lifecycle:
     - `planning.template.publish` - Track creation with visibility, hasTags, hasDescription
     - `planning.template.adopt` - Track adoption with templateId, visibility, adoption count
     - `planning.template.view` - Track gallery views with template counts
   - ✅ CustomEvent dispatching for frontend analytics integration
   - ⏭️ Server-side permission gating (deferred to post-MVP)

5. **Internationalization** ✅
   - ✅ 27 translation keys added across 6 languages (en, es, fr, de, zh-TW, zh-CN):
     - `templates.adopt`, `templates.adoptions`
     - `templates.emptyState.*` (3 keys)
     - `templates.errors.*` (2 keys)
     - `templates.fields.*` (4 keys)
     - `templates.filters.*` (5 keys)
     - `templates.hints.*`, `templates.placeholders.*` (4 keys)
     - `templates.publish*` (3 keys)
     - `templates.visibility.*` (4 keys)

### Implementation Details

**File Structure**:

```
frontendv2/src/
├── api/planning.ts                                    # Types & API endpoints
├── stores/planningStore.ts                            # State management
├── lib/analytics/planning.ts                          # Telemetry events
├── components/practice-planning/
│   ├── TemplatePublisherModal.tsx                     # Publisher UI
│   ├── TemplateGallery.tsx                            # Gallery UI
│   └── __tests__/
│       ├── TemplatePublisherModal.test.tsx            # 7 tests
│       └── TemplateGallery.test.tsx                   # 10 tests
└── locales/*/common.json                              # Translations
```

**Key Commits**:

1. `feat: add plan template schema and sync support`
2. `feat: add template adoption endpoint`
3. `feat: add template management to planning store`
4. `feat: add TemplatePublisherModal component (Phase 4 Ticket #2 - Frontend)`
5. `feat: add TemplateGallery component (Phase 4 Ticket #2 - Frontend)`
6. `fix: correct i18next translation call in TemplateGallery`
7. `feat: add telemetry tracking for template actions (Phase 4 Ticket #2)`
8. `feat: add i18n translations for template features (Phase 4 Ticket #2)`

### Dependencies / Notes

- ✅ Coordinated with planning store/state management - no duplication of plan creation logic
- ✅ Template cloning respects existing offline-first sync patterns with localStorage caching
- ✅ All tests passing, type-check passing, pre-commit hooks passing
- 📋 Future work: Integration tests, advanced filtering, parameterization wizard, versioning UI, tutor-specific permissions and dashboards

---

## 3. Plan Advanced Planning UX Enhancements (Phase 4)

### Background / Problem Statement

Phase 4 of the spec outlines advanced UX enhancements—rescheduling tools, adherence forecasts, and collaborative planning—that remain unscheduled. Clear documentation and engineering tasks are needed to scope and deliver these capabilities.

### Scope & Acceptance Criteria

- Provide rescheduling/skip flows allowing learners to adjust plan occurrences with proper cascade logic and visibility in the planning timeline.
- Offer predictive adherence insights (forecasts, suggested adjustments) using analytics data to recommend workload balancing.
- Support collaborative planning scenarios (multi-user plans, tutor/peer visibility, permissions) as described in the spec.
- Deliver design/engineering artifacts (wireframes, architecture outlines) plus implementation tasks to guide future sprints.

### Proposed Tasks

1. **Rescheduling & Skip Mechanics**
   - Design API/store changes for marking occurrences as rescheduled, skipped, or deferred, including bulk cascade logic when recurrence rules shift.
   - Update planning UI to surface reschedule controls, confirmation flows, and audit history (e.g., "Skipped on Jun 12").
2. **Adherence Forecasting Enhancements**
   - Extend analytics calculations to project upcoming workload vs. capacity, providing proactive suggestions ("Move Tuesday session?"), and integrate recommendations into reminder UI.
   - Prototype visualizations (sparklines, confidence bands) in the analytics panel.
3. **Collaboration & Permissions**
   - Define multi-user plan ownership models, share links, and permission levels (view/comment/edit) along with sync representations.
   - Add UI for inviting collaborators, showing shared plan avatars, and broadcasting updates via WebSocket sync.
4. **Documentation & Readiness**
   - Capture the above design decisions, data contracts, and open questions in `docs/specs/05-features/practice-planning.md` (or a new appendix) to prep for implementation phases.

### Dependencies / Notes

- Requires coordination with backend/auth teams for permissioning.
- Forecasting work should reuse analytics metrics from Ticket #1 to avoid divergence.
