import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Backend URL: use explicitly set API URL, or derive from current origin
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Service role key for server-side Supabase operations (bypasses RLS)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Use service key for server-side operations (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

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

  // Forward to backend (Vercel routes /api/* → api/index.py)
  try {
    const url = `${API_BASE}/api/synthesize`;
    console.log("Calling backend:", url);
    console.log("BACKEND_API_KEY set:", !!process.env.BACKEND_API_KEY);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.BACKEND_API_KEY!,
      },
      body: JSON.stringify({ ...body, user_id: user.id }),
    });

    let data: Record<string, unknown> = {};
    const raw = await res.text();
    console.log("Backend response status:", res.status);
    console.log("Backend response body:", raw.slice(0, 500));
    try { data = JSON.parse(raw); } catch {}

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Save generation history
    const payload: Record<string, unknown> = {
      user_id: user.id,
      voice_id: body.voice_id || "priya",
      text: body.text,
      char_count: body.text.length,
      audio_url: data.audio_url as string,
    };

    // Only include speed if the column exists
    if (body.speed !== undefined) {
      payload.speed = body.speed;
    }

    const { error: insertError } = await supabase.from("generations").insert(payload);

    if (insertError) {
      console.error("Supabase insert failed:", insertError);
    }

    // Increment character usage count on the user's profile
    await supabase.rpc("increment_char_used", {
      user_id_input: user.id,
      amount: body.text.length,
    });

    return NextResponse.json(data);
  } catch (e: any) {
    console.error("TTS proxy error:", e);
    return NextResponse.json({ error: "Failed to synthesize audio", detail: e.message }, { status: 500 });
  }
}
