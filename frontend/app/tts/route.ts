import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // ── Get auth token from request header ────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const token      = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Create Supabase client with user's token ──────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Check character usage ─────────────────────────────────────────────
  try {
    const { data } = await supabase
      .from("users")
      .select("char_used, char_limit")
      .eq("id", user.id)
      .single();

    if (data) {
      const used  = data.char_used  || 0;
      const limit = data.char_limit || 10000;
      if (used + body.text.length > limit) {
        return NextResponse.json(
          { error: `limit_exceeded: You've used ${used.toLocaleString()} of ${limit.toLocaleString()} characters. Upgrade to continue.` },
          { status: 429 }
        );
      }
    }
  } catch {}

  // ── Forward to Python backend ─────────────────────────────────────────
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/synthesize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...body, user_id: user.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // ── Save to generations table ──────────────────────────────────────
    await supabase.from("generations").insert({
      user_id:    user.id,
      voice_id:   body.voice_id || "priya",
      text:       body.text,
      char_count: body.text.length,
      audio_url:  data.audio_url,
    });

    // ── Increment char_used ────────────────────────────────────────────
    await supabase.rpc("increment_char_used", {
      user_id_input: user.id,
      amount:        body.text.length,
    });

    return NextResponse.json(data);

  } catch (e: any) {
    console.error("TTS proxy error:", e.message);
    return NextResponse.json({ error: "Failed to synthesize audio" }, { status: 500 });
  }
}