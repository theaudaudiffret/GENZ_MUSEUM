import json
import os
from pathlib import Path

import anthropic
from elevenlabs.client import ElevenLabs

from backend.memory import load_long_term_memory, load_short_term_memory

ROOT = Path(__file__).parent.parent
NARRATION_PROMPT = ROOT / "docs" / "narration_prompt.md"
DEFAULT_VOICE_ID = "XB0fDUnXU5powFXDhCwa"  # Charlotte — multilingue


def _generate_narration_text(data: dict) -> str:
    system = NARRATION_PROMPT.read_text(encoding="utf-8")
    current_key = str(data.get("_key")) if data.get("_key") else None
    short_mem = load_short_term_memory(exclude_key=current_key)
    long_mem = load_long_term_memory()

    user_content = f"""## Artwork analysis

```json
{json.dumps(data, ensure_ascii=False, indent=2)}
```

## Short-term memory (recently visited artworks)

{short_mem}

## Long-term memory (visitor profile)

{long_mem}"""

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    return response.content[0].text.strip()


def narrate(data: dict) -> bytes:
    narration_text = _generate_narration_text(data)

    client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID)

    audio_iter = client.text_to_speech.convert(
        voice_id=voice_id,
        text=narration_text,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    audio = b"".join(audio_iter)

    return audio
