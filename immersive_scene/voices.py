"""Voix réelles du compte ElevenLabs utilisées par le pipeline immersive_scene.

Petit set fixe (narrateur + pool de personnages par genre) plutôt qu'un
catalogue à matcher — plus simple et ça marche vraiment.
"""

NARRATOR_VOICE_ID = "QMNPncWXVcTVhJ9rDEQO"  # Stephyra — narration documentaire FR

_CHARACTER_VOICES_BY_GENDER = {
    "Masculine": ["GgV5QStPLpmkN7FOHJtY", "wufFsVwuYBePWKO6dMMN"],  # Peter, Rudy
    "Feminine": ["Nx7FcZgjGWVrAsCg0Csy"],  # Baddie
}
_ALL_CHARACTER_VOICES = [v for pool in _CHARACTER_VOICES_BY_GENDER.values() for v in pool]


def character_voice_id(gender: str, index: int) -> str:
    """Pick a character voice for the given gender, cycling through the pool by index."""
    pool = _CHARACTER_VOICES_BY_GENDER.get(gender) or _ALL_CHARACTER_VOICES
    return pool[index % len(pool)]
