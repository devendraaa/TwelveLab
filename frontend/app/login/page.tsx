"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("Supabase not configured"); return; }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/studio");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8 fade-up">
          <h1 className="text-3xl font-serif text-[#f5f3ee]">
            Twelve<span className="text-[#c8f060]">Lab</span>
          </h1>
          <p className="text-[#6b6860] text-sm mt-2 fade-up d1">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-white/10 rounded-2xl p-8 bg-white/2 fade-up d2">
          <div className="flex flex-col gap-4">

            <div>
              <label htmlFor="email" className="text-xs text-[#6b6860] mb-1.5 block">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs text-[#6b6860] mb-1.5 block">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
            </div>

            {error && (
              <div className="text-xs px-4 py-3 rounded-lg border text-red-400 bg-red-400/10 border-red-400/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#c8f060] text-black font-medium text-sm hover:bg-[#9fcc30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <div className="text-center mt-6 flex flex-col gap-3 items-center">
            <Link href="/confirm" className="text-xs text-[#6b6860] hover:text-white transition-colors">
              Forgot your password?
            </Link>
            <Link href="/signup" className="text-xs text-[#6b6860] hover:text-[#c8f060] transition-colors">
              Don&apos;t have an account? <span className="text-[#c8f060]">Sign up</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
