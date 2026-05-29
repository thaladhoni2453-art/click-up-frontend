import React, { useState, useEffect } from "react";
import { X, Crown, Shield, UserMinus, LogOut, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useChatStore } from "../../stores/chatStore";

interface MembersPanelProps {
  channelId: string;
  onClose: () => void;
}

interface Member {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    lastSeenAt: string;
    isOnline: boolean;
  };
}

export const MembersPanel: React.FC<MembersPanelProps> = ({ channelId, onClose }) => {
  const { removeChannel } = useChatStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("MEMBER");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user from local storage token
  useEffect(() => {
    const token = localStorage.getItem("ww_access_token") || localStorage.getItem("accessToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId || payload.sub || payload.id);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/chat/channels/${channelId}/members`);
      setMembers(data.members || []);

      if (currentUserId) {
        const me = data.members.find((m: Member) => m.userId === currentUserId);
        if (me) setMyRole(me.role);
      }
    } catch (err) {
      console.error("Failed to fetch group members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchMembers();
    }
  }, [channelId, currentUserId]);

  const handleRoleChange = async (userId: string, newRole: "ADMIN" | "MEMBER") => {
    try {
      await api.patch(`/chat/channels/${channelId}/members/${userId}/role`, { role: newRole });
      setMembers(prev => prev.map(m => {
        if (m.userId === userId) {
          return { ...m, role: newRole };
        }
        return m;
      }));
    } catch (err) {
      console.error("Role update failed", err);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this channel?`)) return;
    try {
      await api.delete(`/chat/channels/${channelId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (err) {
      console.error("Kicking member failed", err);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this channel?")) return;
    if (!currentUserId) return;
    try {
      await api.delete(`/chat/channels/${channelId}/members/${currentUserId}`);
      removeChannel(channelId);
      onClose();
    } catch (err) {
      console.error("Leaving channel failed", err);
    }
  };

  const handleAddPeople = () => {
    window.dispatchEvent(new CustomEvent("ww:open-invite", { detail: channelId }));
  };

  const formatLastActive = (isoString?: string) => {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    return `Last seen ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="members-panel">
      
      {/* Header */}
      <div className="members-panel-header">
        <span style={{ fontSize: "14px", fontWeight: "700", color: "white" }}>
          Members ({members.length})
        </span>
        <button onClick={onClose} className="modal-close-btn">
          <X size={15} />
        </button>
      </div>

      {/* Add Members Trigger (visible to Owner and Admin only) */}
      {(myRole === "OWNER" || myRole === "ADMIN") && (
        <div style={{ padding: "12px 20px 4px 20px" }}>
          <button
            onClick={handleAddPeople}
            className="sidebar-invite-btn"
            style={{ width: "100%", background: "hsl(var(--primary-hsl))", color: "white", borderStyle: "solid", borderWidth: "1px", borderColor: "hsl(var(--primary-hsl))" }}
          >
            <span>+ Add Members</span>
          </button>
        </div>
      )}

      {/* Body List */}
      <div className="members-panel-scrollable">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "hsl(var(--text-muted-hsl))" }} />
          </div>
        ) : (
          members.map((member) => {
            const isMe = member.userId === currentUserId;
            const isOwner = member.role === "OWNER";
            const isAdmin = member.role === "ADMIN";
            const online = member.user.isOnline;

            return (
              <div key={member.userId} className="members-panel-user-row">
                
                <div className="members-panel-user-left">
                  <div className="sidebar-avatar" style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                    {member.user.fullName.charAt(0).toUpperCase()}
                    <div className={`online-dot ${online ? "online" : "offline"}`}></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: isMe ? "hsl(var(--primary-light-hsl))" : "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.user.fullName} {isMe && "(you)"}
                      </span>
                      {isOwner && (
                        <div className="members-panel-role-badge" title="Group Owner">
                          <Crown size={12} />
                        </div>
                      )}
                      {isAdmin && (
                        <div className="members-panel-role-badge admin" title="Group Admin">
                          <Shield size={12} />
                        </div>
                      )}
                    </div>
                    {!online && (
                      <span style={{ fontSize: "9.5px", color: "hsl(var(--text-muted-hsl))", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatLastActive(member.user.lastSeenAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Controls (visible to OWNER and ADMIN under hierarchy) */}
                {((myRole === "OWNER" && !isOwner) || (myRole === "ADMIN" && member.role === "MEMBER")) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value as "ADMIN" | "MEMBER")}
                      className="members-panel-dropdown"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                    <button
                      onClick={() => handleRemove(member.userId, member.user.fullName)}
                      className="msg-action-btn delete"
                      title="Remove from Channel"
                      style={{ padding: "4px" }}
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!loading && myRole !== "OWNER" && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid hsl(var(--border-hsl))", background: "rgba(0,0,0,0.1)" }}>
          <button
            onClick={handleLeave}
            className="sidebar-invite-btn"
            style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", borderStyle: "solid", borderWidth: "1px" }}
          >
            <LogOut size={13} />
            <span>Leave Channel</span>
          </button>
        </div>
      )}

    </div>
  );
};
export default MembersPanel;
