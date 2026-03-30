from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
import uuid, time

app = FastAPI(title="VoiceAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path("generated_audio")
OUTPUT_DIR.mkdir(exist_ok=True)

VOICES = {
    "aria":   {"name": "Aria",   "lang": "en", "tld": "com",   "gender": "Female", "accent": "American EN"},
    "ryan":   {"name": "Ryan",   "lang": "en", "tld": "co.uk", "gender": "Male",   "accent": "British EN"},
    "priya":  {"name": "Priya",  "lang": "hi", "tld": "co.in", "gender": "Female", "accent": "Hindi IN"},
    "sofia":  {"name": "Sofia",  "lang": "es", "tld": "es",    "gender": "Female", "accent": "Spanish ES"},
    "lena":   {"name": "Lena",   "lang": "de", "tld": "de",    "gender": "Female", "accent": "German DE"},
    "pierre": {"name": "Pierre", "lang": "fr", "tld": "fr",    "gender": "Male",   "accent": "French FR"},
}

class SynthesizeRequest(BaseModel):
    text: str
    voice_id: str = "aria"
    speed: float = 1.0

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
        raise HTTPException(404, f"Voice '{req.voice_id}' not found. Try: {list(VOICES.keys())}")

    filename = f"{uuid.uuid4()}.mp3"
    filepath = OUTPUT_DIR / filename

    # Try gTTS (online - best quality)
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=voice["lang"], tld=voice["tld"], slow=False)
        tts.save(str(filepath))
        media_type = "audio/mpeg"
    except Exception:
        # Fallback: pyttsx3 (offline - works without internet)
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty("rate", int(200 * req.speed))
            wav_path = str(filepath).replace(".mp3", ".wav")
            engine.save_to_file(text, wav_path)
            engine.runAndWait()
            filepath = Path(wav_path)
            media_type = "audio/wav"
        except Exception as e:
            raise HTTPException(500, f"TTS failed: {str(e)}")

    return FileResponse(
        path=str(filepath),
        media_type=media_type,
        filename=f"voiceai_{req.voice_id}.mp3",
        headers={"X-Voice-Name": voice["name"], "X-Char-Count": str(len(text))}
    )

@app.get("/health")
def health():
    return {"status": "ok", "voices": len(VOICES), "time": int(time.time())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
