"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DesktopSidebar, MobileDrawer } from "@/components/sidebar";
import type { Generation, ClonedVoice } from "@/lib/types";
import { VC } from "@/lib/voices";

const VOICE_LANG: Record<string, string> = {
  aria: "EN", ryan: "EN", priya: "HI", aisha: "MR", sofia: "ES", lena: "DE", pierre: "FR",
};

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function HistoryPage() {
  const { user, mounted, logout } = useAuth();
  const router = useRouter();

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [playing,     setPlaying]     = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [filterVoice, setFilterVoice] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  function getVoiceNameForGeneration(voiceId: string): { name: string; color: string; lang: string } {
    const cv = clonedVoices.find(v => v.id === voiceId);
    if (cv && cv.status === "ready") return { name: cv.name, color: "#a78bfa", lang: "Custom" };
    return { name: VOICE_LANG[voiceId] ? voiceId : voiceId.slice(0, 8), color: VC[voiceId] || "#888", lang: VOICE_LANG[voiceId] || "" };
  }

  useEffect(() => {
    if (!mounted || !supabase || !user) return;
    (async () => {
      const [genRes, cvRes] = await Promise.all([
        supabase.from("generations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("cloned_voices").select("*").eq("user_id", user.id),
      ]);
      setGenerations(genRes.data || []);
      setClonedVoices((cvRes.data || []) as ClonedVoice[]);
      setLoading(false);
    })();
  }, [mounted, user]);

  async function deleteGeneration(id: string) {
    if (!supabase) return;
    try {
      await supabase.from("generations").delete().eq("id", id);
      setGenerations(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function replay(gen: Generation) {
    if (!gen.audio_url) return;
    if (audioRef.current) {
      audioRef.current.src = gen.audio_url;
      audioRef.current.play();
      setPlaying(gen.id);
    }
  }

  const filtered = generations.filter(g =>
    g.text.toLowerCase().includes(search.toLowerCase()) &&
    (filterVoice === "all" || g.voice_id === filterVoice)
  );
  const uniqueVoices  = [...new Set(generations.map(g => g.voice_id))];
  const totalChars    = generations.reduce((s, g) => s + g.char_count, 0);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        /* Fonts loaded from globals.css */
        @keyframes fadeIn{from{opacity:0} to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1} 50%{opacity:.3}}
        @keyframes shimmer{0%{background-position:200% 0} 100%{background-position:-200% 0}}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:48;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
        .gen-row{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:14px;transition:all .15s}
        .gen-row:hover{border-color:rgba(200,240,96,0.15);background:rgba(200,240,96,0.02)}
        .gen-row:active{transform:scale(.995)}
        .filter-pill{font-size:12px;padding:7px 14px;border-radius:100px;border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
        .filter-pill:active{transform:scale(.95)}
        .action-btn{border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-btn:hover{opacity:.8}
        .action-btn:active{transform:scale(.97)}
        .loading-shimmer{background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        .desktop-sidebar{position:fixed;top:0;left:0;bottom:0;width:240px;background:#08080a;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;z-index:40;overflow-y:scroll;scrollbar-width:none}
        .desktop-sidebar::-webkit-scrollbar{display:none}
        .nav-drawer{position:fixed;top:0;left:0;bottom:0;width:min(280px,85vw);background:#08080a;border-right:1px solid rgba(255,255,255,0.06);z-index:50;display:flex;flex-direction:column;animation:slideInLeft .3s cubic-bezier(.4,0,.2,1);overflow-y:scroll;scrollbar-width:none}
        .nav-drawer::-webkit-scrollbar{display:none}
        @media(min-width:900px){.hamburger{display:none!important}.main-wrap{margin-left:240px!important}}
        @media(max-width:899px){.desktop-sidebar{display:none!important}.main-wrap{margin-left:0!important}}
        @media(max-width:600px){.stats-grid{grid-template-columns:1fr 1fr!important}.action-row{flex-wrap:wrap!important;gap:6px!important}.action-row>.action-btn{flex:1 1 calc(50% - 6px)!important;min-width:0!important}}
        @media(max-width:400px){.stats-grid{grid-template-columns:1fr!important}.action-row{flex-direction:column!important}.action-row>.action-btn{width:100%!important}}
      `}</style>

      <div style={{ display:"flex", minHeight:"100dvh", background:"#080808", color:"#f0ede8" }}>

        {/* ── SIDEBARS ────────────────────────────────── */}
        <MobileDrawer
          user={user} charUsed={0} charLimit={10000}
          genCount={generations.length} activeRoute="history"
          open={sidebarOpen} onClose={() => setSidebarOpen(false)}
          onLogout={logout}
        />
        <DesktopSidebar
          user={user} charUsed={0} charLimit={10000}
          genCount={generations.length} activeRoute="history"
          onLogout={logout}
        />

        {/* ── MAIN ── */}
        <div className="main-wrap" style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>

          {/* Topbar */}
          <header style={{ padding:"14px 16px", background:"rgba(8,8,8,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:30, backdropFilter:"blur(12px)", gap:"12px" }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{ background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", padding:"8px", borderRadius:"8px", display:"flex", alignItems:"center", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"18px", fontWeight:800, flex:1, textAlign:"center" }}>Twelve<span style={{ color:"#c8f060" }}>Lab</span></div>
            <button onClick={() => router.push("/studio")} style={{ background:"#c8f060", border:"none", color:"#000", cursor:"pointer", padding:"8px 16px", borderRadius:"100px", fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", flexShrink:0 }}>+ New</button>
          </header>

          {/* Content */}
          <div style={{ flex:1, padding:"clamp(14px,4vw,28px)", maxWidth:"900px", width:"100%", margin:"0 auto" }}>

            <div className="fade-up" style={{ marginBottom:"20px" }}>
              <h1 style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"clamp(20px,5vw,26px)", fontWeight:800, letterSpacing:"-0.5px" }}>History</h1>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>All your past generations</p>
            </div>

            <div className="fade-up d1 stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
              {[
                { label:"Generations", value: generations.length },
                { label:"Chars used",  value: totalChars.toLocaleString() },
                { label:"Voices",      value: uniqueVoices.length },
              ].map(s => (
                <div key={s.label} style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"14px 16px" }}>
                  <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"clamp(18px,4vw,24px)", fontWeight:800, letterSpacing:"-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="fade-up d2" style={{ marginBottom:"14px" }}>
              <input type="text" placeholder="Search generations…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width:"100%", padding:"11px 14px", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", color:"rgba(255,255,255,0.8)", fontSize:"16px", fontFamily:"var(--font-inter),'Inter',sans-serif", transition:"border-color .2s" }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor="rgba(200,240,96,0.35)"}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.08)"}
              />
            </div>

            {uniqueVoices.length > 0 && (
              <div className="fade-up d2" style={{ display:"flex", gap:"6px", overflowX:"auto", paddingBottom:"4px", marginBottom:"16px", scrollbarWidth:"none" }}>
                {["all", ...uniqueVoices].map(v => (
                  <button key={v} className="filter-pill"
                    onClick={() => setFilterVoice(v)}
                    style={{ background: filterVoice===v ? "rgba(200,240,96,0.1)" : "#0d0d0d", border:`1px solid ${filterVoice===v ? "rgba(200,240,96,0.3)" : "rgba(255,255,255,0.08)"}`, color: filterVoice===v ? "#c8f060" : "rgba(255,255,255,0.4)", textTransform:"capitalize" }}
                  >{v === "all" ? "All voices" : v}</button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="content-wrap" style={{ display:"flex", flexDirection:"column", gap:"10px", padding:"32px 0" }}>
                {Array.from({length:5}).map((_,i) => <div key={i} className="loading-shimmer fade-up" style={{width:"100%",height:"64px",animationDelay:`${i*0.06}s`}}/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px" }}>
                <div style={{ fontSize:"32px", marginBottom:"12px" }}>🎙</div>
                <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"18px", fontWeight:700, marginBottom:"8px" }}>{search || filterVoice !== "all" ? "No results" : "No generations yet"}</div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)", marginBottom:"20px" }}>{search || filterVoice !== "all" ? "Try a different filter" : "Go to Studio and generate your first audio"}</div>
                <button onClick={() => router.push("/studio")} style={{ padding:"10px 24px", borderRadius:"100px", background:"#c8f060", color:"#000", border:"none", fontSize:"13px", fontWeight:600, cursor:"pointer", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>Go to Studio</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {filtered.map((gen, i) => (
                  <div key={gen.id} className="gen-row slide-left" style={{ padding:"14px 16px", animationDelay:`${i*0.04}s` }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                      <div style={{ width:"38px", height:"38px", borderRadius:"50%", flexShrink:0, background:`${VC[gen.voice_id]||"#888"}18`, border:`1px solid ${VC[gen.voice_id]||"#888"}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, color:VC[gen.voice_id]||"#888", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif" }}>
                        {gen.voice_id[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.82)", lineHeight:"1.5", marginBottom:"8px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as any}>
                          {gen.text}
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"8px" }}>
                          <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"4px", background:`${VC[gen.voice_id]||"#888"}15`, color:VC[gen.voice_id]||"#888", fontWeight:500, textTransform:"capitalize" }}>
                            {gen.voice_id} · {VOICE_LANG[gen.voice_id]||"EN"}
                          </span>
                          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>{gen.char_count.toLocaleString()} chars</span>
                          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>{timeAgo(gen.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="action-row" style={{ display:"flex", gap:"8px", marginTop:"12px", marginLeft:"50px" }}>
                      <button className="action-btn"
                        onClick={() => playing === gen.id ? (audioRef.current?.pause(), setPlaying(null)) : replay(gen)}
                        style={{ flex:1, padding:"9px", borderRadius:"10px", background: playing===gen.id ? "rgba(200,240,96,0.1)" : "rgba(255,255,255,0.05)", border:`1px solid ${playing===gen.id ? "rgba(200,240,96,0.25)" : "rgba(255,255,255,0.08)"}`, color: playing===gen.id ? "#c8f060" : "rgba(255,255,255,0.5)", fontSize:"13px", gap:"6px" }}
                      >
                        {playing===gen.id ? (
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg> Pause</>
                        ) : (
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" fill="currentColor"/></svg> Play</>
                        )}
                      </button>
                      <a href={gen.audio_url} download className="action-btn"
                        style={{ flex:"1 1 120px", padding:"9px", borderRadius:"10px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", fontSize:"13px", textAlign:"center" }}>
                        Download
                      </a>
                      <button className="action-btn" onClick={() => deleteGeneration(gen.id)}
                        style={{ flex:"1 1 120px", padding:"9px", borderRadius:"10px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", color:"#f87171", fontSize:"13px" }}>
                        Delete
                      </button>
                      <button className="action-btn" onClick={() => router.push("/studio")}
                        style={{ flex:1, padding:"9px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)", fontSize:"13px" }}>
                        Use in Studio
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <audio ref={audioRef} onEnded={() => setPlaying(null)} onPause={() => setPlaying(null)} style={{ display:"none" }}/>
      </div>
    </>
  );
}
