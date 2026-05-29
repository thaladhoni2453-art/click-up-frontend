import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../app/providers";
import { useUIStore } from "../../stores/uiStore";
import { getSocket } from "../../lib/socket";
import { api } from "../../lib/api";
import { 
  Send, Hash, Users, Sparkles, Plus, MessageSquare, 
  Search, X, User as UserIcon, MessageCircle, Mail, PlusCircle, Check, Settings
} from "lucide-react";

export const ChatChannel: React.FC = () => {
  const { user } = useAuth();
  const { activeChannelId, setActiveChannelId } = useUIStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<any[]>([]);
  
  // Direct Message & Email Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeInviteTab, setActiveInviteTab] = useState<"members" | "email">("members");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Invite by Email form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");

  // Group creation states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group Admin & Status Presence states
  const [showGroupAdminModal, setShowGroupAdminModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [lastActiveMap, setLastActiveMap] = useState<Record<string, string>>({});

  // Helper to format last active offline status
  const formatLastActive = (isoString?: string) => {
    if (!isoString) return "offline";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Determine if active user is creator/admin of the group channel
  const isCreatorAdmin = () => {
    if (!activeChannel || !activeChannel.isGroup || !activeChannel.description) return false;
    if (!activeChannel.description.startsWith("group:")) return false;
    const creatorId = activeChannel.description.split(":")[1].split(",")[0];
    return creatorId === user?.id;
  };

  // Admin participant controls
  const handleRemoveMember = async (targetUserId: string) => {
    try {
      await api.delete(`/extra/channels/${activeChannel.id}/participants/${targetUserId}`);
      
      // Update local state
      setChannels((prev) => 
        prev.map((c) => {
          if (c.id === activeChannel.id) {
            return {
              ...c,
              participantIds: (c.participantIds || []).filter((id: string) => id !== targetUserId)
            };
          }
          return c;
        })
      );

      // Broadcast update over socket rooms
      const socket = getSocket();
      socket.emit("room:emit", {
        room: `channel:${activeChannel.id}`,
        event: "group:updated",
        data: { channelId: activeChannel.id }
      });
      socket.emit("room:emit", {
        room: `workspace:demo-ws`,
        event: "group:updated",
        data: { channelId: activeChannel.id, targetUserId }
      });
    } catch (e) {
      console.error("Failed to remove member", e);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    try {
      await api.post(`/extra/channels/${activeChannel.id}/participants`, { userId: targetUserId });
      
      // Update local state
      setChannels((prev) => 
        prev.map((c) => {
          if (c.id === activeChannel.id) {
            return {
              ...c,
              participantIds: [...(c.participantIds || []), targetUserId]
            };
          }
          return c;
        })
      );

      // Broadcast update over socket rooms
      const socket = getSocket();
      socket.emit("room:emit", {
        room: `channel:${activeChannel.id}`,
        event: "group:updated",
        data: { channelId: activeChannel.id }
      });
      socket.emit("room:emit", {
        room: `workspace:demo-ws`,
        event: "group:updated",
        data: { channelId: activeChannel.id, targetUserId }
      });
    } catch (e) {
      console.error("Failed to add member", e);
    }
  };

  // Fetch presence on mount and listen to socket updates
  useEffect(() => {
    if (!user?.id) return;

    const fetchPresence = async () => {
      try {
        const { data } = await api.get("/extra/presence");
        const activeMap: Record<string, string> = {};
        data.forEach((p: any) => {
          if (p.lastActiveAt) activeMap[p.userId] = p.lastActiveAt;
        });
        setLastActiveMap(activeMap);
      } catch (e) {
        console.error("Failed to fetch initial presence", e);
      }
    };
    fetchPresence();

    const socket = getSocket();
    
    const handlePresenceList = (userIds: string[]) => {
      setOnlineUsers(userIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => Array.from(new Set([...prev, userId])));
    };

    const handleUserOffline = ({ userId, lastActiveAt }: { userId: string, lastActiveAt: string }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      if (lastActiveAt) {
        setLastActiveMap((prev) => ({ ...prev, [userId]: lastActiveAt }));
      }
    };

    socket.on("presence:list", handlePresenceList);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    // Identify user over socket
    socket.emit("identify", user.id);

    return () => {
      socket.off("presence:list", handlePresenceList);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [user?.id]);

  // Sync group updates in real-time
  useEffect(() => {
    const socket = getSocket();
    
    const handleGroupUpdated = (data: any) => {
      console.log("[Sockets] Group updated received in ChatChannel!", data);
      fetchChannels();
      
      if (data.targetUserId === user?.id && data.channelId === activeChannelId) {
        setActiveChannelId(null);
      }
    };

    socket.on("group:updated", handleGroupUpdated);

    return () => {
      socket.off("group:updated", handleGroupUpdated);
    };
  }, [activeChannelId, user?.id]);

  // Fetch Channels, DMs and Groups
  const fetchChannels = async () => {
    try {
      const { data } = await api.get("/extra/channels");
      setChannels(data);
      
      if (data.length > 0 && !activeChannelId) {
        setActiveChannelId(data[0].id);
      }
    } catch (e) {
      setChannels([
        { id: "general", name: "general", description: "General workspace discussions", isDM: false, isGroup: false },
        { id: "development", name: "development", description: "Core feature design talk", isDM: false, isGroup: false },
      ]);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || {
    id: "general",
    name: "general",
    description: "General workspace discussions",
    isDM: false,
    isGroup: false
  };

  // Fetch messages
  useEffect(() => {
    if (!activeChannel.id) return;
    
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/extra/channels/${activeChannel.id}/messages`);
        setMessages(data);
      } catch (e) {
        setMessages([
          { 
            id: "welcome", 
            authorName: "WaveWork Bot 🤖", 
            content: activeChannel.isDM 
              ? `You opened a direct chat thread with ${activeChannel.name}. Send a message to start conversing!` 
              : activeChannel.isGroup
                ? `Welcome to the "${activeChannel.name}" group chat! Start typing to sync with group participants.`
                : `Welcome to the #${activeChannel.name} channel! Type a message to sync with your team instantly.`,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    };
    fetchMessages();
  }, [activeChannel.id]);

  // Connect Socket.io client broker
  useEffect(() => {
    if (!activeChannel.id) return;
    
    const socket = getSocket();
    socket.emit("join:channel", activeChannel.id);
    
    const handler = (msg: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on(`chat:${activeChannel.id}:message`, handler);

    return () => {
      socket.off(`chat:${activeChannel.id}:message`);
    };
  }, [activeChannel.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open invite modal
  const handleOpenInvite = async () => {
    setShowInviteModal(true);
    setInviteLoading(true);
    setActiveInviteTab("members");
    setInviteSuccessMsg("");
    try {
      const { data } = await api.get("/extra/users");
      setAvailableUsers(data);
    } catch (e) {
      setAvailableUsers([
        { id: "alex-carter", fullName: "Alex Carter", email: "alex@wavework.ai" },
        { id: "sarah-jenkins", fullName: "Sarah Jenkins", email: "sarah@wavework.ai" },
        { id: "marcus-vance", fullName: "Marcus Vance", email: "marcus@wavework.ai" }
      ]);
    } finally {
      setInviteLoading(false);
    }
  };

  // Open group creation modal
  const handleOpenGroupModal = async () => {
    setShowGroupModal(true);
    setGroupName("");
    setSelectedGroupMembers([]);
    try {
      const { data } = await api.get("/extra/users");
      setAvailableUsers(data);
    } catch (e) {
      setAvailableUsers([
        { id: "alex-carter", fullName: "Alex Carter", email: "alex@wavework.ai" },
        { id: "sarah-jenkins", fullName: "Sarah Jenkins", email: "sarah@wavework.ai" },
        { id: "marcus-vance", fullName: "Marcus Vance", email: "marcus@wavework.ai" }
      ]);
    }
  };

  // Start 1-on-1 DM Chat
  const handleStartDM = async (targetUserId: string) => {
    try {
      const { data } = await api.post("/extra/channels", {
        isDM: true,
        targetUserId
      });
      
      setShowInviteModal(false);
      setSearchQuery("");
      setActiveChannelId(data.id);
      await fetchChannels();
    } catch (e) {
      console.error("Failed to start DM chat", e);
    }
  };

  // Send Email Invite
  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const { data } = await api.post("/extra/invites", {
        email: inviteEmail,
        fullName: inviteName
      });

      setInviteSuccessMsg(`Invitation successfully sent to ${inviteEmail}!`);
      setInviteEmail("");
      setInviteName("");

      // Automatically select and route to the newly created DM chat!
      if (data.channelId) {
        setTimeout(() => {
          setShowInviteModal(false);
          setActiveChannelId(data.channelId);
          fetchChannels();
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to send email invite", e);
    }
  };

  // Create private group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const { data } = await api.post("/extra/channels", {
        isGroup: true,
        name: groupName,
        participantIds: selectedGroupMembers
      });

      setShowGroupModal(false);
      setActiveChannelId(data.id);
      await fetchChannels();
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };

  const handleToggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChannel.id) return;

    try {
      const messagePayload = {
        content: text,
        authorName: user?.fullName || "Workspace Member",
      };

      const { data } = await api.post(`/extra/channels/${activeChannel.id}/messages`, messagePayload);
      
      const socket = getSocket();
      socket.emit("chat:message", { channelId: activeChannel.id, message: data });

      setText("");
    } catch (e) {
      const offlineMsg = {
        id: Date.now().toString(),
        authorName: user?.fullName || "You (Local)",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, offlineMsg]);
      setText("");
    }
  };

  // Channel lists sorting
  const rooms = channels.filter((c) => !c.isDM && !c.isGroup);
  const groups = channels.filter((c) => c.isGroup);
  const dms = channels.filter((c) => c.isDM);

  const filteredUsers = availableUsers.filter((u) => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100%", overflow: "hidden" }}>
      
      {/* Channels Sidebar List panel */}
      <div 
        style={{ 
          borderRight: "1px solid hsl(var(--border-hsl))", 
          padding: "20px 12px", 
          background: "rgba(0,0,0,0.15)", 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px",
          overflowY: "auto"
        }}
      >
        
        {/* CHANNELS ROOMS Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>Channels</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveChannelId(r.id)}
                style={{ 
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  padding: "6px 10px", 
                  background: activeChannel.id === r.id ? "rgba(255,255,255,0.06)" : "transparent", 
                  border: "none", 
                  borderRadius: "var(--radius-sm)", 
                  color: "white", 
                  cursor: "pointer", 
                  fontSize: "12.5px", 
                  textAlign: "left" 
                }}
              >
                <Hash size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                <span style={{ fontWeight: activeChannel.id === r.id ? "600" : "400" }}>{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* GROUPS Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>Groups Section</span>
            <button 
              onClick={handleOpenGroupModal}
              style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}
              title="Create a group chat"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {groups.length === 0 ? (
              <div style={{ fontSize: "11.5px", color: "hsl(var(--text-muted-hsl))", padding: "8px 10px", fontStyle: "italic", lineHeight: "1.4" }}>
                No active groups. Click <span style={{ color: "hsl(var(--primary-light-hsl))", fontWeight: "bold" }}>+</span> to create a group!
              </div>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveChannelId(g.id)}
                  style={{ 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    padding: "6px 10px", 
                    background: activeChannel.id === g.id ? "rgba(255,255,255,0.06)" : "transparent", 
                    border: "none", 
                    borderRadius: "var(--radius-sm)", 
                    color: "white", 
                    cursor: "pointer", 
                    fontSize: "12.5px", 
                    textAlign: "left" 
                  }}
                >
                  <Users size={13} style={{ color: activeChannel.id === g.id ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-muted-hsl))" }} />
                  <span style={{ fontWeight: activeChannel.id === g.id ? "600" : "400", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>Direct Messages</span>
            <button 
              onClick={handleOpenInvite}
              style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary-hsl))", cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}
              title="Invite others or start chat"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {dms.length === 0 ? (
              <div style={{ fontSize: "11.5px", color: "hsl(var(--text-muted-hsl))", padding: "8px 10px", fontStyle: "italic", lineHeight: "1.4" }}>
                No active DMs. Click <span style={{ color: "hsl(var(--primary-light-hsl))", fontWeight: "bold" }}>+</span> to invite someone!
              </div>
            ) : (
              dms.map((d) => {
                const isOnline = onlineUsers.includes(d.partnerId);
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveChannelId(d.id)}
                    style={{ 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px", 
                      padding: "8px 10px", 
                      background: activeChannel.id === d.id ? "rgba(255,255,255,0.06)" : "transparent", 
                      border: "none", 
                      borderRadius: "var(--radius-sm)", 
                      color: "white", 
                      cursor: "pointer", 
                      fontSize: "12.5px", 
                      textAlign: "left",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
                      <div 
                        style={{ 
                          width: "22px", 
                          height: "22px", 
                          borderRadius: "50%", 
                          background: activeChannel.id === d.id ? "hsl(var(--primary-hsl))" : "rgba(255,255,255,0.1)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          fontSize: "10px", 
                          fontWeight: "bold",
                          color: "white"
                        }}
                      >
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Vibrant Status Presence Dot */}
                      <div 
                        style={{
                          position: "absolute",
                          bottom: "-1px",
                          right: "-1px",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          border: "1.5px solid #161823",
                          background: isOnline ? "#34c759" : "#7f8c8d",
                          boxShadow: isOnline ? "0 0 4px #34c759" : "none"
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                      <span style={{ fontWeight: activeChannel.id === d.id ? "600" : "400", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name}
                      </span>
                      {!isOnline && (
                        <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))", marginTop: "1px" }}>
                          {formatLastActive(lastActiveMap[d.partnerId])}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Messages Feed panel */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        
        {/* Chat Feed Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid hsl(var(--border-hsl))", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeChannel.isDM ? (
                <MessageCircle size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
              ) : activeChannel.isGroup ? (
                <Users size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
              ) : (
                <Hash size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
              )}
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "white" }}>{activeChannel.name}</h3>
            </div>
            <p style={{ fontSize: "11.5px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px" }}>
              {activeChannel.isDM ? "Direct Conversation" : activeChannel.isGroup ? "Private Group Chat" : activeChannel.description}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {activeChannel.isGroup && isCreatorAdmin() && (
              <button
                onClick={() => setShowGroupAdminModal(true)}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "hsl(var(--text-secondary-hsl))", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center",
                  padding: "6px",
                  borderRadius: "50%",
                  transition: "background 0.2s"
                }}
                title="Manage Group Members"
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <Settings size={15} style={{ color: "hsl(var(--text-secondary-hsl))" }} />
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(var(--text-secondary-hsl))" }}>
              <Users size={14} />
              <span>{activeChannel.isDM ? "Direct Message Room" : activeChannel.isGroup ? "Group Session" : "Active Team Sync"}</span>
            </div>
          </div>
        </div>

        {/* Messages Body list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(0,0,0,0.08)" }}>
          {messages.map((m: any) => (
            <div key={m.id} className="animate-fade-in" style={{ display: "flex", gap: "12px" }}>
              {/* Profile letter avatar */}
              <div 
                style={{ 
                  width: "34px", 
                  height: "34px", 
                  borderRadius: "50%", 
                  background: m.authorName === user?.fullName ? "linear-gradient(135deg, hsl(var(--primary-hsl)), hsla(263, 90%, 75%, 0.8))" : "rgba(255,255,255,0.06)", 
                  border: "1px solid hsl(var(--border-hsl))", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontWeight: "bold", 
                  fontSize: "12px", 
                  color: "white" 
                }}
              >
                {m.authorName?.charAt(0).toUpperCase() || "M"}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontWeight: "600", fontSize: "13px", color: "white" }}>{m.authorName}</span>
                  <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))" }}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}
                  </span>
                </div>
                
                <div 
                  style={{ 
                    fontSize: "13.5px", 
                    color: "hsl(var(--text-secondary-hsl))", 
                    background: m.authorName === user?.fullName ? "rgba(139, 92, 246, 0.1)" : "rgba(255,255,255,0.02)", 
                    padding: "10px 14px", 
                    borderRadius: "0 10px 10px 10px", 
                    border: m.authorName === user?.fullName ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(255,255,255,0.03)", 
                    maxWidth: "550px", 
                    wordBreak: "break-word", 
                    lineHeight: "1.5" 
                  }}
                >
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSend} style={{ padding: "18px 24px", borderTop: "1px solid hsl(var(--border-hsl))", background: "rgba(255,255,255,0.01)", display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder={activeChannel.isDM ? `Chat with ${activeChannel.name}...` : activeChannel.isGroup ? `Message Group...` : `Message #${activeChannel.name}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field"
            style={{ flex: 1, height: "40px" }}
          />
          <button type="submit" className="btn btn-primary" style={{ width: "40px", height: "40px", padding: 0 }}>
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* START DIRECT DM / EMAIL INVITE MODAL OVERLAY */}
      {showInviteModal && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div 
            className="card" 
            style={{ 
              width: "420px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>Start a Conversation</h3>
              </div>
              <button 
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery("");
                  setInviteSuccessMsg("");
                }}
                style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab switch buttons */}
            <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid hsl(var(--border-hsl))", paddingBottom: "10px" }}>
              <button
                onClick={() => setActiveInviteTab("members")}
                style={{
                  background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
                  color: activeInviteTab === "members" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                  fontWeight: activeInviteTab === "members" ? "600" : "400",
                  borderBottom: activeInviteTab === "members" ? "2px solid hsl(var(--primary-hsl))" : "none",
                  padding: "4px 8px"
                }}
              >
                Team Directory
              </button>
              <button
                onClick={() => setActiveInviteTab("email")}
                style={{
                  background: "transparent", border: "none", fontSize: "13px", cursor: "pointer",
                  color: activeInviteTab === "email" ? "hsl(var(--primary-light-hsl))" : "hsl(var(--text-secondary-hsl))",
                  fontWeight: activeInviteTab === "email" ? "600" : "400",
                  borderBottom: activeInviteTab === "email" ? "2px solid hsl(var(--primary-hsl))" : "none",
                  padding: "4px 8px"
                }}
              >
                Invite via Email
              </button>
            </div>

            {/* TAB 1: MEMBERS DIRECTORY */}
            {activeInviteTab === "members" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
                  <input 
                    type="text"
                    placeholder="Search directory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", paddingLeft: "36px", height: "36px" }}
                  />
                </div>

                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {inviteLoading ? (
                    <div style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", textAlign: "center", padding: "12px 0" }}>Loading directory...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", textAlign: "center", padding: "12px 0" }}>No members found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div 
                        key={u.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px", borderRadius: "var(--radius-sm)",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "hsl(var(--primary-light-hsl))" }}>
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{u.fullName}</span>
                            <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))" }}>{u.email}</span>
                          </div>
                        </div>
                        <button onClick={() => handleStartDM(u.id)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11.5px", height: "26px" }}>Chat</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: INVITE BY EMAIL */}
            {activeInviteTab === "email" && (
              <form onSubmit={handleSendEmailInvite} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {inviteSuccessMsg ? (
                  <div style={{ padding: "12px", background: "rgba(52, 199, 89, 0.1)", border: "1px solid rgba(52, 199, 89, 0.25)", borderRadius: "var(--radius-sm)", color: "hsl(var(--success-hsl))", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Check size={14} />
                    <span>{inviteSuccessMsg}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "12px", color: "hsl(var(--text-secondary-hsl))" }}>Email Address</label>
                      <input 
                        type="email"
                        required
                        placeholder="Enter email (e.g. mareddykarthikeya@gmail.com)"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="input-field"
                        style={{ height: "36px" }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "12px", color: "hsl(var(--text-secondary-hsl))" }}>Full Name (Optional)</label>
                      <input 
                        type="text"
                        placeholder="Enter full name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="input-field"
                        style={{ height: "36px" }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ height: "36px", marginTop: "8px", gap: "6px" }}>
                      <Mail size={14} />
                      Send Invites Link
                    </button>
                  </>
                )}
              </form>
            )}

          </div>
        </div>
      )}

      {/* CREATE PRIVATE GROUP CHAT MODAL */}
      {showGroupModal && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <form 
            onSubmit={handleCreateGroup}
            className="card" 
            style={{ 
              width: "440px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "16px"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>Create Group Chat</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowGroupModal(false)}
                style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Group Name input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "hsl(var(--text-secondary-hsl))" }}>Group Name</label>
              <input 
                type="text"
                required
                placeholder="e.g. Q2 Dev Sprint, Weekend Planning..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input-field"
                style={{ height: "36px" }}
              />
            </div>

            {/* Select Members checkbox list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "hsl(var(--text-secondary-hsl))", marginBottom: "4px" }}>Select Participants</label>
              
              <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {availableUsers.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", textAlign: "center" }}>No workspace members available</div>
                ) : (
                  availableUsers.map((u) => {
                    const isChecked = selectedGroupMembers.includes(u.id);
                    return (
                      <div 
                        key={u.id}
                        onClick={() => handleToggleGroupMember(u.id)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "6px 10px", borderRadius: "var(--radius-sm)",
                          background: isChecked ? "rgba(139, 92, 246, 0.05)" : "rgba(255,255,255,0.01)",
                          border: isChecked ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid hsl(var(--border-hsl))",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", color: "white" }}>
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: "12.5px", color: "white" }}>{u.fullName}</span>
                        </div>

                        <div 
                          style={{
                            width: "14px", height: "14px", border: "1px solid hsl(var(--border-hsl))", borderRadius: "3px",
                            background: isChecked ? "hsl(var(--success-hsl))" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px"
                          }}
                        >
                          {isChecked && "✓"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Create Button */}
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ height: "36px", gap: "6px", marginTop: "6px" }}
              disabled={!groupName.trim()}
            >
              <PlusCircle size={14} />
              Create Group Chat
            </button>
          </form>
        </div>
      )}

      {/* MANAGE GROUP PARTICIPANTS MODAL OVERLAY */}
      {showGroupAdminModal && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          <div 
            className="card animate-fade-in" 
            style={{ 
              width: "460px", background: "hsl(var(--card-hsl))", border: "1px solid hsl(var(--border-hsl))",
              borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={16} style={{ color: "hsl(var(--primary-light-hsl))" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>Manage Group</h3>
              </div>
              <button 
                onClick={() => {
                  setShowGroupAdminModal(false);
                  setSearchQuery("");
                }}
                style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Members Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>
                Current Members ({availableUsers.filter((u) => (activeChannel.participantIds || []).includes(u.id)).length})
              </span>
              
              <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}>
                {availableUsers.filter((u) => (activeChannel.participantIds || []).includes(u.id)).map((u) => {
                  const creatorId = activeChannel.description?.split(":")[1]?.split(",")[0];
                  const isUserAdmin = u.id === creatorId;
                  return (
                    <div 
                      key={u.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: "var(--radius-sm)",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div 
                          style={{ 
                            width: "28px", 
                            height: "28px", 
                            borderRadius: "50%", 
                            background: isUserAdmin ? "linear-gradient(135deg, hsl(var(--primary-hsl)), hsla(263, 90%, 75%, 0.8))" : "rgba(255,255,255,0.06)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            fontSize: "11px", 
                            fontWeight: "bold", 
                            color: "white" 
                          }}
                        >
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{u.fullName}</span>
                          <span style={{ fontSize: "10.5px", color: "hsl(var(--text-muted-hsl))" }}>{u.email}</span>
                        </div>
                      </div>
                      
                      {isUserAdmin ? (
                        <span style={{ fontSize: "10.5px", padding: "2px 8px", background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "10px", color: "hsl(var(--primary-light-hsl))", fontWeight: "600" }}>
                          Admin / Creator
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleRemoveMember(u.id)} 
                          className="btn" 
                          style={{ 
                            padding: "4px 10px", 
                            fontSize: "11.5px", 
                            height: "26px", 
                            background: "rgba(244, 63, 94, 0.1)", 
                            border: "1px solid rgba(244, 63, 94, 0.2)", 
                            color: "rgba(244, 63, 94, 0.9)",
                            cursor: "pointer",
                            borderRadius: "var(--radius-sm)"
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Members Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid hsl(var(--border-hsl))", paddingTop: "18px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-muted-hsl))" }}>
                Add Workspace Members
              </span>
              
              <div style={{ position: "relative", marginBottom: "4px" }}>
                <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
                <input 
                  type="text"
                  placeholder="Search workspace directory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", paddingLeft: "36px", height: "36px" }}
                />
              </div>

              <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}>
                {availableUsers
                  .filter((u) => !(activeChannel.participantIds || []).includes(u.id))
                  .filter((u) => 
                    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((u) => (
                    <div 
                      key={u.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 10px", borderRadius: "var(--radius-sm)",
                        background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.02)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", color: "white" }}>
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{u.fullName}</span>
                          <span style={{ fontSize: "9.5px", color: "hsl(var(--text-muted-hsl))" }}>{u.email}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddMember(u.id)} 
                        className="btn btn-primary" 
                        style={{ padding: "4px 10px", fontSize: "11.5px", height: "26px" }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
