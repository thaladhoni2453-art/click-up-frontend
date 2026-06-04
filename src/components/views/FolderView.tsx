import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../stores/uiStore";
import { api } from "../../lib/api";
import { 
  Folder, List, Plus, Trash2, ArrowRight, Layers
} from "lucide-react";

export const FolderView: React.FC = () => {
  const queryClient = useQueryClient();
  const uiStore = useUIStore();
  const activeSpaceId = uiStore.activeSpaceId;
  const activeFolderId = uiStore.activeFolderId;
  const activeWorkspaceId = uiStore.activeWorkspaceId;

  const [newListName, setNewListName] = useState("");
  const [showListForm, setShowListForm] = useState(false);

  // Fetch Space Details (which contains folders and their nested lists)
  const { data: space, isLoading } = useQuery({
    queryKey: ["space-details", activeSpaceId],
    queryFn: async () => {
      if (!activeSpaceId) return null;
      const { data } = await api.get(`/spaces/${activeSpaceId}`);
      return data;
    },
    enabled: !!activeSpaceId,
  });

  const folder = space?.folders?.find((f: any) => f.id === activeFolderId);

  // Create List inside Folder Mutation
  const createListInFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post(`/folders/${activeFolderId}/lists`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-details", activeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      setNewListName("");
      setShowListForm(false);
    }
  });

  // Delete Folder Mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/folders/${activeFolderId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-details", activeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      uiStore.setActiveFolderId(null);
    }
  });

  // Delete List Mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { data } = await api.delete(`/workspaces/lists/${listId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-details", activeSpaceId] });
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
    }
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>Loading Folder Dashboard...</span>
      </div>
    );
  }

  if (!folder) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>Folder not found. Select a valid Folder from the sidebar.</span>
      </div>
    );
  }

  const spaceColor = space?.color || "hsl(263, 90%, 64%)";
  const lists = folder.lists || [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "hsl(var(--bg-hsl))", overflowY: "auto", padding: "30px 40px" }}>
      
      {/* Folder Header Panel */}
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
        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "hsl(var(--warning-hsl))" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div 
              style={{ 
                width: "48px", 
                height: "48px", 
                borderRadius: "12px", 
                background: "linear-gradient(135deg, hsl(var(--warning-hsl)) 0%, rgba(255,255,255,0.05) 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                color: "white",
                boxShadow: "0 8px 24px -6px hsl(var(--warning-hsl))"
              }}
            >
              <Folder size={24} />
            </div>
            
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: "white", margin: "0 0 4px 0" }}>{folder.name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                <span>In Space: {space?.name}</span>
                <span>•</span>
                <span>{lists.length} Lists</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete folder "${folder.name}" and all its lists?`)) {
                deleteFolderMutation.mutate();
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
            Delete Folder
          </button>
        </div>
      </div>

      {/* Lists Inside Folder Section */}
      <div className="glass-panel" style={{ padding: "24px", borderRadius: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={18} style={{ color: "hsl(var(--warning-hsl))" }} />
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "white", margin: 0 }}>Lists in Folder</h3>
          </div>
          <button 
            onClick={() => setShowListForm(!showListForm)}
            style={{ background: "transparent", border: "none", color: spaceColor, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: "600" }}
          >
            <Plus size={14} /> Add List to Folder
          </button>
        </div>

        {showListForm && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newListName.trim()) createListInFolderMutation.mutate(newListName.trim());
            }} 
            style={{ display: "flex", gap: "10px", marginBottom: "20px", animation: "slideDown 0.2s" }}
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
          <div style={{ padding: "40px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            No lists created in this folder yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {lists.map((l: any) => (
              <div 
                key={l.id}
                onClick={() => {
                  uiStore.setActiveListId(l.id);
                  uiStore.setActiveViewId("list");
                }}
                className="glass-panel"
                style={{ 
                  padding: "20px", 
                  borderRadius: "12px", 
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <List size={18} style={{ color: spaceColor }} />
                    <span style={{ fontWeight: "600", color: "white", fontSize: "14.5px" }}>{l.name}</span>
                  </div>
                  
                  {/* Delete nested list */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete list "${l.name}"?`)) {
                        deleteListMutation.mutate(l.id);
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#F87171"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "12px" }}>
                  <span>Open List View</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
