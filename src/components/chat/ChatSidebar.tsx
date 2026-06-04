import React, { useState, useEffect, useRef } from "react";
import { 
  Hash, Lock, Users, Plus, Search, Mail, LogOut, UserPlus, 
  MessageSquare, Loader2, X, ChevronDown, Calendar
} from "lucide-react";
import { useChatStore, Channel } from "../../stores/chatStore";
import { api } from "../../lib/api";
import { useAuth } from "../../app/providers";
import { useQueryClient } from "@tanstack/react-query";

interface ChatSidebarProps {
  onOpenInvite: (channelId?: string) => void;
  onOpenCreateGroup: () => void;
}

interface UserResult {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onOpenInvite, onOpenCreateGroup }) => {
  const { user, logout } = useAuth();
  const { channels, activeChannelId, setActiveChannelId, onlineUsers } = useChatStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  // DM search states
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [dmSearchResults, setDmSearchResults] = useState<UserResult[]>([]);
  const [dmSearching, setDmSearching] = useState(false);
  
  const dmSearchRef = useRef<HTMLDivElement>(null);

  // Custom listener to toggle DM search
  useEffect(() => {
    const handleOpenDmSearch = () => {
      setShowDmSearch(true);
    };
    window.addEventListener("ww:open-dm-search", handleOpenDmSearch);
    return () => window.removeEventListener("ww:open-dm-search", handleOpenDmSearch);
  }, []);

  // Debounced search for starting DMs
  useEffect(() => {
    if (dmSearchQuery.trim().length < 2) {
      setDmSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setDmSearching(true);
      try {
        const { data } = await api.get(`/chat/users?q=${encodeURIComponent(dmSearchQuery)}`);
        setDmSearchResults(data.users || []);
      } catch (err) {
        console.error("DM users search failed", err);
      } finally {
        setDmSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [dmSearchQuery]);

  // Click outside listener for DM search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dmSearchRef.current && !dmSearchRef.current.contains(e.target as Node)) {
        setShowDmSearch(false);
        setDmSearchQuery("");
        setDmSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartDM = async (targetUserId: string) => {
    try {
      const { data } = await api.post("/chat/dm", { targetUserId });
      const channel = data.channel;
      
      // Invalidate query to refresh sidebars instantly!
      queryClient.invalidateQueries({ queryKey: ["channels"] });

      // Fetch properly formatted channels list from the server
      const { data: channelsData } = await api.get("/chat/channels");
      useChatStore.getState().setChannels(channelsData.channels || []);

      setActiveChannelId(channel.id);
      
      // Reset search form
      setShowDmSearch(false);
      setDmSearchQuery("");
      setDmSearchResults([]);
    } catch (err) {
      console.error("Failed to start DM channel", err);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("ww_access_token");
    localStorage.removeItem("ww_refresh_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    await logout();
  };

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

  // Group and DM channels list filtering based on search query
  const groupChannels = channels.filter(
    (c) => c.type === "GROUP" && (c.name || "").toLowerCase().includes(search.toLowerCase())
  );
  
  const dmChannels = channels.filter(
    (c) => c.type === "DM" && (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="chat-sidebar">
      
      {/* Header Info */}
      <div className="sidebar-header">
        
        {/* Logo and dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Green Circle selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div 
              style={{
                width: "20px", height: "20px", borderRadius: "50%", background: "#10b981", 
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "10px", color: "white"
              }}
            >
              W
            </div>
            <span className="sidebar-logo">WaveWork.ai</span>
            <ChevronDown size={14} style={{ color: "hsl(var(--text-muted-hsl))", marginLeft: "2px" }} />
          </div>
          <button title="Calendar Sync" style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted-hsl))", cursor: "pointer" }}>
            <Calendar size={14} />
          </button>
        </div>

        {/* User Card */}
        <div className="sidebar-user-row">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {user?.fullName?.charAt(0).toUpperCase() || "M"}
              <div className="online-dot online" />
            </div>
            <span className="sidebar-username">{user?.fullName || "User Account"}</span>
          </div>
          <button 
            onClick={handleLogout} 
            className="sidebar-section-action" 
            title="Log Out Session"
            style={{ color: "hsl(var(--error-hsl))" }}
          >
            <LogOut size={14} />
          </button>
        </div>

      </div>

      {/* Global Sidebar Filter Search Input */}
      <div className="sidebar-search-container">
        <Search size={14} className="sidebar-search-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter channels & conversations..."
          className="sidebar-search-input"
        />
      </div>

      {/* Nav Lists */}
      <div className="sidebar-scrollable">

        {/* GROUPS LIST */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Channels</span>
            <button onClick={onOpenCreateGroup} className="sidebar-section-action" title="Create a Channel">
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {groupChannels.length === 0 ? (
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", fontStyle: "italic", padding: "8px 16px" }}>
                No channels found.
              </span>
            ) : (
              groupChannels.map((c) => {
                const isActive = activeChannelId === c.id;
                const showInviteBtn = isActive && (c.myRole === "OWNER" || c.myRole === "ADMIN");

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveChannelId(c.id)}
                    className={`channel-item ${isActive ? "active" : ""}`}
                  >
                    <div className="channel-item-left">
                      {c.isPrivate ? (
                        <Lock size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                      ) : (
                        <Hash size={13} style={{ color: "hsl(var(--text-muted-hsl))" }} />
                      )}
                      <span className="channel-name">{c.name}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {showInviteBtn ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInvite(c.id);
                          }}
                          className="sidebar-section-action"
                          title="Invite member"
                          style={{ padding: "2px" }}
                        >
                          <UserPlus size={13} />
                        </button>
                      ) : (
                        <span className="sidebar-badge">{c.memberCount}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES LIST */}
        <div className="sidebar-section" ref={dmSearchRef}>
          <div className="sidebar-section-header">
            <span>Direct Messages</span>
            <button onClick={() => setShowDmSearch(!showDmSearch)} className="sidebar-section-action" title="New direct chat">
              <Plus size={14} />
            </button>
          </div>

          {/* DM Users autocomplete search input */}
          {showDmSearch && (
            <div style={{ padding: "4px 16px", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
                <input
                  type="text"
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  placeholder="Find colleague..."
                  className="sidebar-search-input"
                  style={{ paddingLeft: "30px", fontSize: "12px", paddingTop: "6px", paddingBottom: "6px" }}
                  autoFocus
                />
                {dmSearching && (
                  <Loader2 size={12} className="animate-spin" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted-hsl))" }} />
                )}
              </div>

              {/* DM lookups list */}
              {dmSearchResults.length > 0 && (
                <div className="search-dropdown-list" style={{ top: "36px", left: "16px", width: "calc(100% - 32px)" }}>
                  {dmSearchResults.map((user) => {
                    const online = onlineUsers.has(user.id);
                    return (
                      <div key={user.id} onClick={() => handleStartDM(user.id)} className="dropdown-user-row" style={{ padding: "6px 12px" }}>
                        <div className="sidebar-avatar" style={{ width: "24px", height: "24px", fontSize: "10px" }}>
                          {user.fullName.charAt(0).toUpperCase()}
                          <div className={`online-dot ${online ? "online" : "offline"}`} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>{user.fullName}</span>
                          <span style={{ fontSize: "10px", color: "hsl(var(--text-muted-hsl))" }}>{user.email}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            {dmChannels.length === 0 ? (
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted-hsl))", fontStyle: "italic", padding: "8px 16px" }}>
                No active DMs.
              </span>
            ) : (
              dmChannels.map((c) => {
                const isActive = activeChannelId === c.id;
                const otherMember = c.members.find(m => m.userId !== user?.id) || c.members[0];
                const online = otherMember ? onlineUsers.has(otherMember.userId) : false;

                // Resolve display name robustly!
                let displayName = c.name || "Chat Partner";
                if (displayName.startsWith("dm:") || displayName === "Chat Partner" || displayName === "Member" || displayName === "M Member") {
                  if (c.dmUser && c.dmUser.fullName) {
                    displayName = c.dmUser.fullName;
                  } else if (otherMember && otherMember.fullName) {
                    displayName = otherMember.fullName;
                  } else {
                    // Try parsing from channel description as a fallback
                    const desc = c.description || "";
                    const emailMatch = desc.match(/invited\s+([^\s]+)/i);
                    let partnerEmail = emailMatch ? emailMatch[1] : "member@wavework.ai";
                    const inviterMatch = desc.match(/^([^\s]+)\s+invited/i) || desc.match(/^([^\s]+)\s+has\s+invited/i);
                    const inviterEmail = inviterMatch ? inviterMatch[1] : null;
                    if (inviterEmail && user?.email && inviterEmail !== user.email) {
                      partnerEmail = inviterEmail;
                    }
                    displayName = partnerEmail;
                  }
                }
                if (displayName.includes("@")) {
                  const partnerName = displayName.split("@")[0];
                  displayName = partnerName.charAt(0).toUpperCase() + partnerName.slice(1);
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveChannelId(c.id)}
                    className={`channel-item ${isActive ? "active" : ""}`}
                    style={{ padding: "8px 12px" }}
                  >
                    <div className="channel-item-left" style={{ gap: "10px" }}>
                      <div className="sidebar-avatar" style={{ width: "22px", height: "22px", fontSize: "10px" }}>
                        {displayName.charAt(0).toUpperCase()}
                        <div className={`online-dot ${online ? "online" : "offline"}`} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <span className="channel-name" style={{ fontSize: "13px" }}>{displayName}</span>
                        {online ? (
                          <span style={{ fontSize: "9px", color: "hsl(var(--success-hsl))", fontWeight: "600", marginTop: "1px" }}>Online</span>
                        ) : (
                          <span style={{ fontSize: "9px", color: "hsl(var(--text-muted-hsl))", marginTop: "1px" }}>
                            {otherMember ? formatLastActive(otherMember.lastSeenAt) : "offline"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button onClick={() => onOpenInvite()} className="sidebar-invite-btn">
          <Mail size={14} />
          <span>Invite People</span>
        </button>
      </div>

    </div>
  );
};
export default ChatSidebar;
