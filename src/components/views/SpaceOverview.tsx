import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../lib/api";
import { 
  Folder, List, Users, Plus, Shield, Globe, Calendar, CheckSquare, Settings2, Trash2, ArrowRight
} from "lucide-react";

export const SpaceOverview: React.FC = () => {
  const queryClient = useQueryClient();
  const uiStore = useUIStore();
  const activeSpaceId = uiStore.activeSpaceId;
  const activeWorkspaceId = uiStore.activeWorkspaceId;

  const [newFolderName, setNewFolderName] = useState("");
  const [newListName, setNewListName] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showListForm, setShowListForm] = useState(false);

  // Fetch Space Details
  const { data: space, isLoading, error } = useQuery({
    queryKey: ["space-details", activeSpaceId],
    queryFn: async () => {
      if (!activeSpaceId) return null;
      const { data } = await api.get(`/spaces/${activeSpaceId}`);
      return data;
    },
    enabled: !!activeSpaceId,
  });

  // Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post(`/spaces/${activeSpaceId}/folders`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-details", activeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      setNewFolderName("");
      setShowFolderForm(false);
    }
  });

  // Create List Mutation
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post(`/workspaces/spaces/${activeSpaceId}/lists`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-details", activeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      setNewListName("");
      setShowListForm(false);
    }
  });

  // Delete Space Mutation
  const deleteSpaceMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/spaces/${activeSpaceId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      uiStore.setActiveSpaceId(null);
    }
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>Loading Space Dashboard...</span>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>Select a valid Space from the sidebar.</span>
      </div>
    );
  }

  const spaceColor = space.color || "hsl(263, 90%, 64%)";
  const folders = space.folders || [];
  const lists = space.lists || [];
  const members = space.members || [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "hsl(var(--bg-hsl))", overflowY: "auto", padding: "30px 40px" }}>
      
      {/* Premium Header Panel */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "24px 30px", 
          borderRadius: "16px", 
          background: "rgba(255, 255, 255, 0.01)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          position: "relative",
          overflow: "hidden",
          marginBottom: "30px"
        }}
      >
        {/* Color Accent glow */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: spaceColor }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Space Avatar Circle */}
            <div 
              style={{ 
                width: "48px", 
                height: "48px", 
                borderRadius: "12px", 
                background: `linear-gradient(135deg, ${spaceColor} 0%, rgba(255,255,255,0.05) 100%)`, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "white",
                boxShadow: `0 8px 24px -6px ${spaceColor}`
              }}
            >
              <Folder size={24} />
            </div>
            
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "white", margin: "0 0 4px 0" }}>{space.name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {space.isPrivate ? <Shield size={12} style={{ color: "hsl(263, 90%, 64%)" }} /> : <Globe size={12} style={{ color: "hsl(142, 70%, 45%)" }} />}
                  {space.isPrivate ? "Private Space" : "Public Space"}
                </span>
                <span>•</span>
                <span>{folders.length} Folders</span>
                <span>•</span>
                <span>{lists.length} Direct Lists</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete this space and all its folders and lists?`)) {
                deleteSpaceMutation.mutate();
              }
            }}
            style={{
              padding: "8px 12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#F87171",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <Trash2 size={13} />
            Delete Space
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px", alignItems: "start" }}>
        {/* Left Side: Hierarchy items (Folders & Lists) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          
          {/* Folders Section */}
          <div className="glass-panel" style={{ padding: "24px", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Folder size={18} style={{ color: "hsl(var(--warning-hsl))" }} />
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "white", margin: 0 }}>Folders</h3>
              </div>
              <button 
                onClick={() => setShowFolderForm(!showFolderForm)}
                style={{ background: "transparent", border: "none", color: spaceColor, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: "600" }}
              >
                <Plus size={14} /> New Folder
              </button>
            </div>

            {showFolderForm && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim());
                }} 
                style={{ display: "flex", gap: "10px", marginBottom: "16px", animation: "slideDown 0.2s" }}
              >
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="input-field"
                  style={{ flex: 1, height: "36px" }}
                  required
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ background: spaceColor, border: "none", height: "36px", padding: "0 16px" }}>
                  Create
                </button>
              </form>
            )}

            {folders.length === 0 ? (
              <div style={{ padding: "30px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                No folders created yet in this space.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {folders.map((f: any) => (
                  <div 
                    key={f.id}
                    onClick={() => uiStore.setActiveFolderId(f.id)}
                    className="glass-panel"
                    style={{ 
                      padding: "16px", 
                      borderRadius: "10px", 
                      background: "rgba(255,255,255,0.01)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.04)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Folder size={18} style={{ color: "hsl(var(--warning-hsl))" }} />
                      <span style={{ fontWeight: "600", color: "white", fontSize: "14px" }}>{f.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                      <span>{f.lists?.length || 0} Lists</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Independent Lists Section */}
          <div className="glass-panel" style={{ padding: "24px", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <List size={18} style={{ color: spaceColor }} />
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "white", margin: 0 }}>Direct Lists</h3>
              </div>
              <button 
                onClick={() => setShowListForm(!showListForm)}
                style={{ background: "transparent", border: "none", color: spaceColor, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: "600" }}
              >
                <Plus size={14} /> New List
              </button>
            </div>

            {showListForm && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newListName.trim()) createListMutation.mutate(newListName.trim());
                }} 
                style={{ display: "flex", gap: "10px", marginBottom: "16px", animation: "slideDown 0.2s" }}
              >
                <input
                  type="text"
                  placeholder="List name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="input-field"
                  style={{ flex: 1, height: "36px" }}
                  required
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" style={{ background: spaceColor, border: "none", height: "36px", padding: "0 16px" }}>
                  Create
                </button>
              </form>
            )}

            {lists.length === 0 ? (
              <div style={{ padding: "30px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                No standalone lists in this space.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {lists.map((l: any) => (
                  <div 
                    key={l.id}
                    onClick={() => {
                      uiStore.setActiveListId(l.id);
                      uiStore.setActiveViewId("list");
                    }}
                    className="glass-panel"
                    style={{ 
                      padding: "16px", 
                      borderRadius: "10px", 
                      background: "rgba(255,255,255,0.01)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.04)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <List size={18} style={{ color: spaceColor }} />
                      <span style={{ fontWeight: "600", color: "white", fontSize: "14px" }}>{l.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                      <span>View Tasks</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Space Members panel */}
        <div className="glass-panel" style={{ padding: "24px", borderRadius: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Users size={16} style={{ color: spaceColor }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "white", margin: 0 }}>Space Access</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {space.isPrivate ? (
              members.length === 0 ? (
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                  No members explicitly invited.
                </div>
              ) : (
                members.map((m: any) => {
                  const u = m.user || { fullName: "Workspace User", email: "member@wavework.ai" };
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", background: "rgba(255,255,255,0.01)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: spaceColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "700" }}>
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontSize: "12.5px", fontWeight: "600", color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fullName}</span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{m.role || "MEMBER"}</span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <div 
                style={{ 
                  padding: "16px", 
                  background: "rgba(16, 185, 129, 0.02)", 
                  border: "1px solid rgba(16, 185, 129, 0.1)", 
                  borderRadius: "8px", 
                  color: "rgba(255,255,255,0.6)", 
                  fontSize: "12.5px", 
                  lineHeight: "1.4" 
                }}
              >
                🌍 This space is <strong>Public</strong>. Everyone in the workspace has instant access and visibility here.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
