import React, { useState } from "react";
import { useAuth } from "../../app/providers";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../lib/api";
import { Bell, Search, Sparkles, User, LogOut } from "lucide-react";

export const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeWorkspaceId, activeViewId, setSelectedTaskId } = useUIStore();
  const [standup, setStandup] = useState<string | null>(null);
  const [loadingStandup, setLoadingStandup] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const triggerAIStandup = async () => {
    setLoadingStandup(true);
    try {
      const { data } = await api.post("/extra/ai/workspace/standup", {});
      setStandup(data.summary);
    } catch (e) {
      setStandup("### 🤖 WaveWork AI Standup\n\nFailed to aggregate your standup. Ensure server connection is active!");
    } finally {
      setLoadingStandup(false);
    }
  };

  return (
    <header className="glass-panel" style={{ height: "60px", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid hsl(var(--border-hsl))", position: "relative", zIndex: 50 }}>
      {/* Search Input Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "40%" }}>
        <Search size={16} style={{ color: "hsl(var(--text-muted-hsl))" }} />
        <input
          type="text"
          placeholder="Global Search (Cmd + K)..."
          className="input-field"
          style={{ width: "100%", height: "34px", background: "rgba(0,0,0,0.2)" }}
        />
      </div>

      {/* Action and User Profiles Hub */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>


        {/* Notifications Icon */}
        <button style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative" }}>
          <Bell size={20} style={{ color: "hsl(var(--text-secondary-hsl))" }} />
          <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", background: "hsl(var(--error-hsl))", borderRadius: "50%" }}></span>
        </button>

        {/* User Profile Avatar with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsl(var(--accent-hsl)))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "13px", color: "white" }}>
              {user?.fullName?.charAt(0).toUpperCase() || "W"}
            </div>
          </button>

          {showUserMenu && (
            <div className="glass-panel" style={{ position: "absolute", right: 0, top: "40px", width: "200px", borderRadius: "var(--radius-md)", padding: "8px", boxShadow: "var(--shadow-lg)" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid hsl(var(--border-hsl))", marginBottom: "6px" }}>
                <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{user?.fullName}</div>
                <div style={{ fontSize: "11px", color: "hsl(var(--text-muted-hsl))", wordBreak: "break-all" }}>{user?.email}</div>
              </div>
              <button
                onClick={logout}
                style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: "hsl(var(--error-hsl))", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", borderRadius: "var(--radius-sm)" }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>


    </header>
  );
};
