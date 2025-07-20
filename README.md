# mirubato

Open-source practice journal for musicians - track sessions, log progress, and analyze your musical journey.

![mirubato Screenshot](https://raw.githubusercontent.com/pezware/mirubato/main/frontendv2/public/mirubato-screenshot.jpg)

## Features

🎸 Multi-instrument support (guitar & piano) • 🎵 Real-time audio playback • 📱 Mobile-first design • 🎯 Practice logging & analytics • 🌐 Open source (MIT)

## Quick Start

**Prerequisites**: Install pnpm globally first: `npm install -g pnpm`

```bash
git clone https://github.com/pezware/mirubato.git
cd mirubato
pnpm install
pnpm run dev                    # Frontend: www-mirubato.localhost:4000
cd api && pnpm run dev          # API: api-mirubato.localhost:9797
cd ../scores && pnpm run dev    # Scores: scores-mirubato.localhost:9788
```

## Documentation

| Type            | Link                                                         | Description                       |
| --------------- | ------------------------------------------------------------ | --------------------------------- |
| **🔗 API Docs** | **[api.mirubato.com/docs](https://api.mirubato.com/docs)**   | **Complete REST API reference**   |
| 📖 Development  | [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)                 | Setup and deployment instructions |
| 🏗️ Architecture | [Design Docs](docs/DESIGN.md)                                | System design and architecture    |
| 📋 Debug        | [Debug Guide](docs/DEBUG.md)                                 | Debugging and troubleshooting     |
| 🎵 Scores API   | [scores.mirubato.com/docs](https://scores.mirubato.com/docs) | Sheet music and content API       |

## Technology Stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
**API**: REST, Hono, Cloudflare Workers, D1 (SQLite)
**Audio**: Tone.js, Web Audio API, VexFlow.js notation

## Educational Foundation

Based on proven pedagogical methods including the **"Keep Going Method"** from [_Sight-Reading for Guitar_](https://press.rebus.community/sightreadingforguitar/) by Chelsea Green (CC BY 4.0).

**Special thanks** to:

- Chelsea Green and Rebus Community for open-sourcing educational resources
- [The Mutopia Project](https://www.mutopiaproject.org/) for free sheet music with open licenses
- [IMSLP/Petrucci Music Library](https://imslp.org/) for public domain musical scores

## Project Info

|                   |                                                                    |
| ----------------- | ------------------------------------------------------------------ |
| **🌐 Website**    | [mirubato.com](https://mirubato.com)                               |
| **📚 API Docs**   | [api.mirubato.com/docs](https://api.mirubato.com/docs)             |
| **📝 Repository** | [github.com/pezware/mirubato](https://github.com/pezware/mirubato) |
| **🐛 Issues**     | [GitHub Issues](https://github.com/pezware/mirubato/issues)        |
| **👨‍💻 Contact**    | [@arbeitandy](https://x.com/arbeitandy)                            |
| **📄 License**    | MIT ([details](docs/LICENSE.md))                                   |
| **🚧 Status**     | v1.4.0 Released - Logbook MVP Complete (290+ tests passing)        |

---

Built with ❤️ for the open-source music education community
