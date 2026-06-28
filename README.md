# Animart.ai

AI-powered museum guide. A visitor photographs an artwork; **Claude** analyzes it and produces structured metadata. The app then offers two audio experiences — a **personalized narration** or an **immersive scene** — via **ElevenLabs**, adapted to a visitor persona. Gamification tracks artist **quests** and builds a personal **library** of scanned works.

All generated text and audio is in **English**. JSON field names in the analysis schema are French (`titre_probable`, `artiste_probable`, …) — internal keys only.

---

## Features

- **Onboarding** — short questionnaire → visitor profile (demo: two personas, `serious` / `fun`, driven by tone choice)
- **City & museum journey** — pick a city, museum, era, or featured artist before scanning (`cityData.ts`: Paris, London, Amsterdam, Madrid, Florence, New York, Rome, …)
- **Artwork scan** — camera upload, client-side resize, Claude vision analysis
- **Semantic dedup** — Claude agent matches new scans to existing works (e.g. *Mona Lisa* = *La Joconde*)
- **Classic narration** — Claude writes the script, ElevenLabs speaks it (persona-aware)
- **Immersive scene** — multi-voice theatrical audio with ambient textures, music, SFX, and word-level captions (`immersive_scene/`)
- **Quests** — scan progress per artist at the Louvre, Orsay, and Pompidou (`PageII`, `data.ts`)
- **Library** — session artworks grouped by museum, detail modal, audio playback (`PageBiblio`)

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | React 19, Vite, TypeScript |
| Vision / text | Anthropic Claude (`analyzer`, `dedup`, `narrator`, immersive script) |
| Audio | ElevenLabs (TTS, multi-voice dialogue, music, SFX) |
| Images | OpenCV (resize, perceptual hash), Wikipedia API |
| Deps | [uv](https://docs.astral.sh/uv/) + `pyproject.toml` / `uv.lock` |

---

## Architecture

### Code file graph

How source files connect at runtime (arrows = imports, HTTP calls, or reads/writes):

```
                         ┌── docs/prompt.md
                         │
frontend/src/            │         ┌── docs/narration_prompt.md
─────────────            │         │
App.tsx                  │    ┌────┴──── narrator.py ──► ElevenLabs
 ├─► PageI.tsx ──────────┼───►│
 ├─► PageII.tsx ────────┼───►│         ┌── immersive_scene/pipeline.py
 └─► PageBiblio.tsx ─────┼───►├── server.py ◄── immersive.py ──┘
        │                │    │      │
        ├─► data.ts      │    │      ├── analyzer.py
        ├─► cityData.ts  │    │      ├── dedup.py
        └─► types.ts     │    │      ├── matcher.py
                         │    │      └── profile.py ──► docs/long_term_memory.md
                         │    │
                         │    ├── reads/writes ──► docs/session.json
                         │    │
                         │    └── reads/writes ──► analyses/serious|fun/
                         │                              ├── {key}.json
                         │                              ├── photos/
                         │                              ├── audio/
                         │                              └── immersive/
                         │
                         └── (this README documents the graph above)
```

### System context

```mermaid
flowchart LR
  Browser["Browser React SPA"]
  Server["backend/server.py"]
  Claude["Anthropic Claude"]
  ElevenLabs["ElevenLabs"]
  Wiki["Wikipedia API"]

  Browser <-->|HTTP| Server
  Server --> Claude
  Server --> ElevenLabs
  Server --> Wiki
```

### Module map

```mermaid
flowchart TB
  subgraph FE["frontend/src"]
    App["App.tsx"]
    P1["PageI.tsx"]
    P2["PageII.tsx"]
    PB["PageBiblio.tsx"]
    DT["data.ts"]
    CD["cityData.ts"]
    TP["types.ts"]
    App --> P1
    App --> P2
    App --> PB
    P1 --> DT
    P1 --> CD
    P1 --> TP
    P2 --> DT
    PB --> DT
  end

  subgraph BE["backend"]
    SRV["server.py"]
    AN["analyzer.py"]
    DD["dedup.py"]
    NR["narrator.py"]
    IM["immersive.py"]
    MT["matcher.py"]
    PR["profile.py"]
    SRV --> AN
    SRV --> DD
    SRV --> NR
    SRV --> IM
    SRV --> MT
    SRV --> PR
  end

  subgraph IS["immersive_scene"]
    PL["pipeline.py"]
    PM["prompts.py"]
    VC["voice_catalog.json"]
    PL --> PM
    PL --> VC
  end

  subgraph DC["docs"]
    DP["prompt.md"]
    DN["narration_prompt.md"]
    SJ["session.json"]
    LM["long_term_memory.md"]
  end

  subgraph ST["analyses per persona"]
    JS["key.json"]
    PH["photos/"]
    AU["audio/"]
    IV["immersive/"]
  end

  P1 --> SRV
  P2 --> SRV
  PB --> SRV
  AN --> DP
  NR --> DN
  NR --> LM
  PR --> LM
  IM --> PL
  SRV --> ST
  SRV --> SJ
  SRV --> LM
```

### Scan flow

```mermaid
sequenceDiagram
  actor User
  participant PageI as PageI.tsx
  participant API as server.py
  participant Vision as analyzer.py
  participant Dedup as dedup.py
  participant Match as matcher.py
  participant DB as persona DB
  participant Session as session.json

  User->>PageI: Take photo
  PageI->>API: POST /analyze
  API->>Vision: analyze_artwork
  Vision-->>API: artwork JSON
  API->>Match: match_artist
  API->>Dedup: find_existing_artwork
  alt persona DB hit
    Dedup-->>API: existing key
    API->>DB: load cached JSON
  else new work
    Dedup-->>API: null
    API->>DB: save JSON and photo
  end
  API->>Session: append if not in_session
  API-->>PageI: JSON response
  User->>PageI: Narrate or immersive
  PageI->>API: POST /narrate or /immersive
  API->>DB: reuse or generate audio
  API-->>PageI: MP3 and captions
```

### Data model

```mermaid
flowchart TB
  subgraph persona_db["Persona DB shared persistent"]
    Pserious["analyses/serious"]
    Pfun["analyses/fun"]
  end

  subgraph user_session["User session reset by new-profile"]
    Sess["docs/session.json"]
    Ltm["docs/long_term_memory.md"]
  end

  Scan["New scan"] --> persona_db
  Scan --> user_session
  persona_db -.->|from_cache| Scan
  user_session -.->|in_session| Scan
```

| Flag | Meaning |
|------|---------|
| `from_cache` | Artwork JSON (and audio) reused from the persona DB |
| `in_session` | User already scanned this work — quests/library skip it |

Quest progress uses **`in_session`**, not `from_cache`: cache hits still count as new discoveries for this visitor.

---

## Project layout

```
GENZ_MUSEUM/
├── backend/
│   ├── server.py          # FastAPI app, routes, static files
│   ├── analyzer.py        # Claude vision → artwork JSON
│   ├── dedup.py           # Claude dedup agent
│   ├── narrator.py        # Claude narration → ElevenLabs TTS
│   ├── immersive.py       # Bridge to immersive_scene
│   ├── matcher.py         # Artist name → museum/artist id
│   ├── profile.py         # Onboarding → persona
│   └── main.py            # Optional CLI: analyze a single image file
├── frontend/src/          # React UI (PageI · PageII · PageBiblio)
├── immersive_scene/       # Immersive audio pipeline
├── analyses/{serious,fun}/  # Persona DB (runtime, may be populated)
├── docs/                  # Prompts + session memory
├── pyproject.toml
└── uv.lock
```

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Python ≥ 3.11 | |
| [uv](https://docs.astral.sh/uv/) | recommended |
| Node.js | frontend build |
| **ffmpeg** | system binary, required for immersive audio |
| `.env` | API keys (see below) |

---

## Quick start

### 1. Clone and configure

```bash
git clone https://github.com/theaudaudiffret/GENZ_MUSEUM.git
cd GENZ_MUSEUM
```

Create `.env` at the repo root:

```env
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
```

### 2. Install Python dependencies

```bash
uv sync
```

### 3. Build the frontend

The server serves `frontend/dist/` — rebuild after any UI change.

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Run the server

```bash
uv run python -m backend.server
```

Uvicorn binds to **port 8000** (`0.0.0.0`) and prints a LAN URL for phone access on the same Wi‑Fi.

Without uv:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .
python -m backend.server
```

### 5. (Optional) Analyze one image from the CLI

```bash
uv run python -m backend.main path/to/photo.jpg
```

### 6. (Optional) Sync ElevenLabs voices for immersive casting

```bash
uv run python -m immersive_scene.sync_voices
```

See [`immersive_scene/README.md`](immersive_scene/README.md).

---

## API routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/profile` | Save onboarding → persona |
| `POST` | `/new-profile` | Reset session (persona DB untouched) |
| `POST` | `/analyze` | Upload photo → artwork JSON |
| `POST` | `/narrate` | Cached or new narration MP3 |
| `POST` | `/immersive` | Cached or new immersive MP3 + captions |
| `GET` | `/library` | Session library |
| `GET` | `/artwork/{key}` | Full artwork JSON |
| `GET` | `/photos/{key}` | Artwork image |
| `GET` | `/audio/{key}` | Narration MP3 |
| `GET` | `/immersive-audio/{key}` | Immersive MP3 |

Static assets from `frontend/dist/` are served at `/`.

---

## Further reading

| Document | Contents |
|----------|----------|
| [`immersive_scene/README.md`](immersive_scene/README.md) | Immersive pipeline, voices, sound design |
| [`docs/prompt.md`](docs/prompt.md) | Vision analysis prompt |
| [`docs/narration_prompt.md`](docs/narration_prompt.md) | Narration prompt |
| [`CLAUDE.md`](CLAUDE.md) | Contributor / agent notes |

---

## Gotchas

- Session data survives server restarts; only `/new-profile` clears it.
- Each scan may trigger an extra Claude dedup call once the persona DB is non-empty.
- Wikipedia thumbnails use `httpx` with a `curl` fallback (upload.wikimedia.org blocks Python TLS).
- Narration and immersive are separate modes — the visitor chooses one per artwork.
