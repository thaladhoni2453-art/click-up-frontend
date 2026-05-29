import React, { useState } from "react";
import { useAuth } from "../../app/providers";
import { useUIStore } from "../../stores/uiStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { 
  Folder, List, Layers, Plus, ChevronRight, ChevronDown, 
  Settings, BookOpen, MessageSquare, Target, Calendar, BarChart3, HelpCircle, Inbox, Hash, Users, PlusCircle, Search, Timer
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { workspaces, user } = useAuth();
  const queryClient = useQueryClient();
  const uiStore = useUIStore();
  const activeWorkspaceId = uiStore.activeWorkspaceId;
  const activeSpaceId = uiStore.activeSpaceId;
  const activeListId = uiStore.activeListId;
  const activeViewId = uiStore.activeViewId;
  const activeChannelId = uiStore.activeChannelId;
  
  const setActiveWorkspaceId = uiStore.setActiveWorkspaceId;
  const setActiveSpaceId = uiStore.setActiveSpaceId;
  const setActiveListId = uiStore.setActiveListId;
  const setActiveViewId = uiStore.setActiveViewId;
  const setActiveDocId = uiStore.setActiveDocId;
  const setActiveChannelId = uiStore.setActiveChannelId;

  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  
  // Section collapsible states
  const [expandedHome, setExpandedHome] = useState(true);
  const [expandedFavorites, setExpandedFavorites] = useState(false);
  const [expandedChannels, setExpandedChannels] = useState(true);
  const [expandedDMs, setExpandedDMs] = useState(true);
  const [expandedSpacesSec, setExpandedSpacesSec] = useState(true);

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Connect socket and listen for online/offline presence status updates
  React.useEffect(() => {
    const socket = getSocket();
    
    // Fetch initial list of online users
    socket.emit("get:online-users", (users: string[]) => {
      if (Array.isArray(users)) setOnlineUsers(users);
    });

    socket.on("user:online", (userId: string) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on("user:offline", (data: any) => {
      const userId = typeof data === "string" ? data : data.userId;
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, []);

  // Set default workspace if none selected
  React.useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  // Fetch Workspace Spaces hierarchy tree
  const { data: spaces = [], refetch: refetchHierarchy } = useQuery({
    queryKey: ["hierarchy", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await api.get(`/workspaces/${activeWorkspaceId}/hierarchy`);
      return data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Fetch Channels, Groups, DMs list
  const { data: channels = [], refetch: refetchChannels } = useQuery({
    queryKey: ["channels", activeWorkspaceId],
    queryFn: async () => {
      const { data } = await api.get("/extra/channels");
      return data;
    },
    refetchInterval: 5000, // Refresh status and rooms list every 5s
  });

  // Filter channels based on type
  const rooms = channels.filter((c: any) => !c.isDM && !c.isGroup);
  const groups = channels.filter((c: any) => c.isGroup);
  const dms = channels.filter((c: any) => c.isDM);

  // Space additions mutation
  const createSpaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post(`/workspaces/${activeWorkspaceId}/spaces`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy", activeWorkspaceId] });
      setNewSpaceName("");
      setShowAddSpace(false);
    },
  });

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpaceName.trim()) {
      createSpaceMutation.mutate(newSpaceName);
    }
  };

  // Helper to extract DM partner
  const getDMPartner = (d: any) => {
    if (!d.isDM) return { fullName: d.name || "Group Chat", email: "", id: "" };
    
    // Find the participant that is not the active user
    const participants = d.participantIds || [];
    const partnerId = d.partnerId || participants.find((id: string) => id !== user?.id) || "mock-member";
    
    // Default fallback name from the backend channels payload
    let fullName = d.name || "Chat Partner";
    
    // Parse description signatures
    const desc = d.description || "";
    const emailMatch = desc.match(/invited\s+([^\s]+)/i);
    let partnerEmail = emailMatch ? emailMatch[1] : "member@wavework.ai";
    
    // Extract inviter email
    const inviterMatch = desc.match(/^([^\s]+)\s+invited/i) || desc.match(/^([^\s]+)\s+has\s+invited/i);
    const inviterEmail = inviterMatch ? inviterMatch[1] : null;
    
    if (inviterEmail && user?.email && inviterEmail !== user.email) {
      // The inviter is the partner! (Current user is the receiver)
      partnerEmail = inviterEmail;
    }
    
    if (fullName.startsWith("dm:") || fullName === "Chat Partner" || fullName === "Member" || fullName === "M Member") {
      const partnerName = partnerEmail.split("@")[0];
      fullName = partnerName.charAt(0).toUpperCase() + partnerName.slice(1);
    }

    return {
      id: partnerId,
      fullName: fullName,
      email: partnerEmail
    };
  };

  const currentWorkspaceName = workspaces.find(w => w.id === activeWorkspaceId)?.name || "My Workspace";

  return (
    <aside 
      className="glass-panel" 
      style={{ 
        width: "244px", 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        borderRight: "1px solid hsl(var(--border-hsl))",
        background: "rgba(15, 16, 22, 0.96)",
      }}
    >
      {/* Workspace Switcher Header (ClickUp layout) */}
      <div 
        style={{ 
          padding: "12px 14px", 
          borderBottom: "1px solid hsl(var(--border-hsl))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          {/* Green Workspace Indicator */}
          <div 
            style={{ 
              width: "20px", 
              height: "20px", 
              borderRadius: "4px", 
              background: "hsl(var(--success-hsl))", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontWeight: "800", 
              fontSize: "11px", 
              color: "white" 
            }}
          >
            {currentWorkspaceName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>
            {currentWorkspaceName}
          </span>
          <ChevronDown size={12} style={{ color: "hsl(var(--text-muted-hsl))" }} />
        </div>
      </div>

      {/* Sub-header with "Home" label, Search trigger and purple + Create button */}
      <div 
        style={{ 
          padding: "10px 14px 4px 14px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between" 
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: "700", color: "white", letterSpacing: "-0.01em" }}>Home</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Search size={14} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} />
          <button
            onClick={() => useUIStore.getState().setSelectedTaskId("new")}
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary-hsl)), hsla(263, 90%, 75%, 0.9))",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 2px 6px rgba(139, 92, 246, 0.3)",
            }}
          >
            <Plus size={11} strokeWidth={3} />
            Create
          </button>
        </div>
      </div>

      {/* Sidebar Tree Navigation Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px", display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* COLLAPSIBLE HOME HUB */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <button
            onClick={() => setExpandedHome(!expandedHome)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "700", textAlign: "left" }}
          >
            <span style={{ color: "hsl(var(--text-muted-hsl))" }}>
              {expandedHome ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span style={{ color: "hsl(var(--text-muted-hsl))" }}>INBOX</span>
          </button>

          {expandedHome && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "12px", marginTop: "2px" }}>
              {[
                { id: "inbox", label: "Inbox", icon: <Inbox size={13} /> },
                { id: "replies", label: "Replies", icon: <MessageSquare size={13} /> },
                { id: "assigned-comments", label: "Assigned Comments", icon: <HelpCircle size={13} /> },
                { id: "my-tasks", label: "My Tasks", icon: <Layers size={13} />, badge: 2 },
                { id: "personal-space", label: "Personal Space", icon: <BookOpen size={13} /> },
                { id: "pomodoro", label: "Pomodoro Focus", icon: <Timer size={13} /> },
              ].map((item) => {
                const isActive = activeViewId === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setActiveViewId(item.id);
                    }}
                    style={{ 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between",
                      padding: "6px 8px", 
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent", 
                      border: "none", 
                      borderRadius: "var(--radius-sm)", 
                      color: isActive ? "white" : "hsl(var(--text-secondary-hsl))", 
                      cursor: "pointer", 
                      fontSize: "12.5px" 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", color: isActive ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-muted-hsl))" }}>
                        {item.icon}
                      </span>
                      <span style={{ fontWeight: isActive ? "600" : "500" }}>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span 
                        style={{ 
                          fontSize: "10px", 
                          background: "rgba(255,255,255,0.08)", 
                          color: "hsl(var(--text-muted-hsl))", 
                          padding: "1px 5px", 
                          borderRadius: "9999px",
                          fontWeight: "700"
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FAVORITES */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <button
            onClick={() => setExpandedFavorites(!expandedFavorites)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "700", textAlign: "left" }}
          >
            <span style={{ color: "hsl(var(--text-muted-hsl))" }}>
              {expandedFavorites ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <span style={{ color: "hsl(var(--text-muted-hsl))" }}>FAVORITES</span>
          </button>
          
          {expandedFavorites && (
            <div style={{ padding: "6px 20px", fontSize: "12px", color: "hsl(var(--text-muted-hsl))", fontStyle: "italic" }}>
              Add to your sidebar
            </div>
          )}
        </div>

        {/* CHANNELS */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "6px" }}>
            <button
              onClick={() => setExpandedChannels(!expandedChannels)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "700", textAlign: "left" }}
            >
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>
                {expandedChannels ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>CHANNELS</span>
            </button>
            <Plus size={11} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} onClick={() => {
              setActiveViewId("chat");
              setTimeout(() => {
                window.dispatchEvent(new Event("ww:open-create-group"));
              }, 100);
            }} />
          </div>

          {expandedChannels && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "12px", marginTop: "2px" }}>
              {rooms.map((r: any) => {
                const isActive = activeChannelId === r.id && activeViewId === "chat";
                return (
                  <button 
                    key={r.id}
                    onClick={() => {
                      setActiveViewId("chat");
                      setActiveChannelId(r.id);
                    }}
                    style={{ 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      padding: "5px 8px", 
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent", 
                      border: "none", 
                      borderRadius: "var(--radius-sm)", 
                      color: isActive ? "white" : "hsl(var(--text-secondary-hsl))", 
                      cursor: "pointer", 
                      fontSize: "12.5px",
                      textAlign: "left"
                    }}
                  >
                    <Hash size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                    <span style={{ fontWeight: isActive ? "600" : "500" }}>{r.name}</span>
                  </button>
                );
              })}

              {groups.map((g: any) => {
                const isActive = activeChannelId === g.id && activeViewId === "chat";
                return (
                  <button 
                    key={g.id}
                    onClick={() => {
                      setActiveViewId("chat");
                      setActiveChannelId(g.id);
                    }}
                    style={{ 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      padding: "5px 8px", 
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent", 
                      border: "none", 
                      borderRadius: "var(--radius-sm)", 
                      color: isActive ? "white" : "hsl(var(--text-secondary-hsl))", 
                      cursor: "pointer", 
                      fontSize: "12.5px",
                      textAlign: "left"
                    }}
                  >
                    <Users size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                    <span style={{ fontWeight: isActive ? "600" : "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DIRECT MESSAGES */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "6px" }}>
            <button
              onClick={() => setExpandedDMs(!expandedDMs)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "700", textAlign: "left" }}
            >
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>
                {expandedDMs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>DIRECT MESSAGES</span>
            </button>
            <Plus size={11} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} onClick={() => {
              setActiveViewId("chat");
              setTimeout(() => {
                window.dispatchEvent(new Event("ww:open-dm-search"));
              }, 100);
            }} />
          </div>

          {expandedDMs && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", paddingLeft: "12px", marginTop: "2px" }}>
              {dms.length === 0 ? (
                <div style={{ padding: "6px 8px", fontSize: "11.5px", color: "hsl(var(--text-muted-hsl))", fontStyle: "italic" }}>
                  No active DMs.
                </div>
              ) : (
                dms.map((d: any) => {
                  const partner = getDMPartner(d);
                  const isOnline = onlineUsers.includes(partner.id);
                  const isActive = activeChannelId === d.id && activeViewId === "chat";
                  
                  return (
                    <button 
                      key={d.id}
                      onClick={() => {
                        setActiveViewId("chat");
                        setActiveChannelId(d.id);
                      }}
                      style={{ 
                        width: "100%", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px",
                        padding: "5px 8px", 
                        background: isActive ? "rgba(255,255,255,0.06)" : "transparent", 
                        border: "none", 
                        borderRadius: "var(--radius-sm)", 
                        color: isActive ? "white" : "hsl(var(--text-secondary-hsl))", 
                        cursor: "pointer", 
                        fontSize: "12.5px",
                        textAlign: "left"
                      }}
                    >
                      {/* Live presence indicator dot ring */}
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <div 
                          style={{ 
                            width: "18px", 
                            height: "18px", 
                            borderRadius: "50%", 
                            background: isActive ? "hsl(var(--primary-hsl))" : "rgba(255,255,255,0.1)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            fontSize: "8.5px", 
                            fontWeight: "bold",
                            color: "white"
                          }}
                        >
                          {(partner.fullName || "U").charAt(0)}
                        </div>
                        <div 
                          style={{ 
                            position: "absolute", 
                            bottom: "-1px", 
                            right: "-1px", 
                            width: "7px", 
                            height: "7px", 
                            borderRadius: "50%", 
                            background: isOnline ? "hsl(var(--success-hsl))" : "#8E8E93",
                            border: "1px solid rgba(15, 16, 22, 0.96)",
                            boxShadow: isOnline ? "0 0 4px hsl(var(--success-hsl))" : "none"
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: isActive ? "600" : "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {partner.fullName}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* SPACES HIERARCHY */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "6px" }}>
            <button
              onClick={() => setExpandedSpacesSec(!expandedSpacesSec)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", fontWeight: "700", textAlign: "left" }}
            >
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>
                {expandedSpacesSec ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <span style={{ color: "hsl(var(--text-muted-hsl))" }}>SPACES</span>
            </button>
            <Plus size={11} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} onClick={() => setShowAddSpace(!showAddSpace)} />
          </div>

          {expandedSpacesSec && (
            <div style={{ paddingLeft: "4px", display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
              {showAddSpace && (
                <form onSubmit={handleAddSpace} style={{ display: "flex", gap: "6px", marginBottom: "8px", paddingLeft: "8px" }}>
                  <input 
                    type="text" 
                    placeholder="Space name..." 
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, height: "26px", fontSize: "11.5px", padding: "2px 6px" }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "2px 6px", fontSize: "11px", height: "26px" }}>Add</button>
                </form>
              )}

              {spaces.map((space: any) => {
                const isSpaceExpanded = expandedSpaces[space.id];
                return (
                  <div key={space.id} style={{ display: "flex", flexDirection: "column" }}>
                    {/* Space Node Header */}
                    <div 
                      onClick={() => {
                        setActiveSpaceId(space.id);
                        toggleSpace(space.id);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", background: activeSpaceId === space.id ? "rgba(255,255,255,0.03)" : "transparent", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "12.5px", color: "white" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", color: "hsl(var(--text-muted-hsl))" }}>
                        {isSpaceExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: space.color || "hsl(var(--primary-hsl))" }}></div>
                      <span style={{ fontWeight: 500 }}>{space.name}</span>
                    </div>

                    {/* Sub-Folders & Sub-Lists */}
                    {isSpaceExpanded && (
                      <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px", marginTop: "1px" }}>
                        {/* Direct Space Lists */}
                        {space.lists?.map((list: any) => (
                          <div 
                            key={list.id}
                            onClick={() => {
                              setActiveSpaceId(space.id);
                              setActiveListId(list.id);
                              setActiveViewId("list");
                              setActiveDocId(null);
                              setActiveChannelId(null);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "var(--radius-sm)", background: activeListId === list.id ? "rgba(255,255,255,0.08)" : "transparent", color: activeListId === list.id ? "white" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "12px" }}
                          >
                            <List size={11} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                            <span>{list.name}</span>
                          </div>
                        ))}

                        {/* Space Folders */}
                        {space.folders?.map((folder: any) => {
                          const isFolderExpanded = expandedFolders[folder.id];
                          return (
                            <div key={folder.id} style={{ display: "flex", flexDirection: "column" }}>
                              {/* Folder Item */}
                              <div 
                                onClick={() => toggleFolder(folder.id)}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "12px", color: "hsl(var(--text-secondary-hsl))" }}
                              >
                                <span style={{ display: "flex", alignItems: "center", color: "hsl(var(--text-muted-hsl))" }}>
                                  {isFolderExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                </span>
                                <Folder size={12} style={{ color: "hsl(var(--warning-hsl))" }} />
                                <span>{folder.name}</span>
                              </div>

                              {/* Folder Lists */}
                              {isFolderExpanded && (
                                <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px", marginTop: "1px" }}>
                                  {folder.lists?.map((list: any) => (
                                    <div 
                                      key={list.id}
                                      onClick={() => {
                                        setActiveSpaceId(space.id);
                                        setActiveListId(list.id);
                                        setActiveViewId("list");
                                        setActiveDocId(null);
                                        setActiveChannelId(null);
                                      }}
                                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "var(--radius-sm)", background: activeListId === list.id ? "rgba(255,255,255,0.08)" : "transparent", color: activeListId === list.id ? "white" : "hsl(var(--text-secondary-hsl))", cursor: "pointer", fontSize: "11.5px" }}
                                    >
                                      <List size={11} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                                      <span>{list.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Footer Settings Options */}
      <div 
        style={{ 
          padding: "10px 14px", 
          borderTop: "1px solid hsl(var(--border-hsl))", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.15)"
        }}
      >
        <button 
          onClick={() => setActiveViewId("goals")}
          style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", padding: "2px" }}
        >
          <Settings size={13} />
          Workspace Settings
        </button>
        <HelpCircle size={14} style={{ color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }} />
      </div>
    </aside>
  );
};
