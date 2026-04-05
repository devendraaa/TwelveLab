"use client";
import { useRouter } from "next/navigation";

type SidebarProps = {
  user: { email?: string } | null;
  charUsed: number;
  charLimit: number;
  genCount: number;
  activeRoute: "studio" | "history" | "clone";
  onLogout: () => void;
};

const ActiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3 8a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
);

const CloneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 14h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.4"/><path d="M8 3V1m-3 2V1m6 2V1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.5 8a5.5 5.5 0 1 1 1.2 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M2.5 5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export function DesktopSidebar({ user, charUsed, charLimit, genCount, activeRoute, onLogout }: SidebarProps) {
  const usagePct = Math.min((charUsed / charLimit) * 100, 100);
  const router = useRouter();

  const navItems = [
    { label: "Studio", route: "/studio" as const, icon: <ActiveIcon />, active: activeRoute === "studio" },
    { label: "History", route: "/history" as const, icon: <HistoryIcon />, active: activeRoute === "history" },
  ];

  return (
    <aside className="desktop-sidebar">
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Twelve<span style={{ color: "#c8f060" }}>Lab</span>
        </div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "3px", letterSpacing: ".1em" }}>VOICE SYNTHESIS</div>
      </div>

      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {navItems.map(item => (
          <button
            key={item.label}
            className={`nav-item${item.active ? " active" : ""}`}
            onClick={() => router.push(item.route)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "10px 6px" }} />
        <button className="nav-item" style={{ color: "#c8f060", background: "rgba(200,240,96,0.07)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 4L14 5.5l-3 3 .7 4.3L8 11l-3.7 1.8.7-4.3-3-3L6.2 5 8 1Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          Upgrade
        </button>
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <div className="stat-badge">
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#e8e4de" }}>{genCount}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>generated</div>
          </div>
          <div className="stat-badge">
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#e8e4de" }}>{Math.round(usagePct)}%</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>used</div>
          </div>
        </div>
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Usage</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{charUsed.toLocaleString()} / {charLimit.toLocaleString()}</span>
        </div>
        <div style={{ height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
          <div className="usage-fill" style={{ width: `${usagePct}%`, background: usagePct > 80 ? "linear-gradient(90deg,#fb923c,#ef4444)" : "linear-gradient(90deg,#c8f060,#86d915)" }} />
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "12px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#c8f060,#7fc22a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#000", flexShrink: 0 }}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email?.split("@")[0]}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>Free plan</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", marginTop: "8px", padding: "9px 12px", border: "1px solid rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", borderRadius: "10px", fontSize: "13px" }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileDrawer({ user, charUsed, charLimit, activeRoute, onLogout, open, onClose }: SidebarProps & { open: boolean; onClose: () => void }) {
  const usagePct = Math.min((charUsed / charLimit) * 100, 100);
  const router = useRouter();

  const navItems = [
    { label: "Studio", route: "/studio" as const, active: activeRoute === "studio" },
    { label: "History", route: "/history" as const, active: activeRoute === "history" },
  ];

  return open ? (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="nav-drawer">
        <div style={{ padding: "20px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "19px", fontWeight: 800 }}>Twelve<span style={{ color: "#c8f060" }}>Lab</span></div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "2px", letterSpacing: ".08em" }}>VOICE SYNTHESIS</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "8px", borderRadius: "10px" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <nav style={{ padding: "10px 10px", flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.label}
              className={`nav-item${item.active ? " active" : ""}`}
              onClick={() => { router.push(item.route); onClose(); }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "10px 6px" }} />
          <button className="nav-item" style={{ color: "#c8f060", background: "rgba(200,240,96,0.07)", fontSize: "15px" }}>⭐ Upgrade plan</button>
        </nav>

        <div style={{ padding: "16px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Monthly usage</span>
            <span style={{ fontSize: "12px", color: usagePct > 80 ? "#fb923c" : "rgba(255,255,255,0.4)" }}>{charUsed.toLocaleString()} / {charLimit.toLocaleString()}</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
            <div className="usage-fill" style={{ width: `${usagePct}%`, background: usagePct > 80 ? "linear-gradient(90deg,#fb923c,#ef4444)" : "linear-gradient(90deg,#c8f060,#86d915)" }} />
          </div>
        </div>

        <div style={{ padding: "12px 10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", marginBottom: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#c8f060,#7fc22a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 700, color: "#000", flexShrink: 0 }}>
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email?.split("@")[0]}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Free plan</div>
            </div>
          </div>
          <button onClick={onLogout} className="nav-item" style={{ color: "#f87171", background: "rgba(248,113,113,0.06)" }}>Sign out</button>
        </div>
      </aside>
    </>
  ) : null;
}
