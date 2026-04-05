/**
 * Multi-model LLM fallback service for script generation.
 * Tries providers in order: Gemini → Groq → OpenRouter.
 * If one fails (429, 500, timeout), falls back to the next.
 */

type LLMConfig = {
  name: string;
  endpoint: (env: typeof process.env) => string;
  key: (env: typeof process.env) => string | undefined;
  model: string;
  maxTokens: number;
};

type GenerateParams = {
  topic: string;
  language: string;
  tone?: string;
  duration?: string;
};

const MODELS: LLMConfig[] = [
  {
    name: "Gemini",
    endpoint: () => "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    key: (env) => env.GEMINI_API_KEY,
    model: "gemini-2.0-flash",
    maxTokens: 1024,
  },
  {
    name: "Groq",
    endpoint: () => "https://api.groq.com/openai/v1/chat/completions",
    key: (env) => env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    maxTokens: 1024,
  },
  {
    name: "OpenRouter",
    endpoint: () => "https://openrouter.ai/api/v1/chat/completions",
    key: (env) => env.OPENROUTER_API_KEY,
    model: "google/gemini-2.0-flash-exp:free",
    maxTokens: 1024,
  },
];

function buildSystemPrompt() {
  return `You are a scriptwriter for short-form video content (YouTube Shorts, Instagram Reels, TikTok).

Rules:
- Write a punchy, fast-paced script for the given topic
- Hook the viewer in the first 3 seconds
- Use simple, conversational language
- Include natural pauses (—) for TTS readability
- Keep it within the word range for the specified duration
- 15s = ~35-45 words | 30s = ~70-90 words | 60s = ~140-160 words
- Output ONLY the script text, no headings, no markdown, no extra commentary`;
}

function buildUserPrompt(p: GenerateParams) {
  const dur = p.duration === "15s"
    ? "35-45 words (about 15 seconds)"
    : p.duration === "60s"
    ? "140-160 words (about 60 seconds)"
    : "70-90 words (about 30 seconds)";
  const tone = p.tone ? ` Tone: ${p.tone}.` : "";
  return `Write a short video script.\n\nTopic: ${p.topic}\nLanguage: ${p.language}\nDuration: ${dur}${tone}`;
}

async function callGemini(p: GenerateParams, env: typeof process.env): Promise<string> {
  const resp = await fetch(
    MODELS[0].endpoint(env) + `?key=${MODELS[0].key(env)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: buildSystemPrompt() }] },
          { role: "model", parts: [{ text: "Understood. I will follow those rules." }] },
          { role: "user", parts: [{ text: buildUserPrompt(p) }] },
        ],
        generationConfig: { maxOutputTokens: MODELS[0].maxTokens, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!resp.ok) throw new Error(`Gemini: ${resp.status}`);
  const json = await resp.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: empty response");
  return text.trim();
}

async function callGroq(p: GenerateParams, env: typeof process.env): Promise<string> {
  const resp = await fetch(MODELS[1].endpoint(env), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MODELS[1].key(env)}`,
    },
    body: JSON.stringify({
      model: MODELS[1].model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(p) },
      ],
      max_tokens: MODELS[1].maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) throw new Error(`Groq: ${resp.status}`);
  const json = await resp.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq: empty response");
  return text.trim();
}

async function callOpenRouter(p: GenerateParams, env: typeof process.env): Promise<string> {
  const resp = await fetch(MODELS[2].endpoint(env), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MODELS[2].key(env)}`,
      "HTTP-Referer": "https://twelvelab.com",
      "X-Title": "TwelveLab",
    },
    body: JSON.stringify({
      model: MODELS[2].model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(p) },
      ],
      max_tokens: MODELS[2].maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!resp.ok) throw new Error(`OpenRouter: ${resp.status}`);
  const json = await resp.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter: empty response");
  return text.trim();
}

export async function generateScript(
  params: GenerateParams,
  env: typeof process.env = process.env
): Promise<{ script: string; provider: string }> {
  const callers = [callGemini, callGroq, callOpenRouter];
  const errors: string[] = [];

  for (let i = 0; i < callers.length; i++) {
    const keyFn = MODELS[i].key;
    const key = keyFn(env);
    if (!key) {
      errors.push(`${MODELS[i].name}: API key not set`);
      continue;
    }

    try {
      const script = await callers[i](params, env);
      return { script, provider: MODELS[i].name };
    } catch (e: any) {
      errors.push(`${MODELS[i].name}: ${e.message}`);
      // Only try fallback for rate limits (429) and server errors (5xx)
      const status = parseInt(e.message.split(":")[1] || "0", 10);
      if (status !== 0 && status < 400) throw e; // non-retryable client error
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`);
}
