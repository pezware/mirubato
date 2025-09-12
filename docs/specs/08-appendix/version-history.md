---
Spec-ID: SPEC-APP-001
Title: Version History
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# Version History

Status: ✅ Active

## What

Release history and version tracking for the Mirubato platform.

## Why

- Track feature evolution and breaking changes
- Document migration requirements
- Provide upgrade paths for deployments
- Maintain compatibility matrix

## How

Source of truth for releases is the repository changelog.

- Primary reference: `CHANGELOG.md` at the repo root
- Tag notes and PR links are captured in release descriptions

## Recent Releases

### Version 1.7.6 (Current)

- Real-time WebSocket sync implementation
- Unified version system across all services
- Typography system consolidation
- Specification documentation alignment

### Version 1.7.x Series

- Frontend v2 structure migration
- Sync worker service introduction
- API authentication hardening
- Performance optimizations

For full details and historical entries, see `CHANGELOG.md`.

## Versioning Strategy

- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **All services synchronized**: Single version across platform
- **Breaking changes**: Major version increment
- **Feature additions**: Minor version increment
- **Bug fixes**: Patch version increment

## Migration Notes

See individual service migration guides in their respective directories.

## Related Documentation

- Repository `CHANGELOG.md` - Complete release history
- Service migration guides - `*/MIGRATION.md`
- [Roadmap](./roadmap.md) - Future releases

---

Last updated: 2025-09-11 | Version 1.7.6
