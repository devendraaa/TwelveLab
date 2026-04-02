import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import uuid, time, os

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app = FastAPI(title="VoiceAI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# OUTPUT_DIR = Path("generated_audio")
# OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = Path("/tmp")

VOICES = {
    "aria":   {"name": "Aria",   "lang": "en", "tld": "com",   "gender": "Female", "accent": "American EN"},
    "ryan":   {"name": "Ryan",   "lang": "en", "tld": "co.uk", "gender": "Male",   "accent": "British EN"},
    "priya":  {"name": "Priya",  "lang": "hi", "tld": "co.in", "gender": "Female", "accent": "Hindi IN"},
    "sofia":  {"name": "Sofia",  "lang": "es", "tld": "es",    "gender": "Female", "accent": "Spanish ES"},
    "lena":   {"name": "Lena",   "lang": "de", "tld": "de",    "gender": "Female", "accent": "German DE"},
    "pierre": {"name": "Pierre", "lang": "fr", "tld": "fr",    "gender": "Male",   "accent": "French FR"},
}

class SynthesizeRequest(BaseModel):
    text:     str
    voice_id: str   = "aria"
    speed:    float = 1.0
    user_id:  str | None = None   # ← add this

@app.get("/")
def root():
    return {"status": "VoiceAI API running", "version": "1.0.0"}

@app.get("/voices")
def list_voices():
    return {"voices": [{"id": k, **v} for k, v in VOICES.items()]}

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
    # Get user_id from request header (we'll send it from frontend)
    user_id = req.user_id
    if user_id:
        # from supabase import create_client
        # import os
        # sb = create_client(os.getenv("SUPABASE_URL",""), os.getenv("SUPABASE_SERVICE_KEY",""))
        result = sb.table("users").select("char_used,char_limit,plan").eq("id", user_id).single().execute()
        if result.data:
            used  = result.data["char_used"]  or 0
            limit = result.data["char_limit"] or 10000
            if used + len(text) > limit:
                raise HTTPException(429, {
                    "error":       "usage_limit_exceeded",
                    "used":        used,
                    "limit":       limit,
                    "upgrade_url": "/pricing",
                    "message":     f"You've used {used:,} of {limit:,} characters. Upgrade to continue."
                })

    # ── Synthesize ─────────────────────────────────────────────────────────
    filename = f"{uuid.uuid4()}.mp3"
    filepath = OUTPUT_DIR / filename

    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=voice["lang"], tld=voice["tld"], slow=False)
        tts.save(str(filepath))
        media_type = "audio/mpeg"
    except Exception:
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty("rate", int(200 * req.speed))
            wav_path = str(filepath).replace(".mp3", ".wav")
            engine.save_to_file(text, wav_path)
            engine.runAndWait()
            filepath   = Path(wav_path)
            media_type = "audio/wav"
        except Exception as e:
            raise HTTPException(500, f"TTS failed: {str(e)}")

    try:
        upload = cloudinary.uploader.upload(
            str(filepath),
            resource_type="video"
        )

        audio_url = upload["secure_url"]

    except Exception as e:
        raise HTTPException(500, f"Cloudinary upload failed: {str(e)}")

    return {
        "audio_url": audio_url,
        "voice_name": voice["name"],
        "char_count": len(text)
    }

@app.get("/health")
def health():
    return {"status": "ok", "voices": len(VOICES), "time": int(time.time())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
