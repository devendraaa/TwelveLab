"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Generation = { id: string; voice_id: string; text: string; char_count: number; created_at: string; audio_url?: string; };

const VOICE_COLORS: Record<string, string> = {
  aria: "#60a5fa", ryan: "#34d399", priya: "#fb923c",
  sofia: "#f472b6", lena: "#a78bfa", pierre: "#22d3ee",
};
const VOICE_LANG: Record<string, string> = {
  aria: "EN", ryan: "EN", priya: "HI", sofia: "ES", lena: "DE", pierre: "FR",
};

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [user,        setUser]        = useState<any>(null);
  const [playing,     setPlaying]     = useState<string | null>(null);
  const [generating,  setGenerating]  = useState<string | null>(null);
  const [audioUrls,   setAudioUrls]   = useState<Record<string, string>>({});
  const [search,      setSearch]      = useState("");
  const [filterVoice, setFilterVoice] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted,     setMounted]     = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router   = useRouter();

  useEffect(() => {
    if (!supabase) return;
    setMounted(true);
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data } = await supabase.from("generations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setGenerations(data || []);
      setLoading(false);
    };
    init();
  }, []);

  async function deleteGeneration(id: string) {
    if (!supabase) return;
    try {
      await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      setGenerations(prev => prev.filter(g => g.id !== id));

    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function replay(gen: Generation) {
    if (!gen.audio_url) {
      console.error("No audio URL available");
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = gen.audio_url;
      audioRef.current.play();
      setPlaying(gen.id);
    }
  }

  async function logout() { supabase?.auth.signOut(); router.push("/login"); }

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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body { font-family:'DM Sans',sans-serif; background:#080808; overflow-x:hidden; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        .fade-up { animation:fadeUp .4s ease both; }
        .d1{animation-delay:.05s} .d2{animation-delay:.1s} .d3{animation-delay:.15s}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        input::placeholder{color:rgba(255,255,255,0.2)} input:focus{outline:none}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:48;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
        .sidebar{position:fixed;top:0;left:0;bottom:0;width:260px;background:#0c0c0c;border-right:1px solid rgba(255,255,255,0.07);z-index:49;display:flex;flex-direction:column;overflow-y:auto}
        .nav-btn{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;text-align:left;transition:all .15s}
        .nav-btn:hover{background:rgba(255,255,255,0.05)!important;color:rgba(255,255,255,0.9)!important}
        .gen-row{background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:14px;transition:all .15s}
        .gen-row:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.02)}
        .filter-pill{font-size:12px;padding:7px 14px;border-radius:100px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
        .action-btn{border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:'DM Sans',sans-serif}
        .action-btn:hover{opacity:.8}
        @media(min-width:768px){.hamburger{display:none!important}.main-wrap{margin-left:260px!important}}
        @media(max-width:767px){.sidebar{animation:slideIn .25s ease}.main-wrap{margin-left:0!important}}
        @media(max-width:600px){.stats-grid{grid-template-columns:1fr 1fr!important}.gen-actions{flex-direction:column!important;align-items:flex-start!important}}
        @media(max-width:400px){.stats-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ display:"flex", minHeight:"100dvh", background:"#080808", color:"#f0ede8" }}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}/>}
        {sidebarOpen && (
          <aside className="sidebar">
            <div style={{ padding:"20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"19px", fontWeight:800, letterSpacing:"-0.5px" }}>Twelve<span style={{ color:"#c8f060" }}>Lab</span></div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)", marginTop:"2px", letterSpacing:".08em" }}>VOICE SYNTHESIS</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", padding:"6px", borderRadius:"8px" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <nav style={{ padding:"10px 8px", flex:1 }}>
              {[
                { label:"Studio",  route:"/studio",  active:false },
                { label:"History", route:"/history", active:true  },
              ].map(item => (
                <button key={item.label} className="nav-btn"
                  onClick={() => { router.push(item.route); setSidebarOpen(false); }}
                  style={{ background: item.active ? "rgba(200,240,96,0.09)" : "transparent", color: item.active ? "#c8f060" : "rgba(255,255,255,0.45)", marginBottom:"2px" }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,#c8f060,#7fc22a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, color:"#000", flexShrink:0 }}>
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div style={{ flex:1, overflow:"hidden" }}>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.75)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email?.split("@")[0]}</div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>Free plan</div>
                </div>
              </div>
              <button onClick={logout} style={{ width:"100%", marginTop:"6px", padding:"9px", border:"none", background:"rgba(248,113,113,0.08)", color:"#f87171", cursor:"pointer", borderRadius:"10px", fontSize:"13px", fontFamily:"'DM Sans',sans-serif" }}>Sign out</button>
            </div>
          </aside>
        )}

        {/* Desktop sidebar */}
        <aside className="sidebar" style={{ display:"none" }} id="desktop-sidebar">
          <div style={{ padding:"20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"19px", fontWeight:800 }}>Twelve<span style={{ color:"#c8f060" }}>Lab</span></div>
            <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.28)", marginTop:"2px" }}>VOICE SYNTHESIS</div>
          </div>
          <nav style={{ padding:"10px 8px", flex:1 }}>
            {[{ label:"Studio", route:"/studio", active:false }, { label:"History", route:"/history", active:true }].map(item => (
              <button key={item.label} className="nav-btn" onClick={() => router.push(item.route)}
                style={{ background: item.active?"rgba(200,240,96,0.09)":"transparent", color: item.active?"#c8f060":"rgba(255,255,255,0.45)", marginBottom:"2px" }}>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ padding:"12px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px" }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,#c8f060,#7fc22a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, color:"#000" }}>
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div style={{ flex:1, overflow:"hidden" }}>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.75)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email?.split("@")[0]}</div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>Free plan</div>
              </div>
            </div>
            <button onClick={logout} style={{ width:"100%", marginTop:"6px", padding:"9px", border:"none", background:"rgba(248,113,113,0.08)", color:"#f87171", cursor:"pointer", borderRadius:"10px", fontSize:"13px", fontFamily:"'DM Sans',sans-serif" }}>Sign out</button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main-wrap" style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>

          {/* Topbar */}
          <header style={{ padding:"14px 16px", background:"rgba(8,8,8,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:30, backdropFilter:"blur(12px)", gap:"12px" }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{ background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", padding:"8px", borderRadius:"8px", display:"flex", alignItems:"center", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:800, flex:1, textAlign:"center" }}>Twelve<span style={{ color:"#c8f060" }}>Lab</span></div>
            <button onClick={() => router.push("/studio")} style={{ background:"#c8f060", border:"none", color:"#000", cursor:"pointer", padding:"8px 16px", borderRadius:"100px", fontSize:"13px", fontWeight:600, fontFamily:"'Syne',sans-serif", flexShrink:0 }}>+ New</button>
          </header>

          {/* Content */}
          <div style={{ flex:1, padding:"clamp(14px,4vw,28px)", maxWidth:"900px", width:"100%", margin:"0 auto" }}>

            {/* Title */}
            <div className="fade-up" style={{ marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(20px,5vw,26px)", fontWeight:800, letterSpacing:"-0.5px" }}>History</h1>
                <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>All your past generations</p>
              </div>
            </div>

            {/* Stats */}
            <div className="fade-up d1 stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
              {[
                { label:"Generations", value: generations.length },
                { label:"Chars used",  value: totalChars.toLocaleString() },
                { label:"Voices",      value: uniqueVoices.length },
              ].map(s => (
                <div key={s.label} style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"14px 16px" }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(18px,4vw,24px)", fontWeight:800, letterSpacing:"-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="fade-up d2" style={{ marginBottom:"14px" }}>
              <div style={{ position:"relative" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.25)", pointerEvents:"none" }}>
                  <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Search generations…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", padding:"11px 14px 11px 34px", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", color:"rgba(255,255,255,0.8)", fontSize:"14px", fontFamily:"'DM Sans',sans-serif", transition:"border-color .2s" }}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor="rgba(200,240,96,0.35)"}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.08)"}
                />
              </div>
            </div>

            {/* Filter pills */}
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

            {/* List */}
            {loading ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,0.3)", fontSize:"14px" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px" }}>
                <div style={{ fontSize:"32px", marginBottom:"12px" }}>🎙</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:700, marginBottom:"8px" }}>{search || filterVoice !== "all" ? "No results" : "No generations yet"}</div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)", marginBottom:"20px" }}>{search || filterVoice !== "all" ? "Try a different filter" : "Go to Studio and generate your first audio"}</div>
                <button onClick={() => router.push("/studio")} style={{ padding:"10px 24px", borderRadius:"100px", background:"#c8f060", color:"#000", border:"none", fontSize:"13px", fontWeight:600, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>Go to Studio</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {filtered.map((gen, i) => (
                  <div key={gen.id} className="gen-row fade-up" style={{ padding:"14px 16px", animationDelay:`${i*0.04}s` }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                      {/* Avatar */}
                      <div style={{ width:"38px", height:"38px", borderRadius:"50%", flexShrink:0, background:`${VOICE_COLORS[gen.voice_id]||"#888"}18`, border:`1px solid ${VOICE_COLORS[gen.voice_id]||"#888"}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, color:VOICE_COLORS[gen.voice_id]||"#888", fontFamily:"'Syne',sans-serif" }}>
                        {gen.voice_id[0].toUpperCase()}
                      </div>

                      {/* Content */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.82)", lineHeight:"1.5", marginBottom:"8px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" } as any}>
                          {gen.text}
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"8px" }}>
                          <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:"4px", background:`${VOICE_COLORS[gen.voice_id]||"#888"}15`, color:VOICE_COLORS[gen.voice_id]||"#888", fontWeight:500, textTransform:"capitalize" }}>
                            {gen.voice_id} · {VOICE_LANG[gen.voice_id]||"EN"}
                          </span>
                          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>{gen.char_count.toLocaleString()} chars</span>
                          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>{timeAgo(gen.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="gen-actions" style={{ display:"flex", gap:"8px", marginTop:"12px", marginLeft:"50px" }}>
                      <button className="action-btn"
                        onClick={() => playing === gen.id ? (audioRef.current?.pause(), setPlaying(null)) : replay(gen)}
                        style={{ flex:1, padding:"9px", borderRadius:"10px", background: playing===gen.id ? "rgba(200,240,96,0.1)" : "rgba(255,255,255,0.05)", border:`1px solid ${playing===gen.id ? "rgba(200,240,96,0.25)" : "rgba(255,255,255,0.08)"}`, color: playing===gen.id ? "#c8f060" : "rgba(255,255,255,0.5)", fontSize:"13px", gap:"6px" }}
                      >
                        {generating===gen.id ? (
                          <div style={{ width:"14px", height:"14px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTop:"2px solid #c8f060", animation:"spin .7s linear infinite" }}/>
                        ) : playing===gen.id ? (
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg> Pause</>
                        ) : (
                          <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" fill="currentColor"/></svg> Play</>
                        )}
            
                      </button>
                          {/* Download Button */}
                          <a
                            href={gen.audio_url}
                            download
                            className="action-btn"
                            style={{
                              flex:"1 1 120px",
                              padding:"9px",
                              borderRadius:"10px",
                              background:"rgba(255,255,255,0.05)",
                              border:"1px solid rgba(255,255,255,0.08)",
                              color:"rgba(255,255,255,0.6)",
                              fontSize:"13px",
                              textAlign:"center"
                            }}
                          >
                            Download
                          </a>

                          {/* Delete Button */}
                          <button
                            className="action-btn"
                            onClick={() => deleteGeneration(gen.id)}
                            style={{
                              flex:"1 1 120px",
                              padding:"9px",
                              borderRadius:"10px",
                              background:"rgba(248,113,113,0.08)",
                              border:"1px solid rgba(248,113,113,0.2)",
                              color:"#f87171",
                              fontSize:"13px"
                            }}
                          >
                            Delete
                          </button>
                      {/* <button className="action-btn"
                        onClick={() => deleteGeneration(gen.id)}
                        style={{ flex:1, padding:"9px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)", fontSize:"13px" }}
                      >
                        Delete
                      </button> */}
                      <button className="action-btn"
                        onClick={() => router.push(`/studio`)}
                        style={{ flex:1, padding:"9px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)", fontSize:"13px" }}
                      >
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

      {/* Desktop sidebar injection */}
      <style>{`
        @media(min-width:768px){
          #desktop-sidebar{display:flex!important;flex-direction:column;}
        }
      `}</style>
    </>
  );
}
