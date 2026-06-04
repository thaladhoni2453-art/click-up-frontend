import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useUIStore } from "../../stores/uiStore";
import { X, Shield, Globe, Users, Check, Sparkles, Folder, Layers, Code, Target, Calendar, Inbox } from "lucide-react";

interface SpaceModalProps {
  spaceId?: string | null; // If provided, we are editing. If not, creating.
  onClose: () => void;
}

const COLOR_PRESETS = [
  "hsl(263, 90%, 64%)", // Purple
  "hsl(195, 100%, 50%)", // Cyan
  "hsl(142, 70%, 45%)", // Green
  "hsl(350, 80%, 55%)", // Red
  "hsl(38, 92%, 50%)", // Amber
  "#ffffff" // White
];

const ICON_PRESETS = [
  { name: "Folder", component: Folder },
  { name: "Layers", component: Layers },
  { name: "Code", component: Code },
  { name: "Target", component: Target },
  { name: "Calendar", component: Calendar },
  { name: "Inbox", component: Inbox }
];

export const SpaceModal: React.FC<SpaceModalProps> = ({ spaceId, onClose }) => {
  const queryClient = useQueryClient();
  const { activeWorkspaceId, setActiveSpaceId } = useUIStore();
  
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [selectedIcon, setSelectedIcon] = useState("Folder");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch all workspace users to invite
  const { data: users = [] } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: async () => {
      const { data } = await api.get("/extra/users");
      return data;
    }
  });

  // Fetch space details if editing
  const { data: space } = useQuery({
    queryKey: ["space-details", spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data } = await api.get(`/spaces/${spaceId}`);
      return data;
    },
    enabled: !!spaceId
  });

  // Populate data if editing
  useEffect(() => {
    if (space) {
      setName(space.name || "");
      setSelectedColor(space.color || COLOR_PRESETS[0]);
      setSelectedIcon(space.icon || "Folder");
      setIsPrivate(!!space.isPrivate);
      if (space.members) {
        setSelectedMembers(space.members.map((m: any) => m.userId));
      }
    }
  }, [space]);

  // Mutation to create/edit space
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workspaceId: activeWorkspaceId,
        name,
        color: selectedColor,
        icon: selectedIcon,
        isPrivate,
        memberIds: isPrivate ? selectedMembers : []
      };

      if (spaceId) {
        const { data } = await api.patch(`/spaces/${spaceId}`, payload);
        return data;
      } else {
        const { data } = await api.post("/spaces", payload);
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["space-details", spaceId] });
      if (!spaceId && data?.id) {
        setActiveSpaceId(data.id);
      }
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveMutation.mutate();
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(5, 6, 10, 0.75)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999999,
      animation: "fadeIn 0.25s ease-out"
    }}>
      <div 
        className="glass-panel"
        style={{
          width: "480px",
          background: "#0f111a",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} style={{ color: selectedColor }} />
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "white", margin: 0 }}>
              {spaceId ? "Edit Space settings" : "Create a new Space"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", maxHeight: "75vh" }}>
          
          {/* Space Name Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Space Name</label>
            <input 
              type="text"
              placeholder="e.g. Engineering, Marketing, Operations..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
              autoFocus
              style={{
                width: "100%",
                height: "38px",
                fontSize: "13.5px",
                background: "rgba(0,0,0,0.25)"
              }}
            />
          </div>

          {/* Color Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Avatar Color</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {COLOR_PRESETS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: color,
                      border: isSelected ? "2px solid white" : "1px solid rgba(255,255,255,0.2)",
                      cursor: "pointer",
                      transform: isSelected ? "scale(1.15)" : "scale(1)",
                      transition: "all 0.15s ease",
                      outline: "none"
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Space Icon</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {ICON_PRESETS.map((preset) => {
                const IconComponent = preset.component;
                const isSelected = selectedIcon === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSelectedIcon(preset.name)}
                    style={{
                      padding: "8px 12px",
                      background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
                      border: "1px solid",
                      borderColor: isSelected ? selectedColor : "rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: isSelected ? "white" : "rgba(255,255,255,0.5)",
                      fontSize: "12px",
                      transition: "all 0.15s ease",
                      outline: "none"
                    }}
                  >
                    <IconComponent size={14} style={{ color: isSelected ? selectedColor : "inherit" }} />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Switcher Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Privacy & Access</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              
              {/* Public Choice */}
              <div 
                onClick={() => setIsPrivate(false)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: !isPrivate ? "rgba(16, 185, 129, 0.04)" : "rgba(255, 255, 255, 0.01)",
                  border: "1px solid",
                  borderColor: !isPrivate ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={14} style={{ color: !isPrivate ? "hsl(142, 70%, 45%)" : "rgba(255,255,255,0.4)" }} />
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: !isPrivate ? "white" : "rgba(255,255,255,0.6)" }}>Public Space</span>
                </div>
                <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.35)", lineHeight: "1.4", margin: 0 }}>
                  Visible to everyone in the workspace. Members can join freely.
                </p>
              </div>

              {/* Private Choice */}
              <div 
                onClick={() => setIsPrivate(true)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: isPrivate ? "rgba(139, 92, 246, 0.05)" : "rgba(255, 255, 255, 0.01)",
                  border: "1px solid",
                  borderColor: isPrivate ? "rgba(139, 92, 246, 0.25)" : "rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Shield size={14} style={{ color: isPrivate ? "hsl(263, 90%, 64%)" : "rgba(255,255,255,0.4)" }} />
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: isPrivate ? "white" : "rgba(255,255,255,0.6)" }}>Private Space</span>
                </div>
                <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.35)", lineHeight: "1.4", margin: 0 }}>
                  Hidden from guests. Accessible only by invited members.
                </p>
              </div>

            </div>
          </div>

          {/* Members invite list if Private */}
          {isPrivate && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "slideDown 0.2s ease-out" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)" }}>Invite Members</label>
              
              {users.length === 0 ? (
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>No other organization users to invite.</span>
              ) : (
                <div 
                  className="custom-scrollbar"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    maxHeight: "160px",
                    overflowY: "auto",
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    padding: "6px"
                  }}
                >
                  {users.map((item: any) => {
                    const isSelected = selectedMembers.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMember(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: isSelected ? "rgba(255,255,255,0.03)" : "transparent",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: selectedColor, display: "flex", alignItems: "center", justifyCenter: "center", fontSize: "10px", fontWeight: "700", color: "white" }}>
                            {item.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>{item.fullName}</span>
                        </div>
                        {isSelected && <Check size={14} style={{ color: selectedColor }} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submission button */}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            style={{
              width: "100%",
              padding: "10px 0",
              background: saveMutation.isPending ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${selectedColor} 0%, rgba(139, 92, 246, 0.8) 100%)`,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: saveMutation.isPending ? "not-allowed" : "pointer",
              boxShadow: `0 4px 15px rgba(0,0,0,0.25)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px"
            }}
          >
            {saveMutation.isPending ? "Saving..." : spaceId ? "Save Space changes" : "Create Space"}
          </button>

        </form>
      </div>
    </div>
  );
};
