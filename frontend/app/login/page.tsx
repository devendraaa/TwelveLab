"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [mode,     setMode]     = useState<"login"|"signup">("login");
  const router = useRouter();

  async function handleSubmit() {
    if (!supabase) { setError("Supabase not configured"); return; }
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setError("Check your email for a confirmation link!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/studio");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#f5f3ee]">
            Tweleve<span className="text-[#c8f060]">Lab</span>
          </h1>
          <p className="text-[#6b6860] text-sm mt-2">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div className="border border-white/10 rounded-2xl p-8 bg-white/2">

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#6b6860] mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="text-xs text-[#6b6860] mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
            </div>

            {error && (
              <div className={`text-xs px-4 py-3 rounded-lg border ${
                error.includes("Check your email")
                  ? "text-green-400 bg-green-400/10 border-green-400/20"
                  : "text-red-400 bg-red-400/10 border-red-400/20"
              }`}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#c8f060] text-black font-medium text-sm hover:bg-[#9fcc30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="text-xs text-[#6b6860] hover:text-white transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
