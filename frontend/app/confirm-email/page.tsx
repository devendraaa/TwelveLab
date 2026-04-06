"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmEmailPage() {
  const [status, setStatus]       = useState<"checking" | "success" | "error">("checking");
  const [error, setError]         = useState("");
  const [email, setEmail]         = useState("");
  const [resending, setResending] = useState(false);
  const [sent, setSent]           = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!supabase) { setError("Supabase not configured"); setStatus("error"); return; }

    async function verify() {
      if (!supabase) { setError("Supabase not configured"); setStatus("error"); return; }
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // Check if there's an error hash from Supabase redirect
        const next = searchParams.get("next") || "/studio";
        // If no session, the token may be invalid or expired
        setError("Invalid or expired link. Please sign up again or request a new confirmation email.");
        setStatus("error");
        return;
      }

      // Session exists and user is verified
      router.push(searchParams.get("next") || "/studio");
    }

    verify();
  }, [router, searchParams]);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError("");
    const { error } = await supabase!.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/confirm-email` },
    });
    setResending(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="border border-white/10 rounded-2xl p-8 bg-white/2">
            <div className="animate-pulse text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-[#f5f3ee] mb-2">Verifying your email…</h2>
            <p className="text-[#6b6860] text-sm">Please wait while we confirm your account.</p>
          </div>
        </div>
      </main>
    );
  }

  if (status === "success" || sent) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="border border-white/10 rounded-2xl p-8 bg-white/2">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-[#f5f3ee] mb-2">Email sent</h2>
            <p className="text-[#6b6860] text-sm mb-6">
              A new confirmation link has been sent to <span className="text-white">{email}</span>.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-full bg-[#c8f060] text-black font-medium text-sm hover:bg-[#9fcc30] transition-colors"
            >
              Back to Sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  // error state - let user request a new confirmation email
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#f5f3ee]">
            Twelve<span className="text-[#c8f060]">Lab</span>
          </h1>
          <p className="text-[#6b6860] text-sm mt-2">Confirm your email</p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleResend(); }} className="border border-white/10 rounded-2xl p-8 bg-white/2">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#6b6860] text-center mb-2">Enter your email below to receive a new confirmation link.</p>

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

            {error && (
              <div className="text-xs px-4 py-3 rounded-lg border text-red-400 bg-red-400/10 border-red-400/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={resending}
              className="w-full py-3 rounded-full bg-[#c8f060] text-black font-medium text-sm hover:bg-[#9fcc30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
          </div>

          <div className="text-center mt-6">
            <a href="/login" className="text-xs text-[#6b6860] hover:text-[#c8f060] transition-colors">
              &larr; Back to sign in
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
