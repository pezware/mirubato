# Building Mirubato: A comprehensive guide to creating an open-source classical music practice platform

The landscape of digital music education reveals critical opportunities for Mirubato to establish itself as a premier open-source practice platform for piano and classical guitar students. Based on extensive research of successful platforms, technical libraries, and implementation patterns, this report provides a strategic roadmap for building an MVP that combines algorithmic exercise generation with curated repertoire, all within a modular architecture ready for future AI integration.


## Successful platforms reveal essential engagement patterns

Analysis of leading music education platforms uncovers a consistent formula for user adoption. **IMSLP's success stems from its massive content library of 736,000+ scores**, while interactive platforms like flowkey and Simply Piano excel through real-time audio recognition and gamification. MuseScore combines creation tools with community features, demonstrating the power of user-generated content.

The most engaging platforms share several core features:
- **Interactive learning with real-time feedback** using audio recognition technology
- **Gamification elements** including progress tracking, achievements, and level progression
- **Community features** that foster peer learning and content sharing
- **Personalized learning paths** that adapt to individual skill levels and goals
- **Bite-sized practice sessions** accommodating busy schedules with 5-minute workouts

For dedicated music students and amateurs, the research shows they value **comprehensive curricula with clear progression**, technical depth for serious skill development, and objective measurement tools. The key insight is balancing rigorous educational content with engaging user experiences.

## Technical architecture should prioritize VexFlow and music21

The technical landscape analysis reveals an optimal stack combining multiple open-source libraries. **For frontend notation rendering, VexFlow paired with OpenSheetMusicDisplay provides the best balance** of performance, features, and community support. VexFlow offers fast browser-native rendering with excellent documentation, while OSMD adds MusicXML support for standard notation files.

For backend music analysis and AI integration preparation, **music21 (Python) stands out as the comprehensive choice**. Despite its server-side processing requirements, music21's extensive corpus, advanced analysis capabilities, and natural fit with the Python ML ecosystem make it ideal for future AI features. The library's BSD-3-Clause license ensures commercial flexibility.

The recommended architecture follows a microservices pattern with:
- **Notation Rendering Service** (Node.js + VexFlow/OSMD)
- **Music Analysis Service** (Python + music21)
- **Content Management Service** for lessons and exercises
- **User Progress Service** for learning analytics
- **AI Integration Service** (future capability)

This decoupled approach enables independent scaling, technology diversity, and seamless addition of AI capabilities later.

## Exercise generation demands algorithmic sophistication

Research into practice systems reveals that **successful spaced repetition for music requires adapting traditional algorithms** like SM-2 to account for both massed practice within sessions and spaced practice between sessions. Music skills have different forgetting curves than factual knowledge, with physical muscle memory decaying at different rates.

The Open Sheet Music Education (OSME) project provides a proven pattern for **parameter-based exercise generation**. Their approach uses form-based parameter selection (key signature, time signature, clef, range, difficulty) feeding into algorithmic generation that creates MusicXML output. This model directly addresses Mirubato's priority for exercise generation functionality.

For implementation, the system should support:
- **Technical pattern generation** using rule-based systems for scales, arpeggios, and chord progressions
- **Sight-reading exercise creation** with customizable parameters and progressive difficulty
- **Hierarchical skill modeling** that breaks complex skills into component parts
- **Adaptive difficulty adjustment** based on student performance metrics

## Public domain content provides rich initial repertoire

The research identifies **IMSLP as the primary source for public domain classical music**, offering API access to its massive collection. The Mutopia Project adds 2,124 pieces in LilyPond format, while specialized collections like Open Goldberg Variations provide high-quality editions of specific works.

For curated repertoire, the research provides comprehensive lists organized by skill level:

**Piano progression** moves from Bach's Notebook for Anna Magdalena and Mozart's early pieces for beginners, through Two-Part Inventions and easier sonatas for intermediates, to the major works of Bach, Beethoven, and Chopin for advanced students.

**Classical guitar repertoire** follows a similar progression from Carulli and Sor studies for beginners, through Carcassi études for intermediates, to Villa-Lobos études and concert works for advanced players.

The platform should **prioritize high-value public domain collections** including complete Bach keyboard works, Mozart piano sonatas, progressive Beethoven sonatas, and the complete studies of Sor, Carcassi, and Aguado for guitar.

## Implementation roadmap balances ambition with pragmatism

Based on successful open-source projects like PracticeTime and music education platforms, the MVP development should follow a phased approach:

**Phase 1 (Months 1-3): Core Platform**
- Set up microservices infrastructure with Docker/Kubernetes
- Implement VexFlow-based notation rendering
- Create basic lesson management system
- Build user authentication and progress tracking
- Deploy simple exercise generation using OSME patterns

**Phase 2 (Months 4-6): Enhanced Features**
- Integrate OpenSheetMusicDisplay for MusicXML support
- Add ABC.js for educator content creation
- Implement spaced repetition algorithm for practice scheduling
- Develop practice session tracking with quality ratings
- Expand exercise generation with multiple instrument support

**Phase 3 (Months 7-9): Intelligence Layer**
- Integrate music21 for content analysis
- Implement adaptive difficulty adjustment
- Add performance analytics and progress visualization
- Create goal-setting and achievement systems
- Build community features for content sharing

The technology stack draws from proven implementations:
- **Frontend**: React + TypeScript + Tone.js (audio)
- **Backend**: Node.js/Express gateway with Python/FastAPI for analysis
- **Database**: PostgreSQL with music-specific schema
- **Infrastructure**: Docker containers with CI/CD via GitHub Actions

## Key strategic recommendations

**Focus initially on exercise generation** as the differentiating feature, using OSME's parameter-based approach to create unlimited practice material. This addresses the immediate need for structured practice content while the curated repertoire library grows.

**Implement a plugin architecture from the start** to ensure extensibility. Design notation display, exercise generation, and analysis features as modular plugins that can be enhanced or replaced without affecting the core system.

**Prioritize the practice tracking experience** with both quantitative metrics (time, tempo achievements) and qualitative ratings (session quality, perceived difficulty). Visual progress representations using heatmaps and progress graphs have proven essential for maintaining user engagement.

**Build for the community** by incorporating content sharing and collaborative features early. The success of MuseScore and IMSLP demonstrates that user-generated content can exponentially expand a platform's value.

**Prepare for AI integration** by choosing technologies and architectures that support machine learning workflows. The Python-based music21 analysis service provides a natural integration point for future AI capabilities in personalized learning and intelligent practice recommendations.

By combining proven patterns from successful platforms with modern open-source technologies, Mirubato can establish itself as the go-to practice platform for dedicated classical music students while maintaining the architectural flexibility to evolve with emerging AI capabilities.
