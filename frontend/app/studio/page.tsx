"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Voice = { id: string; name: string; gender: string; accent: string; lang: string; };

const VOICES: Voice[] = [
  { id: "aria",   name: "Aria",   gender: "Female", accent: "American", lang: "EN" },
  { id: "ryan",   name: "Ryan",   gender: "Male",   accent: "British",  lang: "EN" },
  { id: "priya",  name: "Priya",  gender: "Female", accent: "Natural",  lang: "HI" },
  { id: "sofia",  name: "Sofia",  gender: "Female", accent: "Warm",     lang: "ES" },
  { id: "lena",   name: "Lena",   gender: "Female", accent: "Clear",    lang: "DE" },
  { id: "pierre", name: "Pierre", gender: "Male",   accent: "Classic",  lang: "FR" },
];

const SAMPLES: Record<string, string> = {
  "Podcast":  "Welcome back to The Builder's Mindset — where founders share the real story behind building their products. Today's guest built a profitable SaaS in just 90 days.",
  "Product":  "Introducing TwelveLab — the only text-to-speech platform that actually sounds human. Clone any voice in 60 seconds and ship with our developer API in minutes.",
  "Story":    "The old lighthouse keeper had not spoken to another soul in forty-seven days. Each morning he wound the great clockwork mechanism, each night he listened to the sea.",
  "News":     "Markets rose sharply today as investors responded to better-than-expected inflation data. The Sensex gained over 800 points, crossing a key threshold.",
  "Hindi":    "नमस्ते, ट्वेल्वलैब में आपका स्वागत है। यहाँ आप किसी भी टेक्स्ट को असली मानवीय आवाज़ में बदल सकते हैं।",
};

const VOICE_COLORS: Record<string, string> = {
  aria: "#60a5fa", ryan: "#34d399", priya: "#fb923c",
  sofia: "#f472b6", lena: "#a78bfa", pierre: "#22d3ee",
};

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoMic     = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="6" y="1" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 9a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="15" x2="9" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IcoHistory = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 9a6 6 0 1 1 1.4 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 6v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoSettings= () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IcoStar    = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 4L14 5.5l-3 3 .7 4.3L8 11l-3.7 1.8.7-4.3-3-3L6.2 5 8 1Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
const IcoClose   = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IcoMenu    = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;

export default function StudioPage() {
  const [text,         setText]         = useState(SAMPLES["Podcast"]);
  const [voiceId,      setVoiceId]      = useState("aria");
  const [speed,        setSpeed]        = useState(1.0);
  const [loading,      setLoading]      = useState(false);
  const [audioUrl,     setAudioUrl]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [user,         setUser]         = useState<any>(null);
  const [charUsed,     setCharUsed]     = useState(0);
  const [charLimit]                     = useState(10000);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [showVoices,   setShowVoices]   = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router   = useRouter();

  const charCount     = text.length;
  const usagePct      = Math.min((charUsed / charLimit) * 100, 100);
  const selectedVoice = VOICES.find(v => v.id === voiceId)!;
  const voiceColor    = VOICE_COLORS[voiceId] || "#c8f060";

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data } = await supabase.from("users").select("char_used").eq("id", user.id).single();
      if (data) setCharUsed(data.char_used || 0);
    };
    init();
  }, []);

  async function generate() {
    if (!text.trim() || loading) return;
    setLoading(true); setError(null); setAudioUrl(null); setIsPlaying(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_id: voiceId, speed }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Generation failed"); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => { audioRef.current?.play(); setIsPlaying(true); }, 100);
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase.from("generations").insert({ user_id: u.id, voice_id: voiceId, text, char_count: text.length });
        await supabase.rpc("increment_char_used", { user_id_input: u.id, amount: text.length });
        setCharUsed(prev => prev + text.length);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!mounted) return null;

  // ── Sidebar content (shared between desktop + mobile drawer) ──────────────
  const SidebarContent = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Logo */}
      <div style={{ padding:"20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:800, letterSpacing:"-0.5px" }}>
            Twelve<span style={{ color:"#c8f060" }}>Lab</span>
          </div>
          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginTop:"2px", letterSpacing:".08em" }}>VOICE SYNTHESIS</div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setSidebarOpen(false)}
          style={{ display:"none", background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", padding:"4px" }}
          className="sidebar-close">
          <IcoClose />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding:"12px 8px", flex:1 }}>
        {[
          { id:"studio",   label:"Studio",   icon:<IcoMic />,      active:true,  route:"/studio"  },
          { id:"history",  label:"History",  icon:<IcoHistory />,  active:false, route:"/history" },
          { id:"settings", label:"Settings", icon:<IcoSettings />, active:false, soon:true        },
        ].map(item => (
          <button key={item.id}
            onClick={() => { if (!item.soon) { router.push(item.route!); setSidebarOpen(false); } }}
            style={{
              width:"100%", display:"flex", alignItems:"center", gap:"10px",
              padding:"10px 12px", borderRadius:"10px", border:"none", marginBottom:"2px",
              background: item.active ? "rgba(200,240,96,0.1)" : "transparent",
              color: item.active ? "#c8f060" : "rgba(255,255,255,0.45)",
              cursor: item.soon ? "default" : "pointer",
              fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:500,
              textAlign:"left", transition:"all .15s",
            }}
            onMouseEnter={e => { if (!item.active && !item.soon) { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.05)"; el.style.color="rgba(255,255,255,0.8)"; } }}
            onMouseLeave={e => { if (!item.active) { const el = e.currentTarget as HTMLElement; el.style.background="transparent"; el.style.color="rgba(255,255,255,0.45)"; } }}
          >
            <span style={{ color: item.active ? "#c8f060" : "rgba(255,255,255,0.3)" }}>{item.icon}</span>
            <span style={{ flex:1 }}>{item.label}</span>
            {item.soon && <span style={{ fontSize:"9px", padding:"1px 6px", borderRadius:"4px", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.25)" }}>SOON</span>}
          </button>
        ))}

        <div style={{ height:"1px", background:"rgba(255,255,255,0.06)", margin:"10px 4px" }}/>

        {/* Upgrade */}
        <button style={{
          width:"100%", display:"flex", alignItems:"center", gap:"10px",
          padding:"10px 12px", borderRadius:"10px", border:"none",
          background:"rgba(200,240,96,0.07)", color:"#c8f060",
          cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:500,
          textAlign:"left", transition:"background .2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(200,240,96,0.14)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(200,240,96,0.07)"; }}
        >
          <IcoStar />
          <span>Upgrade plan</span>
        </button>
      </nav>

      {/* Usage */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>Monthly usage</span>
          <span style={{ fontSize:"11px", color: usagePct > 80 ? "#fb923c" : "rgba(255,255,255,0.4)" }}>{Math.round(usagePct)}%</span>
        </div>
        <div style={{ height:"3px", background:"rgba(255,255,255,0.08)", borderRadius:"2px", overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:"2px", transition:"width .6s ease",
            width:`${usagePct}%`,
            background: usagePct > 80 ? "linear-gradient(90deg,#fb923c,#ef4444)" : "linear-gradient(90deg,#c8f060,#86d915)",
          }}/>
        </div>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)", marginTop:"5px" }}>
          {charUsed.toLocaleString()} / {charLimit.toLocaleString()} chars
        </div>
      </div>

      {/* User */}
      <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,0.06)", position:"relative" }}>
        <button onClick={() => setShowDropdown(!showDropdown)} style={{
          width:"100%", display:"flex", alignItems:"center", gap:"10px",
          padding:"8px 10px", borderRadius:"10px", border:"none", background:"transparent",
          cursor:"pointer", transition:"background .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; }}
        >
          <div style={{
            width:"34px", height:"34px", borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,#c8f060,#7fc22a)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"14px", fontWeight:700, color:"#000",
          }}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div style={{ flex:1, textAlign:"left", overflow:"hidden" }}>
            <div style={{ fontSize:"12px", fontWeight:500, color:"rgba(255,255,255,0.75)", textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap" }}>
              {user?.email?.split("@")[0]}
            </div>
            <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>Free plan</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color:"rgba(255,255,255,0.25)", transform: showDropdown ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {showDropdown && (
          <>
            <div onClick={() => setShowDropdown(false)} style={{ position:"fixed", inset:0, zIndex:49 }}/>
            <div style={{
              position:"absolute", bottom:"calc(100% + 6px)", left:"12px", right:"12px",
              background:"#1c1c1c", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:"14px", overflow:"hidden", zIndex:50,
              boxShadow:"0 -16px 40px rgba(0,0,0,0.5)",
            }}>
              <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginBottom:"3px" }}>Signed in as</div>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.8)", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.email}</div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"8px", fontSize:"10px", padding:"3px 9px", borderRadius:"6px", background:"rgba(200,240,96,0.1)", color:"#c8f060" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#c8f060" }}/>
                  Free · {charLimit.toLocaleString()} chars/mo
                </div>
              </div>
              <div style={{ padding:"4px" }}>
                {["Profile", "API Keys", "Billing"].map(item => (
                  <button key={item} style={{
                    width:"100%", padding:"9px 12px", border:"none", background:"transparent",
                    color:"rgba(255,255,255,0.5)", cursor:"pointer", borderRadius:"8px",
                    fontSize:"13px", textAlign:"left", fontFamily:"'DM Sans',sans-serif", transition:"all .15s",
                  }}
                  onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.05)"; el.style.color="rgba(255,255,255,0.9)"; }}
                  onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.background="transparent"; el.style.color="rgba(255,255,255,0.5)"; }}
                  >{item}</button>
                ))}
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", padding:"4px" }}>
                <button onClick={logout} style={{
                  width:"100%", padding:"9px 12px", border:"none", background:"transparent",
                  color:"#f87171", cursor:"pointer", borderRadius:"8px",
                  fontSize:"13px", textAlign:"left", fontFamily:"'DM Sans',sans-serif", transition:"background .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="transparent"; }}
                >Sign out</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #080808; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes waveAnim { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(var(--h,.3))} }
        @keyframes slideIn  { from { transform:translateX(-100%); } to { transform:translateX(0); } }

        .fade-up { animation: fadeUp .45s ease both; }
        .delay-1 { animation-delay: .06s; }
        .delay-2 { animation-delay: .12s; }
        .delay-3 { animation-delay: .18s; }
        .delay-4 { animation-delay: .24s; }

        /* scrollbar */
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }

        /* range slider */
        input[type=range] { -webkit-appearance:none; appearance:none; height:3px; border-radius:2px; background:rgba(255,255,255,0.1); outline:none; cursor:pointer; width:100%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#c8f060; cursor:pointer; border:2px solid #080808; transition:transform .15s; }
        input[type=range]::-webkit-slider-thumb:hover { transform:scale(1.2); }

        /* textarea */
        textarea::placeholder { color:rgba(255,255,255,0.18); }
        textarea:focus { outline:none; }

        /* mobile overlay */
        .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:49; backdrop-filter:blur(4px); animation:fadeIn .2s ease; }

        /* mobile sidebar */
        @media (max-width: 768px) {
          .desktop-sidebar { display:none !important; }
          .mobile-topbar   { display:flex !important; }
          .main-content    { margin-left:0 !important; }
          .studio-grid     { grid-template-columns:1fr !important; }
          .right-col       { position:static !important; }
          .sidebar-close   { display:flex !important; }
          .sidebar-overlay { display:block; }
        }
        @media (min-width: 769px) {
          .mobile-sidebar  { display:none !important; }
          .mobile-topbar   { display:none !important; }
        }

        /* voice card */
        .voice-card { transition: all .15s ease; }
        .voice-card:hover { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.12) !important; }

        /* gen button */
        .gen-btn { transition: all .2s ease; }
        .gen-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(200,240,96,0.2); }
        .gen-btn:active:not(:disabled) { transform: translateY(0); }

        /* chip */
        .chip { transition: all .15s; }
        .chip:hover { border-color: rgba(200,240,96,0.4) !important; color: #c8f060 !important; }

        /* audio player */
        audio { accent-color: #c8f060; color-scheme: dark; }

        /* wave bar */
        .wave-bar { animation: waveAnim var(--dur,1s) ease-in-out infinite; }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"#080808", color:"#f0ede8" }}>

        {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="desktop-sidebar" style={{
          width:"220px", minHeight:"100vh", background:"#0c0c0c",
          borderRight:"1px solid rgba(255,255,255,0.06)",
          position:"fixed", top:0, left:0, bottom:0, zIndex:40, flexShrink:0,
        }}>
          <SidebarContent />
        </aside>

        {/* ── MOBILE SIDEBAR DRAWER ───────────────────────────────────────── */}
        {sidebarOpen && (
          <>
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>
            <aside className="mobile-sidebar" style={{
              width:"260px", height:"100vh", background:"#0c0c0c",
              borderRight:"1px solid rgba(255,255,255,0.08)",
              position:"fixed", top:0, left:0, zIndex:50,
              animation:"slideIn .25s ease",
            }}>
              <SidebarContent />
            </aside>
          </>
        )}

        {/* ── MAIN ──────────────────────────────────────────────────────────── */}
        <main className="main-content" style={{ marginLeft:"220px", flex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

          {/* Mobile topbar */}
          <div className="mobile-topbar" style={{
            padding:"14px 16px", background:"rgba(8,8,8,0.95)",
            borderBottom:"1px solid rgba(255,255,255,0.06)",
            alignItems:"center", justifyContent:"space-between",
            position:"sticky", top:0, zIndex:30, backdropFilter:"blur(12px)",
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:"4px" }}>
              <IcoMenu />
            </button>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"17px", fontWeight:800 }}>
              Twelve<span style={{ color:"#c8f060" }}>Lab</span>
            </div>
            <div style={{
              width:"32px", height:"32px", borderRadius:"50%",
              background:"linear-gradient(135deg,#c8f060,#7fc22a)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"13px", fontWeight:700, color:"#000",
            }}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          {/* Desktop header */}
          <header style={{
            padding:"18px 28px", borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:"rgba(8,8,8,0.85)", backdropFilter:"blur(12px)",
            position:"sticky", top:0, zIndex:30,
          }} className="mobile-topbar" style={{ display:"none" }}>
            <div>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:800, letterSpacing:"-0.5px" }}>Text to Speech</h1>
              <p style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", marginTop:"2px" }}>Convert text to lifelike audio</p>
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <div style={{ fontSize:"12px", padding:"5px 12px", borderRadius:"100px", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.35)" }}>
                {charCount.toLocaleString()} chars
              </div>
              <div style={{ fontSize:"12px", padding:"5px 12px", borderRadius:"100px", border:"1px solid rgba(200,240,96,0.2)", color:"#c8f060", background:"rgba(200,240,96,0.06)" }}>
                {selectedVoice.name} · {selectedVoice.lang}
              </div>
            </div>
          </header>

          {/* Studio content */}
          <div style={{ flex:1, padding:"clamp(16px,4vw,32px)", maxWidth:"1100px", width:"100%", margin:"0 auto" }}>

            {/* Page title — visible on desktop */}
            <div className="fade-up" style={{ marginBottom:"24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
              <div>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(20px,4vw,26px)", fontWeight:800, letterSpacing:"-0.5px" }}>Studio</h1>
                <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>Convert text to lifelike audio</p>
              </div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                <div style={{ fontSize:"12px", padding:"5px 12px", borderRadius:"100px", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.35)" }}>
                  {charCount.toLocaleString()} chars
                </div>
                <div style={{ fontSize:"12px", padding:"5px 12px", borderRadius:"100px", border:"1px solid rgba(200,240,96,0.2)", color:"#c8f060", background:"rgba(200,240,96,0.06)" }}>
                  {selectedVoice.name} · {selectedVoice.lang}
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="studio-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"20px", alignItems:"start" }}>

              {/* ── LEFT ─────────────────────────────────────────────────── */}
              <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

                {/* Text editor */}
                <div className="fade-up delay-1" style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#c8f060", animation:"pulse 2s infinite" }}/>
                      <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.5)", letterSpacing:".06em" }}>TEXT INPUT</span>
                    </div>
                    <span style={{ fontSize:"12px", color: charCount > 4500 ? "#fb923c" : "rgba(255,255,255,0.2)" }}>
                      {charCount.toLocaleString()} / 5,000
                    </span>
                  </div>

                  <textarea value={text} onChange={e => setText(e.target.value)} maxLength={5000}
                    placeholder="Type or paste your text here…"
                    style={{
                      width:"100%", minHeight:"clamp(160px,25vh,240px)",
                      background:"transparent", border:"none",
                      color:"rgba(255,255,255,0.82)", padding:"18px",
                      fontSize:"clamp(14px,2vw,15px)", lineHeight:"1.8",
                      resize:"none", fontFamily:"'DM Sans',sans-serif", fontWeight:300,
                    }}
                  />

                  {/* Progress line */}
                  <div style={{ height:"2px", background:"rgba(255,255,255,0.04)", margin:"0 18px 14px" }}>
                    <div style={{
                      height:"100%", borderRadius:"1px", transition:"width .3s ease",
                      width:`${(charCount/5000)*100}%`,
                      background: charCount > 4500 ? "#fb923c" : charCount > 3000 ? "#facc15" : "#c8f060",
                    }}/>
                  </div>

                  {/* Sample chips */}
                  <div style={{ padding:"0 16px 16px", display:"flex", flexWrap:"wrap", gap:"6px", alignItems:"center" }}>
                    <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)", marginRight:"4px" }}>Samples:</span>
                    {Object.keys(SAMPLES).map(key => (
                      <button key={key} className="chip"
                        onClick={() => setText(SAMPLES[key])}
                        style={{
                          fontSize:"11px", padding:"4px 12px", borderRadius:"100px",
                          border:`1px solid ${text === SAMPLES[key] ? "rgba(200,240,96,0.4)" : "rgba(255,255,255,0.08)"}`,
                          background: text === SAMPLES[key] ? "rgba(200,240,96,0.08)" : "transparent",
                          color: text === SAMPLES[key] ? "#c8f060" : "rgba(255,255,255,0.35)",
                          cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                        }}
                      >{key}</button>
                    ))}
                  </div>
                </div>

                {/* Voice picker — mobile only (horizontal scroll) */}
                <div className="fade-up delay-2" style={{ display:"block" }}>
                  <div style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.35)", letterSpacing:".06em", marginBottom:"10px" }}>VOICE</div>
                  <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"4px" }}>
                    {VOICES.map(v => (
                      <button key={v.id} className="voice-card"
                        onClick={() => setVoiceId(v.id)}
                        style={{
                          flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center",
                          gap:"6px", padding:"12px 14px", borderRadius:"14px",
                          border:`1px solid ${voiceId === v.id ? VOICE_COLORS[v.id] + "60" : "rgba(255,255,255,0.07)"}`,
                          background: voiceId === v.id ? VOICE_COLORS[v.id] + "12" : "transparent",
                          cursor:"pointer", minWidth:"80px",
                        }}
                      >
                        <div style={{
                          width:"38px", height:"38px", borderRadius:"50%",
                          background: VOICE_COLORS[v.id] + "20",
                          border:`1px solid ${VOICE_COLORS[v.id]}40`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"15px", fontWeight:700, color:VOICE_COLORS[v.id],
                          fontFamily:"'Syne',sans-serif",
                        }}>
                          {v.name[0]}
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontSize:"12px", fontWeight:500, color: voiceId === v.id ? "#f0ede8" : "rgba(255,255,255,0.55)" }}>{v.name}</div>
                          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)", marginTop:"1px" }}>{v.lang}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed slider */}
                <div className="fade-up delay-2" style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"14px", padding:"16px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                    <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)" }}>Speed</span>
                    <span style={{ fontSize:"12px", fontWeight:500, color:"#c8f060" }}>{speed.toFixed(1)}×</span>
                  </div>
                  <input type="range" min="0.5" max="2" step="0.1" value={speed}
                    onChange={e => setSpeed(parseFloat(e.target.value))} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:"5px" }}>
                    <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.18)" }}>Slower</span>
                    <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.18)" }}>Faster</span>
                  </div>
                </div>

                {/* Generate button */}
                <button className="fade-up delay-3 gen-btn"
                  onClick={generate} disabled={loading || !text.trim()}
                  style={{
                    width:"100%", padding:"16px", borderRadius:"14px",
                    background: loading ? "rgba(200,240,96,0.5)" : "#c8f060",
                    color:"#000", border:"none", cursor: loading || !text.trim() ? "not-allowed" : "pointer",
                    fontSize:"15px", fontWeight:700, fontFamily:"'Syne',sans-serif",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                    opacity: !text.trim() && !loading ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:"2.5px solid rgba(0,0,0,0.2)", borderTop:"2.5px solid #000", animation:"spin .7s linear infinite" }}/>
                      Synthesizing…
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" opacity=".25"/>
                        <path d="M7 6l5 3-5 3V6Z" fill="currentColor"/>
                      </svg>
                      Generate Speech
                    </>
                  )}
                </button>

                {/* Error */}
                {error && (
                  <div className="fade-up" style={{ padding:"12px 16px", borderRadius:"12px", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", fontSize:"13px", color:"#fca5a5" }}>
                    {error}
                  </div>
                )}

                {/* Audio output */}
                {audioUrl && (
                  <div className="fade-up" style={{ background:"#0d0d0d", border:`1px solid ${voiceColor}25`, borderRadius:"16px", overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:voiceColor, animation: isPlaying ? "pulse 1s infinite" : "none" }}/>
                        <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.5)", letterSpacing:".06em" }}>
                          OUTPUT · {selectedVoice.name.toUpperCase()} · {selectedVoice.lang}
                        </span>
                      </div>
                      <a href={audioUrl} download="twelvelab.mp3" style={{
                        fontSize:"11px", padding:"4px 12px", borderRadius:"100px",
                        border:`1px solid ${voiceColor}30`, color:voiceColor,
                        textDecoration:"none", background:`${voiceColor}08`,
                      }}>
                        Download
                      </a>
                    </div>

                    {/* Waveform */}
                    <div style={{ padding:"16px 16px 4px", display:"flex", alignItems:"center", gap:"2px", height:"56px" }}>
                      {[20,35,55,80,95,70,45,85,35,90,60,75,50,88,38,72,55,95,32,80,65,75,48,90,42,82,58,70,55,85,40,92,30,78,68,58,88,45,82,38,75,62,52,85,40,72,58,78].map((h, i) => (
                        <div key={i} className={isPlaying ? "wave-bar" : ""}
                          style={{
                            flex:1, borderRadius:"2px", minWidth:"2px",
                            background: i < 28 ? voiceColor : `${voiceColor}28`,
                            height:`${h}%`,
                            "--h": (h / 100 * 0.6 + 0.1) as any,
                            "--dur": `${0.7 + (i % 7) * 0.15}s` as any,
                            animationDelay:`${i * 0.035}s`,
                          } as any}
                        />
                      ))}
                    </div>
                    <div style={{ padding:"4px 16px 16px" }}>
                      <audio ref={audioRef} src={audioUrl} controls
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        style={{ width:"100%", height:"36px" }}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* ── RIGHT (desktop only) ─────────────────────────────────── */}
              <div className="right-col" style={{ display:"flex", flexDirection:"column", gap:"14px", position:"sticky", top:"80px" }}>

                {/* Voice selector */}
                <div className="fade-up delay-2" style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", overflow:"hidden" }}>
                  <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.45)", letterSpacing:".06em" }}>VOICE</span>
                    <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)" }}>{VOICES.length} available</span>
                  </div>
                  <div style={{ padding:"6px" }}>
                    {VOICES.map(v => (
                      <button key={v.id} className="voice-card"
                        onClick={() => setVoiceId(v.id)}
                        style={{
                          width:"100%", display:"flex", alignItems:"center", gap:"10px",
                          padding:"9px 10px", borderRadius:"10px", marginBottom:"2px",
                          border:`1px solid ${voiceId === v.id ? VOICE_COLORS[v.id] + "50" : "transparent"}`,
                          background: voiceId === v.id ? VOICE_COLORS[v.id] + "10" : "transparent",
                          cursor:"pointer", textAlign:"left",
                        }}
                      >
                        <div style={{
                          width:"32px", height:"32px", borderRadius:"50%", flexShrink:0,
                          background:`${VOICE_COLORS[v.id]}18`, border:`1px solid ${VOICE_COLORS[v.id]}35`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"13px", fontWeight:700, color:VOICE_COLORS[v.id],
                          fontFamily:"'Syne',sans-serif",
                        }}>
                          {v.name[0]}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"13px", fontWeight:500, color: voiceId === v.id ? "#f0ede8" : "rgba(255,255,255,0.6)" }}>{v.name}</div>
                          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"1px" }}>{v.gender} · {v.accent} · {v.lang}</div>
                        </div>
                        {voiceId === v.id && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:VOICE_COLORS[v.id], flexShrink:0 }}/>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="fade-up delay-3" style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"16px", padding:"14px" }}>
                  <div style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.45)", letterSpacing:".06em", marginBottom:"14px" }}>SETTINGS</div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                    <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)" }}>Speed</span>
                    <span style={{ fontSize:"12px", fontWeight:500, color:"#c8f060" }}>{speed.toFixed(1)}×</span>
                  </div>
                  <input type="range" min="0.5" max="2" step="0.1" value={speed}
                    onChange={e => setSpeed(parseFloat(e.target.value))} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:"5px", marginBottom:"16px" }}>
                    <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.18)" }}>0.5×</span>
                    <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.18)" }}>2.0×</span>
                  </div>

                  {/* Format */}
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginBottom:"8px" }}>Output format</div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["MP3","WAV","OGG"].map((f,i) => (
                      <div key={f} style={{
                        flex:1, padding:"7px 0", borderRadius:"8px", textAlign:"center",
                        fontSize:"11px", fontWeight:500,
                        border:`1px solid ${i===0 ? "rgba(200,240,96,0.3)" : "rgba(255,255,255,0.06)"}`,
                        background: i===0 ? "rgba(200,240,96,0.07)" : "transparent",
                        color: i===0 ? "#c8f060" : "rgba(255,255,255,0.2)",
                      }}>
                        {f}
                        {i>0 && <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.15)", marginTop:"1px" }}>soon</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* API hint */}
                <div className="fade-up delay-4" style={{ background:"rgba(200,240,96,0.03)", border:"1px solid rgba(200,240,96,0.09)", borderRadius:"14px", padding:"14px" }}>
                  <div style={{ fontSize:"12px", fontWeight:500, color:"#c8f060", marginBottom:"6px", display:"flex", alignItems:"center", gap:"6px" }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 4h10M1.5 6.5h7M1.5 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    REST API
                  </div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", lineHeight:"1.6", marginBottom:"10px" }}>
                    Integrate TwelveLab directly into your app.
                  </div>
                  <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:"7px", padding:"9px 11px", fontFamily:"monospace", fontSize:"11px", color:"rgba(200,240,96,0.65)" }}>
                    POST /synthesize
                  </div>
                </div>

              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
