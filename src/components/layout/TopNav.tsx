import React, { useState } from "react";
import { useAuth } from "../../app/providers";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../lib/api";
import { useQuery } from "@tanstack/react-query";
import { Bell, Search, Sparkles, User, LogOut, ChevronRight } from "lucide-react";

export const TopNav: React.FC = () => {
  const { user, logout, workspaces } = useAuth();
  const uiStore = useUIStore();
  const { activeWorkspaceId, activeSpaceId, activeFolderId, activeListId } = uiStore;
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fetch Hierarchy from Cache instantly
  const { data: spaces = [] } = useQuery<any[]>({
    queryKey: ["hierarchy", activeWorkspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${activeWorkspaceId}/hierarchy`);
      return data;
    },
    enabled: !!activeWorkspaceId,
    staleTime: Infinity,
  });

  const currentWorkspaceName = workspaces.find(w => w.id === activeWorkspaceId)?.name || "Workspace";
  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const activeFolder = activeSpace?.folders?.find((f: any) => f.id === activeFolderId);
  
  // List name resolution
  let activeListName = "";
  if (activeListId) {
    const spaceList = activeSpace?.lists?.find((l: any) => l.id === activeListId);
    if (spaceList) {
      activeListName = spaceList.name;
    } else {
      const folderList = activeFolder?.lists?.find((l: any) => l.id === activeListId);
      if (folderList) {
        activeListName = folderList.name;
      } else {
        activeSpace?.folders?.forEach((f: any) => {
          const l = f.lists?.find((li: any) => li.id === activeListId);
          if (l) activeListName = l.name;
        });
      }
    }
  }

  return (
    <header className="glass-panel" style={{ height: "60px", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid hsl(var(--border-hsl))", position: "relative", zIndex: 50 }}>
      
      {/* ClickUp-style Breadcrumb navigation path */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Workspace Node */}
        <span style={{ fontSize: "12.5px", fontWeight: "700", color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
          {currentWorkspaceName.toUpperCase()}
        </span>

        {/* Space Node */}
        {activeSpace && (
          <>
            <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: activeSpace.color || "hsl(var(--primary-hsl))" }} />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>
                {activeSpace.name}
              </span>
            </div>
          </>
        )}

        {/* Folder Node */}
        {activeFolder && (
          <>
            <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "hsl(var(--warning-hsl))" }}>
              {activeFolder.name}
            </span>
          </>
        )}

        {/* List Node */}
        {activeListId && activeListName && (
          <>
            <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>
              {activeListName}
            </span>
          </>
        )}
      </div>

      {/* Global Actions and User Profiles Hub */}
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
