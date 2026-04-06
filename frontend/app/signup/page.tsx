"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MIN_PASSWORD = 8;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Weak",     color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair",     color: "#f59e0b" };
  if (score === 3) return { score: 3, label: "Good",     color: "#84cc16" };
  return { score: 4, label: "Strong", color: "#22c55e" };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupPage() {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [agreed,   setAgreed]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [sent,     setSent]     = useState(false);
  const router = useRouter();

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("Supabase not configured"); return; }

    if (!isValidEmail(email)) { setError("Please enter a valid email."); return; }
    if (password.length < MIN_PASSWORD) { setError(`Password must be at least ${MIN_PASSWORD} characters.`); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (!agreed) { setError("You must agree to the Terms."); return; }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/confirm-email`,
      },
    });

    setLoading(false);
    if (error) {
      // If already registered but not verified, resend the confirmation email
      if (error.message?.toLowerCase().includes("already") || error.message?.toLowerCase().includes("registered")) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${window.location.origin}/confirm-email` },
        });
        if (resendError) { setError(resendError.message); return; }
        setSent(true);
        return;
      }
      setError(error.message);
      return;
    }
    setSent(true);
  }

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setError("");
    const { error } = await supabase!.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/studio` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="border border-white/10 rounded-2xl p-8 bg-white/2">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-xl font-semibold text-[#f5f3ee] mb-2">Check your email</h2>
            <p className="text-[#6b6860] text-sm mb-6">
              We sent a confirmation link to <span className="text-white">{email}</span>.<br/>
              Click it to verify your account.
            </p>
            <button
              onClick={() => router.push("/studio")}
              className="w-full py-3 rounded-full bg-[#c8f060] text-black font-medium text-sm hover:bg-[#9fcc30] transition-colors"
            >
              Go to Studio
            </button>
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-xs text-[#6b6860] hover:text-[#c8f060] transition-colors mt-4 inline-block disabled:opacity-40"
            >
              {loading ? "Sending…" : "Didn't receive the email? Resend"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8 fade-up">
          <h1 className="text-3xl font-serif text-[#f5f3ee]">
            Twelve<span className="text-[#c8f060]">Lab</span>
          </h1>
          <p className="text-[#6b6860] text-sm mt-2 fade-up d1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="border border-white/10 rounded-2xl p-8 bg-white/2 fade-up d2">
          <div className="flex flex-col gap-4">

            <div>
              <label htmlFor="name" className="text-xs text-[#6b6860] mb-1.5 block">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
            </div>

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
                minLength={MIN_PASSWORD}
                placeholder="At least 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)", transition: "background .2s" }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="text-xs text-[#6b6860] mb-1.5 block">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={MIN_PASSWORD}
                placeholder="Repeat your password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[#c8f060]/40 transition-colors placeholder:text-white/20"
              />
              {confirm && confirm !== password && (
                <span className="text-xs text-red-400 mt-1 block">Passwords don&apos;t match</span>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-1 accent-[#c8f060]" />
              <span className="text-xs text-[#6b6860]">I agree to the <span className="text-white underline">Terms of Service</span> and <span className="text-white underline">Privacy Policy</span></span>
            </label>

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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>

          <div className="text-center mt-6">
            <Link href="/login" className="text-xs text-[#6b6860] hover:text-[#c8f060] transition-colors">
              Already have an account? <span className="text-[#c8f060]">Sign in</span>
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
