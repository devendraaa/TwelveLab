"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const voices = [
    { id: "aria", name: "Aria", lang: "EN-US", accent: "American", emoji: "\U0001f1fa\U0001f1f8" },
    { id: "priya", name: "Priya", lang: "HI", accent: "Hindi", emoji: "\U0001f1ee\U0001f1f3" },
    { id: "ryan", name: "Ryan", lang: "EN-UK", accent: "British", emoji: "\U0001f1ec\U0001f1e7" },
    { id: "aisha", name: "Aisha", lang: "MR", accent: "Marathi", emoji: "\U0001f1ee\U0001f1f3" },
    { id: "sofia", name: "Sofia", lang: "ES", accent: "Spanish", emoji: "\U0001f1ea\U0001f1f8" },
    { id: "pierre", name: "Pierre", lang: "FR", accent: "French", emoji: "\U0001f1eb\U0001f1f7" },
  ];

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "20+ Natural Voices",
      desc: "Human-like voices for Hindi, Marathi, Tamil, Telugu, Bengali, and 10+ more languages.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Instant Generation",
      desc: "Synthesize speech in seconds via our REST API or the Studio interface.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: "Developer API",
      desc: "Single API call integration. SDKs and docs for every major framework.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: "Secure & Private",
      desc: "Enterprise-ready auth, rate limiting, and usage controls built in from day one.",
    },
  ];

  const stats = [
    { value: "20+", label: "Voices" },
    { value: "12+", label: "Languages" },
    { value: "<2s", label: "Latency" },
    { value: "99.9%", label: "Uptime" },
  ];

  useEffect(() => {
    // Feature cards: track mouse for radial gradient highlight
    const cards = document.querySelectorAll<HTMLElement>(".feat-card");
    cards.forEach(card => {
      card.onmousemove = (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      };
    });
  }, []);

  return (
    <div style={{ background: "#050505", color: "#f0ede8", minHeight: "100dvh", fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes glowPulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes waveMove1 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes waveMove2 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes waveMove3 { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(30px,-40px) scale(1.05)} 50%{transform:translate(-20px,-70px) scale(.95)} 75%{transform:translate(-40px,-20px) scale(1.02)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-50px,20px) scale(1.03)} 50%{transform:translate(30px,-50px) scale(.97)} 75%{transform:translate(40px,30px) scale(1.05)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,30px) scale(1.04)} 66%{transform:translate(-30px,-60px) scale(.96)} }
        @keyframes dash { to{stroke-dashoffset:0} }
        .fade-up { animation: fadeUp .6s ease both; }
        .d1 { animation-delay: .1s; }
        .d2 { animation-delay: .2s; }
        .d3 { animation-delay: .3s; }
        .d4 { animation-delay: .4s; }
        .d5 { animation-delay: .5s; }
        .float { animation: float 4s ease-in-out infinite; }
        .scale-in { animation: scaleIn .4s ease both; }
        .voice-card { transition: all .2s; }
        .voice-card:hover { border-color: rgba(200,240,96,0.2) !important; background: rgba(200,240,96,0.03) !important; transform: translateY(-2px); }
        .feat-card { transition: all .25s; }
        .feat-card:hover { border-color: rgba(200,240,96,0.15) !important; background: rgba(200,240,96,0.03) !important; transform: translateY(-2px); }
        .btn-primary { transition: all .2s; }
        .btn-primary:hover { background: #d4f570 !important; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(200,240,96,0.25) !important; }
        .btn-secondary { transition: all .2s; }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.25) !important; color: rgba(255,255,255,0.9) !important; }
        .cta-link { transition: all .2s; }
        .cta-link:hover { color: #d4f570 !important; }
        @media (max-width:480px){ .hero-btns{flex-direction:column} .hero-btns a{width:100%;text-align:center} .foot-row{flex-direction:column!important;align-items:center!important;text-align:center} .voice-grid{grid-template-columns:1fr!important} .hero-waves{display:none!important} }
        .feat-card { position:relative; overflow:hidden; }
        .feat-card::before { content:""; position:absolute; top:-1px; left:-1px; right:-1px; bottom:-1px; border-radius:21px; padding:1px; background:linear-gradient(135deg, rgba(200,240,96,0.15) 0%, transparent 40%, transparent 60%, rgba(200,240,96,0.15) 100%); -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; opacity:0; transition:opacity .3s; }
        .feat-card:hover::before { opacity:1; }
        .feat-card::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(200,240,96,0.06) 0%, transparent 60%); opacity:0; transition:opacity .3s; pointer-events:none; }
        .feat-card:hover::after { opacity:1; }
        .hero-stat-val { background:linear-gradient(135deg, #c8f060, #7fc22a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-size:200% 200%; animation:gradientShift 3s ease infinite; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "16px clamp(16px, 4vw, 48px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(5,5,5,0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontFamily: "'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Twelve<span style={{ color: "#c8f060" }}>Lab</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/login" className="btn-secondary" style={{
            padding: "9px 18px", borderRadius: "100px",
            border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
            color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: 500,
            textDecoration: "none", cursor: "pointer", transition: "all .2s",
          }}>
            Sign in
          </Link>
          <Link href="/studio" className="btn-primary" style={{
            padding: "9px 18px", borderRadius: "100px",
            background: "#c8f060", color: "#000", border: "none",
            fontSize: "14px", fontWeight: 600, textDecoration: "none",
            cursor: "pointer", transition: "all .2s",
          }}>
            Try Studio
          </Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
        padding: "clamp(50px, 15vh, 140px) clamp(16px, 5vw, 80px) clamp(40px, 8vh, 80px)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle dot grid background */}
        <div style={{ position:"absolute", inset:0, opacity:.04, pointerEvents:"none", backgroundImage:"radial-gradient(circle, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize:"24px 24px" }}/>

        {/* Floating orbs */}
        <div style={{ position:"absolute", width:"500px", height:"500px", top:"-15%", right:"-10%", borderRadius:"50%", background:"radial-gradient(circle, rgba(200,240,96,0.12) 0%, transparent 70%)", animation:"orbFloat1 18s ease-in-out infinite", pointerEvents:"none", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", width:"400px", height:"400px", bottom:"-10%", left:"-8%", borderRadius:"50%", background:"radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)", animation:"orbFloat2 22s ease-in-out infinite", pointerEvents:"none", filter:"blur(40px)" }}/>
        <div style={{ position:"absolute", width:"350px", height:"350px", top:"30%", left:"50%", borderRadius:"50%", background:"radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)", animation:"orbFloat3 20s ease-in-out infinite", pointerEvents:"none", filter:"blur(30px)" }}/>

        {/* Animated sound waves — desktop only */}
        <div className="hero-waves" style={{ position:"absolute", bottom:0, left:0, right:0, height:"120px", overflow:"hidden", pointerEvents:"none" }}>
          <svg width="200%" height="120" preserveAspectRatio="none" viewBox="0 0 2400 120" fill="none" style={{ position:"absolute", bottom:0 }}>
            {/* Wave 1 — accent */}
            <g style={{ animation:"waveMove1 8s linear infinite" }}>
              <path d="M0 60 Q 150 20 300 60 T 600 60 T 900 60 T 1200 60 T 1500 60 T 1800 60 T 2100 60 T 2400 60" stroke="rgba(200,240,96,0.15)" strokeWidth="1.5" fill="none" opacity=".7"/>
              <path d="M0 60 Q 150 20 300 60 T 600 60 T 900 60 T 1200 60 T 1500 60 T 1800 60 T 2100 60 T 2400 60" stroke="rgba(200,240,96,0.15)" strokeWidth="1.5" fill="none" opacity=".7"/>
              <path d="M0 72 Q 150 40 300 72 T 600 72 T 900 72 T 1200 72 T 1500 72 T 1800 72 T 2100 72 T 2400 72" stroke="rgba(200,240,96,0.08)" strokeWidth="1" fill="none" opacity=".5"/>
            </g>
          </svg>
          <svg width="200%" height="120" preserveAspectRatio="none" viewBox="0 0 2400 120" fill="none" style={{ position:"absolute", bottom:0 }}>
            {/* Wave 2 — blue */}
            <g style={{ animation:"waveMove2 12s linear infinite reverse" }}>
              <path d="M0 80 Q 200 40 400 80 T 800 80 T 1200 80 T 1600 80 T 2000 80 T 2400 80" stroke="rgba(96,165,250,0.1)" strokeWidth="1" fill="none" opacity=".6"/>
              <path d="M0 80 Q 200 40 400 80 T 800 80 T 1200 80 T 1600 80 T 2000 80 T 2400 80" stroke="rgba(96,165,250,0.1)" strokeWidth="1" fill="none" opacity=".6"/>
            </g>
          </svg>
          <svg width="200%" height="120" preserveAspectRatio="none" viewBox="0 0 2400 120" fill="none" style={{ position:"absolute", bottom:0 }}>
            {/* Wave 3 — purple */}
            <g style={{ animation:"waveMove3 15s linear infinite" }}>
              <path d="M0 95 Q 250 60 500 95 T 1000 95 T 1500 95 T 2000 95 T 2400 95" stroke="rgba(167,139,250,0.06)" strokeWidth="1" fill="none" opacity=".4"/>
              <path d="M0 95 Q 250 60 500 95 T 1000 95 T 1500 95 T 2000 95 T 2400 95" stroke="rgba(167,139,250,0.06)" strokeWidth="1" fill="none" opacity=".4"/>
            </g>
          </svg>
        </div>

        <div className="fade-up scale-in" style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "6px 6px 6px 14px", borderRadius: "100px",
          background: "rgba(200,240,96,0.06)", border: "1px solid rgba(200,240,96,0.15)",
          marginBottom: "28px", fontSize: "13px", color: "rgba(255,255,255,0.6)",
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%", background: "#c8f060",
            display: "inline-block",
          }}/>
          Powered by HuggingFace &middot; 20 voices &middot; 12+ languages
        </div>

        <h1 className="fade-up d1" style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: "clamp(36px, 8vw, 72px)",
          fontWeight: 800, lineHeight: 1.05,
          letterSpacing: "-1.5px",
          maxWidth: "800px",
          marginBottom: "20px",
        }}>
          Text to speech that
          <br/>
          <span style={{
            background: "linear-gradient(135deg, #c8f060 0%, #7fc22a 50%, #c8f060 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%",
            animation: "gradientShift 4s ease infinite",
          }}>actually sounds human</span>
        </h1>

        <p className="fade-up d2" style={{
          fontSize: "clamp(16px, 2.5vw, 20px)",
          lineHeight: 1.6, color: "rgba(255,255,255,0.4)",
          maxWidth: "560px", marginBottom: "36px",
        }}>
          Generate natural-sounding speech in Indian and international languages.
          Studio-ready API with speed control, usage tracking, and one-click downloads.
        </p>

        <div className="fade-up d3 hero-btns" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/studio" className="btn-primary" style={{
            padding: "16px 36px", borderRadius: "100px",
            background: "#c8f060", color: "#000",
            fontSize: "16px", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif",
            textDecoration: "none", transition: "all .2s",
            boxShadow: "0 0 32px rgba(200,240,96,0.15)",
          }}>
            Start generating audio &rarr;
          </Link>
          <Link href="#features" className="btn-secondary" style={{
            padding: "16px 36px", borderRadius: "100px",
            border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
            color: "rgba(255,255,255,0.7)",
            fontSize: "16px", fontWeight: 500, textDecoration: "none",
            transition: "all .2s",
          }}>
            Learn more
          </Link>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="fade-up d4" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "1px", maxWidth: "800px", margin: "0 auto",
        padding: "0 clamp(20px, 6vw, 80px) 80px",
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            textAlign: "center", padding: "24px",
            background: "rgba(255,255,255,0.02)",
          }}>
            <div className="hero-stat-val" style={{
              fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 800, letterSpacing: "-1px",
            }}>{s.value}</div>
            <div style={{
              fontSize: "12px", color: "rgba(255,255,255,0.3)",
              marginTop: "4px", textTransform: "uppercase", letterSpacing: ".08em",
            }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── VOICES PREVIEW ─────────────────────────────────── */}
      <section style={{
        padding: "0 clamp(20px, 6vw, 80px) 80px",
        maxWidth: "900px", margin: "0 auto",
      }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "12px", color: "#c8f060",
            textTransform: "uppercase", letterSpacing: ".1em",
            fontWeight: 600, marginBottom: "10px",
          }}>Voice Library</div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(24px, 5vw, 40px)", fontWeight: 800,
            letterSpacing: "-1px",
          }}>Every voice, every language</h2>
        </div>

        <div className="fade-up d1 voice-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "12px",
        }}>
          {voices.map(v => (
            <Link href="/studio" className="voice-card" style={{
              padding: "18px 20px", borderRadius: "16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: "14px",
              transition: "all .2s",
              textDecoration: "none", color: "inherit",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "rgba(200,240,96,0.08)",
                border: "1px solid rgba(200,240,96,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", fontWeight: 700, color: "#c8f060",
                fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0,
              }}>
                {v.name[0]}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                  {v.emoji} {v.name}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                  {v.accent} &middot; {v.lang}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <Link href="/studio" className="cta-link" style={{
            fontSize: "14px", color: "#c8f060", textDecoration: "none", fontWeight: 500,
            borderBottom: "1px solid rgba(200,240,96,0.3)", paddingBottom: "2px",
          }}>
            View all 20 voices in Studio &rarr;
          </Link>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" style={{
        padding: "clamp(40px, 8vh, 80px) clamp(20px, 6vw, 80px)",
        maxWidth: "1000px", margin: "0 auto",
      }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontSize: "12px", color: "#c8f060",
            textTransform: "uppercase", letterSpacing: ".1em",
            fontWeight: 600, marginBottom: "10px",
          }}>Why TwelveLab</div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(24px, 5vw, 40px)", fontWeight: 800,
            letterSpacing: "-1px",
          }}>Built for developers and creators</h2>
        </div>

        <div className="fade-up d1" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}>
          {features.map(f => (
            <div key={f.title} className="feat-card" style={{
              padding: "28px 24px", borderRadius: "20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "all .25s",
            }}
            >
              <div style={{
                width: "48px", height: "48px", borderRadius: "14px",
                background: "rgba(200,240,96,0.06)",
                border: "1px solid rgba(200,240,96,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#c8f060", marginBottom: "18px",
              }}>{f.icon}</div>
              <h3 style={{
                fontSize: "16px", fontWeight: 700, marginBottom: "8px",
                color: "rgba(255,255,255,0.9)",
              }}>{f.title}</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── API PREVIEW ──────────────────────────────────────── */}
      <section style={{
        padding: "0 clamp(20px, 6vw, 80px) clamp(60px, 10vh, 100px)",
        maxWidth: "600px", margin: "0 auto",
      }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            fontSize: "12px", color: "#c8f060",
            textTransform: "uppercase", letterSpacing: ".1em",
            fontWeight: 600, marginBottom: "10px",
          }}>REST API</div>
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 800,
            letterSpacing: "-1px", marginBottom: "12px",
          }}>One call. That's it.</h2>
        </div>

        <div className="fade-up d1" style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#60a5fa" }}/>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#34d399" }}/>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fb923c" }}/>
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>synthesize</span>
          </div>
          <pre style={{
            padding: "20px", margin: 0,
            fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "13px",
            lineHeight: 1.7, overflowX: "auto", color: "rgba(255,255,255,0.7)",
          }}>
{`POST /api/synthesize
Content-Type: application/json

{
  "text": "Hello from TwelveLab",
  "voice_id": "priya",
  "speed": 1.0
}`}
          </pre>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{
        padding: "clamp(40px, 8vh, 80px) clamp(20px, 6vw, 80px)",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="fade-up">
          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "clamp(24px, 5vw, 44px)", fontWeight: 800,
            letterSpacing: "-1px", marginBottom: "16px",
          }}>
            Ready to give your product a voice?
          </h2>
          <p style={{
            fontSize: "16px", color: "rgba(255,255,255,0.35)",
            maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.6,
          }}>
            Start synthesizing speech for free. No credit card required.
          </p>
          <Link href="/studio" className="btn-primary" style={{
            display: "inline-block",
            padding: "18px 40px", borderRadius: "100px",
            background: "#c8f060", color: "#000",
            fontSize: "17px", fontWeight: 700,
            fontFamily: "'Space Grotesk',sans-serif",
            textDecoration: "none", transition: "all .2s",
            boxShadow: "0 0 40px rgba(200,240,96,0.15)",
          }}>
            Get started free &rarr;
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{
        padding: "32px clamp(20px, 6vw, 80px)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px",
        fontSize: "12px", color: "rgba(255,255,255,0.25)",
      }}>
        <div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            Twelve<span style={{ color: "#c8f060" }}>Lab</span>
          </span>
          {" "}Text-to-speech platform
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/login" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Sign in</Link>
          <Link href="/studio" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Studio</Link>
        </div>
      </footer>
    </div>
  );
}
