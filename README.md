# mirubato

Open-source sight-reading platform for classical guitar and piano, featuring real-time audio playback and progressive exercises.

![mirubato Screenshot](https://github.com/pezware/mirubato/blob/main/frontend/public/mirubato-screenshot.jpg)

## Features

- 🎸 **Multi-instrument support** - Classical guitar and piano
- 🎵 **Real-time audio** - High-quality samples with Tone.js
- 📱 **Mobile-first** - Practice on any device
- 🎯 **Progressive learning** - Adaptive difficulty system
- 🌐 **Open source** - MIT licensed with open educational resources

## Project Structure

```
mirubato/
├── frontend/          # React frontend with Vite
├── backend/           # GraphQL API on Cloudflare Workers
├── docs/              # Documentation
└── package.json       # Monorepo configuration
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/pezware/mirubato.git
cd mirubato

# Install dependencies
npm install  # See INSTALL_ISSUES.md if you encounter errors

# Start development servers
npm run dev          # Frontend (http://localhost:3000)
npm run dev:backend  # Backend (http://localhost:8787)

# Run tests
npm test

# Build for production
npm run build
```

## Documentation

- 📖 **[Development Guide](docs/DEVELOPMENT.md)** - Setup, development, and deployment
- 🛠️ **[Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md)** - Code standards and best practices
- 🏗️ **[System Design](docs/SYSTEM_DESIGN.md)** - Architecture and database schema
- 📋 **[Roadmap](docs/ROADMAP.md)** - Development phases and progress

## Technology Stack

| Component | Technology                                 |
| --------- | ------------------------------------------ |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS   |
| Backend   | GraphQL, Apollo Server, Cloudflare Workers |
| Database  | Cloudflare D1 (SQLite)                     |
| Audio     | Tone.js, Web Audio API                     |
| Notation  | VexFlow.js                                 |
| Auth      | Magic links with JWT                       |

## Contributing

We welcome contributions from developers, music educators, and musicians! Please read our [Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md) before submitting a PR.

### Areas for Contribution

- 🎨 **UI/UX** - Design improvements and accessibility
- 🎼 **Content** - Sheet music and exercises
- 🧪 **Testing** - Unit and integration tests
- 📚 **Documentation** - Tutorials and guides
- 🌍 **Localization** - Translations

## Educational Foundation

mirubato integrates proven pedagogical methods:

- **"Keep Going Method"** - Continuous reading without stopping
- **Progressive difficulty** - Gradual skill development
- **Multi-sensory learning** - Visual notation with audio feedback

Educational content sources:

- [_Sight-Reading for Guitar: The Keep Going Method_](https://press.rebus.community/sightreadingforguitar/) by Chelsea Green (CC BY 4.0)
- IMSLP public domain classical repertoire

### Special Thanks

We extend our heartfelt gratitude to:

- **Chelsea Green** - Author of _Sight-Reading for Guitar: The Keep Going Method_
- **Rebus Community** - For open-sourcing this invaluable educational resource

Their commitment to open education makes projects like mirubato possible, helping democratize music education worldwide.

## License

MIT License - see [LICENSE](docs/LICENSE.md)

Educational content is licensed under CC BY 4.0 with proper attribution.

## Status

🚧 **Phase 1: Foundation** (Current)

✅ Completed:

- Monorepo structure with frontend/backend separation
- GraphQL backend with authentication
- Landing page with interactive piano
- Music player with tempo control

🔄 In Progress:

- Apollo Client integration
- User authentication UI
- Sheet music service

See [Roadmap](docs/ROADMAP.md) for detailed progress.

## Links

- **Live Demo**: Coming soon at [mirubato.com](https://mirubato.com)
- **Repository**: [github.com/pezware/mirubato](https://github.com/pezware/mirubato)
- **Issues**: [GitHub Issues](https://github.com/pezware/mirubato/issues)

---

Built with ❤️ for the open-source music education community
