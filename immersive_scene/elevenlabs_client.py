"""Thin wrapper around the ElevenLabs Python SDK for the immersive scene pipeline."""

from __future__ import annotations

import os

from dotenv import load_dotenv
from elevenlabs import DialogueInput
from elevenlabs.client import ElevenLabs

load_dotenv()


def get_client() -> ElevenLabs:
    return ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])


def text_to_speech(client: ElevenLabs, text: str, voice_id: str, *, model_id: str = "eleven_multilingual_v2") -> bytes:
    chunks = client.text_to_speech.convert(text=text, voice_id=voice_id, model_id=model_id)
    return b"".join(chunks)


def text_to_dialogue(client: ElevenLabs, lines: list[tuple[str, str]]) -> bytes:
    """Convert (text, voice_id) pairs into a single mixed dialogue audio — one API call."""
    inputs = [DialogueInput(text=text, voice_id=voice_id) for text, voice_id in lines]
    chunks = client.text_to_dialogue.convert(inputs=inputs)
    return b"".join(chunks)


SOUND_EFFECTS_MAX_CHARS = 450  # hard limit enforced by the ElevenLabs API


def text_to_sound_effects(
    client: ElevenLabs, prompt: str, *, duration_seconds: float = 25.0, prompt_influence: float = 0.3
) -> bytes:
    if len(prompt) > SOUND_EFFECTS_MAX_CHARS:
        prompt = prompt[:SOUND_EFFECTS_MAX_CHARS].rsplit(" ", 1)[0]
    chunks = client.text_to_sound_effects.convert(
        text=prompt,
        duration_seconds=duration_seconds,
        prompt_influence=prompt_influence,
    )
    return b"".join(chunks)
