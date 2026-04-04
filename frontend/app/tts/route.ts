import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Read token from Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  // Verify the auth token by calling Supabase's /user endpoint directly
  // This is more reliable than createClient(SUPABASE_URL, anonKey).auth.getUser(token)
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (!verifyRes.ok) {
    console.error("Supabase auth verification failed:", verifyRes.status, await verifyRes.text());
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyRes.json();

  // Check character usage
  try {
    const { data } = await supabase
      .from("users")
      .select("char_used, char_limit")
      .eq("id", user.id)
      .single();

    if (data) {
      const used = data.char_used || 0;
      const limit = data.char_limit || 10000;
      if (used + body.text.length > limit) {
        return NextResponse.json(
          { error: `Usage limit reached (${used.toLocaleString()}/${limit.toLocaleString()})` },
          { status: 429 }
        );
      }
    }
  } catch {}

  // Forward to backend
  try {
    const url = `${API_BASE}/synthesize`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.BACKEND_API_KEY!,
      },
      body: JSON.stringify({ ...body, user_id: user.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Save generation history
    await supabase.from("generations").insert({
      user_id: user.id,
      voice_id: body.voice_id || "priya",
      text: body.text,
      char_count: body.text.length,
      audio_url: data.audio_url,
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("TTS proxy error:", e.message);
    return NextResponse.json({ error: "Failed to synthesize audio" }, { status: 500 });
  }
}
