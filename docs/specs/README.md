# Mirubato Technical Specifications

This is the entry point for Mirubato’s technical specifications. It serves as an index only — details live in the linked documents.

## 01. Architecture

- System Overview: high-level architecture, design principles, and local ports
  - `01-architecture/overview.md`
- Cloudflare Services: Workers, D1, R2, KV, Queues, Durable Objects, AI, Browser
  - `01-architecture/cloudflare-services.md`
- Microservices: per-service responsibilities, bindings, endpoints, protocols
  - `01-architecture/microservices.md`
- Deployment: environments, CI/CD, rollback, operations workflows
  - `01-architecture/deployment.md`

## 02. Database

- Schema Design: tables per service and relationships
  - `02-database/schema.md`
- Migrations: strategy, per-service migrations, safety
  - `02-database/migrations.md`
- Sync Strategy: data model, conflict resolution, tokens
  - `02-database/sync-strategy.md`

## 03. API

- REST API: public endpoints and contracts
  - `03-api/rest-api.md`
- Authentication: JWT, magic link, Google OAuth
  - `03-api/authentication.md`
- WebSocket: real-time protocol and message types
  - `03-api/websocket.md`
- Service APIs: inter-service communication patterns
  - `03-api/service-apis.md`

## 04. Frontend

- Architecture: SPA structure, routing, modules
  - `04-frontend/architecture.md`
- State Management: Zustand stores, SWR patterns
  - `04-frontend/state-management.md`
- Components: patterns and composition
  - `04-frontend/components.md`
- UI Design System: tokens, typography, color
  - `04-frontend/ui-design-system.md`
- Layout Patterns and Responsive Design
  - `04-frontend/layout-patterns.md`
  - `04-frontend/responsive-design.md`

## 05. Features

- Logbook: practice tracking
  - `05-features/logbook.md`
- Scorebook: sheet music library and viewing
  - `05-features/scorebook.md`
- Repertoire: goals and progress
  - `05-features/repertoire.md`
- Analytics: reporting and insights
  - `05-features/analytics.md`
- Practice Tools: metronome, counters, theory
  - `05-features/practice-tools.md`
- Dictionary: music terms and multi-language content
  - `05-features/dictionary.md`

## 06. Integrations

- AI Services: Cloudflare AI and provider strategy
  - `06-integrations/ai-services.md`
- IMSLP: import and processing
  - `06-integrations/imslp.md`
- Third Party: Google OAuth, email, future providers
  - `06-integrations/third-party.md`

## 07. Operations

- Monitoring & Debugging: health, logs, tracing, runbooks
  - `07-operations/monitoring-debugging.md`
- Performance: optimization, caching, benchmarks
  - `07-operations/performance.md`

## 08. Appendix

- Version History: releases and changelog
  - `08-appendix/version-history.md`
- Roadmap: planned work
  - `08-appendix/roadmap.md`
- Glossary: terms and definitions
  - `08-appendix/glossary.md`

## Documentation Guidelines

These guidelines keep specs consistent, useful, and current.

- Core principles:
  - Focus on why over how; capture intent and trade‑offs
  - Prefer code references over code duplication
  - Document reality; clearly mark planned work

- Document structure (per spec):
  - What: one‑line purpose
  - Why: business + technical rationale
  - How: key patterns, integrations, data flow
  - Code References: paths to entries, configs, schemas
  - Operational Limits: concrete constraints and quotas
  - Failure Modes: common failures → mitigations

- Status indicators:
  - ✅ Active, 🔄 Planned, ⚠️ Deprecated, 🚧 Experimental

- Writing:
  - Be concise, specific, and practical
  - Avoid jargon; explain first use of terms
  - Reference function/class definitions; avoid large code blocks
  - Verify paths/line ranges when included; keep stable where possible

- Maintenance cadence:
  - Monthly: verify code references
  - Quarterly: remove outdated info
  - On deploy/refactor: update affected specs
  - Versioning: small focused commits; link to PRs

- Quality checklist (before merging):
  - Accuracy, completeness, clarity, currency, consistency
  - Cross‑references present; spelling/grammar checked

- Common pitfalls to avoid:
  - Copying large code blocks that drift from source
  - Documenting obvious behavior instead of decisions
  - Mixing plans with reality without status markers
  - Lacking background/context for non‑obvious choices
  - Using relative terms (“fast”) without numbers where relevant

## Contributing

- See repository guide: `../../CONTRIBUTING.md`

---

_Last updated: December 2024 | Version 1.7.6_
