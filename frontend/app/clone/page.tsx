"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DesktopSidebar, MobileDrawer } from "@/components/sidebar";
import type { ClonedVoice } from "@/lib/types";

export default function ClonePage() {
  const { user, mounted, logout } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [voiceName, setVoiceName] = useState("");
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [charUsed, setCharUsed] = useState(0);
  const [genCount, setGenCount] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Record state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Canvas waveform
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Training animation
  const [trainingDone, setTrainingDone] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load cloned voices
  useEffect(() => {
    if (!mounted || !supabase || !user) return;
    (async () => {
      const { data } = await supabase.from("cloned_voices").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setClonedVoices((data || []) as ClonedVoice[]);
      setLoading(false);
    })();
  }, [mounted, user]);

  // Load usage
  useEffect(() => {
    if (!mounted || !supabase || !user) return;
    (async () => {
      const { data } = await supabase.from("users").select("char_used").eq("id", user.id).single();
      if (data) setCharUsed(data.char_used || 0);
      const { count } = await supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setGenCount(count || 0);
    })();
  }, [mounted, user]);

  // Recording timer
  useEffect(() => {
    if (isRecording && recordingTime < 120) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) { stopRecording(); return 120; }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Canvas waveform animation
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufLen = analyser.fftSize;
    const data = new Uint8Array(bufLen);
    analyser.getByteTimeDomainData(data);

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#c8f060";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    const sliceWidth = w / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Glow effect
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(200,240,96,0.15)";
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioCtxRef.current = audioCtx;

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);

      // Start canvas animation
      drawWaveform();
    } catch (err) {
      console.error("Microphone error:", err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Upload handler
  async function handleUpload() {
    if (!voiceName.trim() || !selectedFile || !supabase) return;
    setSubmitting(true);
    try {
      // Upload audio to Supabase Storage
      const ext = selectedFile.name.split(".").pop() || "wav";
      const path = `voices/${user!.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("voice-clones").upload(path, selectedFile);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from("voice-clones").getPublicUrl(path);

      // Save record
      const { data, error } = await supabase.from("cloned_voices").insert({
        user_id: user!.id,
        name: voiceName.trim(),
        audio_url: publicUrl,
        status: "pending",
      }).select().single();

      if (error) throw new Error(error.message);
      setClonedVoices(prev => [data as ClonedVoice, ...prev]);
      setVoiceName("");
      setSelectedFile(null);
      setTrainingDone(true);
      setTimeout(() => setTrainingDone(false), 2000);
    } catch (e: any) {
      console.error("Clone upload error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  // Record handler
  async function handleRecordSubmit() {
    if (!voiceName.trim() || !audioBlob || !supabase) return;
    setSubmitting(true);
    try {
      const path = `voices/${user!.id}/${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage.from("voice-clones").upload(path, audioBlob);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from("voice-clones").getPublicUrl(path);

      const { data, error } = await supabase.from("cloned_voices").insert({
        user_id: user!.id,
        name: voiceName.trim(),
        audio_url: publicUrl,
        status: "pending",
      }).select().single();

      if (error) throw new Error(error.message);
      setClonedVoices(prev => [data as ClonedVoice, ...prev]);
      setVoiceName("");
      setAudioBlob(null);
      setRecordingTime(0);
      setTrainingDone(true);
      setTimeout(() => setTrainingDone(false), 2000);
    } catch (e: any) {
      console.error("Clone record error:", e);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteVoice(id: string) {
    if (!supabase) return;
    try {
      await supabase.from("cloned_voices").delete().eq("id", id);
      setClonedVoices(prev => prev.filter(v => v.id !== id));
      setDeleteConfirm(null);
    } catch (err) { console.error("Delete error:", err); }
  }

  function timeAgo(d: string) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (!mounted) return null;

  const readyCount = clonedVoices.filter(v => v.status === "ready").length;
  const maxLen = 120; // 2 minutes

  return (
    <>
      <style>{`
        @keyframes fadeIn{from{opacity:0} to{opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)} 50%{transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0} 100%{background-position:-200% 0}}
        @keyframes ringPulse{0%{transform:scale(.9);opacity:.6} 100%{transform:scale(1.8);opacity:0}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)}}
        @keyframes checkPop{0%{transform:scale(0)} 50%{transform:scale(1.3)} 100%{transform:scale(1)}}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:48;backdrop-filter:blur(4px);animation:fadeIn .2s ease}
        .upload-zone{border:2px dashed rgba(255,255,255,.1);border-radius:20px;padding:48px 24px;text-align:center;transition:all .2s;cursor:pointer}
        .upload-zone:hover,.upload-zone.drag-over{border-color:rgba(200,240,96,.4);background:rgba(200,240,96,.03)}
        .upload-zone.has-file{border-color:rgba(200,240,96,.3);background:rgba(200,240,96,.05)}
        .mode-btn{padding:10px 20px;border-radius:100px;border:none;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}
        .mode-btn:active{transform:scale(.95)}
        .voice-card{background:#0d0d0d;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;transition:all .2s}
        .voice-card:hover{border-color:rgba(200,240,96,.15);background:rgba(200,240,96,.02)}
        .voice-card:active{transform:scale(.99)}
        .status-badge{font-size:11px;padding:3px 10px;border-radius:100px;font-weight:500}
        .action-btn{border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;padding:9px;border-radius:10px;font-size:13px}
        .action-btn:hover{opacity:.8}
        .action-btn:active{transform:scale(.96)}
        .rec-btn{position:relative;width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;background:#ef4444;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .rec-btn:active{transform:scale(.92)}
        .rec-btn.recording{background:#dc2626}
        .rec-ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid #ef4444;animation:ringPulse 1.5s ease infinite;top:-6px;left:-6px;right:-6px;bottom:-6px}
        canvas{width:100%;height:80px;border-radius:12px;background:rgba(0,0,0,.3)}
        @media(min-width:900px){.hamburger{display:none!important}.main-wrap{margin-left:240px!important}}
        @media(max-width:899px){.desktop-sidebar{display:none!important}.main-wrap{margin-left:0!important}}
        @media(max-width:600px){.voice-grid{grid-template-columns:1fr!important}.hero-btns{flex-direction:column}}
      `}</style>

      <div style={{ display:"flex", minHeight:"100dvh", background:"#080808", color:"#f0ede8" }}>
        <MobileDrawer user={user} charUsed={charUsed} charLimit={10000} genCount={genCount} activeRoute="clone" open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />
        <DesktopSidebar user={user} charUsed={charUsed} charLimit={10000} genCount={genCount} activeRoute="clone" onLogout={logout} />

        {/* ── MAIN ── */}
        <div className="main-wrap" style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
          <header className="topbar" style={{ padding:"14px 16px", background:"rgba(8,8,8,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:30, backdropFilter:"blur(12px)", gap:"12px" }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{ background:"rgba(255,255,255,0.06)", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", padding:"8px", borderRadius:"8px", display:"flex", alignItems:"center", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"18px", fontWeight:800, flex:1, textAlign:"center" }}>Twelve<span style={{ color:"#c8f060" }}>Lab</span></div>
            <button onClick={() => router.push("/studio")} style={{ background:"#c8f060", border:"none", color:"#000", cursor:"pointer", padding:"8px 16px", borderRadius:"100px", fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", flexShrink:0 }}>+ New</button>
          </header>

          <div className="content-wrap" style={{ flex:1, padding:"clamp(14px,4vw,28px)", maxWidth:"900px", width:"100%", margin:"0 auto" }}>
            {/* Header */}
            <div className="fade-up" style={{ marginBottom:"28px" }}>
              <h1 style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"clamp(22px,5vw,30px)", fontWeight:800, letterSpacing:"-0.5px", lineHeight:1.1 }}>Voice Cloning</h1>
              <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)", marginTop:"6px" }}>Upload or record a voice sample to create your own AI voice</p>
            </div>

            {/* Stats row */}
            <div className="fade-up d1" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"24px" }}>
              {[
                { label:"Cloned voices", value: clonedVoices.length },
                { label:"Ready to use", value: readyCount },
                { label:"Total samples", value: clonedVoices.reduce((s, v) => s + (v.audio_url ? 1 : 0), 0) },
              ].map(s => (
                <div key={s.label} style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"14px 16px" }}>
                  <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"clamp(18px,4vw,24px)", fontWeight:800, letterSpacing:"-0.5px", color:"#c8f060" }}>{s.value}</div>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mode toggle */}
            <div className="fade-up d2" style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
              <button className="mode-btn" onClick={() => setMode("upload")}
                style={{ background: mode==="upload" ? "rgba(200,240,96,0.1)" : "#0d0d0d", border:`1px solid ${mode==="upload" ? "rgba(200,240,96,0.3)" : "rgba(255,255,255,0.08)"}`, color: mode==="upload" ? "#c8f060" : "rgba(255,255,255,0.4)" }}>
                Upload Audio
              </button>
              <button className="mode-btn" onClick={() => setMode("record")}
                style={{ background: mode==="record" ? "rgba(200,240,96,0.1)" : "#0d0d0d", border:`1px solid ${mode==="record" ? "rgba(200,240,96,0.3)" : "rgba(255,255,255,0.08)"}`, color: mode==="record" ? "#c8f060" : "rgba(255,255,255,0.4)" }}>
                Record Voice
              </button>
            </div>

            {/* Voice name input */}
            <div className="fade-up d2" style={{ marginBottom:"20px" }}>
              <label style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", marginBottom:"6px", display:"block", letterSpacing:".05em" }}>VOICE NAME</label>
              <input type="text" placeholder="e.g. My Voice, John's Voice" value={voiceName} onChange={e => setVoiceName(e.target.value)} maxLength={50}
                style={{ width:"100%", padding:"12px 14px", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", color:"rgba(255,255,255,0.85)", fontSize:"16px", transition:"border-color .2s" }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(200,240,96,0.35)"}
                onBlur={e => (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>

            {/* Upload zone */}
            {mode === "upload" && !audioBlob && (
              <div className={`fade-up d3 ${selectedFile ? "has-file" : ""}`}
                style={{ marginBottom:"20px" }}>
                <div
                  className={`upload-zone ${dragOver ? "drag-over" : ""} ${selectedFile ? "has-file" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); if(e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: selectedFile ? "32px 24px" : "48px 24px" }}
                >
                  <input ref={fileInputRef} type="file" accept="audio/*" hidden
                    onChange={e => { if(e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
                  {selectedFile ? (
                    <div className="scale-in">
                      <div style={{ fontSize:"28px", marginBottom:"8px" }}>🎙️</div>
                      <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"15px", fontWeight:600, marginBottom:"4px" }}>{selectedFile.name}</div>
                      <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB &middot; Click to change</div>
                    </div>
                  ) : (
                    <>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ marginBottom:"12px", opacity:"0.3" }}>
                        <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"15px", fontWeight:600, marginBottom:"6px" }}>Drop audio file here</div>
                      <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginBottom:"12px" }}>MP3, WAV, M4A, OGG &middot; Max 25MB &middot; 30s-2min recommended</div>
                      <div style={{ fontSize:"12px", color:"rgba(200,240,96,0.5)", textDecoration:"underline", cursor:"pointer" }}>Browse files</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Record zone */}
            {mode === "record" && (
              <div className="fade-up d3" style={{ textAlign:"center", marginBottom:"20px" }}>
                <div className="card fade-up" style={{ background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"24px" }}>
                  {/* Waveform canvas */}
                  {isRecording && (
                    <div style={{ marginBottom:"16px" }} className="fade-up">
                      <canvas ref={canvasRef} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px" }}>
                        <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)" }}>{recordingTime === 0 ? "0:00" : formatTime(recordingTime)}</span>
                        <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)" }}>{formatTime(maxLen)}</span>
                      </div>
                      <div style={{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px", marginTop:"4px", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(recordingTime / maxLen) * 100}%`, background: recordingTime > 100 ? "#ef4444" : "#c8f060", borderRadius:"2px", transition:"width 1s linear, background .3s" }} />
                      </div>
                    </div>
                  )}

                  {/* Record button */}
                  {!isRecording && !audioBlob && (
                    <button className="rec-btn fade-up" onClick={startRecording} disabled={isRecording}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/>
                        <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M8 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}

                  {/* Stop button */}
                  {isRecording && (
                    <button className="rec-btn recording fade-up" onClick={stopRecording}>
                      <div className="rec-ring" />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                      </svg>
                    </button>
                  )}

                  {/* Audio blob preview */}
                  {audioBlob && !isRecording && (
                    <div className="scale-in">
                      <div style={{ fontSize:"24px", marginBottom:"8px" }}>🎙️</div>
                      <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"14px", fontWeight:600, marginBottom:"12px" }}>Recording ready</div>
                      <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", marginBottom:"16px" }}>{formatTime(recordingTime)} captured</div>
                      {/* Playback */}
                      <audio ref={audioRef} src={URL.createObjectURL(audioBlob)} controls style={{ width:"100%", marginBottom:"12px", accentColor:"#c8f060", colorScheme:"dark", height:"36px" }} />
                      <div style={{ display:"flex", gap:"8px", justifyContent:"center" }}>
                        <button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} className="action-btn" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)" }}>
                          Re-record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="fade-up d3" style={{ marginBottom:"28px" }}>
              <button onClick={mode === "upload" ? handleUpload : handleRecordSubmit}
                disabled={submitting || !voiceName.trim() || (mode === "upload" ? !selectedFile : !audioBlob)}
                style={{ width:"100%", padding:"16px", borderRadius:"14px", background:"#c8f060", color:"#000", border:"none", fontSize:"15px", fontWeight:700, cursor: (submitting || !voiceName.trim() || (mode === "upload" ? !selectedFile : !audioBlob)) ? "not-allowed" : "pointer", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", opacity: submitting ? 0.6 : 1, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                {submitting ? (
                  <>
                    <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:"2.5px solid rgba(0,0,0,0.2)", borderTop:"2.5px solid #000", animation:"spin .7s linear infinite" }} />
                    Cloning voice…
                  </>
                ) : (
                  <>🎤 Clone Voice</>
                )}
              </button>
            </div>

            {/* Success animation */}
            {trainingDone && (
              <div className="slide-up" style={{ padding:"20px", background:"rgba(200,240,96,0.06)", border:"1px solid rgba(200,240,96,0.15)", borderRadius:"16px", marginBottom:"24px", textAlign:"center" }}>
                <div style={{ fontSize:"24px", marginBottom:"8px", animation:"checkPop .5s ease both" }}>✅</div>
                <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"15px", fontWeight:600, marginBottom:"4px" }}>Voice submitted!</div>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)" }}>Your voice will appear in Studio once processing is complete</div>
              </div>
            )}

            {/* My Voices */}
            <div className="fade-up" style={{ marginBottom:"16px" }}>
              <h2 style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"18px", fontWeight:700, letterSpacing:"-0.3px" }}>My Voices</h2>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)", marginTop:"3px" }}>Your cloned voice samples</p>
            </div>

            {loading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"12px" }}>
                {Array.from({length:3}).map((_,i) => <div key={i} className="loading-shimmer fade-up" style={{height:"80px",animationDelay:`${i*0.06}s`}}/>)}
              </div>
            ) : clonedVoices.length === 0 ? (
              <div style={{ padding:"40px 24px", textAlign:"center", background:"#0d0d0d", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px" }}>
                <div style={{ fontSize:"32px", marginBottom:"8px" }}>🎭</div>
                <div style={{ fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontSize:"16px", fontWeight:600, marginBottom:"6px" }}>No cloned voices yet</div>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)" }}>Upload or record a voice sample above to get started</div>
              </div>
            ) : (
              <div className="voice-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"12px" }}>
                {clonedVoices.map((v, i) => (
                  <div key={v.id} className="voice-card fade-up" style={{ animationDelay:`${i*0.06}s` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                      <div style={{ width:"40px", height:"40px", borderRadius:"50%", flexShrink:0, background:"rgba(200,240,96,0.08)", border:"1px solid rgba(200,240,96,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontFamily:"'Space Grotesk',var(--font-space-grotesk),sans-serif", fontWeight:700, color:"#c8f060" }}>
                        {v.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"14px", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</div>
                        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>{timeAgo(v.created_at)}</div>
                      </div>
                      <span className="status-badge" style={{
                        background: v.status==="ready" ? "rgba(34,197,94,0.1)" : v.status==="failed" ? "rgba(239,68,68,0.1)" : v.status==="training" ? "rgba(250,204,21,0.1)" : "rgba(255,255,255,0.05)",
                        color: v.status==="ready" ? "#22c55e" : v.status==="failed" ? "#ef4444" : v.status==="training" ? "#facc15" : "rgba(255,255,255,0.4)",
                      }}>
                        {v.status === "training" ? "⏳ Training" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button className="action-btn" style={{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)" }}
                        onClick={() => { if(v.audio_url) router.push(`/studio?voice=${v.id}`); }}>
                        Use in Studio
                      </button>
                      {deleteConfirm === v.id ? (
                        <>
                          <button className="action-btn" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444" }} onClick={() => deleteVoice(v.id)}>Confirm</button>
                          <button className="action-btn" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="action-btn" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#f87171", width:"36px", minWidth:"36px", padding:"9px" }} onClick={() => setDeleteConfirm(v.id)}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667A1.333 1.333 0 016.667 1h2.666a1.333 1.333 0 011.334 1.333V4M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 9.333a1.333 1.333 0 001.333 1.334h5.334a1.333 1.333 0 001.333-1.334L12.667 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      )}
                    </div>
                    {v.status === "failed" && v.error && (
                      <div style={{ fontSize:"11px", color:"#ef4444", marginTop:"8px", padding:"6px 10px", background:"rgba(239,68,68,0.06)", borderRadius:"8px" }}>{v.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <audio ref={audioRef} style={{ display:"none" }} />
      </div>
    </>
  );
}
