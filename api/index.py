# ── Load env FIRST ────────────────────────────────────────────────────────────
import os
from pathlib import Path
import uuid, time

from dotenv import load_dotenv
load_dotenv()

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="TwelveLab API", version="3.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = ["*"]  # dev fallback only

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── API Key Auth ──────────────────────────────────────────────────────────────
VALID_API_KEYS = [k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()]

async def verify_api_key(request: Request):
    key = request.headers.get("x-api-key") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not key:
        raise HTTPException(401, "Missing API key. Provide it via x-api-key or Authorization header.")
    if VALID_API_KEYS and key not in VALID_API_KEYS:
        raise HTTPException(403, "Invalid API key.")
    return True

# ── Rate limiter ──────────────────────────────────────────────────────────────
_rate_store: dict[str, list[float]] = {}
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_WINDOW = 60  # seconds

def rate_limit_check(client_id: str) -> None:
    now = time.time()
    _rate_store.setdefault(client_id, [])
    _rate_store[client_id] = [t for t in _rate_store[client_id] if now - t < RATE_WINDOW]
    if len(_rate_store[client_id]) >= RATE_LIMIT:
        raise HTTPException(429, f"Rate limit exceeded: {RATE_LIMIT} requests per minute.")
    _rate_store[client_id].append(now)

# ── Cloudinary ────────────────────────────────────────────────────────────────
import cloudinary
import cloudinary.uploader

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )

# ── Supabase ──────────────────────────────────────────────────────────────────
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

sb = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print("Supabase init skipped:", e)

# ── HuggingFace ───────────────────────────────────────────────────────────────
HF_TOKEN = os.getenv("HF_TOKEN", "")
OUTPUT_DIR = Path("/tmp")

# ── Voice library ─────────────────────────────────────────────────────────────
VOICES = {
    # Indian Languages
    "priya": {
        "name": "Priya", "lang": "HI", "language": "Hindi",
        "gender": "Female", "accent": "Natural", "region": "India",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-hin", "gtts_lang": "hi", "gtts_tld": "co.in",
    },
    "arjun": {
        "name": "Arjun", "lang": "HI", "language": "Hindi",
        "gender": "Male", "accent": "Clear", "region": "India",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-hin", "gtts_lang": "hi", "gtts_tld": "co.in",
    },
    "aisha": {
        "name": "Aisha", "lang": "MR", "language": "Marathi",
        "gender": "Female", "accent": "Natural", "region": "Maharashtra",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-mar", "gtts_lang": "mr", "gtts_tld": "co.in",
    },
    "rohan": {
        "name": "Rohan", "lang": "MR", "language": "Marathi",
        "gender": "Male", "accent": "Clear", "region": "Maharashtra",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-mar", "gtts_lang": "mr", "gtts_tld": "co.in",
    },
    "kavya": {
        "name": "Kavya", "lang": "TA", "language": "Tamil",
        "gender": "Female", "accent": "Natural", "region": "Tamil Nadu",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-tam", "gtts_lang": "ta", "gtts_tld": "co.in",
    },
    "kiran": {
        "name": "Kiran", "lang": "TE", "language": "Telugu",
        "gender": "Male", "accent": "Natural", "region": "Andhra Pradesh",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-tel", "gtts_lang": "te", "gtts_tld": "co.in",
    },
    "meera": {
        "name": "Meera", "lang": "BN", "language": "Bengali",
        "gender": "Female", "accent": "Warm", "region": "West Bengal",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-ben", "gtts_lang": "bn", "gtts_tld": "co.in",
    },
    "rahul": {
        "name": "Rahul", "lang": "GU", "language": "Gujarati",
        "gender": "Male", "accent": "Natural", "region": "Gujarat",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-guj", "gtts_lang": "gu", "gtts_tld": "co.in",
    },
    "ananya": {
        "name": "Ananya", "lang": "KN", "language": "Kannada",
        "gender": "Female", "accent": "Clear", "region": "Karnataka",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-kan", "gtts_lang": "kn", "gtts_tld": "co.in",
    },
    "vikram": {
        "name": "Vikram", "lang": "PA", "language": "Punjabi",
        "gender": "Male", "accent": "Warm", "region": "Punjab",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-pan", "gtts_lang": "pa", "gtts_tld": "co.in",
    },
    "diya": {
        "name": "Diya", "lang": "ML", "language": "Malayalam",
        "gender": "Female", "accent": "Natural", "region": "Kerala",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-mal", "gtts_lang": "ml", "gtts_tld": "co.in",
    },
    "amit": {
        "name": "Amit", "lang": "OR", "language": "Odia",
        "gender": "Male", "accent": "Natural", "region": "Odisha",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian",
        "hf_model":  "facebook/mms-tts-ory", "gtts_lang": "or", "gtts_tld": "co.in",
    },
    # Indian English
    "riya": {
        "name": "Riya", "lang": "EN-IN", "language": "English (Indian)",
        "gender": "Female", "accent": "Indian", "region": "India",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian_english",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits", "gtts_lang": "en", "gtts_tld": "co.in",
    },
    "dev": {
        "name": "Dev", "lang": "EN-IN", "language": "English (Indian)",
        "gender": "Male", "accent": "Indian", "region": "India",
        "flag": "\U0001f1ee\U0001f1f3", "category": "indian_english",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits", "gtts_lang": "en", "gtts_tld": "co.in",
    },
    # International
    "aria": {
        "name": "Aria", "lang": "EN", "language": "English (US)",
        "gender": "Female", "accent": "American", "region": "USA",
        "flag": "\U0001f1fa\U0001f1f8", "category": "international",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits", "gtts_lang": "en", "gtts_tld": "com",
    },
    "ryan": {
        "name": "Ryan", "lang": "EN", "language": "English (UK)",
        "gender": "Male", "accent": "British", "region": "UK",
        "flag": "\U0001f1ec\U0001f1e7", "category": "international",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits", "gtts_lang": "en", "gtts_tld": "co.uk",
    },
    "sofia": {
        "name": "Sofia", "lang": "ES", "language": "Spanish",
        "gender": "Female", "accent": "Warm", "region": "Spain",
        "flag": "\U0001f1ea\U0001f1f8", "category": "international",
        "hf_model":  "facebook/mms-tts-spa", "gtts_lang": "es", "gtts_tld": "es",
    },
    "pierre": {
        "name": "Pierre", "lang": "FR", "language": "French",
        "gender": "Male", "accent": "Classic", "region": "France",
        "flag": "\U0001f1eb\U0001f1f7", "category": "international",
        "hf_model":  "facebook/mms-tts-fra", "gtts_lang": "fr", "gtts_tld": "fr",
    },
}


class SynthesizeRequest(BaseModel):
    text: str
    voice_id: str = "priya"
    speed: float = 1.0
    user_id: str | None = None


# ── TTS helpers ───────────────────────────────────────────────────────────────
async def try_huggingface(text: str, model: str) -> bytes:
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(url, headers=headers, json={"inputs": text})
        if res.status_code == 503:
            retry_after = int(res.headers.get("retry-after", 20))
            print(f"HF model loading, retrying after {retry_after}s...")
        if res.status_code == 503 or res.status_code in (502, 504):
            async with httpx.AsyncClient(timeout=60) as retry_client:
                retry_res = await retry_client.post(url, headers=headers, json={"inputs": text})
                if retry_res.status_code != 200:
                    raise Exception(f"HF error {retry_res.status_code}")
                return retry_res.content
        if res.status_code != 200:
            raise Exception(f"HF error {res.status_code}")
        return res.content


async def try_gtts(text: str, lang: str, tld: str) -> bytes:
    from gtts import gTTS
    import io
    tts = gTTS(text=text, lang=lang, tld=tld, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api")
def root():
    return {
        "status":  "TwelveLab API running",
        "version": "3.0.0",
        "engine":  "huggingface" if HF_TOKEN else "gtts",
        "voices":  len(VOICES),
    }


@app.get("/api/voices")
def list_voices():
    indian = []
    indian_english = []
    international = []

    for vid, v in VOICES.items():
        entry = {
            "id": vid, "name": v["name"], "lang": v["lang"],
            "language": v["language"], "gender": v["gender"],
            "accent": v["accent"], "region": v["region"],
            "flag": v["flag"], "category": v["category"],
        }
        if v["category"] == "indian":
            indian.append(entry)
        elif v["category"] == "indian_english":
            indian_english.append(entry)
        else:
            international.append(entry)

    return {
        "voices": list(VOICES.keys()),
        "grouped": {
            "indian": indian,
            "indian_english": indian_english,
            "international": international,
        },
        "total": len(VOICES),
    }


@app.post("/api/synthesize")
async def synthesize(req: SynthesizeRequest, request: Request):
    await verify_api_key(request)

    client_id = request.headers.get("x-api-key", request.client.host)
    rate_limit_check(client_id)

    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Text cannot be empty")
    if len(text) > 5000:
        raise HTTPException(400, "Text exceeds 5,000 character limit")

    voice = VOICES.get(req.voice_id.lower())
    if not voice:
        raise HTTPException(404, f"Voice '{req.voice_id}' not found")

    if req.user_id and sb:
        try:
            result = sb.table("users").select("char_used,char_limit") \
                       .eq("id", req.user_id).single().execute()
            if result.data:
                used = result.data["char_used"] or 0
                limit = result.data["char_limit"] or 10000
                if used + len(text) > limit:
                    raise HTTPException(429, f"Usage limit exceeded: {used:,}/{limit:,} characters")
        except HTTPException: raise
        except Exception as e:
            print(f"Usage check skipped: {e}")

    audio_bytes = None
    ext = "wav"
    engine_used = "gtts"

    if HF_TOKEN:
        try:
            audio_bytes = await try_huggingface(text, voice["hf_model"])
            ext = "wav"
            engine_used = "huggingface"
        except Exception as e:
            print(f"HF failed ({e}), falling back to gTTS")

    if audio_bytes is None:
        try:
            audio_bytes = await try_gtts(text, voice["gtts_lang"], voice["gtts_tld"])
            ext = "mp3"
            engine_used = "gtts"
        except Exception as e:
            raise HTTPException(500, f"All TTS engines failed: {e}")

    filename = f"{uuid.uuid4()}.{ext}"
    filepath = OUTPUT_DIR / filename
    filepath.write_bytes(audio_bytes)

    try:
        upload = cloudinary.uploader.upload(str(filepath), resource_type="video")
        audio_url = upload["secure_url"]
    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {str(e)}")
    finally:
        try: filepath.unlink()
        except: pass

    return {
        "audio_url": audio_url,
        "voice_name": voice["name"],
        "language": voice["language"],
        "char_count": len(text),
        "engine": engine_used,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "3.0.0",
        "voices": len(VOICES),
    }

# ── Serverless handler (Vercel / AWS Lambda) ─────────────────────────────────
try:
    from mangum import Mangum
    handler = Mangum(app)
except ImportError:
    pass
