"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Generation = {
  id: string;
  voice_id: string;
  text: string;
  char_count: number;
  created_at: string;
};

const VOICE_COLORS: Record<string, string> = {
  aria: "#3b82f6", ryan: "#10b981", priya: "#f97316",
  sofia: "#ec4899", lena: "#8b5cf6", pierre: "#06b6d4",
};

const VOICE_LANG: Record<string, string> = {
  aria: "EN", ryan: "EN", priya: "HI",
  sofia: "ES", lena: "DE", pierre: "FR",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
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
  const [mounted,     setMounted]     = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router   = useRouter();

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGenerations(data || []);
      setLoading(false);
    };
    init();
  }, []);

  async function replay(gen: Generation) {
    // Use cached audio if available
    if (audioUrls[gen.id]) {
      if (audioRef.current) {
        audioRef.current.src = audioUrls[gen.id];
        audioRef.current.play();
        setPlaying(gen.id);
      }
      return;
    }

    setGenerating(gen.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: gen.text, voice_id: gen.voice_id }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setAudioUrls(prev => ({ ...prev, [gen.id]: url }));
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlaying(gen.id);
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(null); }
  }

  function stopAudio() {
    audioRef.current?.pause();
    setPlaying(null);
  }

  const filtered = generations.filter(g => {
    const matchSearch = g.text.toLowerCase().includes(search.toLowerCase());
    const matchVoice  = filterVoice === "all" || g.voice_id === filterVoice;
    return matchSearch && matchVoice;
  });

  const uniqueVoices = [...new Set(generations.map(g => g.voice_id))];
  const totalChars   = generations.reduce((sum, g) => sum + g.char_count, 0);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Syne', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .anim { animation: fadeUp .4s ease both; }
        .row-hover { transition: background .15s, border-color .15s; }
        .row-hover:hover { background: rgba(255,255,255,0.03) !important; border-color: rgba(255,255,255,0.1) !important; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { outline: none; border-color: rgba(200,240,96,0.4) !important; }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"#080808", color:"#f0ede8" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width:"220px", minHeight:"100vh", background:"#0d0d0d",
          borderRight:"1px solid rgba(255,255,255,0.06)",
          display:"flex", flexDirection:"column", flexShrink:0,
          position:"fixed", top:0, left:0, bottom:0, zIndex:40,
        }}>
          {/* Logo */}
          <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div className="font-display" style={{ fontSize:"18px", fontWeight:700, letterSpacing:"-0.5px" }}>
              Twelve<span style={{ color:"#c8f060" }}>Lab</span>
            </div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", marginTop:"3px" }}>VOICE SYNTHESIS</div>
          </div>

          {/* Nav */}
          <nav style={{ padding:"12px 10px", flex:1 }}>
            {[
              { id:"studio",  label:"Studio",  href:"/studio",  active:false },
              { id:"history", label:"History", href:"/history", active:true  },
            ].map(item => (
              <button key={item.id}
                onClick={() => router.push(item.href)}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:"10px",
                  padding:"9px 12px", borderRadius:"10px", border:"none",
                  background: item.active ? "rgba(200,240,96,0.08)" : "transparent",
                  color: item.active ? "#c8f060" : "rgba(255,255,255,0.45)",
                  cursor:"pointer", marginBottom:"2px",
                  fontFamily:"'DM Sans', sans-serif", fontSize:"13px", fontWeight:500,
                  textAlign:"left", transition:"all .15s",
                }}
              >
                {item.id === "studio" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Z" stroke="currentColor" strokeWidth="1.5"/><path d="M6 5.5v5l4-2.5-4-2.5Z" fill="currentColor"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                )}
                {item.label}
              </button>
            ))}
          </nav>

          {/* User */}
          <div style={{ padding:"16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => router.push("/studio")} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"10px",
              padding:"8px", borderRadius:"10px", border:"none", background:"transparent",
              cursor:"pointer",
            }}>
              <div style={{
                width:"32px", height:"32px", borderRadius:"50%",
                background:"linear-gradient(135deg, #c8f060, #7fc22a)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"13px", fontWeight:700, color:"#000", flexShrink:0,
              }}>
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div style={{ flex:1, textAlign:"left", overflow:"hidden" }}>
                <div style={{ fontSize:"12px", fontWeight:500, color:"rgba(255,255,255,0.7)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user?.email?.split("@")[0] || "User"}
                </div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>Free plan</div>
              </div>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ marginLeft:"220px", flex:1, minHeight:"100vh" }}>

          {/* Header */}
          <header style={{
            padding:"20px 32px", borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:"rgba(8,8,8,0.8)", backdropFilter:"blur(12px)",
            position:"sticky", top:0, zIndex:30,
          }}>
            <div>
              <h1 className="font-display anim" style={{ fontSize:"22px", fontWeight:700, letterSpacing:"-0.5px", margin:0 }}>
                History
              </h1>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", margin:"2px 0 0" }}>
                All your past generations
              </p>
            </div>
            <button onClick={() => router.push("/studio")} style={{
              padding:"8px 20px", borderRadius:"100px",
              background:"#c8f060", color:"#000", border:"none",
              fontSize:"13px", fontWeight:600, cursor:"pointer",
              fontFamily:"'Syne', sans-serif", transition:"background .2s",
            }}>
              + New
            </button>
          </header>

          <div style={{ padding:"28px 32px" }}>

            {/* Stats row */}
            <div className="anim" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"12px", marginBottom:"24px" }}>
              {[
                { label:"Total generations", value: generations.length.toString() },
                { label:"Characters generated", value: totalChars.toLocaleString() },
                { label:"Voices used", value: uniqueVoices.length.toString() + " voices" },
              ].map(stat => (
                <div key={stat.label} style={{
                  background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:"14px", padding:"16px 20px",
                }}>
                  <div className="font-display" style={{ fontSize:"24px", fontWeight:700, color:"#f0ede8", letterSpacing:"-0.5px" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search + filter */}
            <div className="anim" style={{ display:"flex", gap:"10px", marginBottom:"20px" }}>
              <div style={{ flex:1, position:"relative" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.25)" }}>
                  <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search your generations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width:"100%", padding:"10px 14px 10px 34px",
                    background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:"10px", color:"rgba(255,255,255,0.8)",
                    fontSize:"13px", fontFamily:"'DM Sans', sans-serif",
                    transition:"border-color .2s",
                  }}
                />
              </div>

              {/* Voice filter pills */}
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                {["all", ...uniqueVoices].map(v => (
                  <button key={v}
                    onClick={() => setFilterVoice(v)}
                    style={{
                      padding:"8px 14px", borderRadius:"100px", border:"none",
                      background: filterVoice === v ? "rgba(200,240,96,0.1)" : "#0d0d0d",
                      border: `1px solid ${filterVoice === v ? "rgba(200,240,96,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: filterVoice === v ? "#c8f060" : "rgba(255,255,255,0.4)",
                      fontSize:"12px", cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
                      textTransform:"capitalize", transition:"all .15s",
                    }}
                  >
                    {v === "all" ? "All voices" : v}
                  </button>
                ))}
              </div>
            </div>

            {/* Generations list */}
            {loading ? (
              <div style={{ textAlign:"center", padding:"60px", color:"rgba(255,255,255,0.3)", fontSize:"14px" }}>
                Loading your generations…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign:"center", padding:"80px 20px",
                background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:"16px",
              }}>
                <div style={{ fontSize:"32px", marginBottom:"12px" }}>🎙</div>
                <div className="font-display" style={{ fontSize:"18px", fontWeight:600, marginBottom:"8px" }}>
                  {search || filterVoice !== "all" ? "No results found" : "No generations yet"}
                </div>
                <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)", marginBottom:"20px" }}>
                  {search || filterVoice !== "all" ? "Try a different search or filter" : "Go to Studio and generate your first audio"}
                </div>
                <button onClick={() => router.push("/studio")} style={{
                  padding:"10px 24px", borderRadius:"100px",
                  background:"#c8f060", color:"#000", border:"none",
                  fontSize:"13px", fontWeight:600, cursor:"pointer",
                  fontFamily:"'Syne', sans-serif",
                }}>
                  Go to Studio
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {filtered.map((gen, i) => (
                  <div key={gen.id} className="row-hover anim" style={{
                    background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"14px", padding:"16px 20px",
                    display:"flex", alignItems:"center", gap:"16px",
                    animationDelay:`${i * 0.04}s`,
                  }}>
                    {/* Voice avatar */}
                    <div style={{
                      width:"40px", height:"40px", borderRadius:"50%", flexShrink:0,
                      background:`${VOICE_COLORS[gen.voice_id] || "#888"}20`,
                      border:`1px solid ${VOICE_COLORS[gen.voice_id] || "#888"}40`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"15px", fontWeight:700,
                      color: VOICE_COLORS[gen.voice_id] || "#888",
                      fontFamily:"'Syne', sans-serif",
                    }}>
                      {gen.voice_id[0].toUpperCase()}
                    </div>

                    {/* Text preview */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:"14px", color:"rgba(255,255,255,0.85)",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        marginBottom:"4px",
                      }}>
                        {gen.text}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <span style={{
                          fontSize:"11px", padding:"2px 8px", borderRadius:"4px",
                          background:`${VOICE_COLORS[gen.voice_id] || "#888"}15`,
                          color: VOICE_COLORS[gen.voice_id] || "#888",
                          fontWeight:500, textTransform:"capitalize",
                        }}>
                          {gen.voice_id} · {VOICE_LANG[gen.voice_id] || "EN"}
                        </span>
                        <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>
                          {gen.char_count.toLocaleString()} chars
                        </span>
                        <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>
                          {timeAgo(gen.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
                      {/* Play / Stop button */}
                      <button
                        onClick={() => playing === gen.id ? stopAudio() : replay(gen)}
                        style={{
                          width:"36px", height:"36px", borderRadius:"50%", border:"none",
                          background: playing === gen.id ? "rgba(200,240,96,0.15)" : "rgba(255,255,255,0.06)",
                          color: playing === gen.id ? "#c8f060" : "rgba(255,255,255,0.5)",
                          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                          transition:"all .15s",
                        }}
                      >
                        {generating === gen.id ? (
                          <div style={{ width:"14px", height:"14px", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTop:"2px solid #c8f060", animation:"spin .7s linear infinite" }}/>
                        ) : playing === gen.id ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="7" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" fill="currentColor"/></svg>
                        )}
                      </button>

                      {/* Use in studio */}
                      <button
                        onClick={() => router.push(`/studio?text=${encodeURIComponent(gen.text)}&voice=${gen.voice_id}`)}
                        style={{
                          padding:"7px 14px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.08)",
                          background:"transparent", color:"rgba(255,255,255,0.4)",
                          fontSize:"12px", cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
                          transition:"all .15s", whiteSpace:"nowrap",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                      >
                        Use in Studio
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Hidden audio element */}
        <audio ref={audioRef}
          onEnded={() => setPlaying(null)}
          onPause={() => setPlaying(null)}
          style={{ display:"none" }}
        />
      </div>
    </>
  );
}
