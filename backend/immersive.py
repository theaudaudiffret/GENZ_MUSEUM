"""Pont entre l'app et le package immersive_scene — même contrat que narrator.narrate()."""
from immersive_scene import generate_immersive_scene

from backend.narrator import generate_narration_text, update_short_term_memory


def _build_artwork_info(data: dict) -> str:
    lines = [data.get("description") or ""]
    if data.get("style"):
        lines.append(f"Style : {data['style']}")
    if data.get("epoque"):
        lines.append(f"Époque : {data['epoque']}")
    if data.get("technique"):
        lines.append(f"Technique : {data['technique']}")
    if data.get("sujets"):
        lines.append(f"Sujets : {', '.join(data['sujets'])}")
    if data.get("ambiance"):
        lines.append(f"Ambiance : {data['ambiance']}")
    return "\n".join(lines)


def generate_immersive(data: dict) -> bytes:
    narration_text = generate_narration_text(data)

    wav_path = generate_immersive_scene(
        data.get("titre_probable") or "Œuvre",
        _build_artwork_info(data),
        artist_name=data.get("artiste_probable") or "",
        narration_text=narration_text,
    )

    update_short_term_memory(narration_text)
    return wav_path.read_bytes()
