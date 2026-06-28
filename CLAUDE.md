# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project: Musées

A mobile-first museum guide. The visitor photographs an artwork; Claude analyzes it and ElevenLabs narrates a short audio commentary adapted to the visitor's persona. Gamified with per-museum artist "quests" and a personal library.

**All generated content (analysis values + narration audio) is in English.** The JSON *field names* are French (`titre_probable`, `artiste_probable`, `couleurs_dominantes`, `ambiance`, `sujets`, `epoque`, `technique`) — internal schema keys, do not confuse with output language.

## Run

```bash
cd frontend && npm run build      # build the React app first (server serves frontend/dist)
python -m backend.server          # FastAPI + uvicorn on :8000, prints the LAN URL for phone access
```
Requires `.env` with `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY`. Python ≥ 3.11; deps in `pyproject.toml`.

## Architecture

**Backend** (`backend/`, FastAPI):
- `server.py` — routes (`/analyze`, `/narrate`, `/profile`, `/new-profile`, `/library`, `/photos/{key}`, `/audio/{key}`) + storage helpers.
- `analyzer.py` — Claude vision → artwork JSON (system prompt `docs/prompt.md`, strict `json_schema`).
- `dedup.py` — **Claude dedup agent**: given a new artwork + the persona DB entries, returns the matching `key` or null (semantic match, e.g. "La Joconde" = "Mona Lisa").
- `narrator.py` — Claude narration text (prompt `docs/narration_prompt.md`) → ElevenLabs audio; also appends to short-term memory.
- `matcher.py` — maps the detected artist name to a museum/artist id via alias tables (drives quests).
- `profile.py` — the profile is a **demo reduced to 2 personas** (`serious` / `fun`), derived from the onboarding *tone* answer; written to `docs/long_term_memory.md`.

**Frontend** (`frontend/src/`, React + Vite, inline-style components):
- `App.tsx` — tab shell + quest progress (localStorage `genz-museum-progress`). `PageI` stays mounted (hidden via `display`) so the last analysis survives tab switches; other pages remount to refresh.
- `PageI.tsx` — onboarding questionnaire + camera/scan/result flow. Onboarding shows only when not yet onboarded (localStorage `genz-museum-onboarded`) or after "Nouveau profil".
- `PageII.tsx` — museum/artist quest collection. `PageBiblio.tsx` — session library. `data.ts` — museums/artists/levels.

## Data model — two decoupled tiers

1. **Persona DB** (`analyses/serious/`, `analyses/fun/`, each with `audio/` + `photos/` + `{key}.json`): **permanent, shared** cache across all users of that persona. Enables audio reuse. The file `key` is the perceptual hash (`_phash`) of the first photo; the dedup agent matches across different photos of the same work.
2. **User session** (`docs/session.json` + `docs/short_term_memory.md`): per-user, **reset by `/new-profile`** (which never touches the persona DBs). Drives the library and library/quest dedup.

**Scan flow:** analyze → dedup agent searches the persona DB → match: reuse stored json+audio; no match: save new entry. Library + quests get the work **only if its key isn't already in the session** (`in_session`), independent of audio caching — so a work reused from the DB but new to *this* user still counts.

## Gotchas

- Memory persists across server restarts (no startup reset); only `/new-profile` clears the session.
- Every scan costs an extra Claude call (the dedup agent) once the persona DB is non-empty.
- `from_cache` (DB hit) and `in_session` (already seen by this user) are distinct — gate quests on `in_session`, not `from_cache`.