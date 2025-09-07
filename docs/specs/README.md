# Mirubato Technical Specifications

Welcome to the Mirubato technical specifications. This documentation provides comprehensive details about the architecture, implementation, and features of the Mirubato music education platform.

## 📚 Documentation Structure

### [01. Architecture](./01-architecture/)

- [System Overview](./01-architecture/overview.md) - High-level architecture and design principles
- [Cloudflare Services](./01-architecture/cloudflare-services.md) - Edge computing infrastructure
- [Microservices](./01-architecture/microservices.md) - Service architecture and communication
- [Deployment](./01-architecture/deployment.md) - Deployment strategy and CI/CD

### [02. Database](./02-database/)

- [Schema Design](./02-database/schema.md) - Complete database schemas for all services
- [Migrations](./02-database/migrations.md) - Migration strategy and versioning
- [Sync Strategy](./02-database/sync-strategy.md) - Real-time sync and conflict resolution

### [03. API](./03-api/)

- [REST API](./03-api/rest-api.md) - Complete REST endpoint documentation
- [Authentication](./03-api/authentication.md) - Auth flows and security
- [WebSocket](./03-api/websocket.md) - Real-time communication protocol
- [Service APIs](./03-api/service-apis.md) - Inter-service communication

### [04. Frontend](./04-frontend/)

- [Architecture](./04-frontend/architecture.md) - React application structure
- [State Management](./04-frontend/state-management.md) - Zustand stores and data flow
- [Components](./04-frontend/components.md) - Component library and patterns
- [UI Design System](./04-frontend/ui-design-system.md) - Typography, colors, and Morandi aesthetic
- [Layout Patterns](./04-frontend/layout-patterns.md) - Responsive layouts and navigation
- [Responsive Design](./04-frontend/responsive-design.md) - Mobile-first approach

### [05. Features](./05-features/)

- [Logbook](./05-features/logbook.md) - Practice tracking and logging
- [Scorebook](./05-features/scorebook.md) - Sheet music library and management
- [Repertoire](./05-features/repertoire.md) - Repertoire tracking and goals
- [Analytics](./05-features/analytics.md) - Reporting and data visualization
- [Practice Tools](./05-features/practice-tools.md) - Metronome, Circle of Fifths, Counter
- [Dictionary](./05-features/dictionary.md) - Music terms and definitions

### [06. Integrations](./06-integrations/)

- [AI Services](./06-integrations/ai-services.md) - Cloudflare AI for metadata extraction and suggestions
- [IMSLP](./06-integrations/imslp.md) - Sheet music import from IMSLP library
- [Third Party](./06-integrations/third-party.md) - Google OAuth, Resend email, and future integrations

### [07. Operations](./07-operations/)

- [Monitoring & Debugging](./07-operations/monitoring-debugging.md) - Health checks, logging, and incident response
- [Performance](./07-operations/performance.md) - Optimization strategies and benchmarks

### [08. Appendix](./08-appendix/)

- [Version History](./08-appendix/version-history.md) - Release notes and changelog
- [Roadmap](./08-appendix/roadmap.md) - Future plans and upcoming features
- [Glossary](./08-appendix/glossary.md) - Terms and definitions

## 🚀 Quick Start

If you're new to Mirubato, start with:

1. [System Overview](./01-architecture/overview.md) - Understand the big picture
2. [REST API](./03-api/rest-api.md) - Explore the API endpoints
3. [Logbook Feature](./05-features/logbook.md) - Core practice tracking feature

## 🔧 For Developers

- **Backend Developers**: Start with [Microservices](./01-architecture/microservices.md) and [Service APIs](./03-api/service-apis.md)
- **Frontend Developers**: Check [Frontend Architecture](./04-frontend/architecture.md) and [State Management](./04-frontend/state-management.md)
- **DevOps**: See [Deployment](./01-architecture/deployment.md) and [Monitoring & Debugging](./07-operations/monitoring-debugging.md)

## 📊 Current Version

**Version**: 1.7.6 (December 2024)

- Real-time WebSocket synchronization
- Advanced analytics and reporting
- Unified typography system
- Enhanced mobile experience

## 🔄 Recent Updates (December 2024)

- **Complete Specifications**: Added comprehensive operations, integrations, and performance documentation
- **Third-Party Integrations**: Documented Google OAuth, Resend email service, and magic link authentication
- **Operations Excellence**: Added monitoring, debugging, and incident response procedures
- **Performance Optimization**: Detailed strategies for frontend bundle optimization and edge caching
- **WebSocket Sync**: Real-time synchronization using Cloudflare Durable Objects
- **Typography System**: Three-font system with Noto Serif, Inter, and Lexend

## 📝 Documentation Guidelines & Principles

### Core Principles

#### 1. Focus on "Why" Over "How"

- **Explain intent and rationale** behind architectural decisions
- **Document contracts** between services, not implementation details
- **Clarify trade-offs** made and alternatives considered
- **Provide context** for future maintainers to understand decisions

#### 2. Code References Over Code Duplication

- **Use precise file:line references** (e.g., `api/src/index.ts:278`)
- **Include function signatures only**, not full implementations
- **Link to actual code** instead of copying it into docs
- **Keep references updated** when code moves

#### 3. Reality Over Aspiration

- **Document what exists**, not what might be built
- **Mark planned features clearly** with 🔄 status badges
- **Remove or update** outdated information immediately
- **Verify against codebase** before documenting

### Documentation Structure

Each service/feature specification should follow this format:

```markdown
## [Service Name]

**What**: One-line description of purpose

**Why**:

- Business rationale
- Technical benefits
- Problem it solves

**How**:

- Key implementation patterns
- Integration points
- Data flow

**Code References**:

- `path/to/file:line` — Function/class signature
- `path/to/config:line` — Configuration

**Operational Limits**:

- Concrete numbers (CPU: 50ms, Memory: 128MB)
- Rate limits and quotas
- Scaling boundaries

**Failure Modes**:

- Common failures → Mitigation strategies
- Error handling patterns
- Fallback behaviors
```

### Writing Guidelines

#### Language & Tone

- **Be concise**: Every word should add value
- **Be specific**: Use numbers, not "fast" or "scalable"
- **Be practical**: Focus on what developers need to know
- **Avoid jargon**: Explain technical terms when first used

#### Code References

- **Always verify** line numbers before committing
- **Use stable references**: Reference class/function definitions, not usage
- **Include context**: Add function signature or class name
- **Update promptly**: When code moves, update references

Example:

```markdown
✅ GOOD: `api/src/utils/database.ts:12-16` — `class DatabaseHelpers`
❌ BAD: See database.ts for details
```

#### Status Indicators

Use clear status badges for features:

- ✅ **Active** - Fully implemented and in production
- 🔄 **Planned** - Designed but not yet implemented
- ⚠️ **Deprecated** - Being phased out
- 🚧 **Experimental** - In development, may change

#### Cross-References

Always link related documentation:

```markdown
## Related Documentation

- [Service Name](../path/to/doc.md) - Brief description
- [Feature Name](../path/to/doc.md) - How it relates
```

### Maintenance Guidelines

#### Regular Reviews

- **Monthly**: Verify code references still accurate
- **Quarterly**: Review for outdated information
- **On Deploy**: Update changed features immediately
- **On Refactor**: Update architectural changes

#### Version Control

- **Small, focused updates**: One topic per commit
- **Clear commit messages**: "docs: update X to reflect Y"
- **Link to PRs**: Reference implementation PRs in updates
- **Track changes**: Update version and date in footer

### Quality Checklist

Before committing documentation:

- [ ] **Accuracy**: All code references verified
- [ ] **Completeness**: What/Why/How/Code/Ops included
- [ ] **Clarity**: Would a new developer understand?
- [ ] **Currency**: Reflects current implementation
- [ ] **Consistency**: Follows these guidelines
- [ ] **Cross-refs**: Related docs linked
- [ ] **Corrections**: Spelling/grammar checked

### Common Pitfalls to Avoid

1. **Don't copy large code blocks** - They become outdated quickly
2. **Don't document obvious things** - Focus on non-obvious decisions
3. **Don't mix plans with reality** - Clearly separate current vs future
4. **Don't assume context** - Provide enough background
5. **Don't skip "why"** - It's the most important part
6. **Don't use relative terms** - "Fast" means nothing, "50ms p95" is clear
7. **Don't document workarounds as features** - Mark them as temporary

### Examples of Good Documentation

#### Good: Explains Why, References Code

```markdown
### Workers

**What**: Edge runtime environment for all Mirubato microservices.

**Why**:

- Sub-50ms global latency through 300+ edge locations
- Zero cold starts with V8 isolates
- Native integration with D1, KV, R2

**Code References**:

- `api/src/index.ts:278` — Main API export
- `api/wrangler.toml:92-96` — Rate limiter configuration
```

#### Bad: Too Much Code, No Context

```markdown
### Workers

Here's how we use Workers:

[500 lines of code]
```

## 📝 Contributing

When updating specifications:

1. **Verify first**: Check code references are accurate
2. **Explain why**: Document rationale, not just what
3. **Stay current**: Update docs when code changes
4. **Cross-reference**: Link related specifications
5. **Follow structure**: Use What/Why/How/Code/Ops format
6. **Be specific**: Use numbers and concrete examples
7. **Mark status**: Clearly indicate Active/Planned/Deprecated

## 🔗 Related Documentation

- [User Guide](../USER_GUIDE.md) - End-user documentation
- [API Reference](../API.md) - Quick API reference
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Development Setup](../../README.md) - Local development setup

---

_Last updated: December 2024 | Version 1.7.6_
