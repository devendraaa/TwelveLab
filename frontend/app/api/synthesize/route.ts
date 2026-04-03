import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  if (!API_BASE || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Auth proxy: missing env variables, forwarding without backend calls");
  }

  const body = await req.json();

  // Auth check (get user from Supabase cookie)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      body: JSON.stringify({
        ...body,
        user_id: user.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Save to Supabase generation history
    await supabase.from("generations").insert({
      user_id: user.id,
      voice_id: body.voice_id || "priya",
      text: body.text,
      char_count: body.text.length,
      audio_url: data.audio_url,
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("Auth proxy error:", e.message);
    return NextResponse.json({ error: "Failed to synthesize audio" }, { status: 500 });
  }
}
