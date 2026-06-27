import json
import socket
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.analyzer import analyze_artwork
from backend.matcher import match_artist
from backend.narrator import narrate
from backend.profile import load_profile_text, save_profile

load_dotenv()

ROOT = Path(__file__).parent.parent
ANALYSES_DIR = ROOT / "analyses"
ANALYSES_DIR.mkdir(exist_ok=True)

SHORT_TERM_MEMORY = ROOT / "docs" / "short_term_memory.md"
LONG_TERM_MEMORY = ROOT / "docs" / "long_term_memory.md"

SHORT_TERM_INITIAL = "# Mémoire court terme — visites récentes\n\n_(vide — les œuvres analysées apparaîtront ici au fil de la visite)_\n"
LONG_TERM_INITIAL = "# Mémoire long terme\n\n_(sera remplie après le questionnaire de bienvenue)_\n"


def _reset_memories() -> None:
    SHORT_TERM_MEMORY.write_text(SHORT_TERM_INITIAL, encoding="utf-8")
    LONG_TERM_MEMORY.write_text(LONG_TERM_INITIAL, encoding="utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _reset_memories()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.post("/profile")
async def profile_route(request: Request):
    data = await request.json()
    save_profile(data)
    return JSONResponse({"ok": True})


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    image_bytes = await file.read()
    media_type = file.content_type or "image/jpeg"
    try:
        phash = _phash(image_bytes)
        cached = _find_cached(phash)
        if cached:
            payload = {k: v for k, v in cached.items() if k != "_phash"}
            return JSONResponse(payload)

        result = analyze_artwork(image_bytes, media_type, load_profile_text())
        result["artist_id"] = match_artist(result.get("artiste_probable"))
        result["_phash"] = phash
        _save(result)
        payload = {k: v for k, v in result.items() if k != "_phash"}
        return JSONResponse(payload)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/narrate")
async def narrate_route(request: Request):
    data = await request.json()
    try:
        audio_bytes = narrate(data)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


def _phash(image_bytes: bytes) -> str:
    """Perceptual hash (64-bit DCT) — same painting ≈ hamming distance ≤ 10."""
    try:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    except Exception:
        img = None
    if img is None:
        return "0" * 16
    img = cv2.resize(img, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    dct = cv2.dct(img)
    block = dct[:8, :8].flatten()
    mean = block.mean()
    bits = (block > mean)
    val = int("".join("1" if b else "0" for b in bits), 2)
    return f"{val:016x}"


def _hamming(a: str, b: str) -> int:
    return bin(int(a, 16) ^ int(b, 16)).count("1")


PHASH_THRESHOLD = 10  # bits différents tolérés sur 64


def _find_cached(phash: str) -> dict | None:
    for path in sorted(ANALYSES_DIR.glob("*.json"), reverse=True):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            stored = data.get("_phash")
            if stored and _hamming(phash, stored) <= PHASH_THRESHOLD:
                return data
        except Exception:
            continue
    return None


def _save(result: dict) -> None:
    filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".json"
    (ANALYSES_DIR / filename).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )


dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="static")


def _local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


if __name__ == "__main__":
    if not dist.exists():
        print("\n  ⚠  Build React manquant. Lance d'abord :")
        print("       cd frontend && npm run build\n")
    print(f"  URL téléphone (même WiFi) :\n\n      http://{_local_ip()}:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
