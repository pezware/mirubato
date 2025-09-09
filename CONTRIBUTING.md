# Contributing to Mirubato

Thanks for your interest in contributing! This guide explains how to propose changes to code and documentation, with a focus on keeping our specs accurate and useful.

## Getting Started

- Use `pnpm` and Node LTS. Run `pnpm install` in the repo root.
- Prefer small, focused PRs with clear motivation and scope.
- Link related issues and include screenshots/logs for UX or operational changes.

## Code Contributions

- Follow existing patterns and style; avoid large refactors in feature PRs.
- Add or update targeted tests where applicable.
- Include operational considerations (limits, failure modes) in PR descriptions.

## Documentation Contributions

- Use the spec template: `docs/specs/_template.md`
- Follow guidelines: `docs/specs/README.md` (Why over How, Code References, etc.)
- Status icons: ✅ Active, 🔄 Planned, ⚠️ Deprecated, 🚧 Experimental
- Date format: use `YYYY-MM-DD` in "Last updated" lines
- Keep code references stable; prefer file paths over large pasted blocks

### Suggested Sections per Spec

- What, Why, How
- Code References
- Operational Limits, Failure Modes
- Decisions, Non-Goals, Open Questions
- Security & Privacy Considerations (where relevant)

## Review Process

- PR checklist:
  - Accurate and current information
  - Clear scope and rationale
  - Cross-references added/updated
  - Build and basic checks pass
- At least one reviewer with domain context for `docs/specs/**` changes is recommended.

## Release Notes

- Update `CHANGELOG.md` where applicable.
- Keep `docs/specs/08-appendix/version-history.md` in sync at a high level.

## Community

- Be kind and constructive. Prefer collaboration and clarity over cleverness.

---

Last updated: 2025-09-09
