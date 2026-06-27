# immersive_scene

Génère une scène audio immersive à partir d'un nom de tableau + d'infos dessus : narration de guide, soundscape d'ambiance, et un court dialogue théâtral multi-voix, mixés en un seul `.wav`.

Package autonome, pensé pour être copié tel quel dans un autre repo comme fonctionnalité additionnelle.

## Voix

Pas de catalogue à matcher — un petit set fixe de vraies voix ElevenLabs dans `voices.py` : un narrateur (voix FR posée, narration documentaire) + un pool de 2-3 voix de personnages réparties par genre, choisies à tour de rôle (`character_voice_id`). Pour changer/ajouter une voix, édite directement les IDs dans `voices.py` — récupère-les sur ElevenLabs Voice Library (ou `client.voices.get_all()`, nécessite la permission `voices_read` sur la clé API).

Le dialogue entre personnages part en un seul appel à `client.text_to_dialogue.convert(...)` (API native multi-voix d'ElevenLabs) plutôt qu'un appel TTS par ligne — plus simple et le rythme/la prosodie entre répliques est géré nativement par ElevenLabs.

## Setup

```bash
pip install anthropic elevenlabs pydub python-dotenv pydantic
```

Variables d'environnement requises (`.env` ou export) :

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
```

`ffmpeg` doit être installé sur la machine (utilisé par pydub pour décoder les formats audio non-WAV renvoyés par les APIs).

## Usage

```python
from immersive_scene import generate_immersive_scene

path = generate_immersive_scene(
    "La liberté guidant le peuple",
    "Tableau d'Eugène Delacroix (1830), Révolution de Juillet à Paris...",
    artist_name="Eugène Delacroix",
)
print(path)  # outputs/la_liberte_guidant_le_peuple/final_scene.wav
```

Si le texte de narration existe déjà côté app hôte (ex. généré par un autre module), passe-le via `narration_text=...` : Claude ne sera pas appelé pour le réécrire, et le pipeline ne fait plus qu'un seul appel Claude (au lieu de deux) pour générer le soundscape + le dialogue.

## Fichiers

- `pipeline.py` — point d'entrée `generate_immersive_scene(...)`
- `prompts.py` — builders de prompts (description, soundscape+dialogue combinés ; pas d'appel API)
- `claude_client.py` — appels Claude (`claude-opus-4-8`) : texte simple + sortie structurée Pydantic pour soundscape+dialogue
- `elevenlabs_client.py` — TTS, Sound Effects, et dialogue multi-voix (`text_to_dialogue`)
- `voices.py` — petit set fixe de vraies voix (narrateur + pool de personnages par genre)
- `audio.py` — assemblage pydub (concat narration+dialogue, boucle soundscape, mix)

## Hors scope

- Génération de musique de fond : `prompts.get_background_music_prompt` existe mais n'est pas appelé. ElevenLabs expose `client.music.compose(...)` pour ça si besoin un jour.
- Pas de pipeline Q&A vocal live (feature séparée).
