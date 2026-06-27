"""Pure prompt builders for the immersive scene pipeline — no API calls here."""


def get_artwork_description_prompt(artwork_name: str, artist_name: str, artwork_info: str) -> str:
    """
    Generate a museum guide description of an artwork (max ~1 minute when read aloud),
    grounded in the provided artwork_info rather than the model's own knowledge.
    """
    return f"""You are an expert museum tour guide with deep knowledge of art history. Your task is to create an engaging, educational description of the artwork for museum visitors.

ARTWORK: "{artwork_name}" by {artist_name}

INFORMATION ABOUT THE ARTWORK (use this as your source of truth — do not invent facts beyond what's given here):
{artwork_info}

REQUIREMENTS:
- Write a compelling description that a tour guide would read aloud to visitors
- Maximum length: 130-150 words (approximately 1 minute of speaking time)
- Structure your description to include:
  1. Brief context (when it was created, historical period)
  2. What visitors can see in the artwork (key visual elements, composition)
  3. The symbolism or meaning behind important elements
  4. Why this artwork is significant or what makes it remarkable
  5. End with a short, inviting question or transition that invites the visitor to imagine stepping into the scene — as if the voices of the people depicted are about to be heard

STYLE GUIDELINES:
- Write in a warm, engaging tone as if speaking directly to visitors
- Use vivid, descriptive language that helps visitors visualize and understand what they're seeing
- Make it accessible to people without art expertise
- Focus on creating emotional connection and appreciation
- Avoid overly academic language
- Write in present tense when describing what's visible in the artwork

OUTPUT FORMAT:
Provide ONLY the description text that the tour guide will read. No introductions, no meta-commentary, no additional formatting - just the pure narration text.

Now, write the tour guide description for "{artwork_name}"."""


def get_soundscape_and_dialogue_prompt(
    artwork_name: str,
    artist_name: str,
    artwork_info: str,
    artwork_description: str,
    *,
    language: str = "français",
    age: str = "adulte",
) -> str:
    """
    Single combined prompt: ask for both the ElevenLabs soundscape prompt and the
    theatrical dialogue script in one structured response, grounded in the tour
    guide description (which already ends on an invitation to step into the scene).
    """
    return f"""You are designing the immersive audio layer of a museum guide experience: an ambient soundscape and a short theatrical dialogue, both meant to play right after a tour guide's narration ends on an invitation to step into the scene.

ARTWORK: "{artwork_name}" by {artist_name}

INFORMATION ABOUT THE ARTWORK:
{artwork_info}

TOUR GUIDE NARRATION (the visitor just heard this — your output continues from where it leaves off):
{artwork_description}

VISITOR CONTEXT (adapt vocabulary and tone of the dialogue accordingly):
- Language to write the dialogue in: {language}
- Visitor age: {age}

PART 1 — SOUNDSCAPE PROMPT
Write a single sound effects prompt for the ElevenLabs Sound Effects API, designed to generate an immersive, seamlessly loopable soundscape that transports the listener INTO the scene depicted in the artwork.

HARD CONSTRAINT: maximum 400 characters total (the API rejects anything over 450 — stay well under). Be dense, not exhaustive:
- 3-5 specific sound elements (e.g. "musket fire, cannon blasts, distant church bells" rather than "battle sounds")
- Brief spatial cue (foreground vs. background)
- One note on pacing or looping

Prioritize the most evocative, specific sounds over completeness — cut anything that doesn't fit the character budget.

PART 2 — DIALOGUE SCRIPT
The tour guide narration above ends by inviting the visitor to step into the scene and listen to its voices. Write 4 to 8 short dialogue lines spoken by the characters in the scene, picking up right on that invitation — as if the visitor has just been transported inside the painting and these voices are the first thing they hear. Each line should feel like it's happening live, in the moment depicted by the artwork — exclamations, calls to action, fragments of conversation. Keep each line under 20 words.

For each line, also describe the voice that should speak it, using EXACTLY these allowed values (a voice catalog will be matched against them — values outside this list will fail to match):
- language: language code matching the dialogue language, e.g. "fr" for French
- age: exactly "Adult" or "Young Adult" (no other value exists in the catalog)
- gender: exactly "Feminine" or "Masculine"
- country: almost always "fr" — only use "ca" if the artwork is explicitly Québécois/Canadian
- characteristics: 3-5 short descriptors of the vocal style and emotion, written in the dialogue's language, e.g. "voix forte, passionnée, déterminée"

Vary the voices across lines (different age/gender/characteristics) so the dialogue feels like multiple distinct characters, not one narrator repeating itself.

Now produce both the soundscape prompt and the dialogue script for "{artwork_name}"."""


def get_background_music_prompt(artwork_name: str, artist_name: str, artwork_description: str) -> str:
    """
    Generate a prompt for ElevenLabs Music API to create atmospheric background music.

    Kept for a future extension (ElevenLabs Music: client.music.compose) — not wired
    into the current pipeline, which only generates narration, soundscape and dialogue.
    """
    return f"""You are an expert in audio design and music composition for immersive museum experiences. Your task is to create a detailed music generation prompt for ElevenLabs Music API.

ARTWORK INFORMATION:
Title: "{artwork_name}" by {artist_name}

ARTWORK DESCRIPTION (from tour guide):
{artwork_description}

YOUR TASK:
Create a music prompt that will generate atmospheric background music to play BEHIND the tour guide's narration. This music should enhance the visitor's emotional experience without overpowering the spoken words.

MUSIC REQUIREMENTS:
- Style: Thriller/atmospheric with subtle dramatic tension
- Purpose: Support and enhance the narration, not distract from it
- Intensity: Medium-low (must allow narration to remain clearly audible)
- Duration: Match the narration length (~1 minute)
- Mood: Should reflect the artwork's emotional atmosphere and historical context
- Texture: Cinematic, evocative, with careful attention to dynamics

OUTPUT FORMAT:
Provide a single, detailed music generation prompt (2-4 sentences) optimized for ElevenLabs Music API. The prompt should include:
- Genre/style descriptors
- Specific instruments or orchestration
- Mood and atmosphere keywords
- Intensity/dynamic range
- Pacing (slow, building, steady, etc.)

Now, create the ElevenLabs music generation prompt for "{artwork_name}"."""
