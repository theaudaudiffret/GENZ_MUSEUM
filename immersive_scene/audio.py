"""Audio assembly helpers built on pydub — concatenation, looping, mixing."""

from __future__ import annotations

from io import BytesIO

from pydub import AudioSegment


def bytes_to_segment(data: bytes) -> AudioSegment:
    return AudioSegment.from_file(BytesIO(data))


def concat_with_silence(segments: list[AudioSegment], gap_ms: int = 1000) -> AudioSegment:
    out = segments[0]
    for seg in segments[1:]:
        out += AudioSegment.silent(duration=gap_ms) + seg
    return out


def loop_to_length(segment: AudioSegment, target_ms: int) -> AudioSegment:
    out = segment
    while len(out) < target_ms:
        out += segment
    return out[:target_ms]


def mix(
    background: AudioSegment,
    foreground: AudioSegment,
    *,
    bg_gain_db: float = -8,
    fg_gain_db: float = 0,
    position_ms: int = 0,
) -> AudioSegment:
    bg = background + bg_gain_db
    fg = foreground + fg_gain_db
    return bg.overlay(fg, position=position_ms)
