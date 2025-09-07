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

## 📝 Contributing

When updating specifications:

1. Keep specs aligned with actual implementation
2. Update version history when features change
3. Cross-reference related specifications
4. Include code examples where helpful
5. Maintain consistent formatting

## 🔗 Related Documentation

- [User Guide](../USER_GUIDE.md) - End-user documentation
- [API Reference](../API.md) - Quick API reference
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Development Setup](../../README.md) - Local development setup

---

_Last updated: December 2024 | Version 1.7.6_
