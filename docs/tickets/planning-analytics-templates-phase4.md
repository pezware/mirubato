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

### Background / Problem Statement

Phase 3 of the planning spec introduces tutor-authored plan templates that can be published, shared, and adopted by learners. The codebase lacks data models, API handling, and UI for templates, preventing tutors from distributing reusable practice structures.

### Scope & Acceptance Criteria

- Define a `plan_template` entity (with metadata, versioning, visibility, ownership) and sync lifecycle so tutors can author and publish templates.
- Provide a tutor-facing authoring UI that captures template metadata, optional guardrails, and publishing controls.
- Expose a learner-facing gallery/import flow allowing users to browse templates, preview requirements, parameterize (e.g., instrument, focus areas), and instantiate them as personal plans.
- Record telemetry for template creation, publication, import, and usage to inform future iterations.
- Enforce permission checks so only authorized tutors can publish templates, and learners can only import approved templates.

### Proposed Tasks

1. **Data Model & Sync**
   - Add `plan_template` tables/migrations (or D1 KV entries) capturing fields such as `templateId`, `ownerTutorId`, `title`, `description`, `segments`, `recurrence`, `visibility`, `version`, `createdAt`, `updatedAt`.
   - Extend API schemas and sync handlers to read/write template entities and include them in `/api/sync` diffs with appropriate access control.
2. **Tutor Authoring Experience**
   - Build `frontendv2/src/components/practice-planning/templates/TemplatePublisherModal.tsx` (or similar) for tutors to define templates, set default recurrence, add guidance copy, and publish/unpublish versions.
   - Integrate with planning store mutations so publishing generates corresponding sync operations.
3. **Learner Adoption Flow**
   - Create `TemplateGallery` and `TemplateImportWizard` surfaces that list available templates, display preview metadata, and let learners customize parameters before cloning into their plan list.
   - Ensure cloning process maps template segments/occurrences into user-specific plan entities with proper IDs and analytics events.
4. **Permissions & Telemetry**
   - Gate publishing actions behind tutor roles; add server-side validation and UI affordances for restricted users.
   - Emit telemetry for template lifecycle events (create, update, publish, import) to feed analytics dashboards.

### Dependencies / Notes

- Coordinate with planning store/state management updates to avoid duplication of plan creation logic.
- Template cloning should respect existing offline-first sync patterns.

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
