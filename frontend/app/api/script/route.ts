import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic, language, tone, duration } = body;

  if (!topic || !language) {
    return NextResponse.json(
      { error: "Topic and language are required" },
      { status: 400 }
    );
  }

  try {
    const result = await generateScript({ topic, language, tone, duration });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Script generation error:", e.message);
    return NextResponse.json(
      { error: "Failed to generate script. Please try again." },
      { status: 500 }
    );
  }
}
