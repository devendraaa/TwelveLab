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
    { label: "Clone", route: "/clone" as const, icon: <CloneIcon />, active: activeRoute === "clone" },
    { label: "History", route: "/history" as const, icon: <HistoryIcon />, active: activeRoute === "history" },
  ];

  return (
    <aside className="twelve-sidebar">
      <div className="sidebar-header">
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Twelve<span style={{ color: "#c8f060" }}>Lab</span>
        </div>
        <div className="sidebar-tagline">VOICE SYNTHESIS</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.label}
            className={`nav-item${item.active ? " nav-item-active" : ""}`}
            onClick={() => router.push(item.route)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div className="nav-divider" />
        <button className="nav-item nav-item-upgrade">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 4L14 5.5l-3 3 .7 4.3L8 11l-3.7 1.8.7-4.3-3-3L6.2 5 8 1Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          Upgrade
        </button>
      </nav>

      <div className="sidebar-usage">
        <div className="stat-badges">
          <div className="stat-badge">
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#e8e4de" }}>{genCount}</div>
            <div className="stat-badge-label">generated</div>
          </div>
          <div className="stat-badge">
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "20px", fontWeight: 700, color: "#e8e4de" }}>{Math.round(usagePct)}%</div>
            <div className="stat-badge-label">used</div>
          </div>
        </div>
        <div className="usage-labels">
          <span>Usage</span>
          <span>{charUsed.toLocaleString()} / {charLimit.toLocaleString()}</span>
        </div>
        <div className="usage-bar">
          <div className="usage-fill" style={{ width: `${usagePct}%`, background: usagePct > 80 ? "linear-gradient(90deg,#fb923c,#ef4444)" : "linear-gradient(90deg,#c8f060,#86d915)" }} />
        </div>
      </div>

      <div className="sidebar-profile">
        <div className="user-info">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="user-text">
            <div>{user?.email?.split("@")[0]}</div>
            <div>Free plan</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-logout">
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
    { label: "Clone", route: "/clone" as const, active: activeRoute === "clone" },
    { label: "History", route: "/history" as const, active: activeRoute === "history" },
  ];

  return open ? (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="nav-drawer">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">Twelve<span className="drawer-accent">Lab</span></div>
            <div className="drawer-tagline">VOICE SYNTHESIS</div>
          </div>
          <button onClick={onClose} className="drawer-close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <nav className="drawer-nav">
          {navItems.map(item => (
            <button
              key={item.label}
              className={`nav-item${item.active ? " nav-item-active" : ""}`}
              onClick={() => { router.push(item.route); onClose(); }}
            >
              {item.label}
            </button>
          ))}
          <div className="nav-divider" />
          <button className="nav-item nav-item-upgrade">Upgrade plan</button>
        </nav>

        <div className="drawer-usage">
          <div className="drawer-usage-row">
            <span>Monthly usage</span>
            <span style={{ color: usagePct > 80 ? "#fb923c" : "rgba(255,255,255,0.4)" }}>{charUsed.toLocaleString()} / {charLimit.toLocaleString()}</span>
          </div>
          <div className="usage-bar-sm">
            <div className="usage-fill" style={{ width: `${usagePct}%`, background: usagePct > 80 ? "linear-gradient(90deg,#fb923c,#ef4444)" : "linear-gradient(90deg,#c8f060,#86d915)" }} />
          </div>
        </div>

        <div className="drawer-footer">
          <div className="drawer-user-card">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="user-text">
              <div>{user?.email?.split("@")[0]}</div>
              <div>Free plan</div>
            </div>
          </div>
          <button onClick={onLogout} className="nav-item" style={{ color: "#f87171", background: "rgba(248,113,113,0.06)" }}>Sign out</button>
        </div>
      </aside>
    </>
  ) : null;
}
