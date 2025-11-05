---
Spec-ID: SPEC-PLN-001
Title: Practice Planning & Goal Schedules
Status: 🔄 Planned
Owner: @codex
Last-Reviewed: 2025-03-17
Version: 1.7.6
---

# Practice Planning & Goal Schedules

Status: 🔄 Planned

## What

Introduce structured planning layers on top of the existing logbook so musicians can schedule, manage, and complete future practice sessions (recurring or one-off) while preserving compatibility with today’s logging workflows.

## Why

- **User value**: Musicians want guided curricula (e.g., “24-Day Guitar Bootcamp”, “Master Chopin in 2 Years”) that combine reminders, sequencing, and completion tracking without losing current logging fidelity.
- **Roadmap fit**: Planning unlocks planned tutor content, shared plans, and richer analytics while reusing the logbook as the authoritative record of what actually happened.
- **Technical leverage**: The existing sync + offline caches for `logbook_entry` and goals can be extended to handle future-oriented “plan instances” with minimal disruption.

## How

### Implementation Phases

1. **Phase 1 – Planning Backbone**
   - Extend sync schemas and enums to accept a new `practice_plan` entity plus embedded or child `plan_occurrence` objects.
   - Create a dedicated planning store (Zustand) with local-storage caching, optimistic mutations, and reuse of `/api/sync` for persistence.
   - Ship a read-only “Planning” tab in the logbook that lists upcoming sessions, grouped by plan and occurrence state.
   - Ensure legacy clients ignore unknown entity types without breaking current logbook flows.

2. **Phase 2 – Authoring & Completion**
   - Add UI affordances to create single-session plans and recurring rules (daily, weekly, custom RRULE) with optional flexible windows.
   - Support “check off” that converts an occurrence into a `logbook_entry`, linking both records (stored as `source.planId` + `planOccurrenceId`).
   - Model rich occurrence content (multiple slots such as “morning” / “evening”, suggested tempos, textual guidance, reflection prompts) and prefill the log entry form with those details.
   - Capture a lightweight “check-in” before or after logging to track self-reported metrics (e.g., max clean tempo, tension hotspots) that feed future review screens.
   - Provide reminders/badges inside the logbook overview to surface due or overdue sessions.

3. **Phase 3 – Tutor Templates & Sharing**
   - Define `plan_template` entities that tutors can publish and learners can adopt, including metadata (instrument, level, duration, tags).
   - Implement plan cloning / parameterization (e.g., select pieces or instrumentation during import).
   - Add sharing controls, ownership metadata, and future hooks for tutor dashboards.

4. **Phase 4 – Advanced UX Enhancements**
   - Integrate planning data into analytics (forecasts, adherence metrics).
   - Allow plan adjustments (skip, reschedule, auto-cascade).
   - Enable collaborative plans (multiple participants) pending sync/permission upgrades.

### Data Model

| Entity                    | Key Fields                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `practice_plan`           | `id`, `title`, `description`, `type` (`bootcamp`, `course`, `custom`), `focusAreas[]`, `techniques[]`, `pieceRefs[]` (`scoreId`, `title`, `composer`), `schedule` (definition), `ownerId`, `visibility` (`private`, `shared`, `template`), `status` (`active`, `archived`), `createdAt`, `updatedAt` | Lives in `sync_data`, versioned like logbook entries.                                                                                       |
| `plan_occurrence`         | `id`, `planId`, `scheduledStart`, `scheduledEnd`, `flexWindow` (`daily`, `weekly`, custom range), `recurrenceKey`, `segments[]`, `targets`, `reflectionPrompts[]`, `status` (`scheduled`, `completed`, `skipped`, `expired`), `logEntryId`, `checkIn`, `notes`, `reminderState`, `metrics` | Either nested under `practice_plan.occurrences[]` for near-term windows or stored as separate sync entities for easier incremental updates. |
| `plan_template` (Phase 3) | Same as plan, plus `templateVersion`, `authorId`, `tags`, `estimatedDurationDays`, `publisherMetadata`                                                                                                                                                                                               | Only available once tutor tooling is enabled.                                                                                               |

**Schedule definition** (JSON):

```json
{
  "kind": "recurring",
  "rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  "durationMinutes": 45,
  "timeOfDay": "18:00",
  "flexibility": "same-day",
  "startDate": "2025-04-01",
  "endDate": "2025-06-30"
}
```

Single sessions use `{"kind":"single","target":"2025-04-12T10:00:00Z","durationMinutes":30}`.

**Occurrence content**:

```json
{
  "id": "occ_2025-04-02_morning",
  "scheduledStart": "2025-04-02T07:00:00-05:00",
  "scheduledEnd": "2025-04-02T07:15:00-05:00",
  "segments": [
    {
      "label": "Morning Focus",
      "durationMinutes": 7,
      "pieceRefs": [
        { "scoreId": "score_c_major_warmup", "title": "C Major Scale", "composer": null }
      ],
      "techniques": ["slow mapping"],
      "instructions": "Play open position slowly at ♩=60. Eyes closed on second pass."
    },
    {
      "label": "Evening Variation",
      "durationMinutes": 8,
      "techniques": ["triplet grouping", "burst"],
      "instructions": "Alternate dotted-eighth/sixteenth and triplet groupings at ♩=70–80."
    }
  ],
  "targets": {
    "tempo": {
      "metric": "cleanTempoBpm",
      "morning": 70,
      "evening": 85
    }
  },
  "reflectionPrompts": [
    "Where did tension appear first during burst practice?",
    "Which 4-note group felt least secure?"
  ],
  "metrics": {
    "ceilingTempo": null,
    "problemAreas": []
  }
}
```

### Integrations & Dependencies

- **Sync pipeline**: Update `schemas.syncChanges` and `DatabaseHelpers.getSyncData` to accept new entity types while maintaining backwards compatibility (`api/src/utils/validation.ts`, `api/src/api/handlers/sync.ts`).
- **Zustand stores**: New `usePlanningStore` mirrors `useLogbookStore` patterns for caching, syncing, and WebSocket updates (`frontendv2/src/stores`).
- **ManualEntryForm**: Teach the dialog to accept a `planOccurrenceId`, prefill segment details (pieces, tempo targets, prompts), and collect post-session check-in metrics (`frontendv2/src/components/ManualEntryForm.tsx`).
- **WebSocket sync**: Add event types like `PLAN_CREATED`, `PLAN_UPDATED`, `PLAN_OCCURRENCE_COMPLETED` to maintain parity with live updates (`frontendv2/src/services/webSocketSync.ts`).
- **Analytics**: Extend reporting hooks so planned targets and recorded metrics align for future review dashboards (`frontendv2/src/components/practice-reports`).

## Code References

- `frontendv2/src/stores/logbookStore.ts`
- `frontendv2/src/components/practice-reports/EnhancedReports.tsx`
- `frontendv2/src/components/ManualEntryForm.tsx`
- `frontendv2/src/services/webSocketSync.ts`
- `api/src/api/handlers/sync.ts`
- `api/src/utils/validation.ts`
- `api/src/schemas/entities.ts`

## Operational Limits

- Max active plans per user (initially 50) to control sync payload sizes.
- Occurrence generation horizon capped (e.g., 90 days forward) and performed incrementally to avoid large JSON blobs.
- Reminder polling limited to client-side timers; server-side push deferred until queues/notifications are in place.
- Per-occurrence segment payloads capped at ~10 segments and 5 prompts to keep sync payloads lightweight.

## Failure Modes

- **Sync conflicts**: Competing updates on occurrences resolved by timestamp + checksum, fallback to conflict notification similar to logbook entries.
- **Offline planning edits**: Ensure local storage queue handles new entity types; unrecognized payloads must fail gracefully.
- **Recurrence drift**: Invalid RRULEs or timezone changes could misplace occurrences; guard with validation + canonicalization at creation time.

## Decisions

- Reuse `sync_data` rather than stand up new tables to benefit from existing conflict handling.
- Model occurrences as first-class IDs so completion and rescheduling stay immutable/audit-friendly.
- Tie plan completion to logbook entries instead of duplicating recorded metrics.
- Record qualitative check-ins alongside the log entry metadata, avoiding a separate persistence surface.

## Non-Goals

- Push notifications, SMS/email reminders (needs future notification infra).
- Collaborative editing and tutor dashboards (future scope).
- Auto-generated AI practice suggestions (separate initiative).

## Open Questions

- Should occurrences be nested under plans or stored as sibling entities for better diffing?
- How far into the future should the client pre-generate occurrences versus lazy creation?
- Do we need plan-level permissions beyond private/shared before tutor features ship?
- What structure should check-in metrics follow so analytics can aggregate (per occurrence vs. per segment)?
- How do we version rich instructional content (tempo charts, tablature snippets) to avoid blowing up sync diffs?

## Security & Privacy Considerations

- Plans share the same authentication model as logbook entries—no new scopes required.
- Tutor templates introduce multi-tenant data; enforce ownership and avoid leaking private notes when cloning.
- Reminders must avoid exposing schedule data in logs; sanitize telemetry.

## Related Documentation

- `docs/specs/05-features/logbook.md`
- `docs/specs/05-features/practice-tools.md`
- `docs/specs/04-frontend/state-management.md` (for Zustand patterns, if available)
- `docs/specs/03-api/sync.md` (sync pipeline reference)

---

Last updated: 2025-03-17 | Version 1.7.6
