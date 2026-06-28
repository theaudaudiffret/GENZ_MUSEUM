"""Shared visitor memory for narration and immersive audio."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
SHORT_TERM_MEMORY = ROOT / "docs" / "short_term_memory.md"
LONG_TERM_MEMORY = ROOT / "docs" / "long_term_memory.md"

MAX_MEMORY_ENTRIES = 10
SHORT_TERM_INITIAL = "# Short-term memory — recent visits\n\n_(empty — analyzed works will appear here during the visit)_\n"
LONG_TERM_INITIAL = "# Long-term memory\n\n_(will be filled after the welcome questionnaire)_\n"


def reset_memories() -> None:
    SHORT_TERM_MEMORY.write_text(SHORT_TERM_INITIAL, encoding="utf-8")
    LONG_TERM_MEMORY.write_text(LONG_TERM_INITIAL, encoding="utf-8")


def load_long_term_memory() -> str:
    return LONG_TERM_MEMORY.read_text(encoding="utf-8") if LONG_TERM_MEMORY.exists() else ""


def load_short_term_memory(*, exclude_key: str | None = None) -> str:
    entries = _read_entries()
    if exclude_key:
        marker = _key_marker(exclude_key)
        entries = [entry for entry in entries if marker not in entry]
    return _render(entries)


def remember_artwork(data: dict) -> None:
    key = str(data.get("_key") or _fallback_key(data))
    marker = _key_marker(key)
    entries = _read_entries()
    if any(marker in entry for entry in entries):
        return

    title = data.get("titre_probable") or "Unknown artwork"
    artist = data.get("artiste_probable") or "unknown artist"
    details = [f"{title} by {artist}."]
    if data.get("depicted_moment"):
        details.append(f"Depicted moment: {data['depicted_moment']}")
    if data.get("narrative_context"):
        details.append(f"Narrative context: {data['narrative_context']}")
    elif data.get("description"):
        details.append(data["description"])

    entry = (
        f"## {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        f"{marker}\n\n"
        f"{' '.join(details)}"
    )
    entries.append(entry)
    SHORT_TERM_MEMORY.write_text(_render(entries[-MAX_MEMORY_ENTRIES:]), encoding="utf-8")


def _read_entries() -> list[str]:
    if not SHORT_TERM_MEMORY.exists():
        return []
    content = SHORT_TERM_MEMORY.read_text(encoding="utf-8")
    parts = re.split(r"(?m)^## ", content)
    return [f"## {part.strip()}" for part in parts[1:] if part.strip()]


def _render(entries: list[str]) -> str:
    if not entries:
        return SHORT_TERM_INITIAL
    return "# Short-term memory — recent visits\n\n" + "\n\n".join(entries) + "\n"


def _key_marker(key: str) -> str:
    return f"<!-- artwork-key:{key} -->"


def _fallback_key(data: dict) -> str:
    return f"{data.get('titre_probable')}|{data.get('artiste_probable')}"
