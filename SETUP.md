# VoiceAI — Next Steps Setup Guide

## What you have now
- [x] Landing page (index.html) — ready to deploy
- [x] FastAPI backend (main.py) — working TTS with 6 voices
- [x] Studio page component (studio-page.tsx) — ready to drop into Next.js

---

## Step 1 — Run the backend locally (15 minutes)

```bash
# Navigate to backend folder
cd voiceai-app/backend

# Activate virtual environment
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Start the server
uvicorn main:app --reload

# Test it works — open in browser:
# http://localhost:8000/docs       ← interactive API docs (auto-generated!)
# http://localhost:8000/voices     ← list all voices
```

### Test synthesis with curl:
```bash
curl -X POST http://localhost:8000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from VoiceAI", "voice_id": "aria"}' \
  --output test.mp3

# Open test.mp3 — you should hear "Hello from VoiceAI"
```

---

## Step 2 — Create the Next.js frontend (20 minutes)

```bash
# In a NEW terminal tab (keep backend running)
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --no-git

cd frontend

# Copy the studio page
mkdir -p app/studio
cp ../frontend-setup/studio-page.tsx app/studio/page.tsx

# Copy env file
cp ../frontend-setup/.env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start frontend
npm run dev
# Open: http://localhost:3000/studio
```

---

## Step 3 — Supabase setup (30 minutes)

1. Go to supabase.com → Create project → name it "voiceai"
2. Copy your Project URL + anon key into .env.local
3. Run this SQL in Supabase SQL Editor to create the DB:

```sql
-- Users table (extends Supabase Auth)
create table public.users (
  id          uuid references auth.users primary key,
  email       text unique not null,
  plan        text default 'free',
  char_used   int  default 0,
  char_limit  int  default 10000,
  created_at  timestamptz default now()
);

-- Generations history
create table public.generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users,
  voice_id    text not null,
  text        text not null,
  char_count  int not null,
  audio_url   text,
  created_at  timestamptz default now()
);

-- Row Level Security (users only see their own data)
alter table public.users       enable row level security;
alter table public.generations enable row level security;

create policy "Users see own profile"
  on public.users for all using (auth.uid() = id);

create policy "Users see own generations"
  on public.generations for all using (auth.uid() = user_id);
```

---

## Step 4 — Deploy backend to Render.com (20 minutes)

1. Push your backend folder to GitHub
2. Go to render.com → New → Web Service → Connect GitHub repo
3. Set:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env vars from .env.example in the Render dashboard
5. Deploy — get your URL: `https://voiceai-api.onrender.com`
6. Update frontend .env.local: `NEXT_PUBLIC_API_URL=https://voiceai-api.onrender.com`

---

## Step 5 — Deploy frontend to Vercel (5 minutes)

```bash
cd frontend
npx vercel
# Follow prompts — it auto-detects Next.js
# Add all env vars from .env.local in the Vercel dashboard
```

---

## What you'll have after these 5 steps

- Live landing page at yourdomain.vercel.app
- Working /studio page with real TTS in 6 voices
- Deployed backend API
- Database ready for users

## Next after that → Stripe subscriptions (Phase 4)
