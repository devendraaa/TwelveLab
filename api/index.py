import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import uuid, time, os, requests

# Safe dotenv
if os.path.exists(".env"):
    load_dotenv()

# Safe Cloudinary
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )

# Safe Supabase
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

sb = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print("Supabase init skipped:", e)

    
# ── HuggingFace ────────────────────────────────────────────────────────────────
HF_TOKEN   = os.getenv("HF_TOKEN", "")
HF_HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

OUTPUT_DIR = Path("/tmp")

app = FastAPI(title="TwelveLab API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Voice library ──────────────────────────────────────────────────────────────
# Facebook MMS supports all Indian languages natively
# ISO 639-3 codes used by MMS models
VOICES = {

    # ── Indian Languages (Primary focus) ──────────────────────────────────
    "priya": {
        "name": "Priya", "lang": "HI", "language": "Hindi",
        "gender": "Female", "accent": "Natural", "region": "India",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-hin",
        "gtts_lang": "hi", "gtts_tld": "co.in",
    },
    "arjun": {
        "name": "Arjun", "lang": "HI", "language": "Hindi",
        "gender": "Male", "accent": "Clear", "region": "India",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-hin",
        "gtts_lang": "hi", "gtts_tld": "co.in",
    },
    "aisha": {
        "name": "Aisha", "lang": "MR", "language": "Marathi",
        "gender": "Female", "accent": "Natural", "region": "Maharashtra",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-mar",
        "gtts_lang": "mr", "gtts_tld": "co.in",
    },
    "rohan": {
        "name": "Rohan", "lang": "MR", "language": "Marathi",
        "gender": "Male", "accent": "Clear", "region": "Maharashtra",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-mar",
        "gtts_lang": "mr", "gtts_tld": "co.in",
    },
    "kavya": {
        "name": "Kavya", "lang": "TA", "language": "Tamil",
        "gender": "Female", "accent": "Natural", "region": "Tamil Nadu",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-tam",
        "gtts_lang": "ta", "gtts_tld": "co.in",
    },
    "kiran": {
        "name": "Kiran", "lang": "TE", "language": "Telugu",
        "gender": "Male", "accent": "Natural", "region": "Andhra Pradesh",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-tel",
        "gtts_lang": "te", "gtts_tld": "co.in",
    },
    "meera": {
        "name": "Meera", "lang": "BN", "language": "Bengali",
        "gender": "Female", "accent": "Warm", "region": "West Bengal",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-ben",
        "gtts_lang": "bn", "gtts_tld": "co.in",
    },
    "rahul": {
        "name": "Rahul", "lang": "GU", "language": "Gujarati",
        "gender": "Male", "accent": "Natural", "region": "Gujarat",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-guj",
        "gtts_lang": "gu", "gtts_tld": "co.in",
    },
    "ananya": {
        "name": "Ananya", "lang": "KN", "language": "Kannada",
        "gender": "Female", "accent": "Clear", "region": "Karnataka",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-kan",
        "gtts_lang": "kn", "gtts_tld": "co.in",
    },
    "vikram": {
        "name": "Vikram", "lang": "PA", "language": "Punjabi",
        "gender": "Male", "accent": "Warm", "region": "Punjab",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-pan",
        "gtts_lang": "pa", "gtts_tld": "co.in",
    },
    "diya": {
        "name": "Diya", "lang": "ML", "language": "Malayalam",
        "gender": "Female", "accent": "Natural", "region": "Kerala",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-mal",
        "gtts_lang": "ml", "gtts_tld": "co.in",
    },
    "amit": {
        "name": "Amit", "lang": "OR", "language": "Odia",
        "gender": "Male", "accent": "Natural", "region": "Odisha",
        "flag": "🇮🇳", "category": "indian",
        "hf_model":  "facebook/mms-tts-ory",
        "gtts_lang": "or", "gtts_tld": "co.in",
    },

    # ── Indian English accents ─────────────────────────────────────────────
    "riya": {
        "name": "Riya", "lang": "EN-IN", "language": "English (Indian)",
        "gender": "Female", "accent": "Indian", "region": "India",
        "flag": "🇮🇳", "category": "indian_english",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang": "en", "gtts_tld": "co.in",
    },
    "dev": {
        "name": "Dev", "lang": "EN-IN", "language": "English (Indian)",
        "gender": "Male", "accent": "Indian", "region": "India",
        "flag": "🇮🇳", "category": "indian_english",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang": "en", "gtts_tld": "co.in",
    },

    # ── International voices ───────────────────────────────────────────────
    "aria": {
        "name": "Aria", "lang": "EN", "language": "English (US)",
        "gender": "Female", "accent": "American", "region": "USA",
        "flag": "🇺🇸", "category": "international",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang": "en", "gtts_tld": "com",
    },
    "ryan": {
        "name": "Ryan", "lang": "EN", "language": "English (UK)",
        "gender": "Male", "accent": "British", "region": "UK",
        "flag": "🇬🇧", "category": "international",
        "hf_model":  "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang": "en", "gtts_tld": "co.uk",
    },
    "sofia": {
        "name": "Sofia", "lang": "ES", "language": "Spanish",
        "gender": "Female", "accent": "Warm", "region": "Spain",
        "flag": "🇪🇸", "category": "international",
        "hf_model":  "facebook/mms-tts-spa",
        "gtts_lang": "es", "gtts_tld": "es",
    },
    "pierre": {
        "name": "Pierre", "lang": "FR", "language": "French",
        "gender": "Male", "accent": "Classic", "region": "France",
        "flag": "🇫🇷", "category": "international",
        "hf_model":  "facebook/mms-tts-fra",
        "gtts_lang": "fr", "gtts_tld": "fr",
    },
}


class SynthesizeRequest(BaseModel):
    text:     str
    voice_id: str        = "priya"
    speed:    float      = 1.0
    user_id:  str | None = None


# ── TTS helpers ────────────────────────────────────────────────────────────────
def try_huggingface(text: str, model: str) -> bytes:
    url = f"https://api-inference.huggingface.co/models/{model}"
    res = requests.post(url, headers=HF_HEADERS, json={"inputs": text}, timeout=30)
    if res.status_code == 503:
        print("HF model loading, waiting 20s...")
        time.sleep(20)
        res = requests.post(url, headers=HF_HEADERS, json={"inputs": text}, timeout=60)
    if res.status_code != 200:
        raise Exception(f"HF error {res.status_code}: {res.text[:200]}")
    return res.content


def try_gtts(text: str, lang: str, tld: str) -> bytes:
    from gtts import gTTS
    import io
    tts = gTTS(text=text, lang=lang, tld=tld, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":  "TwelveLab API running",
        "version": "3.0.0",
        "engine":  "huggingface" if HF_TOKEN else "gtts",
        "voices":  len(VOICES),
    }


@app.get("/voices")
def list_voices():
    # Group by category for frontend display
    indian          = []
    indian_english  = []
    international   = []

    for vid, v in VOICES.items():
        entry = {
            "id":       vid,
            "name":     v["name"],
            "lang":     v["lang"],
            "language": v["language"],
            "gender":   v["gender"],
            "accent":   v["accent"],
            "region":   v["region"],
            "flag":     v["flag"],
            "category": v["category"],
        }
        if v["category"] == "indian":
            indian.append(entry)
        elif v["category"] == "indian_english":
            indian_english.append(entry)
        else:
            international.append(entry)

    return {
        "voices": list({**{vid: v} for vid, v in VOICES.items()}.keys()),
        "grouped": {
            "indian":         indian,
            "indian_english": indian_english,
            "international":  international,
        },
        "total": len(VOICES),
    }


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Text cannot be empty")
    if len(text) > 5000:
        raise HTTPException(400, "Text exceeds 5,000 character limit")

    voice = VOICES.get(req.voice_id.lower())
    if not voice:
        raise HTTPException(404, f"Voice '{req.voice_id}' not found. Available: {list(VOICES.keys())}")

    # ── Usage limit check ──────────────────────────────────────────────────
    if req.user_id:
        try:
            if sb:
                result = sb.table("users").select("char_used,char_limit,plan") \
                           .eq("id", req.user_id).single().execute()
                if result.data:
                    used  = result.data["char_used"]  or 0
                    limit = result.data["char_limit"] or 10000
                    if used + len(text) > limit:
                        raise HTTPException(429, detail={
                            "error":       "usage_limit_exceeded",
                            "used":        used,
                            "limit":       limit,
                            "upgrade_url": "/pricing",
                            "message":     f"You've used {used:,} of {limit:,} characters. Upgrade to continue."
                        })
        except HTTPException:
            raise
        except Exception as e:
            print(f"Usage check skipped: {e}")

    # ── Synthesize ─────────────────────────────────────────────────────────
    audio_bytes = None
    ext         = "wav"
    engine_used = "gtts"

    if HF_TOKEN:
        try:
            print(f"HuggingFace: {voice['hf_model']} for {voice['language']}")
            audio_bytes = try_huggingface(text, voice["hf_model"])
            ext         = "wav"
            engine_used = "huggingface"
            print(f"HF success: {len(audio_bytes)} bytes")
        except Exception as hf_err:
            print(f"HF failed ({hf_err}), falling back to gTTS")

    if audio_bytes is None:
        try:
            print(f"gTTS: lang={voice['gtts_lang']}")
            audio_bytes = try_gtts(text, voice["gtts_lang"], voice["gtts_tld"])
            ext         = "mp3"
            engine_used = "gtts"
        except Exception as gtts_err:
            raise HTTPException(500, f"All TTS engines failed: {gtts_err}")

    # ── Save to /tmp ───────────────────────────────────────────────────────
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = OUTPUT_DIR / filename
    filepath.write_bytes(audio_bytes)

    # ── Upload to Cloudinary ───────────────────────────────────────────────
    try:
        upload    = cloudinary.uploader.upload(str(filepath), resource_type="video")
        audio_url = upload["secure_url"]
        print(f"Cloudinary: {audio_url}")
    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {str(e)}")
    finally:
        try: filepath.unlink()
        except: pass

    return {
        "audio_url":  audio_url,
        "voice_name": voice["name"],
        "language":   voice["language"],
        "char_count": len(text),
        "engine":     engine_used,
    }


@app.get("/health")
def health():
    return {
        "status":   "ok",
        "version":  "3.0.0",
        "engine":   "huggingface" if HF_TOKEN else "gtts",
        "hf_token": "set" if HF_TOKEN else "missing",
        "voices":   len(VOICES),
        "time":     int(time.time()),
    }

handler = app

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
