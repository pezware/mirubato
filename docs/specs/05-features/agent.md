# Mirubato Music Agent – Architecture & Strategy Proposal

## 1. Goal: “Conservatory Professor” Music Agent

**Vision:**
Turn mirubato into a _music-native AI layer_ that feels like a conservatory professor who:

- Understands **practice**, not just theory
- Knows different **instruments** (guitar, piano, etc.)
- Can **listen** and **watch** your playing
- Can interact with **music tools** (Tone.js, Strudel, OCR, DAW-like environments)
  We’ll treat the general LLM as a _reasoning core_, and surround it with **music-specific perception + tools + pedagogy**.

---

## 2. High-Level Architecture

Think in **four layers**:

1. **Interface Layer** – where the user interacts
2. **Music Agent Orchestrator** – domain logic, tool routing
3. **Music Tools & Perception Services** – audio/video/sheet processing, Tone.js/Strudel integration
4. **Foundation Models & Infra** – general LLMs + hosting (Cloudflare / GCP)

### 2.1 Interface Layer

Surfaces:

- Web app (mirubato.com) chat + “practice companion” view
- “Analyze this session” panel tied to practice logs
- Teacher-facing tools (view student’s agent summaries)
- Future: API/SDK endpoints for third-party apps
  Responsibilities:
- Manage user sessions, auth, permissions
- Stream responses (tokens + UI events)
- Upload & manage audio/video/sheet files

---

### 2.2 Music Agent Orchestrator

Core idea: **one Music Agent per user/piece/lesson** that:

- Receives: prompts + context (practice history, current goals, files)
- Chooses tools: which music tools to call (analysis, OCR, generation)
- Interprets outputs: converts low-level signals into pedagogy-friendly feedback
- Talks with an LLM: to generate explanations, plans, encouragement, etc.
  Rough flow (simplified):

1. User asks: “How can I improve this Bach prelude? Here’s my recording.”
2. Agent:

- Stores the audio
- Calls `analyze_audio_performance`
- Turns the numeric / symbolic output into structured music feedback
- Calls LLM with:
- user goals
- session history
- analysis results

3. LLM returns a _teaching-level_ answer.
4. Agent transforms that into:

- A **narrative explanation**
- A **structured practice plan** object
- Optional **Tone.js/Strudel snippets** to demonstrate ideas
  The orchestrator itself is just **deterministic TypeScript/Python logic** that:
- Manages tools
- Prepares prompts
- Validates tool outputs
- Handles safety and constraints

---

### 2.3 Music Tools & Perception Services

This is where your _music-specific value_ lives.

#### 2.3.1 Practice & Planning Tools

Examples:

- `summarize_practice_history(user_id, piece_id)`
- `generate_practice_plan(history, constraints, goals)`
- `detect_plateau(history)` – flags when user is stuck
- `skill_profile(user_id)` – technique vs repertoire vs theory
  These tools operate on **Mirubato’s structured data** (sessions, logs, metadata).

#### 2.3.2 Audio Analysis Tools

You probably don’t want the LLM to consume raw audio directly; instead:

- Use specialized models/services to extract **structured features**:
- Onset/timing
- Tempo curves
- Pitch accuracy/intonation
- Dynamics envelope
- Error density per bar/section
  Then expose tools like:
- `analyze_audio_performance(audio_id, score_reference?) → { timing, accuracy, dynamics, comments }`
- `compute_tempo_map(audio_id) → { bar: tempo }`
- `segment_practice(audio_id) → [sections with difficulty / issues]`
  Later, when multimodal LLMs (audio+video) are cheap enough, you can:
- Send **both** the raw audio snippet **and** the extracted features, and let the LLM combine them.
  But the structured representation will be a long-term asset.

#### 2.3.3 Video / Posture Analysis Tools

For instruments where posture matters:

- `analyze_posture(video_id, instrument) → posture_issues`
- Camera angle checks
- Right/left hand position markers
- Large-scale movement patterns
  Again: use a separate CV model → output symbolic feedback → LLM turns that into teaching advice.

#### 2.3.4 Sheet Music OCR & Symbolic Tools

Use OCR / OMR tools to convert images/PDFs → MusicXML / MIDI / other symbolic formats.

- `ocr_sheet_to_musicxml(file_id)`
- `analyze_score_difficulty(musicxml, instrument, player_level)`
- `suggest_fingering(musicxml_segment, instrument)`

### 2.3.5 Tone.js & Strudel Integration

- **Tone.js** is a Web Audio framework for creating interactive music in the browser; it gives you instruments, effects, and a timeline/transport like a DAW.
- **Strudel** is a JavaScript live-coding environment and a port of TidalCycles for algorithmic music in the browser. It’s great for pattern-based, generative, and educational music.
  Expose tools like:
- `generate_tone_js_example(concept) → { code, description }`
- e.g. demonstrate swing vs straight with short Tone.js examples
- `generate_strudel_pattern(style, tempo, complexity) → code`
- e.g. “give me a Strudel pattern that matches this groove”
- `explain_strudel_code(code) → teaching_explanation`
  The LLM can _generate_ code for Tone.js/Strudel; your infrastructure just needs to:
- Provide a safe sandbox in the browser to run Tone.js/Strudel
- Optionally record or visualize the pattern

---

### 2.4 Foundation Models & Infra

You have two good options:

#### Option A – Cloudflare-first Orchestration

Use **Cloudflare Agents/Workers AI** for the LLM + edge agent logic:

- Cloudflare Workers AI gives you serverless model hosting and model routing.
- Cloudflare Agents SDK lets agents call multiple providers (OpenAI, Anthropic, Gemini) via AI Gateway.
  Strengths:
- Low-latency global edge for chat-style interactions
- Simple scaling
- Easy integration with Cloudflare KV / D1 / R2 for lightweight data
  Limitations:
- Heavy audio/video processing may be harder to run purely at the edge.
- For CPU/GPU-intensive models (e.g., advanced audio feature extraction), you probably want GCP.

#### Option B – Hybrid: Cloudflare + GCP (recommended)

**Split responsibilities:**

- **Cloudflare**:
- Front-door chat agent + streaming
- Routing to different tools/LLMs
- **GCP (Vertex AI + Cloud Run/GKE)**:
- Heavy models (audio analysis, CV, OMR/score OCR)
- Persistent music data & analytics
- Vertex general multimodal agents/models for advanced reasoning, if needed
  The Cloudflare agent calls your GCP services via HTTP; Vertex models can also be one of the LLM providers used under the hood.
  This gives you:
- Edge performance for conversational UX
- Strong infra for heavy ML workloads
- Flexibility to mix models (Anthropic/OpenAI via Cloudflare, plus Vertex)

---

## 3. Multi-Format Plan (Text + Audio + Video + Score)

Design from the start for **multi-modal workflows**, even before you implement all of them.

### 3.1 Unified Session Object

Define an internal `MusicSessionContext`:

```json
{
  "user_id": "...",
  "instrument": "classical_guitar",
  "piece": {
    "title": "BWV 1007 Prelude",
    "composer": "Bach",
    "source_type": "sheet_scan|musicxml|midi",
    "score_id": "..."
  },
  "practice_session": {
    "id": "...",
    "duration_minutes": 40,
    "date": "2025-12-01",
    "audio_ids": ["..."],
    "video_ids": ["..."],
    "notes": "Trouble with slurs in bars 17-20",
    "tags": ["intonation", "left_hand_tension"]
  },
  "analysis": {
    "audio": {
      /* structured metrics */
    },
    "video": {
      /* posture markers */
    },
    "score": {
      /* difficulty map */
    }
  },
  "goals": ["smooth legato", "reduce tension", "stabilize tempo 60-70 bpm"]
}
```

The LLM never sees raw files; it sees:

- Symbols
- Metrics
- Short text summaries

### 3.2 Modal Pipelines

Plan separate pipelines:

1. **Text-only** (already working today)
2. **Text + Practice Logs**
3. **Text + Audio features**
4. **Text + Audio features + Score**
5. **Full multimodal** (audio/video to LLM when cost-effective)
   You can roll these out incrementally:

- v1: text + practice logs + music dictionary
- v2: add basic audio analytics (tempo, segmentation)
- v3: add score-aware feedback (via OCR/OMR)
- v4: add posture/video analysis for specific instruments

---

## 4. Testing & Validation Strategy

You’re aiming for “conservatory professor” quality, so you need **very intentional evaluation**, not just “does it run”.

### 4.1 Unit Tests (Tools / Services)

- Each tool (`analyze_audio`, `generate_practice_plan`, `ocr_sheet`) must:
- Accept clearly typed inputs
- Produce deterministic outputs for fixed test fixtures
- Use:
- Synthetic audio test files
- Example scores
- Simulated practice histories

### 4.2 Scenario / Conversation Tests

Create **golden test suites**:

- For each scenario:
- Input: user profile + piece + practice context + question
- Expected: constraints on output such as:
- Must reference specific bars or sections
- Must suggest 2–3 concrete exercises
- Must avoid dangerous advice (e.g., “practice 8 hours straight”)
  Automate evaluation using:
- Simple heuristics (keyword checks, required sections)
- LLM-as-judge (second model) to rate:
- Pedagogical quality
- Musical correctness
- Friendliness/encouragement

### 4.3 Expert-in-the-Loop Evaluation

Crucial for your use case:

- Partner with **teachers/advanced musicians**:
- Give them curated test sets
- Have them grade responses (1–5) for:
- Accuracy
- Usefulness
- Level-appropriateness
- Use this to:
- Train your prompts/system messages
- Tune your planning tools
- Decide which features are ready for general users vs. “beta”

### 4.4 Live Metrics & Guardrails

Once in production:

- Track:
- Session lengths / return rate
- “Was this useful?” thumbs up/down
- Which tools are used in good vs bad sessions
- Guardrails:
- Block obviously harmful advice (over-practice, self-injury)
- Set maximum daily practice suggestions based on user profile
- Add disclaimers and “listen to your body / teacher” for health-related things

---

## 5. Distribution Strategy

### 5.1 Inside Mirubato

Core experiences:

1. **Practice Companion**

- Right side of the practice page: “Ask your practice mentor”
- Suggests next steps after each logged session
- Gives micro-feedback from past N sessions

2. **Piece Explorer**

- For each piece:
- Difficulty map
- Recommended progression
- Suggested warmups

3. **Teacher Dashboard**

- Teacher sees:
- Agent-generated summaries of students’ progress
- Recommended focus areas for next lesson
- Teachers can override/adjust plans → feedback loop for improving the agent.

### 5.2 External Distribution (Later)

Once stable:

- **API**:
- `POST /v1/music-agent/query`
- `POST /v1/music-agent/analyze-session`
- **SDK**:
- TypeScript first:
- `@mirubato/music-agent`
- Python later:
- For researchers and ML/music people
  You can also:
- Publish **VS Code / browser extensions**:
- “Music practice assistant” for Tone.js/Strudel coding.
- Integrate with **DAWs**:
- Provide a plugin that sends practice info/audio segments to Mirubato Agent and shows feedback in the DAW.

---

## 6. Cloudflare vs GCP – Practical Recommendation

### Keep Cloudflare for:

- Edge-based **chat/agent routing**
- Streaming UX
- Simple, low-latency logic
- Multi-provider LLM usage via Cloudflare Agents + Workers AI

### Use GCP/Vertex for:

- Heavier ML workloads:
- Audio analysis models
- Video/posture models
- OMR / music OCR
- Central data storage + analytics
- Optional Vertex “general agents” for some tasks (e.g., long-form pedagogical content, curriculum generation)
  Communication pattern:
- Cloudflare Agent ↔ GCP microservices over HTTPS
- Each microservice is a “music tool” the agent can call
  This hybrid model is flexible and plays well with your existing GCP experience.

---

## 7. Phased Roadmap (Concrete)

### Phase 1 – Deepen Text Agent (1–2 months)

- Improve prompts/system messages to be **practice-teacher-like**
- Build:
- Practice schema
- Simple planning tools (no audio yet)
- Roll out:
- Practice companion in mirubato
- Music dictionary + practice advice

### Phase 2 – Audio-aware Feedback (2–4 months)

- Implement basic audio analysis via GCP (tempo, segments, rough accuracy)
- Build `analyze_audio_performance` tool → feed summary into LLM
- Start **teacher evaluation** cycles

### Phase 3 – Score-Aware & Multi-Tool Integration (3–6 months)

- Sheet OCR → MusicXML
- Score-based analysis (difficulty map, phrase structure)
- Tone.js/Strudel educational demos (code examples, pattern exploration)

### Phase 4 – Video / Posture & External SDK (6–12+ months)

- Add posture analysis for selected instruments
- Publish:
- Public API
- TypeScript SDK
- Start onboarding external partners (schools, apps)

---

## 8. Key Design Principles

1. **Music-first, LLM-second**
   LLM is a reasoning engine, not the source of musical truth. Music-specific tools & schemas are your advantage.
2. **Intermediate representations**
   Never rely solely on raw audio/video → always convert to structured signals first.
3. **Teacher in the loop**
   Treat conservatory-level musicians as “labelers” and “product owners” of pedagogy quality.
4. **Multi-modal by design, text-only by implementation priority**
   Architect for audio/video/score from day one; implement in progressively deeper layers.
5. **Infra flexibility**
   Cloudflare for edge & orchestration, GCP for heavy lifting; don’t over-commit to one giant “agent framework”.
