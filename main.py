import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import uuid, time, os, requests

load_dotenv()

# ── Cloudinary ─────────────────────────────────────────────────────────────────
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# ── Supabase ───────────────────────────────────────────────────────────────────
from supabase import create_client
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# ── HuggingFace ────────────────────────────────────────────────────────────────
HF_TOKEN  = os.getenv("HF_TOKEN", "")
HF_HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

OUTPUT_DIR = Path("/tmp")

app = FastAPI(title="TwelveLab API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Voice library ──────────────────────────────────────────────────────────────
VOICES = {
    "aria": {
        "name": "Aria",   "lang": "EN", "gender": "Female", "accent": "American",
        "hf_model":   "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang":  "en", "gtts_tld": "com",
    },
    "ryan": {
        "name": "Ryan",   "lang": "EN", "gender": "Male",   "accent": "British",
        "hf_model":   "espnet/kan-bayashi_ljspeech_vits",
        "gtts_lang":  "en", "gtts_tld": "co.uk",
    },
    "priya": {
        "name": "Priya",  "lang": "HI", "gender": "Female", "accent": "Natural",
        "hf_model":   "facebook/mms-tts-hin",
        "gtts_lang":  "hi", "gtts_tld": "co.in",
    },
    "sofia": {
        "name": "Sofia",  "lang": "ES", "gender": "Female", "accent": "Warm",
        "hf_model":   "facebook/mms-tts-spa",
        "gtts_lang":  "es", "gtts_tld": "es",
    },
    "lena": {
        "name": "Lena",   "lang": "DE", "gender": "Female", "accent": "Clear",
        "hf_model":   "facebook/mms-tts-deu",
        "gtts_lang":  "de", "gtts_tld": "de",
    },
    "pierre": {
        "name": "Pierre", "lang": "FR", "gender": "Male",   "accent": "Classic",
        "hf_model":   "facebook/mms-tts-fra",
        "gtts_lang":  "fr", "gtts_tld": "fr",
    },
}

class SynthesizeRequest(BaseModel):
    text:     str
    voice_id: str        = "aria"
    speed:    float      = 1.0
    user_id:  str | None = None


# ── TTS helpers ────────────────────────────────────────────────────────────────
def try_huggingface(text: str, model: str) -> bytes:
    """Call HuggingFace Inference API. Returns raw audio bytes."""
    url = f"https://api-inference.huggingface.co/models/{model}"
    res = requests.post(url, headers=HF_HEADERS, json={"inputs": text}, timeout=30)
    if res.status_code == 503:
        # Model loading — wait and retry once
        print(f"HF model loading, waiting 20s...")
        time.sleep(20)
        res = requests.post(url, headers=HF_HEADERS, json={"inputs": text}, timeout=60)
    if res.status_code != 200:
        raise Exception(f"HF error {res.status_code}: {res.text[:200]}")
    return res.content


def try_gtts(text: str, lang: str, tld: str) -> bytes:
    """Fallback: Google TTS. Returns raw MP3 bytes."""
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
        "version": "2.0.0",
        "engine":  "huggingface" if HF_TOKEN else "gtts",
    }


@app.get("/voices")
def list_voices():
    return {
        "voices": [
            {"id": vid, "name": v["name"], "lang": v["lang"],
             "gender": v["gender"], "accent": v["accent"]}
            for vid, v in VOICES.items()
        ]
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
        raise HTTPException(404, f"Voice '{req.voice_id}' not found.")

    # ── Usage limit check ──────────────────────────────────────────────────
    if req.user_id:
        try:
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

    # ── Synthesize: HuggingFace → gTTS fallback ───────────────────────────
    audio_bytes = None
    ext         = "wav"

    if HF_TOKEN:
        try:
            print(f"HuggingFace: {voice['hf_model']}")
            audio_bytes = try_huggingface(text, voice["hf_model"])
            ext = "wav"
            print(f"HF success: {len(audio_bytes)} bytes")
        except Exception as hf_err:
            print(f"HF failed ({hf_err}), falling back to gTTS")

    if audio_bytes is None:
        try:
            print(f"gTTS fallback: lang={voice['gtts_lang']}")
            audio_bytes = try_gtts(text, voice["gtts_lang"], voice["gtts_tld"])
            ext = "mp3"
            print(f"gTTS success: {len(audio_bytes)} bytes")
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
        print(f"Cloudinary upload success: {audio_url}")
    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {str(e)}")
    finally:
        # Clean up temp file
        try: filepath.unlink()
        except: pass

    return {
        "audio_url":  audio_url,
        "voice_name": voice["name"],
        "char_count": len(text),
        "engine":     "huggingface" if HF_TOKEN and ext == "wav" else "gtts",
    }


@app.get("/health")
def health():
    return {
        "status":    "ok",
        "version":   "2.0.0",
        "engine":    "huggingface" if HF_TOKEN else "gtts",
        "hf_token":  "set" if HF_TOKEN else "missing",
        "voices":    len(VOICES),
        "time":      int(time.time()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
