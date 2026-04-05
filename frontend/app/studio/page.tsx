"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { VOICES, SAMPLES, VC } from "@/lib/voices";
import { useAuth } from "@/hooks/use-auth";
import { DesktopSidebar, MobileDrawer } from "@/components/sidebar";
import type { ClonedVoice } from "@/lib/types";

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "HI", label: "हिन्दी (Hindi)" },
  { code: "MR", label: "मराठी (Marathi)" },
  { code: "ES", label: "Español" },
  { code: "DE", label: "Deutsch" },
  { code: "FR", label: "Français" },
];
const DURATIONS = ["15s", "30s", "60s"];

export default function StudioPage() {
  const { user, mounted, logout } = useAuth();
  const router = useRouter();
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);

  const [text,        setText]        = useState(SAMPLES["Podcast"]);
  const [voiceId,     setVoiceId]     = useState("aria");
  const [speed,       setSpeed]       = useState(1.0);
  const [loading,     setLoading]     = useState(false);
  const [audioUrl,    setAudioUrl]    = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [charUsed,    setCharUsed]    = useState(0);
  const [charLimit]                   = useState(10000);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [navOpen,     setNavOpen]     = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);
  const [genCount,    setGenCount]    = useState(0);
  // Script AI mode
  const [scriptMode, setScriptMode] = useState(false);
  const [topic, setTopic] = useState("");
  const [scriptLang, setScriptLang] = useState("EN");
  const [duration, setDuration] = useState("30s");
  const [genScriptLoading, setGenScriptLoading] = useState(false);
  const [isCSR, setIsCSR] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsCSR(true);
  }, []);

  const voiceParam = isCSR ? new URLSearchParams(window.location.search).get("voice") : null;

  const isCloned = voiceId.startsWith("cloned-");
  const clonedVoice = isCloned ? clonedVoices.find(v => v.id === voiceId.replace("cloned-", "")) : null;

  const charCount  = text.length;
  const usagePct   = Math.min((charUsed / charLimit) * 100, 100);
  const builtInVoice = !isCloned ? VOICES.find(v => v.id === voiceId) : null;
  const voiceName  = clonedVoice?.name || builtInVoice?.name || voiceId;
  const voiceLang  = builtInVoice?.lang || "Custom";
  const color      = isCloned ? "#a78bfa" : (VC[voiceId] || "#888");
  const isLimit    = error?.includes("limit_exceeded");

  useEffect(() => {
    if (!mounted || !supabase || !user) return;
    (async () => {
      const { data: userData } = await supabase.from("users").select("char_used").eq("id", user.id).single();
      if (userData) setCharUsed(userData.char_used || 0);
      const { count } = await supabase.from("generations").select("*", { count:"exact", head:true }).eq("user_id", user.id);
      setGenCount(count || 0);
      // Load cloned voices
      const { data: cvData } = await supabase.from("cloned_voices").select("*").eq("user_id", user.id).eq("status", "ready").order("created_at", { ascending: false });
      if (cvData) setClonedVoices(cvData as ClonedVoice[]);
      if (voiceParam) {
        setVoiceId(`cloned-${voiceParam}`);
      }
    })();
  }, [mounted, user]);

  async function generateScript() {
    if (!topic.trim() || genScriptLoading) return;
    setGenScriptLoading(true);
    setError(null);
    try {
      const res = await fetch("/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), language: scriptLang, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate script");
      setText(data.script);
    } catch (e: any) {
      console.error("Script generation error:", e);
      setError(e.message);
    } finally {
      setGenScriptLoading(false);
    }
  }

  async function generate() {
    if (!supabase || !text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const supabaseUser = await supabase.auth.getUser();
      const currentUser = supabaseUser.data?.user;

      if (!currentUser) {
        setError("You must be logged in to generate audio.");
        return;
      }

      const effectiveVoice = isCloned ? (clonedVoice?.voice_path || clonedVoice?.id || voiceId) : voiceId;
      const res = await fetch("/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ text, voice_id: effectiveVoice, speed, is_cloned: isCloned }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429)
          throw new Error("limit_exceeded: " + (data.detail || "Usage limit reached."));
        throw new Error(data.error || data.detail || "Generation failed");
      }

      if (!data.audio_url)
        throw new Error("Audio URL missing");

      setAudioUrl(data.audio_url);

      setTimeout(() => {
        audioRef.current?.play();
        setIsPlaying(true);
      }, 100);

      setCharUsed(p => p + text.length);
      setGenCount(p => p + 1);

    } catch (e: any) {
      console.error("Generate error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <>
      <style>{`
        /* Fonts now loaded in globals.css */

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html {
          font-family: 'Geist', sans-serif;
          background: #050505;
          color: #e8e4de;
          -webkit-text-size-adjust: 100%;
          touch-action: manipulation;
          overflow-x: hidden;
          width: 100%;
        }
        body {
          overflow-x: hidden;
          width: 100%;
          min-height: 100dvh;
        }

        /* ── Keyframes ── */
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes slideL   { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        @keyframes waveBar  { 0%,100%{transform:scaleY(.15)} 50%{transform:scaleY(1)} }
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(200,240,96,0.15)} 50%{box-shadow:0 0 40px rgba(200,240,96,0.35)} }
        @keyframes borderPulse { 0%,100%{border-color:rgba(200,240,96,0.2)} 50%{border-color:rgba(200,240,96,0.5)} }

        .fu  { animation: fadeUp .45s ease both; }
        .d1  { animation-delay:.06s; }
        .d2  { animation-delay:.12s; }
        .d3  { animation-delay:.18s; }
        .d4  { animation-delay:.24s; }
        .d5  { animation-delay:.30s; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }

        /* ── Range slider ── */
        input[type=range] {
          -webkit-appearance:none; appearance:none;
          width:100%; height:2px; border-radius:1px;
          background:rgba(255,255,255,0.1); outline:none; cursor:pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance:none; width:20px; height:20px; border-radius:50%;
          background:#c8f060; cursor:pointer; border:3px solid #050505;
          box-shadow:0 0 0 1px rgba(200,240,96,0.3);
          transition:transform .15s, box-shadow .15s;
        }
        input[type=range]::-webkit-slider-thumb:active { transform:scale(1.2); box-shadow:0 0 0 4px rgba(200,240,96,0.2); }

        /* ── Textarea ── */
        textarea { -webkit-tap-highlight-color:transparent; }
        textarea::placeholder { color:rgba(255,255,255,0.18); }
        textarea:focus { outline:none; }

        /* ── Overlay ── */
        .overlay {
          position:fixed; inset:0; z-index:60;
          background:rgba(0,0,0,0.8);
          backdrop-filter:blur(8px);
          animation:fadeIn .2s ease;
        }

        /* ── Nav drawer ── */
        .nav-drawer {
          position:fixed; top:0; left:0; bottom:0; width:min(280px,85vw);
          background:#0a0a0a; border-right:1px solid rgba(255,255,255,0.07);
          z-index:70; display:flex; flex-direction:column;
          animation:slideL .25s cubic-bezier(.4,0,.2,1);
          overflow-y:auto;
        }

        /* ── Topbar ── */
        .topbar {
          position:sticky; top:0; z-index:40;
          padding:14px 16px;
          background:rgba(5,5,5,0.92);
          backdrop-filter:blur(16px);
          border-bottom:1px solid rgba(255,255,255,0.06);
          display:flex; align-items:center; justify-content:space-between;
          gap:12px;
        }

        /* ── Cards ── */
        .card {
          background:#0d0d0d;
          border:1px solid rgba(255,255,255,0.07);
          border-radius:20px;
          overflow:hidden;
        }
        .card-header {
          padding:14px 18px;
          border-bottom:1px solid rgba(255,255,255,0.06);
          display:flex; align-items:center; justify-content:space-between;
        }

        /* ── Voice pill ── */
        .voice-pill {
          display:flex; align-items:center; gap:8px;
          padding:10px 14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.07);
          background:transparent; cursor:pointer;
          transition:all .2s ease; flex-shrink:0;
          font-family:var(--font-inter), 'Inter', sans-serif;
        }
        .voice-pill:active { transform:scale(.96); }

        /* ── Gen button ── */
        .gen-btn {
          width:100%; padding:18px; border-radius:18px;
          background:#c8f060; color:#000; border:none;
          font-size:16px; font-weight:700; letter-spacing:.02em;
          font-family:'Space Grotesk',var(--font-space-grotesk),sans-serif;
          cursor:pointer; transition:all .2s ease;
          display:flex; align-items:center; justify-content:center; gap:10px;
          position:relative; overflow:hidden;
        }
        .gen-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
          background-size:200% 100%; transform:translateX(-100%);
          transition:transform .4s ease;
        }
        .gen-btn:hover::before { transform:translateX(100%); }
        .gen-btn:hover:not(:disabled) { background:#d4f570; transform:translateY(-2px); box-shadow:0 12px 32px rgba(200,240,96,0.25); }
        .gen-btn:active:not(:disabled) { transform:translateY(0) scale(.99); }
        .gen-btn:disabled { background:rgba(200,240,96,0.35); color:rgba(0,0,0,0.5); cursor:not-allowed; }

        /* ── Sample chip ── */
        .chip {
          padding:6px 14px; border-radius:100px;
          border:1px solid rgba(255,255,255,0.08);
          background:transparent; color:rgba(255,255,255,0.38);
          font-size:12px; cursor:pointer; white-space:nowrap;
          font-family:var(--font-inter), 'Inter', sans-serif; transition:all .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .chip:active { transform:scale(.95); }
        .chip.active { border-color:rgba(200,240,96,0.4); color:#c8f060; background:rgba(200,240,96,0.07); }

        /* ── Nav item ── */
        .nav-item {
          width:100%; display:flex; align-items:center; gap:12px;
          padding:12px 16px; border-radius:12px; border:none;
          background:transparent; cursor:pointer;
          font-family:var(--font-inter), 'Inter', sans-serif; font-size:15px; font-weight:400;
          text-align:left; transition:all .15s; color:rgba(255,255,255,0.5);
          -webkit-tap-highlight-color:transparent;
        }
        .nav-item:active { background:rgba(255,255,255,0.06) !important; }
        .nav-item.active { background:rgba(200,240,96,0.09); color:#c8f060; }

        /* ── Usage bar ── */
        .usage-fill {
          height:100%; border-radius:2px; transition:width .8s cubic-bezier(.4,0,.2,1);
        }

        /* ── Wave bars ── */
        .wbar { transform-origin:bottom; }
        .wbar.playing { animation:waveBar var(--d,1s) ease-in-out infinite; }

        /* ── Shimmer loading ── */
        .shimmer {
          background:linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
          background-size:200% 100%; animation:shimmer 1.5s infinite;
          border-radius:8px;
        }

        /* ── Stats badge ── */
        .stat-badge {
          display:flex; flex-direction:column; align-items:center;
          padding:12px 16px; border-radius:16px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.06);
          flex:1;
        }

        /* ── Mobile-first layout ── */
        .page-wrap {
          width:100%; max-width:100vw; overflow-x:hidden;
          padding:16px; padding-bottom:32px;
          display:flex; flex-direction:column; gap:14px;
        }

        /* ── Desktop: 2-col layout ── */
        @media (min-width:900px) {
          .page-wrap { max-width:1100px; margin:0 auto; padding:28px; flex-direction:row; align-items:start; gap:24px; }
          .left-col  { flex:1; min-width:0; display:flex; flex-direction:column; gap:16px; }
          .right-col { width:300px; flex-shrink:0; display:flex; flex-direction:column; gap:14px; position:sticky; top:80px; }
          .voice-row { display:none !important; }
          .right-col-voice { display:flex !important; }
        }
        @media (max-width:899px) {
          .left-col  { display:flex; flex-direction:column; gap:14px; }
          .right-col { display:none; }
          .voice-row { display:flex !important; }
        }

        .right-col-voice { display:none; }

        /* ── Desktop sidebar ── */
        @media (min-width:900px) {
          .topbar-hamburger { display:none !important; }
          body { padding-left:240px; }
          .desktop-sidebar {
            display:flex !important;
            position:fixed; top:0; left:0; bottom:0; width:240px;
            background:#0a0a0a; border-right:1px solid rgba(255,255,255,0.07);
            flex-direction:column; z-index:30; overflow-y:auto;
          }
        }
        @media (max-width:899px) {
          .desktop-sidebar { display:none !important; }
        }
      `}</style>

      {/* ── SIDEBARS ──────────────────────────────────────────────────────── */}
      <MobileDrawer
        user={user} charUsed={charUsed} charLimit={charLimit}
        genCount={genCount} activeRoute="studio"
        open={navOpen} onClose={() => setNavOpen(false)}
        onLogout={logout}
      />
      <DesktopSidebar
        user={user} charUsed={charUsed} charLimit={charLimit}
        genCount={genCount} activeRoute="studio"
        onLogout={logout}
      />

      {/* ── TOPBAR ────────────────────────────────────────────────────────── */}
      <div className="topbar">
        <button className="topbar-hamburger" onClick={() => setNavOpen(true)} style={{
          background:"rgba(255,255,255,0.07)", border:"none",
          color:"rgba(255,255,255,0.7)", cursor:"pointer",
          padding:"9px", borderRadius:"11px", display:"flex", alignItems:"center",
          flexShrink:0,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"18px", fontWeight:800, letterSpacing:"-0.3px" }}>
          Twelve<span style={{ color:"#c8f060" }}>Lab</span>
        </div>

        {/* Right: voice indicator + user */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
          <div style={{ fontSize:"12px", padding:"5px 11px", borderRadius:"100px", border:`1px solid ${color}30`, color:color, background:`${color}0d`, fontFamily:"var(--font-inter), 'Inter', sans-serif", whiteSpace:"nowrap" }}>
            {voiceName}{isCloned ? " " : " · "}{isCloned ? "" : voiceLang}
          </div>
          <button onClick={() => setUserOpen(!userOpen)} style={{
            width:"34px", height:"34px", borderRadius:"50%", border:"none",
            background:"linear-gradient(135deg,#c8f060,#7fc22a)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"14px", fontWeight:700, color:"#000", cursor:"pointer", flexShrink:0,
          }}>
            {user?.email?.charAt(0).toUpperCase()}
          </button>
          {/* Mobile user dropdown */}
          {userOpen && (
            <>
              <div onClick={() => setUserOpen(false)} style={{ position:"fixed", inset:0, zIndex:49 }}/>
              <div style={{ position:"absolute", top:"calc(100% + 8px)", right:"16px", background:"#181818", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px", overflow:"hidden", zIndex:50, minWidth:"200px", boxShadow:"0 16px 48px rgba(0,0,0,0.6)" }}>
                <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>Signed in as</div>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.8)", marginTop:"2px", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.email}</div>
                </div>
                <div style={{ padding:"6px" }}>
                  <button onClick={logout} className="nav-item" style={{ color:"#f87171", padding:"10px 12px", fontSize:"13px" }}>Sign out</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── PAGE CONTENT ──────────────────────────────────────────────────── */}
      <div className="page-wrap">

        {/* LEFT COLUMN */}
        <div className="left-col">

          {/* Page title */}
          <div className="fu" style={{ paddingBottom:"4px" }}>
            <h1 style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"clamp(22px,6vw,28px)", fontWeight:800, letterSpacing:"-0.5px", lineHeight:1.1 }}>
              Text to Speech
            </h1>
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.32)", marginTop:"5px" }}>
              Convert any text to lifelike audio instantly
            </p>
          </div>

          {/* Text editor card */}
          <div className="card fu d1">
            <div className="card-header">
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#c8f060", animation:"pulse 2.5s ease infinite" }}/>
                <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.4)", letterSpacing:".07em" }}>{scriptMode ? "SCRIPT AI" : "TEXT INPUT"}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                {scriptMode && <span style={{ fontSize:"12px", color:"rgba(167,139,250,0.5)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>({duration})</span>}
                <span style={{ fontSize:"12px", color: charCount > 4500 ? "#fb923c" : "rgba(255,255,255,0.2)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>
                  {charCount.toLocaleString()} / 5,000
                </span>
              </div>
            </div>

            {/* Script AI mode controls */}
            {scriptMode && (
              <div style={{ padding:"16px 18px 0" }}>
                <div style={{ display:"flex", flexDirection:"row", gap:"8px", flexWrap:"wrap" }}>
                  <input
                    value={topic} onChange={e => setTopic(e.target.value)} maxLength={500}
                    placeholder="Enter your topic… e.g. 'healthy food tips'"
                    style={{
                      flex:1, minWidth:"160px", padding:"10px 14px",
                      borderRadius:"12px", border:"1px solid rgba(255,255,255,0.1)",
                      background:"rgba(255,255,255,0.03)", color:"#e8e4de",
                      fontSize:"14px", fontFamily:"var(--font-inter), 'Inter', sans-serif",
                    }}
                  />
                  <select value={scriptLang} onChange={e => setScriptLang(e.target.value)}
                    style={{
                      padding:"10px 12px", borderRadius:"12px",
                      border:"1px solid rgba(255,255,255,0.1)",
                      background:"rgba(255,255,255,0.03)", color:"#e8e4de",
                      fontSize:"14px", fontFamily:"var(--font-inter), 'Inter', sans-serif",
                      cursor:"pointer",
                    }}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <div style={{ display:"flex", gap:"4px" }}>
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)} style={{
                        padding:"8px 12px", borderRadius:"10px",
                        border:`1px solid ${duration===d ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                        background: duration===d ? "rgba(167,139,250,0.1)" : "transparent",
                        color: duration===d ? "#a78bfa" : "rgba(255,255,255,0.4)",
                        fontSize:"12px", fontWeight:600,
                        fontFamily:"var(--font-inter), 'Inter', sans-serif",
                        cursor:"pointer",
                      }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateScript} disabled={!topic.trim() || genScriptLoading} style={{
                  marginTop:"12px", padding:"10px 24px", borderRadius:"12px",
                  border:"none", cursor: topic.trim() && !genScriptLoading ? "pointer" : "not-allowed",
                  background: topic.trim() && !genScriptLoading
                    ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                    : "rgba(167,139,250,0.2)",
                  color: "#fff", fontSize:"14px", fontWeight:600,
                  fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif",
                  display:"flex", alignItems:"center", gap:"8px",
                }}>
                  {genScriptLoading ? (
                    <>
                      <div style={{ width:"16px", height:"16px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.25)", borderTop:"2px solid #fff", animation:"spin .7s linear infinite" }}/>
                      Generating…
                    </>
                  ) : (
                    <>✦ Generate Script</>
                  )}
                </button>
              </div>
            )}

            <textarea
              value={text} onChange={e => setText(e.target.value)} maxLength={5000}
              placeholder={scriptMode ? "Your script will appear here…" : "Type or paste your text here…"}
              style={{
                width:"100%", minHeight:"clamp(130px,20vh,200px)",
                background:"transparent", border:"none",
                color:"rgba(255,255,255,0.82)", padding:"18px",
                fontSize:"16px", lineHeight:"1.8", resize:"none",
                fontFamily:"var(--font-inter), 'Inter', sans-serif", fontWeight:300,
              }}
            />

            {/* Progress bar */}
            <div style={{ height:"2px", background:"rgba(255,255,255,0.05)", margin:"0 18px 14px" }}>
              <div style={{
                height:"100%", borderRadius:"1px", transition:"width .3s ease",
                width:`${(charCount/5000)*100}%`,
                background: charCount>4500?"#fb923c" : charCount>3000?"#facc15":"#c8f060",
              }}/>
            </div>

            {/* Sample chips — only show in normal mode */}
            {!scriptMode && (
              <div style={{ padding:"0 16px 16px", display:"flex", gap:"6px", overflowX:"auto", scrollbarWidth:"none" }}>
                {Object.keys(SAMPLES).map(key => (
                  <button key={key} className={`chip ${text===SAMPLES[key]?"active":""}`}
                    onClick={() => setText(SAMPLES[key])}>
                    {key}
                  </button>
                ))}
              </div>
            )}

            {/* Script AI toggle — at the bottom of the card */}
            <div style={{ padding:"0 18px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
              <button onClick={() => setScriptMode(!scriptMode)} style={{
                padding:"6px 14px", borderRadius:"100px",
                border:`1px solid ${scriptMode ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                background: scriptMode ? "rgba(167,139,250,0.08)" : "transparent",
                color: scriptMode ? "#a78bfa" : "rgba(255,255,255,0.3)",
                fontSize:"11px", fontWeight:500,
                fontFamily:"var(--font-inter), 'Inter', sans-serif",
                cursor:"pointer", transition:"all .15s",
              }}>
                Script AI — {scriptMode ? "ON" : "OFF"}
              </button>
              {scriptMode && <span style={{ fontSize:"11px", color:"rgba(167,139,250,0.35)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>Generate scripts for shorts &amp; reels</span>}
            </div>
          </div>

          {/* Voice row — mobile only */}
          <div className="voice-row fu d2" style={{ display:"none", flexDirection:"column", gap:"10px" }}>
            <div style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.35)", letterSpacing:".07em" }}>VOICE</div>
            <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"4px", scrollbarWidth:"none" }}>
              {VOICES.map(v => (
                <button key={v.id} className="voice-pill"
                  onClick={() => setVoiceId(v.id)}
                  style={{
                    borderColor: voiceId===v.id ? VC[v.id]+"60" : undefined,
                    background:  voiceId===v.id ? VC[v.id]+"12" : undefined,
                  }}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", flexShrink:0, background:`${VC[v.id]}18`, border:`1px solid ${VC[v.id]}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:700, color:VC[v.id], fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>
                    {v.name[0]}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:"13px", fontWeight:500, color: voiceId===v.id?"#e8e4de":"rgba(255,255,255,0.55)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>{v.name}</div>
                    <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"1px" }}>{v.emoji} {v.lang}</div>
                  </div>
                  {voiceId===v.id && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:VC[v.id], marginLeft:"auto", flexShrink:0 }}/>}
                </button>
              ))}
              {clonedVoices.filter(v => v.status === "ready").map(v => (
                <button key={v.id} className="voice-pill"
                  onClick={() => setVoiceId(`cloned-${v.id}`)}
                  style={{
                    borderColor: voiceId===`cloned-${v.id}` ? "#a78bfa60" : undefined,
                    background:  voiceId===`cloned-${v.id}` ? "#a78bfa12" : undefined,
                  }}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"50%", flexShrink:0, background:"#a78bfa18", border:"1px solid #a78bfa35", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#a78bfa", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>

                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:"11px", fontWeight:600, color: voiceId===`cloned-${v.id}`?"#e8e4de":"rgba(255,255,255,0.55)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>{v.name}</div>
                    <div style={{ fontSize:"9px", color:"#a78bfa", marginTop:"1px" }}>Custom</div>
                  </div>
                  {voiceId===`cloned-${v.id}` && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#a78bfa", marginLeft:"auto", flexShrink:0 }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Speed — mobile */}
          <div className="card fu d2 voice-row" style={{ display:"none", padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>Speed</span>
              <span style={{ fontSize:"13px", fontWeight:500, color:"#c8f060", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>{speed.toFixed(1)}×</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}/>
          </div>

          {/* Generate button */}
          <button className="gen-btn fu d3" onClick={generate} disabled={loading || !text.trim()}>
            {loading ? (
              <>
                <div style={{ width:"20px", height:"20px", borderRadius:"50%", border:"2.5px solid rgba(0,0,0,0.25)", borderTop:"2.5px solid #000", animation:"spin .7s linear infinite" }}/>
                Synthesizing audio…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" opacity=".2"/>
                  <path d="M8 7l6 3-6 3V7Z" fill="currentColor"/>
                </svg>
                Generate Speech
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="fu" style={{
              padding:"16px 18px", borderRadius:"18px",
              background: isLimit?"rgba(251,146,60,0.07)":"rgba(239,68,68,0.07)",
              border:`1px solid ${isLimit?"rgba(251,146,60,0.2)":"rgba(239,68,68,0.2)"}`,
              animation:"borderPulse 2s ease infinite",
            }}>
              <div style={{ fontSize:"14px", fontWeight:600, color:isLimit?"#fb923c":"#fca5a5", marginBottom:"6px", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>
                {isLimit ? "Usage limit reached" : "Something went wrong"}
              </div>
              <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.45)", lineHeight:"1.6", marginBottom:isLimit?"14px":"0" }}>
                {error.replace("limit_exceeded: ","")}
              </div>
              {isLimit && (
                <button onClick={() => router.push("/pricing")} style={{ padding:"10px 24px", borderRadius:"100px", background:"#fb923c", color:"#000", border:"none", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>
                  Upgrade plan →
                </button>
              )}
            </div>
          )}

          {/* Audio output */}
          {audioUrl && (
            <div className="card fu slide-up" style={{ borderColor:`${color}20`, animation:"glow 3s ease infinite" }}>
              <div className="card-header" style={{ borderBottomColor:`${color}15` }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:color, animation: isPlaying?"pulse 1.2s ease infinite":"none" }}/>
                  <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.4)", letterSpacing:".07em" }}>
                    OUTPUT · {voiceName.toUpperCase()} · {voiceLang}
                  </span>
                </div>
                <a href={audioUrl} download="twelvelab.mp3" style={{ fontSize:"12px", padding:"5px 14px", borderRadius:"100px", border:`1px solid ${color}30`, color:color, textDecoration:"none", background:`${color}08`, fontFamily:"var(--font-inter), 'Inter', sans-serif", whiteSpace:"nowrap" }}>
                  ↓ MP3
                </a>
              </div>

              {/* Animated waveform */}
              <div style={{ padding:"16px 18px 8px", display:"flex", alignItems:"flex-end", gap:"2px", height:"60px", overflow:"hidden" }}>
                {[20,35,55,80,95,70,45,85,35,90,60,75,50,88,38,72,55,95,32,80,65,75,48,90,42,82,58,70,55,85,40,92,30,78,68,58,88,45,82,38,75,62,52,85,40,72,58,78,35,60].map((h, i) => (
                  <div key={i} className={isPlaying?"wbar playing":"wbar"}
                    style={{
                      flex:1, borderRadius:"2px", minWidth:"2px",
                      background: i<28 ? color : `${color}22`,
                      height:`${h}%`,
                      "--d":`${0.6+(i%8)*0.12}s` as any,
                      animationDelay:`${i*0.03}s`,
                    } as any}
                  />
                ))}
              </div>

              <div style={{ padding:"4px 18px 18px" }}>
                <audio ref={audioRef} src={audioUrl} controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{ width:"100%", height:"36px", accentColor:color, colorScheme:"dark" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — desktop only */}
        <div className="right-col">

          {/* Voice selector */}
          <div className="card fu d1" style={{ borderRadius:"20px" }}>
            <div className="card-header">
              <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.4)", letterSpacing:".07em" }}>VOICE</span>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)" }}>{VOICES.length + clonedVoices.filter(v=>v.status==="ready").length} available</span>
            </div>
            <div style={{ padding:"6px" }}>
              {VOICES.map(v => (
                <button key={v.id}
                  onClick={() => setVoiceId(v.id)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:"10px",
                    padding:"9px 10px", borderRadius:"12px",
                    border:`1px solid ${voiceId===v.id?VC[v.id]+"50":"transparent"}`,
                    background: voiceId===v.id?`${VC[v.id]}0e`:"transparent",
                    cursor:"pointer", marginBottom:"2px", transition:"all .15s",
                    fontFamily:"var(--font-inter), 'Inter', sans-serif",
                  }}
                  onMouseEnter={e => { if(voiceId!==v.id){ const el=e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.04)"; el.style.borderColor="rgba(255,255,255,0.08)"; } }}
                  onMouseLeave={e => { if(voiceId!==v.id){ const el=e.currentTarget as HTMLElement; el.style.background="transparent"; el.style.borderColor="transparent"; } }}
                >
                  <div style={{ width:"32px", height:"32px", borderRadius:"50%", flexShrink:0, background:`${VC[v.id]}18`, border:`1px solid ${VC[v.id]}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:VC[v.id], fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>
                    {v.name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:500, color: voiceId===v.id?"#e8e4de":"rgba(255,255,255,0.6)" }}>{v.name}</div>
                    <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"1px" }}>{v.emoji} {v.gender} · {v.lang}</div>
                  </div>
                  {voiceId===v.id && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:VC[v.id], flexShrink:0 }}/>}
                </button>
              ))}
              {clonedVoices.filter(v => v.status === "ready").map(v => (
                <button key={`cv-${v.id}`} onClick={() => setVoiceId(`cloned-${v.id}`)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"9px 10px", borderRadius:"12px", border:`1px solid ${voiceId===`cloned-${v.id}`?"#a78bfa50":"transparent"}`, background: voiceId===`cloned-${v.id}`?"#a78bfa0e":"transparent", cursor:"pointer", marginBottom:"2px", transition:"all .15s", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}
                  onMouseEnter={e => { if(voiceId!==`cloned-${v.id}`){ const el=e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.04)"; el.style.borderColor="rgba(255,255,255,0.08)"; } }}
                  onMouseLeave={e => { if(voiceId!==`cloned-${v.id}`){ const el=e.currentTarget as HTMLElement; el.style.background="transparent"; el.style.borderColor="transparent"; } }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"50%", flexShrink:0, background:"#a78bfa18", border:"1px solid #a78bfa35", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:700, color:"#a78bfa", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>

                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", fontWeight:500, color: voiceId===`cloned-${v.id}`?"#e8e4de":"rgba(255,255,255,0.6)" }}>{v.name}</div>
                    <div style={{ fontSize:"10px", color:"#a78bfa", marginTop:"1px" }}>Custom voice</div>
                  </div>
                  {voiceId===`cloned-${v.id}` && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#a78bfa", flexShrink:0 }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="card fu d2" style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.4)", letterSpacing:".07em", marginBottom:"16px" }}>SETTINGS</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>Speed</span>
              <span style={{ fontSize:"13px", fontWeight:500, color:"#c8f060", fontFamily:"var(--font-inter), 'Inter', sans-serif" }}>{speed.toFixed(1)}×</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}/>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:"6px", marginBottom:"20px" }}>
              <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>Slower</span>
              <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>Faster</span>
            </div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginBottom:"10px", letterSpacing:".04em" }}>FORMAT</div>
            <div style={{ display:"flex", gap:"6px" }}>
              {["MP3","WAV","OGG"].map((f,i) => (
                <div key={f} style={{ flex:1, padding:"8px 0", borderRadius:"10px", textAlign:"center", fontSize:"12px", fontWeight:500, fontFamily:"var(--font-inter), 'Inter', sans-serif", border:`1px solid ${i===0?"rgba(200,240,96,0.3)":"rgba(255,255,255,0.06)"}`, background:i===0?"rgba(200,240,96,0.07)":"transparent", color:i===0?"#c8f060":"rgba(255,255,255,0.2)" }}>
                  {f}
                  {i>0&&<div style={{ fontSize:"9px", color:"rgba(255,255,255,0.15)", marginTop:"1px" }}>soon</div>}
                </div>
              ))}
            </div>
          </div>

          {/* API card */}
          <div className="fu d3" style={{ background:"rgba(200,240,96,0.03)", border:"1px solid rgba(200,240,96,0.09)", borderRadius:"18px", padding:"16px 18px" }}>
            <div style={{ fontSize:"12px", fontWeight:600, color:"#c8f060", marginBottom:"6px", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>REST API</div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", lineHeight:"1.7", marginBottom:"12px" }}>Integrate TwelveLab into your app with a single API call.</div>
            <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:"10px", padding:"10px 12px", fontFamily:"monospace", fontSize:"11px", color:"rgba(200,240,96,0.7)", letterSpacing:".02em" }}>
              POST /synthesize
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
